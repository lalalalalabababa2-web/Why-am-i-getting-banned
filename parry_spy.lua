--[[
    Remote Spy V3.2  ·  Parry Diagnostics  ·  Roblox / Luau (executor-side)
    Runs on: Synapse-X / Script-Ware / KRNL / Fluxus / Wave / mobile executors.
    Needs  : hookmetamethod, getnamecallmethod, newcclosure, checkcaller, getgenv
    Optional: hookfunction, setclipboard, gethui, getdebugid / :GetDebugId

    Why V3.1 found nothing:
      The old build only recorded remotes you had BOUND by hand, so the capture
      log stayed empty ("0 of 0") and the parry correlator had nothing to score
      against — the Sessions counter just ticked a local timer. This version
      captures EVERY outgoing remote globally the instant capture is on, then
      correlates by frequency across repeated parries.

    How to use it
      1. START CAPTURE            -> global logging on (LOGS fills immediately)
      2. PARRY CAPTURE            -> arms a short window ("parry now")
      3. parry in-game once       -> whatever fires in that window is scored
      4. repeat steps 2-3 ~5x     -> the remote that hits EVERY session rises to
                                     the top of the PARRY tab; noise sinks
      5. tap a candidate / log row-> copies ready-to-fire replay code

    The parry remote = high session-hit count + low out-of-window noise.
    A candidate that also fires constantly outside the window is a state/
    replication remote (server infers parry from it) — the tab flags that.
]]

local CONFIG = {
    windowSec     = 1.2,    -- how long "parry now" stays armed after you press it
    preRollSec    = 0.10,   -- also count fires this far BEFORE the press
    ringMax       = 400,    -- recent-fire buffer size (LOGS feed)
    topCandidates = 6,      -- how many guesses to show on the PARRY tab
    refreshSec    = 0.25,   -- UI redraw cadence
    autoClipboard = true,   -- copy latest candidate's replay automatically
    blocked       = {},     -- mute by remote .Name or path substring
}

--==================================================================--
-- single-instance guard / soft reload
--==================================================================--
local genv = (getgenv and getgenv()) or _G
if genv.ParrySpy and genv.ParrySpy.__installed then
    local S = genv.ParrySpy
    S.enabled = not S.enabled
    if S.gui then pcall(function() S.gui.Enabled = S.enabled end) end
    print(("[ParrySpy] GUI %s"):format(S.enabled and "shown" or "hidden"))
    return
end

local S = {
    __installed = true,
    enabled     = true,
    capturing   = false,
    armed       = false,
    armT        = 0,
    sessions    = {},   -- { {t=, keys={[key]=true}} }
    perKey      = {},   -- key -> {name,path,debugId,firesTotal,firesInWindow,lastArgs,method}
    ring        = {},   -- recent fires {key,name,method,preview,t}
    captureT    = 0,
    totalFires  = 0,
    gui         = nil,
}
genv.ParrySpy = S

--==================================================================--
-- helpers
--==================================================================--
local RunService = game:GetService("RunService")
local UIS        = game:GetService("UserInputService")

local idCache = setmetatable({}, { __mode = "k" }) -- remote -> {name,path,debugId}

local function debugIdOf(inst)
    local id
    if getdebugid then pcall(function() id = getdebugid(inst) end) end
    if not id then pcall(function() id = inst:GetDebugId() end) end
    return id or tostring(inst)
end

local function indexFor(name)
    if type(name) == "string" and name:match("^[%a_][%w_]*$") then return "." .. name end
    return ("[%q]"):format(tostring(name))
end

local function pathOf(inst)
    if typeof(inst) ~= "Instance" then return tostring(inst) end
    if inst == game then return "game" end
    local ok, p = pcall(function()
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
    return ok and p or inst:GetFullName()
end

-- cached identity so we don't recompute path/debugId on every fire
local function identity(remote)
    local cached = idCache[remote]
    if cached then return cached end
    local info = {
        name    = (typeof(remote) == "Instance") and remote.Name or tostring(remote),
        path    = pathOf(remote),
        debugId = debugIdOf(remote),
    }
    info.key = info.debugId -- stable for the instance's life, even if .Name shuffles
    idCache[remote] = info
    return info
end

-- full value -> runnable Lua (for replay)
local function ser(v, depth, seen)
    depth, seen = depth or 0, seen or {}
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
    if t == "EnumItem" then return tostring(v) end
    if t == "table" then
        if seen[v] then return '"<cycle>"' end
        if depth > 5 then return '"<deep>"' end
        seen[v] = true
        local parts, arrayLike = {}, true
        for k in pairs(v) do if type(k) ~= "number" then arrayLike = false break end end
        for k, val in pairs(v) do
            local key = ""
            if not arrayLike then
                key = (type(k) == "string" and k:match("^[%a_][%w_]*$")) and (k .. " = ")
                      or ("[" .. ser(k, depth + 1, seen) .. "] = ")
            end
            parts[#parts + 1] = key .. ser(val, depth + 1, seen)
        end
        seen[v] = nil
        return "{" .. table.concat(parts, ", ") .. "}"
    end
    return ("%q"):format(tostring(v))
end

local function joinArgs(packed)
    if not packed then return "" end
    local parts = {}
    for i = 1, packed.n do parts[i] = ser(packed[i]) end
    return table.concat(parts, ", ")
end

-- cheap one-line preview for the LOGS feed (no deep serialization)
local function preview(packed)
    local parts = {}
    for i = 1, math.min(packed.n, 4) do
        local v = packed[i]
        local t = typeof(v)
        if t == "string" then
            parts[i] = '"' .. (#v > 14 and v:sub(1, 14) .. "…" or v) .. '"'
        elseif t == "number" or t == "boolean" then parts[i] = tostring(v)
        elseif t == "Instance" then parts[i] = v.ClassName
        else parts[i] = t end
    end
    if packed.n > 4 then parts[#parts + 1] = "+" .. (packed.n - 4) end
    return table.concat(parts, ", ")
end

local function muted(info)
    for _, b in ipairs(CONFIG.blocked) do
        if info.name == b or info.path:find(b, 1, true) then return true end
    end
    return false
end

--==================================================================--
-- capture core
--==================================================================--
local function record(remote, method, packed)
    if not (S.enabled and S.capturing) then return end
    if typeof(remote) ~= "Instance" then return end
    local info = identity(remote)
    if muted(info) then return end

    local now = os.clock()
    S.totalFires += 1

    local pk = S.perKey[info.key]
    if not pk then
        pk = { name = info.name, path = info.path, debugId = info.debugId,
               firesTotal = 0, firesInWindow = 0, method = method, lastArgs = nil }
        S.perKey[info.key] = pk
    end
    pk.firesTotal += 1
    pk.method = method
    pk.lastArgs = packed

    -- ring buffer for LOGS
    S.ring[#S.ring + 1] = { key = info.key, name = info.name, method = method,
                            preview = preview(packed), t = now }
    if #S.ring > CONFIG.ringMax then table.remove(S.ring, 1) end

    -- in a parry window? tag it to the open session + count as window fire
    if S.armed and now <= (S.armT + CONFIG.windowSec) and now >= (S.armT - CONFIG.preRollSec) then
        pk.firesInWindow += 1
        local sess = S.sessions[#S.sessions]
        if sess then sess.keys[info.key] = true end
    end
end

local function arm()
    if not S.capturing then return false end
    S.armed = true
    S.armT  = os.clock()
    S.sessions[#S.sessions + 1] = { t = S.armT, keys = {} }
    return true
end

local function closeWindowIfDue()
    if S.armed and os.clock() > (S.armT + CONFIG.windowSec) then
        S.armed = false
    end
end

-- rank candidates: appears in the most parry sessions, with least outside noise
local function rankCandidates()
    local nSessions = #S.sessions
    local list = {}
    for key, pk in pairs(S.perKey) do
        if pk.firesInWindow > 0 then
            local hits = 0
            for _, sess in ipairs(S.sessions) do
                if sess.keys[key] then hits += 1 end
            end
            local noise = pk.firesTotal - pk.firesInWindow
            list[#list + 1] = {
                key = key, pk = pk, hits = hits, nSessions = nSessions,
                noise = noise,
                score = hits * 1000 - noise, -- session consistency dominates
            }
        end
    end
    table.sort(list, function(a, b) return a.score > b.score end)
    return list
end

--==================================================================--
-- GUI
--==================================================================--
local CLR = {
    bg    = Color3.fromRGB(18, 18, 22),
    bar   = Color3.fromRGB(30, 30, 38),
    tab   = Color3.fromRGB(40, 40, 50),
    tabOn = Color3.fromRGB(196, 54, 54),
    row   = Color3.fromRGB(28, 28, 34),
    good  = Color3.fromRGB(120, 220, 160),
    warn  = Color3.fromRGB(250, 200, 110),
    text  = Color3.fromRGB(235, 235, 245),
    dim   = Color3.fromRGB(150, 150, 165),
    green = Color3.fromRGB(60, 170, 90),
    red   = Color3.fromRGB(196, 54, 54),
    gold  = Color3.fromRGB(205, 160, 40),
}

local function corner(obj, r) local c = Instance.new("UICorner", obj); c.CornerRadius = UDim.new(0, r or 6); return obj end

local function newBtn(parent, text, color)
    local b = Instance.new("TextButton")
    b.BackgroundColor3 = color
    b.AutoButtonColor = true
    b.BorderSizePixel = 0
    b.Font = Enum.Font.GothamBold
    b.TextSize = 14
    b.TextColor3 = CLR.text
    b.Text = text
    b.Parent = parent
    return corner(b, 6)
end

local function buildGui()
    local ok, G = pcall(function()
        local parent = (gethui and gethui()) or game:GetService("CoreGui")
        local sg = Instance.new("ScreenGui")
        sg.Name = "PSpy_" .. tostring(math.random(1e5, 1e6))
        sg.ResetOnSpawn = false
        sg.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
        sg.IgnoreGuiInset = true

        local win = Instance.new("Frame", sg)
        win.Size = UDim2.fromOffset(380, 330)
        win.Position = UDim2.fromOffset(90, 70)
        win.BackgroundColor3 = CLR.bg
        win.BorderSizePixel = 0
        win.Active = true
        corner(win, 8)

        -- title bar + drag
        local bar = Instance.new("TextLabel", win)
        bar.Size = UDim2.new(1, -40, 0, 30)
        bar.BackgroundColor3 = CLR.bar
        bar.BorderSizePixel = 0
        bar.Font = Enum.Font.GothamBold
        bar.TextSize = 13
        bar.TextColor3 = CLR.text
        bar.Text = "  REMOTE SPY V3.2  ·  parry diagnostics"
        bar.TextXAlignment = Enum.TextXAlignment.Left
        corner(bar, 8)

        local minBtn = newBtn(win, "–", CLR.bar)
        minBtn.Size = UDim2.fromOffset(34, 30)
        minBtn.Position = UDim2.new(1, -36, 0, 0)
        minBtn.TextSize = 20

        local dragging, dragStart, startPos
        local function beginDrag(input)
            dragging, dragStart, startPos = true, input.Position, win.Position
            input.Changed:Connect(function()
                if input.UserInputState == Enum.UserInputState.End then dragging = false end
            end)
        end
        bar.InputBegan:Connect(function(i)
            if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then beginDrag(i) end
        end)
        UIS.InputChanged:Connect(function(i)
            if dragging and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then
                local d = i.Position - dragStart
                win.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X, startPos.Y.Scale, startPos.Y.Offset + d.Y)
            end
        end)

        -- tabs
        local tabBar = Instance.new("Frame", win)
        tabBar.Position = UDim2.fromOffset(8, 36)
        tabBar.Size = UDim2.new(1, -16, 0, 34)
        tabBar.BackgroundTransparency = 1
        local tl = Instance.new("UIListLayout", tabBar)
        tl.FillDirection = Enum.FillDirection.Horizontal
        tl.Padding = UDim.new(0, 6)
        local tabBtns = {}
        for _, name in ipairs({ "PARRY", "LOGS", "INFO" }) do
            local b = newBtn(tabBar, name, CLR.tab)
            b.Size = UDim2.new(0.333, -4, 1, 0)
            tabBtns[name] = b
        end

        -- content
        local content = Instance.new("ScrollingFrame", win)
        content.Position = UDim2.fromOffset(8, 76)
        content.Size = UDim2.new(1, -16, 1, -148)
        content.BackgroundColor3 = Color3.fromRGB(24, 24, 30)
        content.BorderSizePixel = 0
        content.ScrollBarThickness = 5
        content.CanvasSize = UDim2.new()
        content.AutomaticCanvasSize = Enum.AutomaticSize.Y
        corner(content, 6)
        local cl = Instance.new("UIListLayout", content)
        cl.Padding = UDim.new(0, 3)
        cl.SortOrder = Enum.SortOrder.LayoutOrder
        local cp = Instance.new("UIPadding", content)
        cp.PaddingTop = UDim.new(0, 6); cp.PaddingLeft = UDim.new(0, 8); cp.PaddingRight = UDim.new(0, 8)

        -- action row 1: start/stop
        local startBtn = newBtn(win, "START CAPTURE", CLR.green)
        startBtn.Size = UDim2.new(0.5, -12, 0, 30)
        startBtn.Position = UDim2.new(0, 8, 1, -68)
        local stopBtn = newBtn(win, "STOPPED", CLR.tab)
        stopBtn.Size = UDim2.new(0.5, -12, 0, 30)
        stopBtn.Position = UDim2.new(0.5, 4, 1, -68)

        -- action row 2: parry / clear / min
        local parryBtn = newBtn(win, "PARRY CAPTURE", CLR.gold)
        parryBtn.Size = UDim2.new(0.5, -12, 0, 30)
        parryBtn.Position = UDim2.new(0, 8, 1, -34)
        local clearBtn = newBtn(win, "CLEAR", CLR.tab)
        clearBtn.Size = UDim2.new(0.25, -6, 0, 30)
        clearBtn.Position = UDim2.new(0.5, 4, 1, -34)
        local minBtn2 = newBtn(win, "MIN", CLR.tab)
        minBtn2.Size = UDim2.new(0.25, -6, 0, 30)
        minBtn2.Position = UDim2.new(0.75, 2, 1, -34)

        sg.Parent = parent
        return {
            sg = sg, win = win, content = content, tabBtns = tabBtns,
            startBtn = startBtn, stopBtn = stopBtn, parryBtn = parryBtn,
            clearBtn = clearBtn, minBtn = minBtn, minBtn2 = minBtn2,
            tab = "PARRY", minimized = false,
        }
    end)
    return ok and G or nil
end

-- content row factory
local function addLabel(content, text, color, order)
    local l = Instance.new("TextLabel")
    l.BackgroundTransparency = 1
    l.Size = UDim2.new(1, 0, 0, 0)
    l.AutomaticSize = Enum.AutomaticSize.Y
    l.Font = Enum.Font.Gotham
    l.TextSize = 13
    l.TextWrapped = true
    l.TextXAlignment = Enum.TextXAlignment.Left
    l.TextYAlignment = Enum.TextYAlignment.Top
    l.TextColor3 = color or CLR.dim
    l.Text = text
    l.LayoutOrder = order or 0
    l.Parent = content
    return l
end

local function addRow(content, text, color, replay, order)
    local b = Instance.new("TextButton")
    b.Size = UDim2.new(1, 0, 0, 0)
    b.AutomaticSize = Enum.AutomaticSize.Y
    b.BackgroundColor3 = CLR.row
    b.BorderSizePixel = 0
    b.Font = Enum.Font.Code
    b.TextSize = 12
    b.TextWrapped = true
    b.TextXAlignment = Enum.TextXAlignment.Left
    b.TextColor3 = color or CLR.good
    b.Text = text
    b.LayoutOrder = order or 0
    b.Parent = corner(b, 4) and content
    local pad = Instance.new("UIPadding", b)
    pad.PaddingTop = UDim.new(0, 4); pad.PaddingBottom = UDim.new(0, 4)
    pad.PaddingLeft = UDim.new(0, 6); pad.PaddingRight = UDim.new(0, 6)
    if replay then
        b.Activated:Connect(function()
            if setclipboard then setclipboard(replay) end
            local old = b.Text
            b.Text = "copied → clipboard"
            task.delay(0.8, function() if b and b.Parent then b.Text = old end end)
        end)
    end
    return b
end

local function clearContent(content)
    for _, c in ipairs(content:GetChildren()) do
        if c:IsA("TextLabel") or c:IsA("TextButton") then c:Destroy() end
    end
end

--==================================================================--
-- rendering
--==================================================================--
local function renderParry(G)
    local content = G.content
    clearContent(content)
    local nSessions = #S.sessions
    local status = S.armed and "ARMED — parry now" or (S.capturing and "ready — press PARRY CAPTURE" or "capture is OFF")
    addLabel(content,
        ("Sessions: %d    Fires captured: %d\n%s")
        :format(nSessions, S.totalFires, status),
        CLR.text, 0)

    local list = rankCandidates()
    if #list == 0 then
        addLabel(content, "\nNo candidates yet. START CAPTURE, press PARRY CAPTURE, then parry. Repeat a few times.", CLR.dim, 1)
        return
    end

    for i = 1, math.min(#list, CONFIG.topCandidates) do
        local c = list[i]
        local pk = c.pk
        local replay = ("%s:%s(%s)"):format(pk.path, pk.method, joinArgs(pk.lastArgs))
        local isTop = (i == 1)
        local color = isTop and CLR.warn or CLR.good
        local noisy = c.noise > (nSessions * 3)
        local tag = isTop and "★ BEST" or ("#" .. i)
        local note = noisy and "  ⚠ fires constantly → likely a state/replication remote" or ""
        addRow(content,
            ("%s  %s\nhits %d/%d sessions · noise %d%s\n%s")
            :format(tag, pk.name, c.hits, nSessions, c.noise, note, replay),
            color, replay, i)
    end

    -- copy the best guess once, only when it changes (don't clobber the clipboard every tick)
    if CONFIG.autoClipboard and setclipboard and list[1] and S._lastTopKey ~= list[1].key then
        S._lastTopKey = list[1].key
        local pk = list[1].pk
        pcall(setclipboard, ("%s:%s(%s)"):format(pk.path, pk.method, joinArgs(pk.lastArgs)))
    end
end

local function renderLogs(G)
    local content = G.content
    clearContent(content)
    local n = #S.ring
    addLabel(content, ("showing %d of %d (newest first)"):format(math.min(n, 40), n), CLR.dim, 0)
    if n == 0 then
        addLabel(content, "\nNo entries yet. Press START CAPTURE, then do anything in-game.", CLR.dim, 1)
        return
    end
    local shown = 0
    for i = n, 1, -1 do
        shown += 1
        if shown > 40 then break end
        local e = S.ring[i]
        local pk = S.perKey[e.key]
        local replay = pk and ("%s:%s(%s)"):format(pk.path, pk.method, joinArgs(pk.lastArgs)) or nil
        addRow(content, ("%s:%s(%s)"):format(e.name, e.method, e.preview), CLR.good, replay, shown)
    end
end

local function renderInfo(G)
    local content = G.content
    clearContent(content)
    local uniq = 0 for _ in pairs(S.perKey) do uniq += 1 end
    addLabel(content, ([[
REMOTE SPY V3.2 — parry diagnostics

Flow:
  1. START CAPTURE — logs every outgoing remote.
  2. PARRY CAPTURE — arms a %.1fs window.
  3. Parry once in-game.
  4. Repeat 2–3 about five times.

The PARRY tab ranks remotes by how many parry
sessions they fired in. The real parry remote
hits every session with low "noise". A candidate
that also fires constantly is a state remote the
server reads — flagged with ⚠.

Live stats:
  unique remotes seen : %d
  total fires captured: %d
  parry sessions      : %d

Tap any candidate or log row to copy its replay.
getgenv().ParrySpy holds all captured data.
]]):format(CONFIG.windowSec, uniq, S.totalFires, #S.sessions), CLR.dim, 0)
end

local function refresh(G, force)
    if not G or G.minimized then return end
    if G.tab == "PARRY" then
        renderParry(G)                      -- ranks evolve live, always redraw
    elseif G.tab == "LOGS" then
        if force or G._lastRingN ~= #S.ring then  -- only rebuild when the feed grew
            G._lastRingN = #S.ring
            renderLogs(G)
        end
    else
        if force or not G._infoDrawn then
            G._infoDrawn = true
            renderInfo(G)
        end
    end
end

local function setTab(G, name)
    G.tab = name
    G._infoDrawn = false
    G._lastRingN = nil
    for n, b in pairs(G.tabBtns) do
        b.BackgroundColor3 = (n == name) and CLR.tabOn or CLR.tab
    end
    refresh(G, true)
end

local function setCapture(G, on)
    S.capturing = on
    if on then S.captureT = os.clock() end
    G.startBtn.Text = on and "CAPTURING…" or "START CAPTURE"
    G.startBtn.BackgroundColor3 = on and CLR.tab or CLR.green
    G.stopBtn.Text = on and "STOP CAPTURE" or "STOPPED"
    G.stopBtn.BackgroundColor3 = on and CLR.red or CLR.tab
end

--==================================================================--
-- wire up + hooks
--==================================================================--
S.gui = buildGui()
local G = S.gui

if G then
    setTab(G, "PARRY")
    setCapture(G, false)
    for name, b in pairs(G.tabBtns) do b.Activated:Connect(function() setTab(G, name) end) end
    G.startBtn.Activated:Connect(function() setCapture(G, true);  refresh(G) end)
    G.stopBtn.Activated:Connect(function() setCapture(G, false); S.armed = false; refresh(G) end)
    G.parryBtn.Activated:Connect(function()
        if arm() then
            G.parryBtn.Text = "ARMED: PARRY NOW"
            task.delay(CONFIG.windowSec, function()
                if G and G.parryBtn then G.parryBtn.Text = "PARRY CAPTURE" end
                refresh(G)
            end)
        else
            G.parryBtn.Text = "start capture first"
            task.delay(1, function() if G and G.parryBtn then G.parryBtn.Text = "PARRY CAPTURE" end end)
        end
    end)
    G.clearBtn.Activated:Connect(function()
        S.sessions, S.perKey, S.ring, S.totalFires, S.armed = {}, {}, {}, 0, false
        S._lastTopKey = nil
        refresh(G, true)
    end)
    local function toggleMin()
        G.minimized = not G.minimized
        for _, c in ipairs(G.win:GetChildren()) do
            if c:IsA("ScrollingFrame") or (c:IsA("Frame") and c.BackgroundTransparency == 1)
               or c == G.startBtn or c == G.stopBtn or c == G.parryBtn or c == G.clearBtn or c == G.minBtn2 then
                c.Visible = not G.minimized
            end
        end
        G.win.Size = G.minimized and UDim2.fromOffset(380, 30) or UDim2.fromOffset(380, 330)
        if not G.minimized then refresh(G) end
    end
    G.minBtn.Activated:Connect(toggleMin)
    G.minBtn2.Activated:Connect(toggleMin)
end

-- namecall: remote:FireServer(...) / remote:InvokeServer(...)
local oldNamecall
oldNamecall = hookmetamethod(game, "__namecall", newcclosure(function(self, ...)
    local m = getnamecallmethod()
    if not checkcaller() and (m == "FireServer" or m == "InvokeServer" or m == "fireServer" or m == "invokeServer") then
        record(self, m, table.pack(...))
    end
    return oldNamecall(self, ...)
end))

-- direct closure: remote.FireServer(remote, ...) — separate path, no double count
if hookfunction then
    pcall(function()
        local re = Instance.new("RemoteEvent")
        local oldFire
        oldFire = hookfunction(re.FireServer, newcclosure(function(self, ...)
            if not checkcaller() then record(self, "FireServer", table.pack(...)) end
            return oldFire(self, ...)
        end))
        re:Destroy()
        local rf = Instance.new("RemoteFunction")
        local oldInv
        oldInv = hookfunction(rf.InvokeServer, newcclosure(function(self, ...)
            if not checkcaller() then record(self, "InvokeServer", table.pack(...)) end
            return oldInv(self, ...)
        end))
        rf:Destroy()
    end)
end

-- refresh / window-close loop
local acc = 0
RunService.Heartbeat:Connect(function(dt)
    closeWindowIfDue()
    acc += dt
    if acc >= CONFIG.refreshSec then
        acc = 0
        if S.enabled and G and not G.minimized then refresh(G) end
    end
end)

print("[ParrySpy] V3.2 armed. START CAPTURE → PARRY CAPTURE → parry. Re-run to hide/show the window.")
