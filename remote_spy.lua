--[[
    Remote Spy  ·  Roblox  ·  Lua (executor-side)
    Runs on: Synapse-X / Script-Ware / KRNL / Fluxus / Wave-style executors.
    Needs  : hookmetamethod, getnamecallmethod, newcclosure, checkcaller, getgenv
    Uses if present (all optional, degrades gracefully):
             hookfunction, setclipboard, gethui, getrawmetatable, getdebugid / :GetDebugId

    What it does
      · Hooks the __namecall metamethod AND the raw FireServer / InvokeServer
        closures, so it catches both call styles games use to dodge spies:
            remote:FireServer(...)              -> namecall path
            remote.FireServer(remote, ...)      -> direct-closure path
      · Logs every OUTGOING remote call with a full, bracket-indexed path.
        When the game randomizes remote names, the name is useless — so the
        path uses ["..."] indexing (survives any characters) and prints a
        DebugId, which stays the same for the life of that instance even when
        the .Name keeps shuffling. That's how you track "the random one."
      · Serializes the arguments back into runnable Lua and prints ready-to-
        fire REPLAY code (auto-copied to clipboard if the executor supports it),
        plus an optional floating log window.

    Controls (after first run)
      · Re-execute this script      -> toggles the spy on/off (no double-hook)
      · getgenv().RemoteSpy.blocked -> table of names/paths to mute
      · getgenv().RemoteSpy.only    -> if non-empty, log ONLY these names
      · getgenv().RemoteSpy.log     -> every captured call, for scripting
]]

local CONFIG = {
    useGui       = true,   -- floating capture window; falls back to console if it can't build
    toConsole    = true,   -- always print to the dev console / F9
    autoClipboard= true,   -- copy replay code of the latest call to clipboard
    maxGuiRows   = 60,      -- trim the on-screen list past this
    blocked      = {        -- mute by remote .Name OR by any substring of the path
        -- "ReplicateEffect",
        -- "CharacterSoundEvent",
    },
    only         = {},      -- if non-empty, ONLY these names are logged
}

----------------------------------------------------------------------
-- single-instance / toggle guard
----------------------------------------------------------------------
local genv = (getgenv and getgenv()) or _G
if genv.RemoteSpy and genv.RemoteSpy.__installed then
    genv.RemoteSpy.enabled = not genv.RemoteSpy.enabled
    local gui = genv.RemoteSpy.gui
    if gui then pcall(function() gui.Enabled = genv.RemoteSpy.enabled end) end
    print(("[RemoteSpy] %s"):format(genv.RemoteSpy.enabled and "resumed" or "paused"))
    return
end

local STATE = {
    __installed = true,
    enabled     = true,
    count       = 0,
    blocked     = CONFIG.blocked,
    only        = CONFIG.only,
    log         = {},   -- { {remote=, method=, path=, debugId=, args={...}, replay=, at=} }
    gui         = nil,
}
genv.RemoteSpy = STATE

----------------------------------------------------------------------
-- helpers
----------------------------------------------------------------------
local function tryGetDebugId(inst)
    local id
    if getdebugid then pcall(function() id = getdebugid(inst) end) end
    if not id then pcall(function() id = inst:GetDebugId() end) end
    return id or "?"
end

-- name -> ".Name" if it's a clean identifier, else ["escaped name"]
local function indexFor(name)
    if type(name) == "string" and name:match("^[%a_][%w_]*$") then
        return "." .. name
    end
    return ("[%q]"):format(tostring(name))
end

-- full path that survives random/obfuscated names (bracket indexing + GetService roots)
local function pathOf(inst)
    if typeof(inst) ~= "Instance" then return tostring(inst) end
    if inst == game then return "game" end
    local ok, path = pcall(function()
        local segs, cur = {}, inst
        while cur and cur ~= game do
            local parent = cur.Parent
            if parent == game then
                local okSvc, svc = pcall(function() return game:GetService(cur.ClassName) end)
                if okSvc and svc == cur then
                    table.insert(segs, 1, (':GetService("%s")'):format(cur.ClassName))
                else
                    table.insert(segs, 1, indexFor(cur.Name))
                end
            else
                table.insert(segs, 1, indexFor(cur.Name))
            end
            cur = parent
        end
        return "game" .. table.concat(segs)
    end)
    return ok and path or inst:GetFullName()
end

-- value -> runnable Lua source (handles the common Roblox datatypes + nested tables)
local function serialize(v, depth, seen)
    depth = depth or 0
    seen = seen or {}
    local t = typeof(v)
    if t == "string"  then return ("%q"):format(v) end
    if t == "number" or t == "boolean" then return tostring(v) end
    if t == "nil"     then return "nil" end
    if t == "Instance" then return pathOf(v) end
    if t == "Vector3" then return ("Vector3.new(%s, %s, %s)"):format(v.X, v.Y, v.Z) end
    if t == "Vector2" then return ("Vector2.new(%s, %s)"):format(v.X, v.Y) end
    if t == "CFrame"  then return "CFrame.new(" .. table.concat({v:GetComponents()}, ", ") .. ")" end
    if t == "Color3"  then return ("Color3.new(%s, %s, %s)"):format(v.R, v.G, v.B) end
    if t == "UDim2"   then return ("UDim2.new(%s, %s, %s, %s)"):format(v.X.Scale, v.X.Offset, v.Y.Scale, v.Y.Offset) end
    if t == "UDim"    then return ("UDim.new(%s, %s)"):format(v.Scale, v.Offset) end
    if t == "EnumItem" then return tostring(v) end
    if t == "table" then
        if seen[v] then return '"<cycle>"' end
        if depth > 6 then return '"<deep>"' end
        seen[v] = true
        local pad, parts = ("    "):rep(depth + 1), {}
        local arrayLike = true
        for k in pairs(v) do if type(k) ~= "number" then arrayLike = false break end end
        for k, val in pairs(v) do
            local key = ""
            if not arrayLike then
                if type(k) == "string" and k:match("^[%a_][%w_]*$") then
                    key = k .. " = "
                else
                    key = "[" .. serialize(k, depth + 1, seen) .. "] = "
                end
            end
            parts[#parts + 1] = pad .. key .. serialize(val, depth + 1, seen)
        end
        seen[v] = nil
        if #parts == 0 then return "{}" end
        return "{\n" .. table.concat(parts, ",\n") .. "\n" .. ("    "):rep(depth) .. "}"
    end
    return ("%q"):format(tostring(v)) -- userdata / fallback
end

local function joinArgs(packed)
    local parts = {}
    for i = 1, packed.n do parts[i] = serialize(packed[i]) end
    return table.concat(parts, ", ")
end

local function shouldLog(remote)
    if not STATE.enabled then return false end
    local name = (typeof(remote) == "Instance") and remote.Name or tostring(remote)
    if #STATE.only > 0 then
        for _, want in ipairs(STATE.only) do if name == want then return true end end
        return false
    end
    local path = (typeof(remote) == "Instance") and remote:GetFullName() or ""
    for _, b in ipairs(STATE.blocked) do
        if name == b or path:find(b, 1, true) then return false end
    end
    return true
end

----------------------------------------------------------------------
-- optional floating GUI
----------------------------------------------------------------------
local function buildGui()
    if not CONFIG.useGui then return nil end
    local ok, gui = pcall(function()
        local players = game:GetService("Players")
        local parent = (gethui and gethui()) or game:GetService("CoreGui")

        local sg = Instance.new("ScreenGui")
        sg.Name = "RSpy_" .. tostring(math.random(1e5, 1e6))
        sg.ResetOnSpawn = false
        sg.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

        local win = Instance.new("Frame", sg)
        win.Size = UDim2.fromOffset(360, 300)
        win.Position = UDim2.fromOffset(24, 120)
        win.BackgroundColor3 = Color3.fromRGB(18, 18, 22)
        win.BorderSizePixel = 0
        win.Active = true
        Instance.new("UICorner", win).CornerRadius = UDim.new(0, 8)

        local bar = Instance.new("TextButton", win)   -- title bar doubles as drag handle
        bar.AutoButtonColor = false
        bar.Size = UDim2.new(1, 0, 0, 28)
        bar.BackgroundColor3 = Color3.fromRGB(30, 30, 38)
        bar.BorderSizePixel = 0
        bar.Font = Enum.Font.GothamBold
        bar.TextSize = 13
        bar.TextColor3 = Color3.fromRGB(235, 235, 245)
        bar.Text = "  remote spy  ·  drag me  ·  click a row = copy replay"
        bar.TextXAlignment = Enum.TextXAlignment.Left
        Instance.new("UICorner", bar).CornerRadius = UDim.new(0, 8)

        -- manual drag (Frame.Draggable is deprecated / dead in modern clients)
        local uis = game:GetService("UserInputService")
        local dragging, dragStart, startPos
        bar.InputBegan:Connect(function(input)
            if input.UserInputType == Enum.UserInputType.MouseButton1
            or input.UserInputType == Enum.UserInputType.Touch then
                dragging, dragStart, startPos = true, input.Position, win.Position
                input.Changed:Connect(function()
                    if input.UserInputState == Enum.UserInputState.End then dragging = false end
                end)
            end
        end)
        uis.InputChanged:Connect(function(input)
            if dragging and (input.UserInputType == Enum.UserInputType.MouseMovement
                          or input.UserInputType == Enum.UserInputType.Touch) then
                local d = input.Position - dragStart
                win.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X,
                                         startPos.Y.Scale, startPos.Y.Offset + d.Y)
            end
        end)

        local list = Instance.new("ScrollingFrame", win)
        list.Position = UDim2.fromOffset(0, 30)
        list.Size = UDim2.new(1, 0, 1, -30)
        list.BackgroundTransparency = 1
        list.BorderSizePixel = 0
        list.ScrollBarThickness = 4
        list.CanvasSize = UDim2.new()
        list.AutomaticCanvasSize = Enum.AutomaticSize.Y
        local layout = Instance.new("UIListLayout", list)
        layout.SortOrder = Enum.SortOrder.LayoutOrder
        layout.Padding = UDim.new(0, 2)

        sg.Parent = parent
        return { sg = sg, list = list, layout = layout, next = 0 }
    end)
    return ok and gui or nil
end

local function pushGui(entry)
    local g = STATE.gui
    if not g then return end
    pcall(function()
        g.next = g.next + 1
        local row = Instance.new("TextButton")
        row.LayoutOrder = -g.next -- newest on top
        row.Size = UDim2.new(1, -8, 0, 20)
        row.Position = UDim2.fromOffset(4, 0)
        row.BackgroundColor3 = Color3.fromRGB(28, 28, 34)
        row.BorderSizePixel = 0
        row.Font = Enum.Font.Code
        row.TextSize = 12
        row.TextXAlignment = Enum.TextXAlignment.Left
        row.TextColor3 = Color3.fromRGB(120, 220, 160)
        row.Text = ("  #%d  %s  (%d args)"):format(entry.n, entry.name, entry.argc)
        Instance.new("UICorner", row).CornerRadius = UDim.new(0, 4)
        row.Parent = g.list
        row.MouseButton1Click:Connect(function()
            if setclipboard then setclipboard(entry.replay) end
            row.TextColor3 = Color3.fromRGB(250, 210, 120)
            row.Text = ("  #%d  copied -> clipboard"):format(entry.n)
        end)

        -- trim
        local kids = g.list:GetChildren()
        if #kids - 1 > CONFIG.maxGuiRows then
            local oldest, best
            for _, c in ipairs(kids) do
                if c:IsA("TextButton") then
                    if not oldest or c.LayoutOrder > oldest then oldest, best = c.LayoutOrder, c end
                end
            end
            if best then best:Destroy() end
        end
    end)
end

----------------------------------------------------------------------
-- core capture
----------------------------------------------------------------------
local function capture(remote, method, packed)
    STATE.count = STATE.count + 1
    local n       = STATE.count
    local name    = (typeof(remote) == "Instance") and remote.Name or tostring(remote)
    local path    = pathOf(remote)
    local debugId = tryGetDebugId(remote)
    local argStr  = joinArgs(packed)
    local replay  = ("%s:%s(%s)"):format(path, method, argStr)

    STATE.log[#STATE.log + 1] = {
        remote = remote, method = method, path = path,
        debugId = debugId, name = name, args = packed, replay = replay,
        at = os.clock(),
    }

    if CONFIG.autoClipboard and setclipboard then pcall(setclipboard, replay) end

    if CONFIG.toConsole then
        print(("\n[RemoteSpy] #%d  %s  DebugId %s"):format(n, name, debugId))
        print("  method : " .. method)
        print("  path   : " .. path)
        print("  args   : " .. (argStr == "" and "<none>" or argStr))
        print("  replay : " .. replay)
    end

    pushGui({ n = n, name = name, argc = packed.n, replay = replay })
end

----------------------------------------------------------------------
-- install hooks
----------------------------------------------------------------------
STATE.gui = buildGui()

-- 1) namecall:  remote:FireServer(...) / remote:InvokeServer(...)
local oldNamecall
oldNamecall = hookmetamethod(game, "__namecall", newcclosure(function(self, ...)
    local method = getnamecallmethod()
    if not checkcaller()
       and (method == "FireServer" or method == "InvokeServer"
            or method == "fireServer" or method == "invokeServer")
       and shouldLog(self) then
        capture(self, method, table.pack(...))
    end
    return oldNamecall(self, ...)
end))

-- 2) direct closure:  remote.FireServer(remote, ...) / remote.InvokeServer(remote, ...)
--    different code path from namecall, so no double-logging.
if hookfunction then
    pcall(function()
        local re = Instance.new("RemoteEvent")
        local oldFire
        oldFire = hookfunction(re.FireServer, newcclosure(function(self, ...)
            if not checkcaller() and shouldLog(self) then
                capture(self, "FireServer", table.pack(...))
            end
            return oldFire(self, ...)
        end))
        re:Destroy()

        local rf = Instance.new("RemoteFunction")
        local oldInvoke
        oldInvoke = hookfunction(rf.InvokeServer, newcclosure(function(self, ...)
            if not checkcaller() and shouldLog(self) then
                capture(self, "InvokeServer", table.pack(...))
            end
            return oldInvoke(self, ...)
        end))
        rf:Destroy()
    end)
end

print("[RemoteSpy] armed. firing remotes will log here" ..
      (STATE.gui and " + on-screen window." or " (console only)."))
print("[RemoteSpy] re-run this script to pause/resume. getgenv().RemoteSpy.log holds captures.")
