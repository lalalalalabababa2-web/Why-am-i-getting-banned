--[[
    Auto Dribble + Auto GK v5.1 - Blue Lock: Rivals (mobile)
    Roblox Luau, run through an executor (Delta / Codex / Arceus X on Android).

    DRIBBLE  While you have the ball, dribbles the same frame it sees an enemy about to reach you
             (ping-compensated, slides and dashes included), or one starting a move right next to you.
    AUTO GK  Dives at shots heading into your goal at the last moment, smothers enemies dribbling
             right at you, and steps toward the ball's side of goal while your thumb is off the
             joystick. Turn it on standing in your goal. Dribble pauses while it's on.

    How it presses: it finds the game's own "Dive" / "Dribble" button (by its label or its name) and
    tries, in order: running the button's code (BTN), a virtual second finger on it (TAP), having the
    executor fire its signals (SIG), Q into the game's input code (KEY), a virtual Q key (VKEY), a
    virtual click on the button (CLICK). At startup it checks which of those your executor allows and
    skips the ones it blocks. After every press it checks you really moved, and switches by itself
    when you didn't.

    Pills: tap = on/off, drag = move both (they stay on screen).
           hold ~1s and let go, then tap the game's button = force that button
           hold ~1s and let go, then tap the same pill = forget the forced button
    Red = off, green = on, amber = on but no ball found, grey = paused, blue = waiting for your tap.

    The black box under the pills is a live readout (Debug = false hides it):
      line 1  what your executor allows (Y = works, n = blocked, ? = not tried yet)
      line 2  the ball and the nearest enemy (distance, and seconds until they reach you)
      line 3  the last press: which move, whether it found the game's button, the method, OK / miss
]]

local CFG = {
    Key          = Enum.KeyCode.Q, -- the dribble key, which is also the keeper's dive
    Labels       = { dribble = "dribble", dive = "dive" }, -- the text on the game's buttons
    BallNames    = { Football = true, Ball = true, SoccerBall = true },
    HoldDist     = 5,      -- the nearest player within this of the ball (studs) has it
    Debug        = true,   -- the live readout under the pills
    EngineInput  = true,   -- allow the virtual Q key and click as last resorts

    -- dribble
    ScanDist     = 40,     -- watch enemies this far out (dashes close fast)
    Reach        = 4,      -- roughly how far a tackle reaches
    ReactTime    = 0.2,    -- dribble this long before an enemy is in reach, plus your ping
    MinClosing   = 6,      -- studs/s toward you; slower than this isn't a run at you
    TackleDist   = 12,     -- dribble when an enemy this close starts a move or a tackle animation
    TackleWords  = { "tackle", "steal", "slide" },
    Cooldown     = 0.5,    -- retry gap, in case the game's own cooldown swallowed a press

    -- keeper
    ShotSpeed    = 45,     -- studs/s; slower balls are passes and rolls
    ShotAim      = 0.5,    -- how much of its speed must head into the goal (1 = straight in, 0.5 = 60 deg)
    GoalWidth    = 25,     -- it must cross your goal line this close to your spot
    DiveRange    = 35,     -- dive at shots passing this close to you
    DiveLead     = 0.2,    -- dive this long before the ball arrives, plus ping and travel time
    DiveSpeed    = 60,     -- roughly how fast a dive covers ground (studs/s)
    Smother      = 7,      -- dive at an enemy carrying the ball this close (0 = never)
    Positioning  = true,   -- step toward the ball's side of goal while your thumb is off the stick
    Advance      = 6,      -- furthest you step off your spot toward the ball
    DiveCooldown = 0.6,

    LongPress    = 0.7,    -- hold a pill this long to force one of the game's buttons
    SaveFile     = "AutoDribble_buttons.json",
}

local Players     = game:GetService("Players")
local RunService  = game:GetService("RunService")
local UIS         = game:GetService("UserInputService")
local CAS         = game:GetService("ContextActionService")
local GuiService  = game:GetService("GuiService")
local HttpService = game:GetService("HttpService")
local okVim, VIM  = pcall(function() return game:GetService("VirtualInputManager") end)
if not okVim then VIM = nil end

local LP  = Players.LocalPlayer
local env = (getgenv and getgenv()) or _G

-- running the script again replaces the old copy instead of stacking two
if env.AutoDribbleStop then env.AutoDribbleStop() end

local conns, mine = {}, setmetatable({}, { __mode = "k" }) -- our handlers, never fired as the game's
local function bind(signal, fn)
    mine[fn] = true
    local c = signal:Connect(fn)
    table.insert(conns, c)
    return c
end

local on = { dribble = false, dive = false }
local learning -- nil, "dribble" or "dive"
local lastDribble, lastDive, diveUntil = -math.huge, -math.huge, -math.huge
local ballFound, stickIdle = false, true
local home, lastRoot -- the keeper's spot in goal, and last frame's position (teleport check)
local fieldDir       -- flat direction from your goal out to the pitch
local fieldExact     -- true when it came from the pitch itself, not guessed from the ball
local fieldSum, fieldN = Vector3.zero, 0 -- running average of where play happens, seen from your spot
local lastInput      -- a real InputObject, for ContextActionService handlers that expect one
local caps = { conn = false, sig = false, touch = nil, key = nil } -- what the executor allows
local dbg = { last = "no press yet" }

---------------------------------------------------------------- UI

local COLORS = {
    off    = Color3.fromRGB(150, 45, 45),
    on     = Color3.fromRGB(40, 150, 70),
    noBall = Color3.fromRGB(190, 140, 30),
    paused = Color3.fromRGB(90, 90, 90),
    learn  = Color3.fromRGB(45, 110, 200),
    hit    = Color3.fromRGB(235, 235, 235),
}
local WHITE, BLACK = Color3.new(1, 1, 1), Color3.new(0, 0, 0)
local NAMES = { dribble = "DRIBBLE", dive = "AUTO GK" }
local MOVES = { dribble = "DRIBBLE", dive = "DIVE" }
local DONE  = { dribble = "DRIBBLED", dive = "DIVED" }

local screen = Instance.new("ScreenGui")
screen.Name = "AutoDribble"
screen.ResetOnSpawn = false
screen.IgnoreGuiInset = true
screen.DisplayOrder = 999
if not pcall(function() screen.Parent = (gethui and gethui()) or game:GetService("CoreGui") end) then
    screen.Parent = LP:WaitForChild("PlayerGui")
end

local bar = Instance.new("Frame")
bar.Size = CFG.Debug and UDim2.fromOffset(220, 100) or UDim2.fromOffset(104, 60)
bar.Position = UDim2.new(0, 16, 0.35, 0)
bar.BackgroundTransparency = 1
bar.Parent = screen

local function makePill(y)
    local b = Instance.new("TextButton")
    b.Size = UDim2.fromOffset(104, 28)
    b.Position = UDim2.fromOffset(0, y)
    b.AutoButtonColor = false
    b.BackgroundTransparency = 0.15
    b.Font = Enum.Font.GothamBold
    b.TextSize = 11
    b.TextColor3 = WHITE
    b.Parent = bar
    Instance.new("UICorner", b).CornerRadius = UDim.new(0, 8)
    return b
end
local pills = { dribble = makePill(0), dive = makePill(32) }

local info = Instance.new("TextLabel")
info.Size = UDim2.fromOffset(220, 36)
info.Position = UDim2.fromOffset(0, 64)
info.BackgroundColor3 = BLACK
info.BackgroundTransparency = 0.35
info.TextColor3 = WHITE
info.Font = Enum.Font.Code
info.TextSize = 10
info.TextXAlignment = Enum.TextXAlignment.Left
info.TextYAlignment = Enum.TextYAlignment.Top
info.Text = ""
info.Visible = CFG.Debug
info.Parent = bar
Instance.new("UICorner", info).CornerRadius = UDim.new(0, 6)

local function paint(kind)
    local pill = pills[kind]
    pill.TextColor3 = WHITE
    if learning == kind then
        pill.Text, pill.BackgroundColor3 = "TAP " .. MOVES[kind], COLORS.learn
    elseif not on[kind] then
        pill.Text, pill.BackgroundColor3 = NAMES[kind] .. " OFF", COLORS.off
    elseif kind == "dribble" and on.dive then
        pill.Text, pill.BackgroundColor3 = "DRIBBLE PAUSED", COLORS.paused
    else
        pill.Text, pill.BackgroundColor3 = NAMES[kind] .. " ON", ballFound and COLORS.on or COLORS.noBall
    end
end

-- a pill showing a short message keeps it until its own timer runs out
local msgGen, msgOn = { dribble = 0, dive = 0 }, { dribble = false, dive = false }

local function refresh()
    for kind in pairs(pills) do
        if not msgOn[kind] then paint(kind) end
    end
end

local function say(kind, text, bg, fg, secs)
    msgGen[kind] += 1
    local gen = msgGen[kind]
    msgOn[kind] = true
    local pill = pills[kind]
    pill.Text, pill.BackgroundColor3, pill.TextColor3 = text, bg, fg
    task.delay(secs, function()
        if msgGen[kind] == gen then
            msgOn[kind] = false
            paint(kind)
        end
    end)
end

local function hush(kind)
    msgGen[kind] += 1
    msgOn[kind] = false
end

local function flash(kind, text) say(kind, text, COLORS.hit, BLACK, 0.6) end
local function notify(kind, text, bg) say(kind, text, bg, WHITE, 1) end

---------------------------------------------------------------- ball

local balls, tracks = {}, {}
local function addBall(inst)
    if inst:IsA("BasePart") and CFG.BallNames[inst.Name] then
        balls[inst] = true
    end
end
for _, d in ipairs(workspace:GetDescendants()) do addBall(d) end
bind(workspace.DescendantAdded, addBall)

local function nearestBall(from)
    local best, bestD
    for ball in pairs(balls) do
        if not ball:IsDescendantOf(workspace) then
            balls[ball], tracks[ball] = nil, nil
        else
            local d = (ball.Position - from).Magnitude
            if not best or d < bestD then best, bestD = ball, d end
        end
    end
    return best
end

local function holderOf(ball)
    local best, bestD
    for _, p in ipairs(Players:GetPlayers()) do
        local c = p.Character
        if c then
            if ball:IsDescendantOf(c) then return p end
            local r = c:FindFirstChild("HumanoidRootPart")
            local d = r and (ball.Position - r.Position).Magnitude
            if d and d <= CFG.HoldDist and (not best or d < bestD) then best, bestD = p, d end
        end
    end
    return best
end

-- Velocity comes from physics when the ball has it, otherwise from how far it moved.
-- Acceleration is measured, not assumed, so straight power shots, curves and lobs all predict.
local function updateTrack(ball, dt)
    local now, pos = os.clock(), ball.Position
    local s = tracks[ball]
    if not s then
        s = { pos = pos, vel = ball.AssemblyLinearVelocity, acc = Vector3.zero, hist = {},
              physAt = -math.huge, kickAt = -math.huge }
        tracks[ball] = s
    end
    local phys = ball.AssemblyLinearVelocity
    if phys.Magnitude > 0.5 then s.physAt = now end
    if dt > 0 and (pos - s.pos).Magnitude / dt > 1500 then
        -- no shot is that fast: the ball was reset (kickoff, after a goal), not kicked
        s.hist, s.vel, s.acc, s.pos = {}, phys, Vector3.zero, pos
    end
    -- the last ~0.05s of positions: a ball the server moves by hand updates in bursts,
    -- so frame-to-frame steps are too jumpy to read a speed from
    table.insert(s.hist, { now, pos })
    while #s.hist > 2 and now - s.hist[2][1] >= 0.05 do table.remove(s.hist, 1) end
    if dt <= 0 then return s end
    local old = s.hist[1]
    local vel = phys
    -- only a ball with no physics velocity for a while is one the server moves by hand;
    -- a physics ball that just stopped dead would read as a burst of speed from its history
    local byHand = now - s.physAt > 0.1
    if byHand then
        vel = now > old[1] and (pos - old[2]) / (now - old[1]) or s.vel
    end
    local dv = vel - s.vel
    if dv.Magnitude > (byHand and 8 or 25) then
        -- a kick or a hard bounce: the old forces no longer apply
        s.acc, s.kickAt = Vector3.zero, now
    elseif not byHand or now - s.kickAt > 0.15 then
        -- a hand-moved ball's speed ramps in across the window after a kick; that ramp
        -- isn't acceleration, so its reading waits until the window has caught up
        local a = dv / dt
        if a.Magnitude > 250 then a = a.Unit * 250 end
        s.acc = s.acc:Lerp(a, 0.3)
    end
    s.pos, s.vel = pos, vel
    return s
end

---------------------------------------------------------------- players

local ACTION = {} -- animation priorities moves play at (walking and idling sit below these)
for _, name in ipairs({ "Action", "Action2", "Action3", "Action4" }) do
    local ok, item = pcall(function() return Enum.AnimationPriority[name] end)
    if ok and item then ACTION[item] = true end
end

local function teamOf(p) return p.Team or p:GetAttribute("Team") end

local function isEnemy(p)
    if p == LP then return false end
    local mine_, theirs = teamOf(LP), teamOf(p)
    if mine_ == nil or theirs == nil then return true end
    return mine_ ~= theirs
end

local function tackling(hum)
    local animator = hum:FindFirstChildOfClass("Animator")
    if not animator then return false end
    for _, t in ipairs(animator:GetPlayingAnimationTracks()) do
        local name = (t.Name .. " " .. (t.Animation and t.Animation.Name or "")):lower()
        for _, word in ipairs(CFG.TackleWords) do
            if name:find(word, 1, true) then return true end
        end
    end
    return false
end

local function flat(v) return Vector3.new(v.X, 0, v.Z) end

local motion   = setmetatable({}, { __mode = "k" }) -- root -> { hist, vel } measured from movement
local moveSeen = setmetatable({}, { __mode = "k" }) -- animator -> move tracks playing last frame
local moveAt   = setmetatable({}, { __mode = "k" }) -- player -> when a new move animation started

-- every frame, for everyone else on the server
local function trackPlayers()
    local now = os.clock()
    for _, p in ipairs(Players:GetPlayers()) do
        local c = p ~= LP and p.Character
        local r = c and c:FindFirstChild("HumanoidRootPart")
        if r then
            -- speed from movement too: a slide or dash moved by CFrame has no physics velocity.
            -- Read over the last ~0.05s, sliding every frame, so it's both steady and quick.
            local m = motion[r]
            if not m then
                m = { hist = {}, vel = Vector3.zero }
                motion[r] = m
            end
            table.insert(m.hist, { now, r.Position })
            while #m.hist > 2 and now - m.hist[2][1] >= 0.05 do table.remove(m.hist, 1) end
            local old = m.hist[1]
            if now > old[1] then
                local v = (r.Position - old[2]) / (now - old[1])
                m.vel = v.Magnitude < 400 and v or Vector3.zero -- faster than that was a teleport
            end
            -- any move animation starting, whatever the game calls it: steals, tackles, slides
            local h = c:FindFirstChildOfClass("Humanoid")
            local animator = h and h:FindFirstChildOfClass("Animator")
            if animator then
                local was, now_ = moveSeen[animator], {}
                for _, t in ipairs(animator:GetPlayingAnimationTracks()) do
                    if ACTION[t.Priority] then
                        now_[t] = true
                        if was and not was[t] then moveAt[p] = now end
                    end
                end
                moveSeen[animator] = now_
            end
        end
    end
end

local function velocityOf(r)
    local m, phys = motion[r], r.AssemblyLinearVelocity
    if m and m.vel.Magnitude > phys.Magnitude then return m.vel end
    return phys
end

-- What you see of other players is about one round trip behind where the server has them,
-- so every timing check adds your ping on top of its window.
local function ping()
    local ok, p = pcall(function() return LP:GetNetworkPing() end)
    return (ok and type(p) == "number") and math.clamp(p, 0, 0.4) or 0.1
end

local function threatened(root, lead)
    local myPos, myVel, now = root.Position, root.AssemblyLinearVelocity, os.clock()
    for _, p in ipairs(Players:GetPlayers()) do
        local char = p.Character
        local r = char and char:FindFirstChild("HumanoidRootPart")
        local h = char and char:FindFirstChildOfClass("Humanoid")
        if r and h and h.Health > 0 and isEnemy(p) then
            local off = flat(myPos - r.Position) -- enemy -> me
            local dist = off.Magnitude
            if dist > 0 and dist < CFG.ScanDist then
                -- how fast they're closing the gap, and how long until they're in tackle reach
                local closing = flat(velocityOf(r) - myVel):Dot(off.Unit)
                if closing > CFG.MinClosing and (dist - CFG.Reach) / closing <= CFG.ReactTime + lead then
                    return true
                end
                if dist < CFG.TackleDist and (tackling(h) or now - (moveAt[p] or -math.huge) < 0.3) then
                    return true
                end
            end
        end
    end
    return false
end

-- for the readout: the nearest enemy, and how many seconds until they're in reach
local function nearestFoe(root)
    local best, eta
    for _, p in ipairs(Players:GetPlayers()) do
        local c = isEnemy(p) and p.Character
        local r = c and c:FindFirstChild("HumanoidRootPart")
        if r then
            local off = flat(root.Position - r.Position)
            local d = off.Magnitude
            if d > 0 and (not best or d < best) then
                local closing = flat(velocityOf(r) - root.AssemblyLinearVelocity):Dot(off.Unit)
                best, eta = d, closing > CFG.MinClosing and math.max(0, (d - CFG.Reach) / closing) or nil
            end
        end
    end
    return best, eta
end

---------------------------------------------------------------- the game's buttons

local saved = {} -- kind -> { path = {names from PlayerGui down}, obj = Instance? }, forced by hand
local found = {} -- kind -> { by = object that matched, button = button }

local function playerGui() return LP:FindFirstChildOfClass("PlayerGui") end

-- on screen: every frame above it visible and its ScreenGui enabled
local function shown(obj)
    local cur = obj
    while cur and not cur:IsA("PlayerGui") do
        if cur:IsA("GuiObject") and not cur.Visible then return false end
        if cur:IsA("ScreenGui") and not cur.Enabled then return false end
        cur = cur.Parent
    end
    return cur ~= nil
end

-- a text that reads exactly "Dive" / "Dribble", or a button named after it
local function names(obj, kind)
    local want = CFG.Labels[kind]
    if obj:IsA("TextLabel") or obj:IsA("TextButton") then
        local text = obj.Text:lower():gsub("%s", "")
        if text == want then return true end
    end
    return obj:IsA("GuiButton") and obj.Name:lower():find(want, 1, true) ~= nil
end

local function buttonFor(obj)
    if obj:IsA("GuiButton") then return obj end
    local b = obj:FindFirstAncestorWhichIsA("GuiButton")
    if b then return b end
    -- a sibling button the label sits on; failing that, the only one beside it. Any button in a
    -- shared row could be Shoot, so with several and none under the label it takes none of them.
    local c = obj.AbsolutePosition + obj.AbsoluteSize / 2
    local only, count = nil, 0
    for _, sib in ipairs(obj.Parent:GetChildren()) do
        if sib:IsA("GuiButton") and shown(sib) then
            local p, s = sib.AbsolutePosition, sib.AbsoluteSize
            if c.X >= p.X and c.X <= p.X + s.X and c.Y >= p.Y and c.Y <= p.Y + s.Y then return sib end
            only, count = sib, count + 1
        end
    end
    if count == 1 then return only end
    -- no button object at all, just an image with its own touch code: the finger and the click
    -- only need the spot, and the label sits on it
    return obj
end

local function byLabel(kind)
    local pg = playerGui()
    if not pg then return nil end
    local hit = found[kind]
    if hit and not hit.bare and hit.by:IsDescendantOf(pg) and names(hit.by, kind) and shown(hit.by) then
        return hit.button
    end
    -- a label on a button first (it's what you see), then a button named after the move, and only
    -- then a bare label with no button object at all, so a "Dribble" hint elsewhere never wins
    local byName, bare
    for _, d in ipairs(pg:GetDescendants()) do
        if (d:IsA("GuiObject")) and not d:IsDescendantOf(screen) and names(d, kind) and shown(d) then
            local isText = d:IsA("TextLabel") or d:IsA("TextButton")
            local b = buttonFor(d)
            local labelled = isText and d.Text:lower():gsub("%s", "") == CFG.Labels[kind]
            if labelled and b:IsA("GuiButton") then
                found[kind] = { by = d, button = b }
                return b
            elseif not labelled then
                byName = byName or { by = d, button = b }
            else
                bare = bare or { by = d, button = b, bare = true }
            end
        end
    end
    found[kind] = byName or bare
    return found[kind] and found[kind].button
end

local function save()
    local data = {}
    for kind, t in pairs(saved) do data[kind] = t.path end
    pcall(writefile, CFG.SaveFile, HttpService:JSONEncode(data))
end

local function setTarget(kind, obj)
    local pg = playerGui()
    local path, cur = {}, obj
    while cur and cur ~= pg do
        table.insert(path, 1, cur.Name)
        cur = cur.Parent
    end
    saved[kind] = { path = path, obj = obj }
    save()
end

local function clearTarget(kind)
    saved[kind] = nil
    save()
end

-- the game can rebuild its HUD (respawn, new match), so re-find a forced button by its path
local function getTarget(kind)
    local t, pg = saved[kind], playerGui()
    if not (t and pg) then return nil end
    if t.obj and t.obj:IsDescendantOf(pg) then return t.obj end
    local cur = pg
    for _, name in ipairs(t.path) do
        cur = cur:FindFirstChild(name)
        if not cur then return nil end
    end
    t.obj = cur
    return cur
end

pcall(function()
    for kind, path in pairs(HttpService:JSONDecode(readfile(CFG.SaveFile))) do
        if NAMES[kind] and type(path) == "table" and #path > 0 then saved[kind] = { path = path } end
    end
end)

---------------------------------------------------------------- pressing

-- a field of a connection getconnections handed back; some executors' connections throw on
-- fields they don't have instead of returning nil
local function field(k, name)
    local ok, v = pcall(function() return k[name] end)
    if ok then return v end
    return nil
end

-- What runs a game connection: its function, or its own Fire on executors that keep the function
-- hidden. Nothing for one that's switched off, lives in another Lua state, or is the engine's own.
local function runner(k)
    if field(k, "ForeignState") or field(k, "LuaConnection") == false or field(k, "Enabled") == false then
        return nil
    end
    local fn = field(k, "Function")
    if type(fn) == "function" then return fn end
    local fireFn = field(k, "Fire")
    if type(fireFn) == "function" then
        return function(...) return fireFn(k, ...) end
    end
    return nil
end

-- Runs the game's own Lua functions connected to a signal, skipping ours.
-- Returns how many ran; nothing passes through Roblox's input system.
local function fire(signal, ...)
    local ok, list = pcall(getconnections, signal)
    if not ok or type(list) ~= "table" then return 0 end
    local n = 0
    for _, c in ipairs(list) do
        local fn = runner(c)
        if fn and not mine[fn] then
            task.spawn(pcall, fn, ...)
            n += 1
        end
    end
    return n
end

local SIGNALS = { "InputBegan", "InputEnded", "MouseButton1Down", "MouseButton1Up",
                  "MouseButton1Click", "Activated", "TouchTap" }

-- how many of the game's functions listen to this object; zero means there's nothing to run
local function listenerCount(obj)
    local n = 0
    for _, name in ipairs(SIGNALS) do
        local ok, list = pcall(function() return getconnections(obj[name]) end)
        if ok and type(list) == "table" then
            for _, c in ipairs(list) do
                local fn = runner(c)
                if fn and not mine[fn] then n += 1 end
            end
        end
    end
    return n
end

local TOUCH_ID = 271828

-- What this executor actually allows, tried on things of our own so nothing in the game moves.
local function probe()
    caps.conn, caps.sig = false, false
    local function test(start, set)
        local ok, be = pcall(Instance.new, "BindableEvent")
        if not (ok and be) then return end
        local hit = false
        local c = be.Event:Connect(function() hit = true end)
        pcall(start, be.Event)
        task.delay(0.2, function() -- some executors run it right away, some a frame later
            set(hit)
            c:Disconnect()
            be:Destroy()
        end)
    end
    -- getconnections: run what it hands back instead of comparing it to ours. Some executors hand
    -- back a wrapped copy, which never equals the original but runs just the same.
    test(function(signal)
        for _, k in ipairs(getconnections(signal)) do
            local fn = runner(k)
            if fn then fn() end
        end
    end, function(v) caps.conn = v end)
    if type(firesignal) == "function" then
        test(firesignal, function(v) caps.sig = v end)
    end
    -- an "up" for a finger that never touched down does nothing, but shows the call is allowed
    caps.touch = VIM ~= nil and pcall(function() VIM:SendTouchEvent(TOUCH_ID, 2, -1, -1) end)
end

local function fakeInput(inputType, keyCode, state, pos)
    return {
        UserInputType = inputType,
        KeyCode = keyCode,
        UserInputState = state,
        Position = pos or Vector3.zero,
        Delta = Vector3.zero,
        IsModifierKeyDown = function() return false end,
    }
end

-- the signals a real tap on a button fires, in the same order, each handed to `send`
local function tapSignals(b, send)
    local T, none = Enum.UserInputType.Touch, Enum.KeyCode.Unknown
    local c = b.AbsolutePosition + b.AbsoluteSize / 2
    local pos = Vector3.new(c.X, c.Y, 0)
    local isButton = b:IsA("GuiButton")
    send(b.InputBegan, fakeInput(T, none, Enum.UserInputState.Begin, pos))
    if isButton then send(b.MouseButton1Down, c.X, c.Y) end
    task.delay(0.03, function()
        local up = fakeInput(T, none, Enum.UserInputState.End, pos)
        send(b.InputEnded, up)
        if isButton then
            send(b.MouseButton1Up, c.X, c.Y)
            send(b.MouseButton1Click)
            send(b.Activated, up, 1)
            send(b.TouchTap, { c })
        end
    end)
end

-- where the button is on the actual screen, for the virtual finger and mouse
local function screenCentre(b)
    local sg = b:FindFirstAncestorWhichIsA("ScreenGui")
    local inset = (sg and not sg.IgnoreGuiInset) and GuiService:GetGuiInset() or Vector2.zero
    return b.AbsolutePosition + b.AbsoluteSize / 2 + inset
end

-- BTN: run the button's own functions
local function pressButton(b)
    if not caps.conn or listenerCount(b) == 0 then return false end
    tapSignals(b, fire)
    return true
end

-- TAP: a second finger on the button through Roblox's input system. It's still a touch,
-- so the joystick keeps its own finger and nothing flips into keyboard mode.
-- Tried on every press whatever the startup check said: a refused call costs nothing.
local function tapButton(b)
    if not VIM then return false end
    local c = screenCentre(b)
    caps.touch = pcall(function() VIM:SendTouchEvent(TOUCH_ID, 0, c.X, c.Y) end) -- Begin
    if not caps.touch then return false end
    task.delay(0.05, function()
        pcall(function() VIM:SendTouchEvent(TOUCH_ID, 2, c.X, c.Y) end) -- End
    end)
    return true
end

-- SIG: the executor fires the button's signals itself, for when it won't hand over the functions
local function sigButton(b)
    if not caps.sig then return false end
    tapSignals(b, function(signal, ...) pcall(firesignal, signal, ...) end)
    return true
end

-- KEY: Q straight into the game's InputBegan listeners and its ContextActionService binding.
-- The binding needs no getconnections (CallFunction runs it), so it's tried even when that's blocked.
-- An action named after the move wins; otherwise every action bound to Q.
local function casCall(kind, state)
    local n = 0
    pcall(function()
        local all, picked = CAS:GetAllBoundActionInfo(), {}
        for name in pairs(all) do
            if tostring(name):lower():find(CFG.Labels[kind], 1, true) then table.insert(picked, name) end
        end
        if #picked == 0 then
            for name, info_ in pairs(all) do
                if type(info_.inputTypes) == "table" and table.find(info_.inputTypes, CFG.Key) then
                    table.insert(picked, name)
                end
            end
        end
        for _, name in ipairs(picked) do
            CAS:CallFunction(name, state, lastInput)
            n += 1
        end
    end)
    return n
end

local function pressKey(kind)
    local K = Enum.UserInputType.Keyboard
    local n = caps.conn and fire(UIS.InputBegan, fakeInput(K, CFG.Key, Enum.UserInputState.Begin), false) or 0
    n += casCall(kind, Enum.UserInputState.Begin)
    if n == 0 then return false end
    task.delay(0.03, function()
        if caps.conn then fire(UIS.InputEnded, fakeInput(K, CFG.Key, Enum.UserInputState.End), false) end
        casCall(kind, Enum.UserInputState.End)
    end)
    return true
end

-- VKEY / CLICK: real virtual input. Last resorts: a keyboard or mouse event can make some games
-- switch their buttons to PC layout for a moment, until your next touch.
local function vkey()
    if not (VIM and CFG.EngineInput) then return false end
    caps.key = pcall(function() VIM:SendKeyEvent(true, CFG.Key, false, game) end)
    if not caps.key then return false end
    task.delay(0.03, function()
        pcall(function() VIM:SendKeyEvent(false, CFG.Key, false, game) end)
    end)
    return true
end

local function clickButton(b)
    if not (VIM and CFG.EngineInput) then return false end
    local c = screenCentre(b)
    if not pcall(function() VIM:SendMouseButtonEvent(c.X, c.Y, 0, true, game, 0) end) then return false end
    task.delay(0.03, function()
        pcall(function() VIM:SendMouseButtonEvent(c.X, c.Y, 0, false, game, 0) end)
    end)
    return true
end

local function playingSet(hum)
    local set, animator = {}, hum:FindFirstChildOfClass("Animator")
    if animator then
        for _, t in ipairs(animator:GetPlayingAnimationTracks()) do set[t] = true end
    end
    return set, animator
end

-- Did the move really happen? A new move-priority animation, or a lunge you can't walk.
local function verify(root, hum, before, speed0, done)
    local _, animator = playingSet(hum)
    local limit = math.max(speed0 + 20, 30)
    local t0 = os.clock()
    local lastP, lastT = root.Position, t0
    while os.clock() - t0 < 0.45 do
        task.wait()
        if animator then
            for _, t in ipairs(animator:GetPlayingAnimationTracks()) do
                if not before[t] and ACTION[t.Priority] then return done(true) end
            end
        end
        -- a lunge the game moves by CFrame has no physics speed, so it's read from position too;
        -- without that, a method that works would count as a miss and get dropped
        local now, speed = os.clock(), flat(root.AssemblyLinearVelocity).Magnitude
        if now - lastT >= 0.05 then
            speed = math.max(speed, flat(root.Position - lastP).Magnitude / (now - lastT))
            lastP, lastT = root.Position, now
        end
        if speed > limit then return done(true) end
    end
    done(false)
end

-- Which way works is per move. Start at the top; after misses move down the list.
-- One confirmed hit locks a method in; it only moves on again after a run of misses.
local METHODS = { "BTN", "TAP", "SIG", "KEY", "VKEY", "CLICK" }
local method = { dribble = { i = 1, misses = 0, sure = false }, dive = { i = 1, misses = 0, sure = false } }

local function attempt(how, b, kind)
    if how == "BTN" then return b ~= nil and pressButton(b) end
    if how == "TAP" then return b ~= nil and tapButton(b) end
    if how == "SIG" then return b ~= nil and sigButton(b) end
    if how == "KEY" then return pressKey(kind) end
    if how == "VKEY" then return vkey() end
    return b ~= nil and clickButton(b)
end

local function result(kind, ok)
    local m = method[kind]
    dbg.last ..= ok and " OK" or " miss"
    if ok then
        m.misses, m.sure = 0, true
        notify(kind, DONE[kind], COLORS.on)
    else
        m.misses += 1
        if m.misses >= (m.sure and 4 or 2) then
            -- a method that had been working stopped: look again from the top
            m.i = m.sure and 1 or m.i % #METHODS + 1
            m.misses, m.sure = 0, false
        end
        notify(kind, "NO " .. MOVES[kind], COLORS.noBall)
    end
end

local function trigger(kind, root, hum)
    local b = getTarget(kind) or byLabel(kind)
    local before = playingSet(hum)
    local speed0 = flat(root.AssemblyLinearVelocity).Magnitude
    local m = method[kind]
    -- "label" = found only the text, no button object: the finger and click can still hit it
    local seen = b and (b:IsA("GuiButton") and "yes" or "label") or "NO"
    for k = 0, #METHODS - 1 do
        local i = (m.i - 1 + k) % #METHODS + 1
        local how = METHODS[i]
        if attempt(how, b, kind) then
            m.i = i
            dbg.last = ("%s btn:%s via %s"):format(MOVES[kind], seen, how)
            flash(kind, MOVES[kind] .. ": " .. how)
            verify(root, hum, before, speed0, function(ok) result(kind, ok) end)
            return
        end
    end
    dbg.last = ("%s btn:%s nothing worked"):format(MOVES[kind], seen)
    say(kind, "NO BUTTON", COLORS.off, WHITE, 1.5)
end

---------------------------------------------------------------- learning a button

local learnConns = {}

local function stopLearning()
    for _, c in ipairs(learnConns) do c:Disconnect() end
    table.clear(learnConns)
    learning = nil
end

local function startLearning(kind)
    local pg = playerGui()
    if not pg then return end
    learning = kind
    hush(kind)
    refresh()

    local hits = {}
    local function finish()
        if learning ~= kind then return end
        stopLearning()
        -- buttons with the game's code behind them first, then the smallest thing tapped
        local best, bestScore
        for _, obj in ipairs(hits) do
            local score = (listenerCount(obj) > 0 and 0 or 1e9) + obj.AbsoluteSize.X * obj.AbsoluteSize.Y
            if not best or score < bestScore then best, bestScore = obj, score end
        end
        if best then
            setTarget(kind, best)
            notify(kind, "SAVED", COLORS.on)
        else
            notify(kind, "NOT FOUND", COLORS.noBall)
        end
    end

    local function watch(obj)
        if not (obj:IsA("GuiButton") or (obj:IsA("GuiObject") and obj.Active)) then return end
        if obj:IsDescendantOf(screen) then return end
        local touchGui = pg:FindFirstChild("TouchGui") -- Roblox's own joystick
        if touchGui and obj:IsDescendantOf(touchGui) then return end
        local function onTouch(input)
            local t = input.UserInputType
            if t ~= Enum.UserInputType.Touch and t ~= Enum.UserInputType.MouseButton1 then return end
            -- one tap hits every layer under the finger; collect them, then pick
            if #hits == 0 then task.delay(0.1, finish) end
            table.insert(hits, obj)
        end
        mine[onTouch] = true
        table.insert(learnConns, obj.InputBegan:Connect(onTouch))
    end

    for _, d in ipairs(pg:GetDescendants()) do watch(d) end
    mine[watch] = true
    table.insert(learnConns, pg.DescendantAdded:Connect(watch))
end

---------------------------------------------------------------- keeper

-- closest the ball's path gets to a point over the next second, with the ground as a floor
local function closestApproach(s, target)
    local floorY = target.Y - 2.2
    local bestT, bestD, bestP = 0, math.huge, s.pos
    for i = 0, 60 do
        local t = i / 60
        local p = s.pos + s.vel * t + s.acc * (0.5 * t * t)
        if p.Y < floorY then p = Vector3.new(p.X, floorY, p.Z) end
        local d = (p - target).Magnitude
        if d < bestD then bestT, bestD, bestP = t, d, p end
    end
    return bestT, bestD, bestP
end

local function dive(root, hum, at)
    lastDive = os.clock()
    diveUntil = lastDive + 1 -- let the dive play out before positioning again
    local look = Vector3.new(at.X, root.Position.Y, at.Z)
    if stickIdle and (look - root.Position).Magnitude > 0.5 then
        -- face and lean toward where the ball will be, in case the game aims the dive that way
        root.CFrame = CFrame.lookAt(root.Position, look)
        hum:Move((look - root.Position).Unit)
    end
    task.spawn(trigger, "dive", root, hum)
end

-- The pitch is usually one big part: its centre, straight below you, gives the exact direction
-- out of your goal.
local function pitchCentre(root)
    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = { LP.Character }
    local ok, hit = pcall(function() return workspace:Raycast(root.Position, Vector3.new(0, -60, 0), params) end)
    local part = ok and hit and hit.Instance
    if part and part:IsA("BasePart") and math.max(part.Size.X, part.Size.Z) >= 120 then
        return part.Position
    end
    return nil
end

-- A shot, not a pass across the box: heading into the goal and crossing its line near your spot.
-- Until the pitch direction is known, any fast ball coming at you counts.
local function onTarget(s)
    if not (home and fieldDir) then return true end
    local p, v = flat(s.pos - home), flat(s.vel)
    local closing = -v:Dot(fieldDir) -- speed toward the goal line
    if closing <= 0 or closing < CFG.ShotAim * v.Magnitude then return false end
    local tc = p:Dot(fieldDir) / closing
    if tc < 0 or tc > 1.5 then return false end
    local cross = p + v * tc
    return (cross - fieldDir * cross:Dot(fieldDir)).Magnitude <= CFG.GoalWidth
end

local function keeper(root, hum, ball, s, holder, lead)
    if holder == LP or os.clock() - lastDive < CFG.DiveCooldown then return end
    local myPos = root.Position
    if holder then
        -- 1v1: an enemy carrying the ball close enough to smother
        if CFG.Smother > 0 and isEnemy(holder) and (ball.Position - myPos).Magnitude <= CFG.Smother then
            dive(root, hum, ball.Position)
        end
        return
    end
    if s.vel.Magnitude < CFG.ShotSpeed or s.vel:Dot(myPos - s.pos) <= 0 or not onTarget(s) then return end
    local t, d, at = closestApproach(s, myPos)
    if d <= CFG.DiveRange and t <= CFG.DiveLead + lead + d / CFG.DiveSpeed then
        dive(root, hum, at)
    end
end

---------------------------------------------------------------- main loop

bind(UIS.InputBegan, function(input)
    if typeof(input) == "Instance" then lastInput = input end
end)

local function body()
    local char = LP.Character
    local root = char and char:FindFirstChild("HumanoidRootPart")
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    if root and hum then return root, hum end
    return nil
end

local nextInfo = 0
local function yn(v) return v == nil and "?" or (v and "Y" or "n") end
local function showInfo(root, ball, holder)
    if not CFG.Debug or os.clock() < nextInfo then return end
    nextInfo = os.clock() + 0.1
    local line1 = ("conn %s sig %s tap %s key %s"):format(yn(caps.conn), yn(caps.sig), yn(caps.touch), yn(caps.key))
    local line2 = "no ball"
    if ball then
        local who = holder == LP and "YOU" or holder and (isEnemy(holder) and "FOE" or "TEAM") or "free"
        line2 = ("ball %.0f %s"):format((ball.Position - root.Position).Magnitude, who)
    end
    local d, eta = nearestFoe(root)
    if d then line2 ..= (" | foe %.0f"):format(d) .. (eta and (" %.2fs"):format(eta) or "") end
    info.Text = line1 .. "\n" .. line2 .. "\n" .. dbg.last
end

bind(RunService.Heartbeat, function(dt)
    local root, hum = body()
    if not root then return end
    trackPlayers()

    -- keeper's spot: where you stood when you turned it on, re-set after any teleport (kickoff, reset)
    if on.dive and (not home or (lastRoot and (root.Position - lastRoot).Magnitude > 25)) then
        home = root.Position
        local centre = pitchCentre(root)
        local out = centre and flat(centre - home)
        fieldDir = (out and out.Magnitude > 10) and out.Unit or nil
        fieldExact = fieldDir ~= nil
        fieldSum, fieldN = Vector3.zero, 0
    end
    lastRoot = root.Position

    local ball = nearestBall(root.Position)
    if (ball ~= nil) ~= ballFound then
        ballFound = ball ~= nil
        refresh()
    end
    local holder = ball and holderOf(ball)
    showInfo(root, ball, holder)
    if not ball then return end
    if on.dive and home and not fieldExact then
        -- No pitch part to read: play happens out on the pitch, so the average direction of the
        -- ball and every other player from your spot is the way out of your goal. Nothing in
        -- front of you is ever behind the goal line, so anything back there is a ball that went
        -- out, not the pitch. Plain average at first, settling into a long memory.
        local function learn(pos)
            local out = flat(pos - home)
            if out.Magnitude > 30 and not (fieldDir and out:Dot(fieldDir) < 0) then
                fieldN = math.min(fieldN + 1, 20000)
                fieldSum = fieldSum * (1 - 1 / fieldN) + out.Unit / fieldN
            end
        end
        learn(ball.Position)
        for _, p in ipairs(Players:GetPlayers()) do
            local r = p ~= LP and p.Character and p.Character:FindFirstChild("HumanoidRootPart")
            if r then learn(r.Position) end
        end
        if fieldSum.Magnitude > 0.2 then fieldDir = fieldSum.Unit end
    end
    local s = updateTrack(ball, dt)
    if learning or not (on.dribble or on.dive) or UIS:GetFocusedTextBox() then return end

    local lead = ping()
    if on.dive then
        keeper(root, hum, ball, s, holder, lead)
    elseif on.dribble and holder == LP and os.clock() - lastDribble >= CFG.Cooldown and threatened(root, lead) then
        lastDribble = os.clock()
        task.spawn(trigger, "dribble", root, hum)
    end
end)

-- Positioning runs before physics. Roblox's ControlModule has already applied your joystick
-- for this frame by then, so MoveDirection here is your thumb, never our own last move.
bind(RunService.Stepped, function()
    local root, hum = body()
    if not root then return end
    stickIdle = hum.MoveDirection.Magnitude < 0.05
    if not (on.dive and CFG.Positioning and stickIdle and home) or learning or os.clock() < diveUntil then
        return
    end
    local ball = nearestBall(root.Position)
    if not ball or holderOf(ball) == LP then return end
    local toBall = flat(ball.Position - home)
    local spot = home
    if toBall.Magnitude > 0.1 then
        spot = home + toBall.Unit * math.min(CFG.Advance, toBall.Magnitude * 0.5)
    end
    local go = flat(spot - root.Position)
    if go.Magnitude > 1 then hum:Move(go.Unit) end
end)

---------------------------------------------------------------- pills: tap / hold / drag

local dragInput, dragKind, dragStart, startAbs, moved, pressedAt

for kind, pill in pairs(pills) do
    bind(pill.InputBegan, function(input)
        local t = input.UserInputType
        if t == Enum.UserInputType.Touch or t == Enum.UserInputType.MouseButton1 then
            dragInput, dragKind, dragStart, startAbs, moved = input, kind, input.Position, bar.AbsolutePosition, false
            pressedAt = os.clock()
        end
    end)
end

bind(UIS.InputChanged, function(input)
    if not dragInput then return end
    if input == dragInput or input.UserInputType == Enum.UserInputType.MouseMovement then
        local delta = input.Position - dragStart
        if delta.Magnitude > 6 then moved = true end
        if moved then
            -- kept fully on screen, so a pill can't end up half hidden behind the edge
            local area, size = screen.AbsoluteSize, bar.AbsoluteSize
            local x = math.clamp(startAbs.X + delta.X, 0, math.max(0, area.X - size.X))
            local y = math.clamp(startAbs.Y + delta.Y, 0, math.max(0, area.Y - size.Y))
            bar.Position = UDim2.fromOffset(x, y)
        end
    end
end)

bind(UIS.InputEnded, function(input)
    if not dragInput then return end
    if input ~= dragInput and input.UserInputType ~= Enum.UserInputType.MouseButton1 then return end
    dragInput = nil
    if moved then return end
    local kind = dragKind
    hush(kind)
    if learning then
        local was = learning
        stopLearning()
        if was == kind then
            clearTarget(kind)
            notify(kind, "CLEARED", COLORS.paused)
        else
            refresh()
        end
    elseif os.clock() - pressedAt >= CFG.LongPress then
        startLearning(kind)
    else
        on[kind] = not on[kind]
        if kind == "dive" then home = nil end -- re-anchor to where you're standing now
        refresh()
    end
end)

env.AutoDribbleStop = function()
    on.dribble, on.dive = false, false
    stopLearning()
    for _, c in ipairs(conns) do c:Disconnect() end
    screen:Destroy()
    env.AutoDribbleStop = nil
end

probe()
refresh()
