--[[
    Auto Dribble + Auto Tackle + Auto GK v10 - Blue Lock: Rivals (mobile)
    Roblox Luau, run through an executor (Delta / Codex / Arceus X on Android).

    DRIBBLE  While you have the ball, dribbles the moment an enemy is about to reach you or starts a
             tackle (ping-compensated, slides and dashes included). Dribble is a counter: a tackle
             that lands inside its protection window ankle-breaks the tackler. When a tackle comes
             while dribble is still cooling down, it flicks the ball over it instead (a jump with the
             ball, Space on PC).
    TACKLE   While an enemy has the ball, turns to where they'll be and slides once the slide reaches
             them. It never slides into an open dribble window (that's how you get ankle-broken), goes
             straight in while their dribble is cooling down, and otherwise waits until they're too
             close to react.
    AUTO GK  Dives at shots heading between your posts at the last moment, jumps for high balls close
             to you, walks across to slow balls instead of wasting the dive on a pass, smothers
             enemies dribbling right at you, and keeps you between the ball and your goal while your
             thumb is off the joystick. Turn it on standing in your goal. Dribble and tackle pause.

    How it presses: it finds the game's own "Dribble" / "Slide" / "Dive" button (by its label or its
    name) and tries, top-down: running the button's code (BTN), a virtual second finger on it (TAP),
    having the executor fire its signals (SIG), the move's key into the game's input code (KEY), a
    virtual key (VKEY), a virtual click on the button (CLICK). After every press it checks the move
    really happened. A method that misses twice in a row (while the move was ready) is skipped for a
    while, so the gentlest method that works is always the one used. It never presses while the
    game's button is off screen (cutscenes, awakenings), and never while the move is cooling down.

    Cooldowns are learned: after a hit it watches the game's button until it looks the way it did
    before the press. Until then it uses the guesses in CFG.Cooldowns.

    Pills: tap = on/off, drag = move them all (they stay on screen).
           hold ~1s and let go, then tap the game's button = force that button
           hold ~1s and let go, then tap the same pill = forget the forced button
    Red = off, green = on, amber = on but no ball found, grey = paused, blue = waiting for your tap.

    BLATANT (on by default): the keeper teleports onto a shot's path and dives into it; tackle puts
    you 3 studs from the carrier before the slide. Both still skip fakes and open dribble windows.
    Stamina is held at its max all the time, no button.

    With Debug = true, a black box under the pills is a live readout:
      line 1  what your executor allows (Y = works, n = blocked, ? = not tried yet), and your ping
      line 2  the ball and the nearest enemy (distance, and seconds until they reach you)
      line 3  the last press: which move, whether it found the game's button, the method, OK / miss
      line 4  each move's cooldown left (ok = ready), and how far your slide reaches
]]

local CFG = {
    Keys         = { dribble = Enum.KeyCode.Q, tackle = Enum.KeyCode.E, dive = Enum.KeyCode.Q },
    Labels       = { dribble = { "dribble" }, tackle = { "slide", "tackle", "steal" }, dive = { "dive" } },
    BallNames    = { Football = true, Ball = true, SoccerBall = true },
    HoldDist     = 5,      -- the nearest player within this of the ball (studs) has it
    Debug        = false,  -- true shows a live readout box under the pills
    Blatant      = true,   -- teleports: the keeper onto the shot's path, you next to the carrier to slide
    EngineInput  = true,   -- allow the virtual key and click as last resorts
    Cooldowns    = { dribble = 3, tackle = 3, dive = 1.5 }, -- first guesses (s), replaced once learned
    UiScale      = 1,      -- size of the pills and readout: 1.3 = bigger, 0.8 = smaller
    InfStamina   = true,   -- hold stamina at its max, wherever the game keeps it on your side (always on)
    Retry        = 0.5,    -- gap between tries of a ready move, in case the game swallowed a press

    -- dribble
    ScanDist     = 40,     -- watch enemies this far out (dashes close fast)
    Reach        = 4,      -- roughly how far a tackle reaches
    ReactTime    = 0.3,    -- dribble this long before an enemy is in reach, plus your ping
    MinClosing   = 6,      -- studs/s toward you; slower than this isn't a run at you
    LungeSpeed   = 40,     -- an enemy's own speed toward you above this is a slide or dash, not a run
    TackleDist   = 18,     -- an enemy this close starting any move or a tackle animation is a tackle
    CloseDist    = 5,      -- an enemy this close and not backing off can steal: dribble
    TackleWords  = { "tackle", "steal", "slide" },
    Flick        = true,   -- jump with the ball over a tackle that comes while dribble is cooling down

    -- tackle
    SlideSpeed   = 55,     -- studs/s, a first guess for timing where they'll be
    SlideReach   = 14,     -- studs, a first guess, then measured from your own slides
    SmartTackle  = true,   -- false = slide whenever in reach (still never into an open dribble window)
    TeleportReach = 30,    -- Blatant: carriers this far away get a teleport and a slide
    TackleSnap   = 0.22,   -- an enemy whose dribble is ready only gets slid at when this close (s)
    Protect      = 0.8,    -- a dribble (yours or theirs) protects against tackles this long after it starts (s)
    EnemyCooldown= 3,      -- and is down this long after that (s)

    -- keeper
    ShotSpeed    = 60,     -- dive at balls this fast; real shots were ~150 studs/s, passes ~40
    SlowBall     = 20,     -- slower than this is a roll, not a shot
    ReleaseDist  = 6,      -- fakes: a ball still this close to whoever just had it hasn't been shot...
    SureShot     = 110,    -- ...unless it's this fast already (studs/s)
    ShotConfirm  = 0.08,   -- a slower ball gets this long after the kick to show it's dying out
    GoalWidth    = 30,     -- half the goal's width, used until the goal itself is found in the map
    DiveRange    = 35,     -- dive at shots passing this close to you
    DiveLead     = 0.2,    -- dive this long before the ball arrives, plus ping and travel time
    DiveSpeed    = 60,     -- roughly how fast a dive covers ground (studs/s)
    DiveReach    = 12,     -- roughly how far a dive carries you: wider than this, move first, dive last
    SnapRange    = 30,     -- Blatant: furthest the keeper teleports onto a shot's path
    JumpHigh     = true,   -- jump for high balls close to you instead of diving under them
    HighBall     = 4,      -- studs above your middle that count as high
    JumpReach    = 5,      -- sideways: a high ball passing closer than this gets a jump, wider gets a dive
    Smother      = 7,      -- dive at an enemy carrying the ball this close (0 = never)
    Positioning  = true,   -- move between the ball and your goal while your thumb is off the stick
    Advance      = 6,      -- furthest you step off your spot toward the ball

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

local KINDS = { "dribble", "tackle", "dive" }
local on = { dribble = false, tackle = false, dive = false }
local learning -- nil or one of KINDS
local lastDive, diveUntil = -math.huge, -math.huge
local lastJump, lastFlick = -math.huge, -math.huge
local ballFound, stickIdle = false, true
local home, lastRoot -- the keeper's spot in goal, and last frame's position (teleport check)
local fieldDir       -- flat direction from your goal out to the pitch
local fieldExact     -- true when it came from the pitch itself, not guessed from the ball
local fieldSum, fieldN = Vector3.zero, 0 -- running average of where play happens, seen from your spot
local lastInput      -- a real InputObject, for ContextActionService handlers that expect one
local curHolder, heldSince = nil, 0 -- who had the ball last frame, and since when
local lastCarrier, lastCarriedAt = nil, -math.huge -- the last enemy with the ball, and when
local shotPlan       -- the keeper's read of a ball coming in: { at = where it passes you, t = when }
local slideReach = CFG.SlideReach
local goalCentre, goalHalf = nil, CFG.GoalWidth -- your goal, once it's found in the map
local caps = { conn = false, sig = false, touch = nil, key = nil } -- what the executor allows
local dbg = { last = "no press yet" }

-- per move: when it last went off (at), how long it then cools down (cd, learned when it can be),
-- when it was last tried, a short hold while its button still looks like it's cooling, whether
-- its button has ever been on screen, how the button looks while the move is ready, and misses in
-- a row per press method
local move = {}
for _, kind in ipairs(KINDS) do
    move[kind] = { at = -math.huge, cd = CFG.Cooldowns[kind], tried = -math.huge, hold = 0, busy = false,
                   seen = false, ready = nil, learned = false, bad = {}, good = {} }
end

local function cooling(kind)
    local m = move[kind]
    return os.clock() - m.at < m.cd
end

local function ready(kind)
    local m, now = move[kind], os.clock()
    return not m.busy and not cooling(kind) and now >= m.hold and now - m.tried >= CFG.Retry
end

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
local NAMES = { dribble = "DRIBBLE", tackle = "TACKLE", dive = "AUTO GK" }
local MOVES = { dribble = "DRIBBLE", tackle = "SLIDE", dive = "DIVE" }
local DONE  = { dribble = "DRIBBLED", tackle = "SLID", dive = "DIVED" }

local screen = Instance.new("ScreenGui")
screen.Name = "AutoDribble"
screen.ResetOnSpawn = false
screen.IgnoreGuiInset = true
screen.DisplayOrder = 999
if not pcall(function() screen.Parent = (gethui and gethui()) or game:GetService("CoreGui") end) then
    screen.Parent = LP:WaitForChild("PlayerGui")
end

local bar = Instance.new("Frame")
bar.Size = UDim2.fromOffset(192, CFG.Debug and 78 or 22)
bar.Position = UDim2.new(0, 12, 0.22, 0)
bar.BackgroundTransparency = 1
bar.Parent = screen
Instance.new("UIScale", bar).Scale = CFG.UiScale

local function makePill(x)
    local b = Instance.new("TextButton")
    b.Size = UDim2.fromOffset(62, 22)
    b.Position = UDim2.fromOffset(x, 0)
    b.AutoButtonColor = false
    b.BackgroundTransparency = 0.15
    b.Font = Enum.Font.GothamBold
    b.TextScaled = true -- any message fits the small pill
    b.TextColor3 = WHITE
    b.Parent = bar
    Instance.new("UICorner", b).CornerRadius = UDim.new(0, 6)
    Instance.new("UITextSizeConstraint", b).MaxTextSize = 10
    return b
end
local pills = { dribble = makePill(0), tackle = makePill(65), dive = makePill(130) }

local info = Instance.new("TextLabel")
info.Size = UDim2.fromOffset(192, 53)
info.Position = UDim2.fromOffset(0, 25)
info.BackgroundColor3 = BLACK
info.BackgroundTransparency = 0.35
info.TextColor3 = WHITE
info.Font = Enum.Font.Code
info.TextSize = 8
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
    elseif kind ~= "dive" and on.dive then
        pill.Text, pill.BackgroundColor3 = NAMES[kind] .. " PAUSED", COLORS.paused
    else
        pill.Text, pill.BackgroundColor3 = NAMES[kind] .. " ON", ballFound and COLORS.on or COLORS.noBall
    end
end

-- a pill showing a short message keeps it until its own timer runs out
local msgGen, msgOn = {}, {}
for _, kind in ipairs(KINDS) do msgGen[kind], msgOn[kind] = 0, false end

local function refresh()
    for _, kind in ipairs(KINDS) do
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

local function priorities(names)
    local set = {}
    for _, name in ipairs(names) do
        local ok, item = pcall(function() return Enum.AnimationPriority[name] end)
        if ok and item then set[item] = true end
    end
    return set
end
local ACTION = priorities({ "Action", "Action2", "Action3", "Action4" }) -- what moves play at
local BASE = priorities({ "Core", "Idle" }) -- standing and walking; everything else may be a move

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

local motion     = setmetatable({}, { __mode = "k" }) -- root -> { hist, vel } measured from movement
local moveSeen   = setmetatable({}, { __mode = "k" }) -- animator -> move tracks playing last frame
local moveAt     = setmetatable({}, { __mode = "k" }) -- player -> when a new move animation started
local carryMoveAt = setmetatable({}, { __mode = "k" }) -- player -> when they started one holding the ball
local anyMoveAt  = setmetatable({}, { __mode = "k" }) -- player -> when any non-walking animation started

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
            -- any move animation starting, whatever the game calls it: steals, tackles, slides,
            -- and the carrier's dribble (a trap right as they receive the ball doesn't count)
            local h = c:FindFirstChildOfClass("Humanoid")
            local animator = h and h:FindFirstChildOfClass("Animator")
            if animator then
                local was, now_ = moveSeen[animator], {}
                for _, t in ipairs(animator:GetPlayingAnimationTracks()) do
                    now_[t] = true
                    if was and not was[t] then
                        -- a dribble needn't play at Action priority: anything that isn't walking
                        -- or standing might be one, and that's enough to keep a slide out of it
                        if not BASE[t.Priority] then anyMoveAt[p] = now end
                        if ACTION[t.Priority] then
                            moveAt[p] = now
                            if p == curHolder and now - heldSince > 0.3 then carryMoveAt[p] = now end
                        end
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

-- An enemy coming for the ball you hold. The second result says they've committed to the tackle
-- itself (a move animation, a tackle by name, a lunge faster than anyone runs), not just a run.
local function threat(root, lead)
    local myPos, myVel, now = root.Position, root.AssemblyLinearVelocity, os.clock()
    local runner_
    for _, p in ipairs(Players:GetPlayers()) do
        local char = p.Character
        local r = char and char:FindFirstChild("HumanoidRootPart")
        local h = char and char:FindFirstChildOfClass("Humanoid")
        if r and h and h.Health > 0 and isEnemy(p) then
            local off = flat(myPos - r.Position) -- enemy -> me
            local dist = off.Magnitude
            if dist > 0 and dist < CFG.ScanDist then
                local vel = velocityOf(r)
                -- how fast they're closing the gap, and how long until they're in tackle reach
                local closing = flat(vel - myVel):Dot(off.Unit)
                local soon = closing > CFG.MinClosing and (dist - CFG.Reach) / closing <= CFG.ReactTime + lead
                local committed = flat(vel):Dot(off.Unit) > CFG.LungeSpeed or tackling(h)
                    or now - (moveAt[p] or -math.huge) < 0.3
                if committed and (soon or dist < CFG.TackleDist) then return p, true end
                -- right on you (running side by side, or catching you from behind): it can steal
                -- (moving: someone ankle-broken lies there too)
                if soon or (dist < CFG.CloseDist and closing > -2 and flat(vel).Magnitude > 3) then
                    runner_ = runner_ or p
                end
            end
        end
    end
    return runner_, false
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
local found = {} -- kind -> { by = object that matched, button = button, bare = label only? }

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

local function isWord(kind, text)
    for _, w in ipairs(CFG.Labels[kind]) do
        if text == w then return true end
    end
    return false
end

local function labelOf(obj)
    return (obj.Text:lower():gsub("%s", ""))
end

-- a text that reads exactly "Dribble" / "Slide" / "Dive", or a button named after it
local function names(obj, kind)
    if (obj:IsA("TextLabel") or obj:IsA("TextButton")) and isWord(kind, labelOf(obj)) then
        return true
    end
    if obj:IsA("GuiButton") then
        local n = obj.Name:lower()
        for _, w in ipairs(CFG.Labels[kind]) do
            if n:find(w, 1, true) then return true end
        end
    end
    return false
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
    -- then a bare label with no button object at all, so a "Dribble" key hint elsewhere never wins
    local byName, bare
    for _, d in ipairs(pg:GetDescendants()) do
        if (d:IsA("GuiObject")) and not d:IsDescendantOf(screen) and names(d, kind) and shown(d) then
            local isText = d:IsA("TextLabel") or d:IsA("TextButton")
            local b = buttonFor(d)
            local labelled = isText and isWord(kind, labelOf(d))
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

-- the move's button is somewhere in the game's HUD, on screen or not
local function exists(kind)
    local pg = playerGui()
    if not pg then return false end
    for _, d in ipairs(pg:GetDescendants()) do
        if d:IsA("GuiObject") and not d:IsDescendantOf(screen) and names(d, kind) then return true end
    end
    return false
end

-- What a button looks like, coarse enough to ignore flicker. A cooldown shows up here as a dimmed
-- icon, a fill bar changing size, a number counting down, or a part appearing.
local function look(b)
    if not b then return nil end
    local function r(x) return math.floor(x * 10 + 0.5) end
    local out = {}
    local function add(o)
        if not o:IsA("GuiObject") then return end
        local s = o.Size
        local t = { o.Name, o.Visible and 1 or 0, r(o.BackgroundTransparency),
                    r(s.X.Scale * 2), r(s.Y.Scale * 2), math.floor(s.X.Offset / 4), math.floor(s.Y.Offset / 4) }
        if o:IsA("ImageLabel") or o:IsA("ImageButton") then
            local c = o.ImageColor3
            table.insert(t, r(o.ImageTransparency))
            table.insert(t, r(c.R) .. "." .. r(c.G) .. "." .. r(c.B))
        end
        if o:IsA("TextLabel") or o:IsA("TextButton") then
            table.insert(t, o.Text)
            table.insert(t, r(o.TextTransparency))
        end
        table.insert(out, table.concat(t, ","))
    end
    add(b)
    for _, d in ipairs(b:GetDescendants()) do add(d) end
    return table.concat(out, "|")
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
    if t.obj and t.obj:IsDescendantOf(pg) then return shown(t.obj) and t.obj or nil end
    local cur = pg
    for _, name in ipairs(t.path) do
        cur = cur:FindFirstChild(name)
        if not cur then return nil end
    end
    t.obj = cur
    return shown(cur) and cur or nil
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

-- KEY: the move's key straight into the game's InputBegan listeners and its ContextActionService
-- binding. The binding needs no getconnections (CallFunction runs it), so it's tried even when
-- that's blocked. An action named after the move wins; otherwise every action bound to the key.
local function casCall(kind, state)
    local n = 0
    pcall(function()
        local all, picked = CAS:GetAllBoundActionInfo(), {}
        for name in pairs(all) do
            local lower = tostring(name):lower()
            for _, w in ipairs(CFG.Labels[kind]) do
                if lower:find(w, 1, true) then
                    table.insert(picked, name)
                    break
                end
            end
        end
        if #picked == 0 then
            for name, info_ in pairs(all) do
                if type(info_.inputTypes) == "table" and table.find(info_.inputTypes, CFG.Keys[kind]) then
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
    local K, key = Enum.UserInputType.Keyboard, CFG.Keys[kind]
    local n = caps.conn and fire(UIS.InputBegan, fakeInput(K, key, Enum.UserInputState.Begin), false) or 0
    n += casCall(kind, Enum.UserInputState.Begin)
    if n == 0 then return false end
    task.delay(0.03, function()
        if caps.conn then fire(UIS.InputEnded, fakeInput(K, key, Enum.UserInputState.End), false) end
        casCall(kind, Enum.UserInputState.End)
    end)
    return true
end

-- VKEY / CLICK: real virtual input. Last resorts: a keyboard or mouse event makes this game switch
-- to its PC layout (key hints) until your next touch.
local function vkey(kind)
    if not (VIM and CFG.EngineInput) then return false end
    local key = CFG.Keys[kind]
    caps.key = pcall(function() VIM:SendKeyEvent(true, key, false, game) end)
    if not caps.key then return false end
    task.delay(0.03, function()
        pcall(function() VIM:SendKeyEvent(false, key, false, game) end)
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

-- Did the move really happen? A new move-priority animation, a lunge you can't walk, or the game's
-- button changing the way it does when the move goes on cooldown.
local function verify(root, hum, before, speed0, b, look0)
    local _, animator = playingSet(hum)
    local limit = math.max(speed0 + 20, 30)
    local t0 = os.clock()
    local lastP, lastT = root.Position, t0
    while os.clock() - t0 < 0.45 do
        task.wait()
        if animator then
            for _, t in ipairs(animator:GetPlayingAnimationTracks()) do
                if not before[t] and ACTION[t.Priority] then return true end
            end
        end
        -- a lunge the game moves by CFrame has no physics speed, so it's read from position too
        local now, speed = os.clock(), flat(root.AssemblyLinearVelocity).Magnitude
        if now - lastT >= 0.05 then
            speed = math.max(speed, flat(root.Position - lastP).Magnitude / (now - lastT))
            lastP, lastT = root.Position, now
        end
        if speed > limit then return true end
        if look0 and b.Parent and shown(b) and look(b) ~= look0 then return true end
    end
    return false
end

-- The button goes back to how it looked before the press once the move is ready again, so the
-- time that takes is the cooldown. Only learned when it changed and came back while staying on
-- screen; after that, a button that still looks different means "cooling", whatever the timer says.
local function learnCooldown(kind, b, t0)
    local m = move[kind]
    local changed = false
    while os.clock() - t0 < 20 do
        task.wait(0.1)
        if not (b.Parent and shown(b)) then return end
        if look(b) ~= m.ready then
            changed = true
        elseif changed then
            m.cd = math.max(CFG.Retry, os.clock() - t0)
            m.learned = true
            return
        end
    end
end

-- Top-down through the methods, skipping one that has just missed twice in a row (four times if it
-- has worked before) until 20s have passed. So the gentlest method that works is always the one used.
local METHODS = { "BTN", "TAP", "SIG", "KEY", "VKEY", "CLICK" }

local function usable(m, i)
    local bad = m.bad[i]
    return not bad or bad.n < (m.good[i] and 4 or 2) or os.clock() - bad.at > 20
end

local function attempt(how, b, kind)
    if how == "BTN" then return b ~= nil and pressButton(b) end
    if how == "TAP" then return b ~= nil and tapButton(b) end
    if how == "SIG" then return b ~= nil and sigButton(b) end
    if how == "KEY" then return pressKey(kind) end
    if how == "VKEY" then return vkey(kind) end
    return b ~= nil and clickButton(b)
end

local function result(kind, i, ok, b, look0, pressedAt)
    local m = move[kind]
    dbg.last ..= ok and " OK" or " miss"
    if ok then
        m.at, m.bad[i], m.good[i] = os.clock(), nil, true
        if look0 then
            m.ready = look0
            task.spawn(learnCooldown, kind, b, pressedAt)
        end
        notify(kind, DONE[kind], COLORS.on)
    else
        local bad = m.bad[i] or { n = 0 }
        bad.n, bad.at = bad.n + 1, os.clock()
        m.bad[i] = bad
        notify(kind, "NO " .. MOVES[kind], COLORS.noBall)
    end
end

-- Returns true when something was pressed.
local function trigger(kind, root, hum)
    local m = move[kind]
    local b = getTarget(kind) or byLabel(kind)
    if b then
        m.seen = true
    elseif m.seen or exists(kind) then
        -- the game has this button, it just isn't on screen: a cutscene, or the move isn't
        -- available right now. A key or click would only flip the game to its PC layout.
        m.seen = true
        dbg.last = MOVES[kind] .. " button off screen"
        return false
    end
    local look0 = look(b)
    if m.learned and b and look0 ~= m.ready then
        -- The button still looks the way it does while cooling. Far longer than the cooldown it
        -- learned means its look changed for some other reason (a tint, a new HUD): stop trusting it.
        if os.clock() - m.at < m.cd * 2 + 3 then
            dbg.last = MOVES[kind] .. " still cooling (button)"
            m.hold = os.clock() + 0.2 -- look again shortly
            return false
        end
        m.learned = false
    end
    local before, speed0 = playingSet(hum), flat(root.AssemblyLinearVelocity).Magnitude
    local seen = b and (b:IsA("GuiButton") and "yes" or "label") or "NO"
    local function try(i)
        local how = METHODS[i]
        local t0 = os.clock()
        if not attempt(how, b, kind) then return false end
        dbg.last = ("%s btn:%s via %s"):format(MOVES[kind], seen, how)
        flash(kind, MOVES[kind] .. ": " .. how)
        result(kind, i, verify(root, hum, before, speed0, b, look0), b, look0, t0)
        return true
    end
    for i = 1, #METHODS do
        if usable(m, i) and try(i) then return true end
    end
    -- everything usable is skipped or refused: give the skipped ones another chance now
    for i = 1, #METHODS do
        if not usable(m, i) and try(i) then return true end
    end
    dbg.last = ("%s btn:%s nothing worked"):format(MOVES[kind], seen)
    say(kind, "NO BUTTON", COLORS.off, WHITE, 1.5)
    return false
end

-- Turn toward `at` for a moment (dives and slides go the way you face). The game's auto-rotate
-- would turn you back toward your thumb, so it's off for the turn and comes back after.
local autoSaved, autoGen = nil, 0
local faceDir, faceUntil = nil, 0 -- a direction held every frame for a moment (see refaceNow)
local function face(root, hum, at)
    local look_ = Vector3.new(at.X, root.Position.Y, at.Z)
    if (look_ - root.Position).Magnitude < 0.5 then return end
    if autoSaved == nil then autoSaved = hum.AutoRotate end
    autoGen += 1
    local gen = autoGen
    hum.AutoRotate = false
    root.CFrame = CFrame.lookAt(root.Position, look_)
    -- the direction, not the point: a dive or slide carries you past the point
    faceDir, faceUntil = (look_ - root.Position).Unit, os.clock() + 0.35
    hum:Move((look_ - root.Position).Unit)
    task.delay(0.4, function()
        if autoGen ~= gen then return end
        if hum.Parent then hum.AutoRotate = autoSaved end
        autoSaved = nil
    end)
end

-- Press a move, turned toward `at` first when given. The press goes in the same frame as the
-- turn, before shift lock or the camera can turn you back.
local function launch(kind, root, hum, at)
    local m = move[kind]
    m.busy, m.tried = true, os.clock()
    task.spawn(function()
        local from = root.Position
        if at then face(root, hum, at) end
        -- an error mid-press must not leave the move marked busy for good
        local ok, pressed = pcall(trigger, kind, root, hum)
        if not ok then dbg.last = MOVES[kind] .. " error: " .. tostring(pressed) end
        -- a slide that went off: how far it really carried you is how far the next one is aimed
        if ok and pressed and kind == "tackle" and os.clock() - m.at < 1 then
            task.wait(math.max(0, 0.7 - (os.clock() - m.tried)))
            local d = flat(root.Position - from).Magnitude
            if d > 4 then slideReach = math.clamp(slideReach * 0.5 + d * 0.5, 6, 30) end
        end
        m.busy = false
    end)
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

---------------------------------------------------------------- dribble and tackle

-- Jump with the ball: the game's rainbow flick, which lifts it over a slide. Some games read the
-- jump from the Humanoid, some from JumpRequest, so it's both.
local function flick(hum)
    lastFlick = os.clock()
    hum.Jump = true
    if caps.conn then fire(UIS.JumpRequest) end
    dbg.last = "FLICK (dribble cooling)"
    flash("dribble", "FLICK")
end

-- Where to slide at the carrier, or nil when it isn't time. Their dribble decides it: an open
-- protection window would ankle-break you, a cooling one can't stop you, and a ready one only
-- loses to a slide that gets there before they can react.
local function tackleAim(root, holder, lead)
    local char = holder.Character
    local r = char and char:FindFirstChild("HumanoidRootPart")
    local h = char and char:FindFirstChildOfClass("Humanoid")
    if not (r and h and h.Health > 0) then return nil end
    local dist = flat(r.Position - root.Position).Magnitude
    -- Blatant: you're put 3 studs from them before the slide, so it reaches from much further
    local reach = CFG.Blatant and CFG.TeleportReach or slideReach
    if dist > reach + 8 then return nil end
    -- where they'll be when the slide gets there; you see them a round trip late, so plus ping
    local t = (CFG.Blatant and math.min(dist, 3) or dist) / CFG.SlideSpeed + lead
    local aim = r.Position + flat(velocityOf(r)) * t
    if flat(aim - root.Position).Magnitude > reach then return nil end
    local now = os.clock()
    -- mid-move or mid-dash: whatever it is, a dribble's protection may be up
    if now - (anyMoveAt[holder] or -math.huge) < CFG.Protect + lead then return nil end
    if flat(velocityOf(r)).Magnitude > CFG.LungeSpeed then return nil end
    local since = now - (carryMoveAt[holder] or -math.huge)
    local theirsCooling = since < CFG.Protect + CFG.EnemyCooldown
    if CFG.SmartTackle and not theirsCooling and t > CFG.TackleSnap then return nil end
    return aim
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

-- time to the top of a jump, and how high that is
local function jumpArc(hum)
    local g = workspace.Gravity
    local v = hum.UseJumpPower and hum.JumpPower or math.sqrt(2 * g * hum.JumpHeight)
    return v / g, v * v / (2 * g)
end

local function dive(root, hum, at)
    lastDive = os.clock()
    diveUntil = lastDive + 1 -- let the dive play out before positioning again
    launch("dive", root, hum, at)
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

-- Your goal: the nearest part near your spot named like a goal or net (or inside a model named
-- that), at least as wide as a goal. Its long side is the goal's width, its centre the middle.
local function findGoal(from)
    local best, bestD
    for _, d in ipairs(workspace:GetDescendants()) do
        if d:IsA("BasePart") then
            local n = (d.Name .. " " .. (d.Parent and d.Parent.Name or "")):lower()
            local w = math.max(d.Size.X, d.Size.Z)
            local dist = flat(d.Position - from).Magnitude
            if (n:find("goal", 1, true) or n:find("net", 1, true)) and w >= 12 and w <= 120 and dist < 60
                and (not best or dist < bestD) then
                best, bestD = d, dist
            end
        end
    end
    if not best then return nil, CFG.GoalWidth end
    return Vector3.new(best.Position.X, from.Y, best.Position.Z), math.max(best.Size.X, best.Size.Z) / 2
end

-- the middle of your goal on the line you stand on (your spot, until the goal is found)
local function goalBase()
    if goalCentre and fieldDir and home then
        return goalCentre + fieldDir * flat(home - goalCentre):Dot(fieldDir)
    end
    return home
end

-- A shot: crossing your goal line between the posts (a little to spare), from any angle. Angled
-- shots from the wing count too; a pass across the box never reaches the line. Until the pitch
-- direction is known, any fast ball coming at you counts.
local function onTarget(s)
    if not (home and fieldDir) then return true end
    local p, v = flat(s.pos - goalBase()), flat(s.vel)
    local closing = -v:Dot(fieldDir) -- speed toward the goal line
    if closing <= 1 then return false end
    local tc = p:Dot(fieldDir) / closing
    if tc < 0 or tc > 1.5 then return false end
    -- slowing enough to stop before the line (a touch, a push, a feint that rolls dead): no shot
    local slowing = s.acc:Dot(fieldDir)
    if slowing > 1 and closing * closing / (2 * slowing) < p:Dot(fieldDir) then return false end
    local cross = p + v * tc
    return (cross - fieldDir * cross:Dot(fieldDir)).Magnitude <= goalHalf + 3
end

local function keeper(root, hum, ball, s, holder, lead)
    shotPlan = nil
    if holder == LP then return end
    local now, myPos = os.clock(), root.Position
    if holder then
        -- 1v1: an enemy carrying the ball right at you, close enough to smother. Standing still
        -- in front of you (winding up a shot, faking one) only gets it right on top of you.
        local r = isEnemy(holder) and holder.Character and holder.Character:FindFirstChild("HumanoidRootPart")
        local gap = (ball.Position - myPos).Magnitude
        if r and CFG.Smother > 0 and gap <= CFG.Smother and ready("dive") then
            local toMe = flat(myPos - r.Position)
            local coming = toMe.Magnitude > 0 and flat(velocityOf(r)):Dot(toMe.Unit) > 3
            if coming or gap <= 4 then dive(root, hum, ball.Position) end
        end
        return
    end
    local speed = s.vel.Magnitude
    if speed < CFG.SlowBall or s.vel:Dot(myPos - s.pos) <= 0 then return end
    -- A fake: a touch or a push keeps the ball at the feet of whoever just had it, while a shot
    -- leaves them. Anything shot-fast counts straight away.
    local cr = lastCarrier and now - lastCarriedAt < 1 and lastCarrier.Character
        and lastCarrier.Character:FindFirstChild("HumanoidRootPart")
    if cr and speed < CFG.SureShot and (s.pos - cr.Position).Magnitude < CFG.ReleaseDist then
        dbg.last = "fake? ball still at their feet"
        return
    end
    -- right after the kick its slowing hasn't shown yet: a push that dies out looks like a shot for
    -- a few frames. Shot-fast balls count straight away.
    if speed < CFG.SureShot and now - s.kickAt < CFG.ShotConfirm then return end
    if not onTarget(s) then return end
    if CFG.Blatant and fieldDir and now >= diveUntil then
        -- Snap onto the ball's path where it crosses your line, facing it: the shot meets you
        -- instead of you chasing it. Kept inside the posts.
        local base = goalBase()
        local p, v = flat(s.pos - base), flat(s.vel)
        local closing = -v:Dot(fieldDir)
        local cross = p + v * (closing > 1 and p:Dot(fieldDir) / closing or 0)
        local lateral = cross - fieldDir * cross:Dot(fieldDir)
        if lateral.Magnitude > goalHalf then lateral = lateral.Unit * goalHalf end
        local spot = Vector3.new(base.X + lateral.X, myPos.Y, base.Z + lateral.Z)
        local jump = (spot - myPos).Magnitude
        if jump > 1 and jump <= CFG.SnapRange then
            root.CFrame = CFrame.lookAt(spot, Vector3.new(s.pos.X, spot.Y, s.pos.Z))
            myPos = spot
        end
    end
    local t, d, at = closestApproach(s, myPos)
    shotPlan = { at = at, t = now + t } -- positioning walks you onto its path
    local side, up = flat(at - myPos).Magnitude, at.Y - myPos.Y
    -- a high ball close to you: jump so it meets you at the top of the jump, not under it
    if CFG.JumpHigh and up > CFG.HighBall and side <= CFG.JumpReach then
        local apexT, apexH = jumpArc(hum)
        if up <= CFG.HighBall + apexH + 2 and t <= apexT + lead and now - lastJump > 1 then
            lastJump = now
            hum.Jump = true
            dbg.last = ("JUMP for a ball %.0f up"):format(up)
        end
        return
    end
    -- a slow ball you can walk onto before it arrives: no dive to waste on what may be a pass
    if speed < CFG.ShotSpeed and side / math.max(hum.WalkSpeed, 1) <= t then return end
    -- as late as the dive can still get there; a path wider than a dive reaches is walked toward
    -- first (positioning), and dived at only in the last moment
    if d <= CFG.DiveRange and t <= CFG.DiveLead + lead + math.min(d, CFG.DiveReach) / CFG.DiveSpeed
        and ready("dive") then
        -- coming straight at you: dive into it, not off to one side and out of its way
        dive(root, hum, side < 3 and s.pos or at)
    end
end

---------------------------------------------------------------- stamina

-- Wherever the game keeps your stamina on your side: an attribute or a number value named like
-- "stamina" on you, your character or what they hold, or (with getgc) a script's table with a
-- Stamina field. Each is held at its max: a "Max..." next to it if there is one, else the highest
-- it has been. Stamina the server keeps to itself can't be reached from here.
local stam = { found = "searching", list = {}, gc = {}, nextScan = 0, deep = nil, nextDeep = 0 }
local STAM_WORDS = { "stamina", "energy", "endurance" }
local NOT_STAM = { "max", "regen", "cost", "drain", "rate", "recover", "delay", "cooldown" }

local function isStamina(name)
    local n = tostring(name):lower()
    for _, w in ipairs(NOT_STAM) do
        if n:find(w, 1, true) then return false end
    end
    if n == "stam" then return true end
    for _, w in ipairs(STAM_WORDS) do
        if n:find(w, 1, true) then return true end
    end
    return false
end

-- its max, from whatever sits next to it: MaxStamina, maxStamina, Max<name>, ...
local function maxNear(get, name)
    local cap = name:sub(1, 1):upper() .. name:sub(2)
    for _, k in ipairs({ "Max" .. cap, "max" .. cap, "Max" .. name, "MaxStamina", "maxStamina", "MaxEnergy", "Max" }) do
        local ok, v = pcall(get, k)
        if ok and type(v) == "number" then return v end
    end
    return nil
end

-- the game's per-player data folders: ReplicatedStorage.PlayerData.<you> and the like
local function playerFolders()
    local out, mineNames = {}, { [LP.Name] = true, [tostring(LP.UserId)] = true }
    for _, svc in ipairs({ game:GetService("ReplicatedStorage"), workspace }) do
        for _, c in ipairs(svc:GetChildren()) do
            if mineNames[c.Name] and c ~= LP.Character then table.insert(out, c) end
            if c:IsA("Folder") or c:IsA("Configuration") then
                for _, cc in ipairs(c:GetChildren()) do
                    if mineNames[cc.Name] then table.insert(out, cc) end
                end
            end
        end
    end
    return out
end

local function scanStamina()
    local list = {}
    local function attrs(inst)
        local ok, all = pcall(function() return inst:GetAttributes() end)
        if not (ok and type(all) == "table") then return end
        for name, v in pairs(all) do
            if type(v) == "number" and isStamina(name) then
                table.insert(list, { kind = "attr", inst = inst, name = name,
                    max = maxNear(function(k) return all[k] end, name) })
            end
        end
    end
    local function values(root)
        attrs(root)
        for _, d in ipairs(root:GetDescendants()) do
            if (d:IsA("NumberValue") or d:IsA("IntValue")) and isStamina(d.Name) then
                local parent = d.Parent
                table.insert(list, { kind = "value", inst = d, name = d.Name,
                    max = maxNear(function(k) return parent:FindFirstChild(k).Value end, d.Name) })
            end
            attrs(d)
        end
    end
    attrs(LP)
    for _, c in ipairs(LP:GetChildren()) do
        if not (c:IsA("PlayerGui") or c.Name == "PlayerScripts") then values(c) end
    end
    if LP.Character then values(LP.Character) end
    pcall(function()
        for _, f in ipairs(playerFolders()) do values(f) end
    end)
    stam.list = list
    local first = list[1] or stam.gc[1]
    local n = #list + #stam.gc
    stam.found = first and (first.kind .. " " .. first.name .. (n > 1 and (" +" .. (n - 1)) or ""))
        or (stam.deep and "searching" or "none")
end

-- A script's own table with a stamina field, found by walking the game's memory (getgc) a slice
-- per frame so it doesn't hitch. Once at the start, then again every 20s while nothing is found.
local function deepStep()
    local d = stam.deep
    if not d then
        if type(getgc) ~= "function" or os.clock() < stam.nextDeep then return end
        local ok, objs = pcall(getgc, true)
        if not (ok and type(objs) == "table") then
            stam.nextDeep = math.huge
            return
        end
        d = { objs = objs, i = 1, found = {} }
        stam.deep = d
    end
    local stop = math.min(d.i + 1500, #d.objs)
    for i = d.i, stop do
        local o = d.objs[i]
        if type(o) == "table" then
            pcall(function()
                for k, v in next, o do
                    if type(k) == "string" and type(v) == "number" and isStamina(k) and #d.found < 16 then
                        table.insert(d.found, { kind = "table", t = o, name = k,
                            max = maxNear(function(key) return rawget(o, key) end, k) })
                    end
                end
            end)
        end
    end
    d.i = stop + 1
    if d.i > #d.objs then
        stam.deep, stam.gc = nil, d.found
        stam.nextDeep = (#d.found == 0 and #stam.list == 0) and os.clock() + 20 or math.huge
    end
end

local function readStamina(e)
    if e.kind == "attr" then return e.inst:GetAttribute(e.name) end
    if e.kind == "value" then return e.inst.Value end
    return rawget(e.t, e.name)
end

local function writeStamina(e, v)
    if e.kind == "attr" then e.inst:SetAttribute(e.name, v)
    elseif e.kind == "value" then e.inst.Value = v
    else rawset(e.t, e.name, v) end
end

local function holdStamina()
    if os.clock() >= stam.nextScan then
        stam.nextScan = os.clock() + 3 -- new characters, new values
        pcall(scanStamina)
    end
    pcall(deepStep)
    for _, list in ipairs({ stam.list, stam.gc }) do
        for _, e in ipairs(list) do
            pcall(function()
                local cur = readStamina(e)
                if type(cur) ~= "number" then return end
                e.top = math.max(e.top or cur, cur, type(e.max) == "number" and e.max or 0)
                if cur < e.top then writeStamina(e, e.top) end
            end)
        end
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

-- Shift lock (and some games' cameras) turn your character to face the camera every frame. While
-- a dive or slide goes off, this turns it back to the target after them, every frame.
local function refaceNow()
    local root = body()
    if root and faceDir and os.clock() < faceUntil then
        root.CFrame = CFrame.lookAt(root.Position, root.Position + faceDir)
    end
end
pcall(function() RunService:BindToRenderStep("AutoDribbleFace", Enum.RenderPriority.Last.Value, refaceNow) end)

local nextInfo = 0
local function yn(v) return v == nil and "?" or (v and "Y" or "n") end
local function left(kind)
    local m = move[kind]
    local s = m.cd - (os.clock() - m.at)
    return s > 0 and ("%.1f"):format(s) or "ok"
end
local function showInfo(root, ball, holder, lead)
    if not CFG.Debug or os.clock() < nextInfo then return end
    nextInfo = os.clock() + 0.1
    local line1 = ("conn %s sig %s tap %s key %s | %dms"):format(yn(caps.conn), yn(caps.sig), yn(caps.touch),
        yn(caps.key), math.floor(lead * 1000 + 0.5))
    local line2 = "no ball"
    if ball then
        local who = holder == LP and "YOU" or holder and (isEnemy(holder) and "FOE" or "TEAM") or "free"
        line2 = ("ball %.0f %s"):format((ball.Position - root.Position).Magnitude, who)
    end
    local d, eta = nearestFoe(root)
    if d then line2 ..= (" | foe %.0f"):format(d) .. (eta and (" %.2fs"):format(eta) or "") end
    local line4 = ("cd drb %s tkl %s gk %s | slide %.0f"):format(left("dribble"), left("tackle"), left("dive"),
        slideReach)
    local line5 = ("goal %s | stamina %s"):format(goalCentre and ("%.0f wide"):format(goalHalf * 2) or "?", stam.found)
    info.Text = line1 .. "\n" .. line2 .. "\n" .. dbg.last .. "\n" .. line4 .. "\n" .. line5
end

bind(RunService.Heartbeat, function(dt)
    if CFG.InfStamina then holdStamina() end
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
        goalCentre, goalHalf = findGoal(home)
    end
    lastRoot = root.Position

    local lead = ping()
    local ball = nearestBall(root.Position)
    if (ball ~= nil) ~= ballFound then
        ballFound = ball ~= nil
        refresh()
    end
    local holder = ball and holderOf(ball)
    if holder ~= curHolder then curHolder, heldSince = holder, os.clock() end
    if holder and holder ~= LP and isEnemy(holder) then lastCarrier, lastCarriedAt = holder, os.clock() end
    showInfo(root, ball, holder, lead)
    if not ball then return end
    if on.dive and home and not fieldExact then
        -- No pitch part to read: play happens out on the pitch, so the average direction of the
        -- ball and every other player from your spot is the way out of your goal. Nothing in
        -- front of you is ever behind the goal line, so anything back there is a ball that went
        -- out, not the pitch. Plain average at first, settling into a long memory.
        local function learnField(pos)
            local out = flat(pos - home)
            if out.Magnitude > 30 and not (fieldDir and out:Dot(fieldDir) < 0) then
                fieldN = math.min(fieldN + 1, 20000)
                fieldSum = fieldSum * (1 - 1 / fieldN) + out.Unit / fieldN
            end
        end
        learnField(ball.Position)
        for _, p in ipairs(Players:GetPlayers()) do
            local r = p ~= LP and p.Character and p.Character:FindFirstChild("HumanoidRootPart")
            if r then learnField(r.Position) end
        end
        if fieldSum.Magnitude > 0.2 then fieldDir = fieldSum.Unit end
    end
    local s = updateTrack(ball, dt)
    if learning or not (on.dribble or on.tackle or on.dive) or UIS:GetFocusedTextBox() then return end

    if on.dive then
        keeper(root, hum, ball, s, holder, lead)
    elseif holder == LP then
        if on.dribble then
            local foe, committed = threat(root, lead)
            if foe and ready("dribble") then
                launch("dribble", root, hum)
            elseif foe and committed and CFG.Flick and cooling("dribble") and os.clock() - lastFlick > 1
                and os.clock() - move.dribble.at > CFG.Protect then
                -- (inside your own protection window the tackle gets ankle-broken anyway)
                flick(hum)
            end
        end
    elseif on.tackle and holder and isEnemy(holder) and ready("tackle") then
        local aim = tackleAim(root, holder, lead)
        if aim then
            local off = flat(aim - root.Position)
            if CFG.Blatant and off.Magnitude > 4 then
                -- 3 studs short of where they'll be, facing them: the slide can't miss from there
                local at = root.Position + off - off.Unit * 3
                root.CFrame = CFrame.lookAt(at, Vector3.new(aim.X, at.Y, aim.Z))
            end
            launch("tackle", root, hum, aim)
        end
    end
end)

-- Positioning runs before physics. Roblox's ControlModule has already applied your joystick
-- for this frame by then, so MoveDirection here is your thumb, never our own last move.
bind(RunService.Stepped, function()
    refaceNow()
    local root, hum = body()
    if not root then return end
    stickIdle = hum.MoveDirection.Magnitude < 0.05
    if not (on.dive and CFG.Positioning and stickIdle and home) or learning or os.clock() < diveUntil then
        return
    end
    local ball = nearestBall(root.Position)
    if not ball or holderOf(ball) == LP then return end
    local base = goalBase()
    local spot = base
    if shotPlan and os.clock() < shotPlan.t and flat(shotPlan.at - base).Magnitude <= goalHalf + 6 then
        -- a ball coming in: get onto its path before the dive, so the dive has less to cover
        spot = shotPlan.at
    else
        local toBall = flat(ball.Position - base)
        if toBall.Magnitude > 0.1 then
            spot = base + toBall.Unit * math.min(CFG.Advance, toBall.Magnitude * 0.5)
        end
    end
    local step = flat(spot - root.Position)
    if step.Magnitude > 1 then hum:Move(step.Unit) end
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
    for _, kind in ipairs(KINDS) do on[kind] = false end
    stopLearning()
    pcall(function() RunService:UnbindFromRenderStep("AutoDribbleFace") end)
    for _, c in ipairs(conns) do c:Disconnect() end
    screen:Destroy()
    env.AutoDribbleStop = nil
end

probe()
refresh()
