--[[
    Turbo League - Ball Trajectory Predictor (mobile) v6
    Roblox client Luau, for mobile executors (Delta, Codex, Arceus X, Fluxus...)

    loadstring(game:HttpGet("https://raw.githubusercontent.com/lalalalalabababa2-web/Why-am-i-getting-banned/ccr-c8ff314b-e969wb/roblox/turbo_league_trajectory.lua"))()

    Everything is drawn "x-ray" by default (on top of the floor, ball and walls),
    so rings can't get buried under the grass layer anymore.

    On screen:
      cyan -> purple line   : predicted path, color shifts with time
      orange dots           : bounces
      red ring + timer      : where it next hits the ground
      GREEN RING + BEAM     : where the ball comes to rest (time + distance)
      green edge badge      : points at the stop spot when it's off-screen
      yellow "GO" ring      : earliest spot you can reach before the ball passes it
                              turns orange "LATE" if an opponent gets there first
      red "THEM" ring       : earliest spot the fastest opponent can reach
      pale yellow line      : SHOT PREVIEW - where the ball goes if you hit it now
      pink outline          : ball ESP through walls + speed tag
      white ring            : shadow under the ball while airborne
      top banner            : "GOAL in 1.3s" / "OWN GOAL in 1.3s"

    TRAJ  : tap = on/off, drag = move, hold 1s = info line
    MENU  : toggle every feature, prediction length, line width, low-lag mode
    Settings and learned physics are saved (writefile) and survive rejoining.
]]

---------------------------------------------------------------- config
local CONFIG = {
    BallNames     = { "ball", "soccerball", "gameball", "giantball", "football" },
    MaxPredict    = 16,
    FineTime      = 3,      -- first seconds simulated with small steps
    FineStep      = 1/45,
    CoarseStep    = 1/25,
    FineSegment   = 2,      -- sim steps per drawn segment, near part
    CoarseSegment = 4,      -- sim steps per drawn segment, far part
    ShotTime      = 2.5,
    MaxBounces    = 6,
    RollSpeed     = 18,     -- contacts slower than this into the surface are rolling, not bounces
    StopSpeed     = 2.5,    -- rolling slower than this = stopped
    Friction      = 0.85,
    AirDrag       = 0.03,
    RingSegments  = 24,
    BeamHeight    = 45,
    MinSpeed      = 3,
    ShotRange     = 45,     -- studs from the ball's surface where shot preview kicks in
    SaveFile      = "turbo_traj_v6.json",
}

local C = {
    LineStart = Color3.fromRGB(0, 220, 255),
    LineEnd   = Color3.fromRGB(190, 70, 255),
    Bounce    = Color3.fromRGB(255, 170, 0),
    Land      = Color3.fromRGB(255, 60, 90),
    Stop      = Color3.fromRGB(60, 255, 120),
    Reach     = Color3.fromRGB(255, 230, 40),
    Late      = Color3.fromRGB(255, 130, 40),
    Enemy     = Color3.fromRGB(255, 40, 40),
    Shadow    = Color3.fromRGB(255, 255, 255),
    Shot      = Color3.fromRGB(255, 255, 160),
    Esp       = Color3.fromRGB(255, 80, 200),
    Off       = Color3.fromRGB(150, 150, 150),
    Panel     = Color3.fromRGB(20, 20, 28),
}

local DEFAULTS = {
    path = true, land = true, stop = true, arrow = true, reach = true, shot = true,
    goal = true, esp = true, xray = true, predict = 12, width = 2, lowLag = false,
}
local WIDTHS      = { 0.35, 0.6, 1.0 }
local WIDTH_NAMES = { "thin", "normal", "thick" }
local PREDICTS    = { 4, 8, 12, 16 }

---------------------------------------------------------------- services
local Players     = game:GetService("Players")
local RunService  = game:GetService("RunService")
local UIS         = game:GetService("UserInputService")
local HttpService = game:GetService("HttpService")
local LP          = Players.LocalPlayer

local env = getgenv and getgenv() or {}
if env.__TL_TRAJ then pcall(env.__TL_TRAJ) end

---------------------------------------------------------------- saved state
local saved = {}
pcall(function()
    if isfile and readfile and isfile(CONFIG.SaveFile) then
        saved = HttpService:JSONDecode(readfile(CONFIG.SaveFile))
    end
end)
if type(saved) ~= "table" then saved = {} end

env.__TL_SETTINGS = env.__TL_SETTINGS or (type(saved.settings) == "table" and saved.settings) or {}
local S = env.__TL_SETTINGS
for k, v in pairs(DEFAULTS) do if S[k] == nil then S[k] = v end end

env.__TL_LEARN = env.__TL_LEARN or (type(saved.learn) == "table" and saved.learn) or {}
local learn = env.__TL_LEARN
local function resetLearn(all)
    if all or not learn.g then learn.g = workspace.Gravity end
    if all or not learn.e then learn.e = 0.6 end       -- bounciness
    if all or not learn.roll then learn.roll = 0.4 end -- rolling slowdown per second
    if all or not learn.car then learn.car = 80 end    -- car top ground speed
    if all or not learn.hit then learn.hit = 1.5 end   -- how hard a car hit launches the ball
end
resetLearn(false)

local function saveAll()
    if not writefile then return end
    pcall(function()
        writefile(CONFIG.SaveFile, HttpService:JSONEncode({ settings = S, learn = learn }))
    end)
end

local connections = {}
local function bind(sig, fn) local c = sig:Connect(fn); table.insert(connections, c); return c end

---------------------------------------------------------------- visuals
-- Everything is a HandleAdornment on one origin part, so AlwaysOnTop can draw it through
-- the floor, the ball and walls. Lives under the camera so round cleanups don't touch it.
local MAX_SEGMENTS = math.ceil(CONFIG.FineTime / CONFIG.FineStep / CONFIG.FineSegment)
    + math.ceil((CONFIG.MaxPredict - CONFIG.FineTime) / CONFIG.CoarseStep / CONFIG.CoarseSegment)
    + CONFIG.MaxBounces * 2 + 4
local SHOT_SEGMENTS = math.ceil(CONFIG.ShotTime / CONFIG.FineStep / CONFIG.FineSegment) + CONFIG.MaxBounces * 2 + 4

local folder, origin, adorns
local segs, shotSegs, dots, beam, shotLabel, espHi, espLabel
local rings = {}
local mainHidden, shotHidden = true, true

local function newAdorn(class, color)
    local a = Instance.new(class)
    a.Adornee = origin
    a.AlwaysOnTop = S.xray
    a.ZIndex = 5
    a.Color3 = color
    a.Transparency = 0
    a.Visible = false
    a.Parent = folder
    table.insert(adorns, a)
    return a
end

local function newLabel(color)
    local bb = Instance.new("BillboardGui")
    bb.Adornee = origin
    bb.Size = UDim2.fromOffset(120, 26)
    bb.AlwaysOnTop = true
    bb.LightInfluence = 0
    bb.Enabled = false
    bb.Parent = folder
    local t = Instance.new("TextLabel")
    t.Size = UDim2.fromScale(1, 1)
    t.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
    t.BackgroundTransparency = 0.25
    t.TextColor3 = color
    t.Font = Enum.Font.GothamBold
    t.TextScaled = true
    t.Parent = bb
    Instance.new("UICorner", t).CornerRadius = UDim.new(0, 6)
    return { bb = bb, text = t }
end

-- origin sits at 0,0,0 so StudsOffsetWorldSpace is just the world position
local function setLabel(lbl, worldPos, text, color)
    lbl.bb.StudsOffsetWorldSpace = worldPos
    lbl.text.Text = text
    if color then lbl.text.TextColor3 = color end
    lbl.bb.Enabled = true
end

local function newRing(color, withLabel)
    local r = { boxes = {}, color = color }
    r.disc = newAdorn("CylinderHandleAdornment", color)
    for i = 1, CONFIG.RingSegments do r.boxes[i] = newAdorn("BoxHandleAdornment", color) end
    if withLabel then r.label = newLabel(color) end
    return r
end

local function hideRing(r)
    r.disc.Visible = false
    for _, b in ipairs(r.boxes) do b.Visible = false end
    if r.label then r.label.bb.Enabled = false end
end

local function basis(up)
    local ref = math.abs(up.Y) < 0.99 and Vector3.yAxis or Vector3.xAxis
    local u = ref:Cross(up).Unit
    return u, up:Cross(u).Unit
end

-- ring of boxes + a faint filled disc, lifted a bit off the surface
local function placeRing(r, center, normal, radius, color, text, alpha)
    local up = normal.Unit
    local u, v = basis(up)
    local c = center + up * 0.3
    local n = #r.boxes
    local segLen = 2 * math.pi * radius / n * 1.1
    color = color or r.color
    alpha = alpha or 0.05
    for i, box in ipairs(r.boxes) do
        local th = (i - 1) / n * 2 * math.pi
        local pos = c + (u * math.cos(th) + v * math.sin(th)) * radius
        local tangent = -u * math.sin(th) + v * math.cos(th)
        box.Size = Vector3.new(1, 0.3, segLen)
        box.CFrame = CFrame.lookAt(pos, pos + tangent, up)
        box.Color3 = color
        box.Transparency = alpha
        box.Visible = true
    end
    -- cylinder adornments run along Z; fromMatrix(c, u, v) makes Z = up
    r.disc.Radius = radius
    r.disc.Height = 0.1
    r.disc.CFrame = CFrame.fromMatrix(c, u, v)
    r.disc.Color3 = color
    r.disc.Transparency = 0.78 + alpha * 0.2
    r.disc.Visible = true
    if r.label then
        if text then setLabel(r.label, c + up * 5, text, color) else r.label.bb.Enabled = false end
    end
end

local function hideList(list, from)
    for i = from or 1, #list do list[i].Visible = false end
end

local function buildVisuals()
    if folder then pcall(function() folder:Destroy() end) end
    adorns = {}
    folder = Instance.new("Folder")
    folder.Name = "TL_Trajectory"
    folder.Parent = workspace.CurrentCamera or workspace

    origin = Instance.new("Part")
    origin.Name = "Origin"
    origin.Anchored, origin.CanCollide, origin.CanQuery, origin.CanTouch = true, false, false, false
    origin.Transparency = 1
    origin.Size = Vector3.new(0.05, 0.05, 0.05)
    origin.CFrame = CFrame.new()
    origin.Parent = folder

    segs, shotSegs, dots = {}, {}, {}
    for i = 1, MAX_SEGMENTS do segs[i] = newAdorn("BoxHandleAdornment", C.LineStart) end
    for i = 1, SHOT_SEGMENTS do shotSegs[i] = newAdorn("BoxHandleAdornment", C.Shot) end
    for i = 1, CONFIG.MaxBounces do
        dots[i] = newAdorn("SphereHandleAdornment", C.Bounce)
        dots[i].Radius = 0.9
    end
    beam = newAdorn("BoxHandleAdornment", C.Stop)
    rings.land   = newRing(C.Land, true)
    rings.stop   = newRing(C.Stop, true)
    rings.reach  = newRing(C.Reach, true)
    rings.enemy  = newRing(C.Enemy, true)
    rings.shadow = newRing(C.Shadow, false)
    shotLabel    = newLabel(C.Shot)
    espLabel     = newLabel(C.Esp)

    espHi = Instance.new("Highlight")
    espHi.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
    espHi.FillColor = C.Esp
    espHi.FillTransparency = 0.8
    espHi.OutlineColor = C.Esp
    espHi.OutlineTransparency = 0
    espHi.Enabled = false
    espHi.Parent = folder

    mainHidden, shotHidden = true, true
end

local function visualsAlive()
    return folder and folder.Parent == (workspace.CurrentCamera or workspace)
        and origin and origin.Parent == folder
end

buildVisuals()

---------------------------------------------------------------- ball picking
local candidates, motion, goals = {}, {}, {}
local ball

local function inCharacter(inst)
    local m = inst:FindFirstAncestorOfClass("Model")
    while m do
        if Players:GetPlayerFromCharacter(m) then return true end
        m = m.Parent and m.Parent:FindFirstAncestorOfClass("Model")
    end
    return false
end

local function nameScore(s)
    s = s:lower()
    if s == "ball" then return 100 end
    for _, n in ipairs(CONFIG.BallNames) do
        if s:find(n, 1, true) then return 60 end
    end
    return 0
end

local function isRoundish(p)
    local s = p.Size
    local mx, mn = math.max(s.X, s.Y, s.Z), math.min(s.X, s.Y, s.Z)
    return mn > 1.5 and mn < 80 and mx / mn < 1.25
end

local function considerPart(inst)
    if not inst:IsA("BasePart") or (folder and inst:IsDescendantOf(folder)) then return end
    if not isRoundish(inst) then return end
    local named = nameScore(inst.Name) > 0
        or (inst.Parent and inst.Parent:IsA("Model") and nameScore(inst.Parent.Name) > 0)
    local sphere = inst:IsA("Part") and inst.Shape == Enum.PartType.Ball
    if (named or sphere) and not inCharacter(inst) then candidates[inst] = true end
end

-- goal trigger volumes: non-colliding or invisible parts named "goal", big enough for a goal mouth
local function considerGoal(inst)
    if not inst:IsA("BasePart") then return end
    if not inst.Name:lower():find("goal", 1, true) then return end
    if inst.CanCollide and inst.Transparency < 0.9 then return end
    local s = inst.Size
    local big = (s.X > 6 and 1 or 0) + (s.Y > 6 and 1 or 0) + (s.Z > 6 and 1 or 0)
    if big >= 2 then goals[inst] = true end
end

for _, inst in ipairs(workspace:GetDescendants()) do considerPart(inst); considerGoal(inst) end
bind(workspace.DescendantAdded, function(inst) considerPart(inst); considerGoal(inst) end)
bind(workspace.DescendantRemoving, function(inst)
    candidates[inst], motion[inst], goals[inst] = nil, nil, nil
    if inst == ball then ball = nil end
end)

local function updateMotion()
    for p in pairs(candidates) do
        local m = motion[p]
        local pos = p.Position
        if not m then
            motion[p] = { last = pos, moved = 0 }
        else
            local d = (pos - m.last).Magnitude
            if d < 40 then m.moved = m.moved * 0.98 + d end -- ~1s memory, ignores teleports
            m.last = pos
        end
    end
end

local function visible(p)
    return p.Transparency < 0.95 and p.LocalTransparencyModifier < 0.95
end

local function score(p)
    if not (p.Parent and p:IsDescendantOf(workspace)) then return -math.huge end
    local s = nameScore(p.Name)
    if p.Parent:IsA("Model") then s = math.max(s, nameScore(p.Parent.Name) * 0.8) end
    s += visible(p) and 60 or -80
    s += math.min((motion[p] and motion[p].moved or 0) * 3, 150)
    s += math.min(p.Size.X, 30)
    return s
end

local pickTimer = 0
local function pickBall(dt)
    pickTimer -= dt
    if ball and ball.Parent and pickTimer > 0 then return ball end
    pickTimer = 0.5
    local best, bestScore = nil, -math.huge
    for p in pairs(candidates) do
        local s = score(p)
        if s > bestScore then best, bestScore = p, s end
    end
    if ball and ball.Parent and best ~= ball and bestScore < score(ball) + 25 then
        return ball
    end
    ball = best
    return ball
end

local function goalCount()
    local n = 0
    for _ in pairs(goals) do n += 1 end
    return n
end

---------------------------------------------------------------- velocity (least-squares fit)
-- A line fit through recent positions beats frame deltas: replication arrives in bursts.
-- Gravity comes from a parabola fit on Y.
local samples = {}
local SAMPLE_KEEP = 0.4
local VEL_WINDOW  = 0.12
local hideUntil, trackedPart, kickoffAt, airSince = 0, nil, nil, nil
local smoothVel = Vector3.zero

local function resetTracking()
    table.clear(samples)
    smoothVel = Vector3.zero
end

local function fitVelocity(now)
    local n, st, sp = 0, 0, Vector3.zero
    for i = #samples, 1, -1 do
        local s = samples[i]
        if now - s.t > VEL_WINDOW and n >= 3 then break end
        n += 1; st += s.t; sp += s.p
    end
    if n < 2 then return Vector3.zero end
    local tm, pm = st / n, sp / n
    local num, den = Vector3.zero, 0
    for i = #samples, #samples - n + 1, -1 do
        local s = samples[i]
        local dt = s.t - tm
        num += (s.p - pm) * dt
        den += dt * dt
    end
    if den < 1e-6 then return Vector3.zero end
    return num / den
end

local function fitGravity()
    local n = #samples
    if n < 8 or samples[n].t - samples[1].t < 0.25 then return nil end
    local t0 = samples[1].t
    local S0, S1, S2, S3, S4, Y0, Y1, Y2 = 0, 0, 0, 0, 0, 0, 0, 0
    for _, s in ipairs(samples) do
        local t, y = s.t - t0, s.p.Y
        local t2 = t * t
        S0 += 1; S1 += t; S2 += t2; S3 += t2 * t; S4 += t2 * t2
        Y0 += y; Y1 += y * t; Y2 += y * t2
    end
    local function det(a, b, c, d, e, f, g, h, i)
        return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    end
    local D = det(S0, S1, S2, S1, S2, S3, S2, S3, S4)
    if math.abs(D) < 1e-9 then return nil end
    return 2 * det(S0, S1, Y0, S1, S2, Y1, S2, S3, Y2) / D
end

local function trackBall(b, now, radius)
    if b ~= trackedPart then trackedPart = b; resetTracking(); airSince = nil end
    local pos = b.Position
    local last = samples[#samples]

    if last and (pos - last.p).Magnitude > math.max(50, radius * 6) then
        resetTracking()            -- respawn / kickoff teleport
        hideUntil = now + 0.3
        kickoffAt = now
        last = nil
    end
    if not last or (pos - last.p).Magnitude > 1e-3 then
        table.insert(samples, { t = now, p = pos })
    end
    while #samples > 3 and now - samples[1].t > SAMPLE_KEEP do table.remove(samples, 1) end

    local physVel = b.AssemblyLinearVelocity
    local raw
    if physVel.Magnitude > 0.5 and not b.Anchored then
        raw = physVel
    elseif samples[#samples] and now - samples[#samples].t > 0.25 then
        raw = Vector3.zero
    else
        raw = fitVelocity(now)
    end
    smoothVel = smoothVel:Lerp(raw, 0.5)
    return smoothVel
end

---------------------------------------------------------------- raycast filters
local rayParams = RaycastParams.new()          -- physics: what the ball actually bounces on
rayParams.FilterType = Enum.RaycastFilterType.Exclude
rayParams.RespectCanCollide = true

local visParams = RaycastParams.new()          -- visuals: the surface you actually see
visParams.FilterType = Enum.RaycastFilterType.Exclude
visParams.RespectCanCollide = false

local cars = {}
local function considerSeat(inst)
    if inst:IsA("VehicleSeat") then
        local m = inst:FindFirstAncestorOfClass("Model")
        if m and m ~= workspace then cars[m] = true end
    end
end
for _, inst in ipairs(workspace:GetDescendants()) do considerSeat(inst) end
bind(workspace.DescendantAdded, considerSeat)

local function refreshFilter(b)
    local ignore = { folder, b }
    if b.Parent and b.Parent:IsA("Model") then table.insert(ignore, b.Parent) end
    for _, plr in ipairs(Players:GetPlayers()) do
        if plr.Character then table.insert(ignore, plr.Character) end
    end
    for m in pairs(cars) do
        if m.Parent then table.insert(ignore, m) else cars[m] = nil end
    end
    rayParams.FilterDescendantsInstances = ignore
    visParams.FilterDescendantsInstances = ignore
end

-- lift a physics contact point up to the visible surface (grass layers etc.)
local function surfaceAt(pos, normal)
    normal = normal or Vector3.yAxis
    local hit = workspace:Raycast(pos + normal * 6, -normal * 9, visParams)
    if hit and hit.Instance.Transparency < 0.9 then return hit.Position, hit.Normal end
    return pos, normal
end

local function groundUnder(p, radius)
    local hit = workspace:Raycast(p, Vector3.new(0, -(radius + 40), 0), rayParams)
    if hit then return surfaceAt(hit.Position, hit.Normal) end
    return p - Vector3.new(0, radius, 0), Vector3.yAxis
end

---------------------------------------------------------------- learning
local vyLog, rollLog = {}, {}
local pendingBounce, pendingHit
local prevVel = Vector3.zero

local function learnFromMotion(b, vel, now, radius)
    local ground = workspace:Raycast(b.Position, Vector3.new(0, -(radius + 3), 0), rayParams)
    local ceiling = workspace:Raycast(b.Position, Vector3.new(0, radius + 3, 0), rayParams)
    local airborne = not ground and not ceiling

    -- gravity: parabola fit, only once the whole sample window is free flight (no bounce inside)
    airSince = airborne and (airSince or now) or nil
    if airSince and now - airSince > SAMPLE_KEEP and #samples >= 8 then
        local a = fitGravity()
        if a and a < 0 then
            local g = math.clamp(-a, workspace.Gravity * 0.2, workspace.Gravity * 1.5)
            learn.g += (g - learn.g) * 0.08
        end
    end

    -- bounciness: vy hard negative -> positive near the floor
    table.insert(vyLog, { t = now, vy = vel.Y })
    while #vyLog > 0 and now - vyLog[1].t > 0.3 do table.remove(vyLog, 1) end
    if not pendingBounce and ground and vel.Y > 3 then
        local vin = 0
        for _, e in ipairs(vyLog) do vin = math.min(vin, e.vy) end
        if vin < -25 then pendingBounce = { t = now, vin = vin, vout = vel.Y } end
    elseif pendingBounce then
        pendingBounce.vout = math.max(pendingBounce.vout, vel.Y)
        if now - pendingBounce.t > 0.15 then
            local e = math.clamp(pendingBounce.vout / -pendingBounce.vin, 0.15, 0.95)
            learn.e += (e - learn.e) * 0.25
            pendingBounce = nil
        end
    end

    -- rolling slowdown: exponential decay of ground speed while nothing touches it
    local h = Vector3.new(vel.X, 0, vel.Z).Magnitude
    if ground and math.abs(vel.Y) < 4 and h > 6 then
        table.insert(rollLog, { t = now, h = h })
        while #rollLog > 0 and now - rollLog[1].t > 0.5 do table.remove(rollLog, 1) end
        local first = rollLog[1]
        local span = now - first.t
        if span > 0.35 then
            local ratio = h / first.h
            if ratio > 0.4 and ratio < 1.0 then
                local k = math.clamp(-math.log(ratio) / span, 0.02, 3)
                learn.roll += (k - learn.roll) * 0.1
            end
            table.clear(rollLog)
        end
    else
        table.clear(rollLog)
    end
end

-- hit strength: when your car smacks the ball, compare the ball's speed change to the closing speed
local function learnHit(b, vel, now, radius, car)
    if pendingHit then
        if now - pendingHit.t > 0.12 then
            local dv = (vel - pendingHit.before):Dot(pendingHit.n)
            local f = math.clamp(dv / pendingHit.rel, 0.4, 3)
            learn.hit += (f - learn.hit) * 0.2
            pendingHit = nil
        end
    elseif car and (vel - prevVel).Magnitude > 30 then
        local toBall = b.Position - car.Position
        if toBall.Magnitude < radius + 10 then
            local n = toBall.Unit
            local rel = (car.AssemblyLinearVelocity - prevVel):Dot(n)
            if rel > 10 then pendingHit = { t = now, before = prevVel, n = n, rel = rel } end
        end
    end
    prevVel = vel
end

---------------------------------------------------------------- cars
-- works whether the car is a seat-driven model or the character itself
local function carPartOf(plr)
    local char = plr.Character
    if not char then return nil end
    local hum = char:FindFirstChildOfClass("Humanoid")
    if hum and hum.SeatPart then return hum.SeatPart end
    return char.PrimaryPart or char:FindFirstChild("HumanoidRootPart")
end

local function updateCarSpeed(car, dt)
    local v = car.AssemblyLinearVelocity
    local h = Vector3.new(v.X, 0, v.Z).Magnitude
    if h < 400 then
        -- fastest it's gone, drifting down slowly so one boost spike doesn't stick
        learn.car = math.max(learn.car - 2 * dt, h, 40)
    end
end

local function enemyCars()
    local list = {}
    for _, plr in ipairs(Players:GetPlayers()) do
        if plr ~= LP and (not LP.Team or not plr.Team or plr.Team ~= LP.Team) then
            local cp = carPartOf(plr)
            if cp then table.insert(list, cp) end
        end
    end
    return list
end

---------------------------------------------------------------- goals
local ownGoalPos

local function goalAt(p)
    for g in pairs(goals) do
        if g.Parent then
            local l = g.CFrame:PointToObjectSpace(p)
            local h = g.Size / 2
            if math.abs(l.X) <= h.X and math.abs(l.Y) <= h.Y and math.abs(l.Z) <= h.Z then
                return g
            end
        end
    end
    return nil
end

local function nearestGoal(pos)
    local best, bd = nil, math.huge
    for g in pairs(goals) do
        local d = (g.Position - pos).Magnitude
        if d < bd then best, bd = g.Position, d end
    end
    return best
end

-- true = yours, false = theirs, nil = don't know yet
local function isOwnGoal(g)
    if not ownGoalPos or not g then return nil end
    return (g.Position - ownGoalPos).Magnitude < 60
end

---------------------------------------------------------------- simulation
local function cast(origin_, radius, dir)
    if dir.Magnitude < 1e-4 then return nil end
    local ok, res = pcall(workspace.Spherecast, workspace, origin_, radius, dir, rayParams)
    if ok then return res end
    return workspace:Raycast(origin_, dir + dir.Unit * radius, rayParams)
end

-- points {p, t}; bounces; land {pos, normal, t}; stop {pos, normal, t, settled}; goalT; goalPart
local function simulate(pos, vel, radius, maxTime)
    local g     = Vector3.new(0, -learn.g, 0)
    -- cast a hair smaller than the ball and rest it exactly that far off surfaces: a bigger gap
    -- makes it "fall" into every contact and micro-bounce forever, so it never settles
    local castR = math.min(math.max(radius - 0.1, radius * 0.5), 250)
    local rest  = castR + 0.05

    -- a ball sitting slightly sunk into the floor would start the cast inside it and fall through
    local under = workspace:Raycast(pos, Vector3.new(0, -(radius + 2), 0), rayParams)
    if under and (pos - under.Position):Dot(under.Normal) < rest then
        pos = under.Position + under.Normal * rest
    end

    local points  = { { p = pos, t = 0 } }
    local bounces = {}
    local land, stop, goalT, goalPart
    local rolling, rollNormal = false, Vector3.yAxis
    local t, i = 0, 0
    local startedInGoal = goalAt(pos) ~= nil

    while t < maxTime do
        i += 1
        local fine = t < CONFIG.FineTime
        local dt = fine and CONFIG.FineStep or CONFIG.CoarseStep
        t += dt

        if rolling then
            local gAlong = g - rollNormal * g:Dot(rollNormal)
            vel = (vel + gAlong * dt) * math.exp(-learn.roll * dt)
        else
            vel = (vel + g * dt) * (1 - CONFIG.AirDrag * dt)
        end

        local move = vel * dt
        local hit  = cast(pos, castR, move)

        if hit then
            local n = hit.Normal
            local into = -vel:Dot(n)
            pos = hit.Position + n * rest
            local vn = n * vel:Dot(n)

            if into < CONFIG.RollSpeed then
                vel -= vn
                if n.Y > 0.6 then
                    if not rolling and not land then land = { pos = hit.Position, normal = n, t = t } end
                    rolling, rollNormal = true, n
                end
            else
                vel = (vel - vn) * CONFIG.Friction - vn * learn.e
                rolling = false
                table.insert(points, { p = pos, t = t })
                if #bounces < CONFIG.MaxBounces then table.insert(bounces, pos) end
                if not land and n.Y > 0.6 then land = { pos = hit.Position, normal = n, t = t } end
            end
        else
            pos += move
            if rolling then
                local support = workspace:Raycast(pos, -rollNormal * (radius + 1), rayParams)
                if support then rollNormal = support.Normal else rolling = false end
            end
        end

        if not goalT and not startedInGoal then
            local gp = goalAt(pos)
            if gp then goalT, goalPart = t, gp end
        end

        if i % (fine and CONFIG.FineSegment or CONFIG.CoarseSegment) == 0 then
            table.insert(points, { p = pos, t = t })
        end

        if rolling and vel.Magnitude < CONFIG.StopSpeed then
            stop = { pos = pos - rollNormal * rest, normal = rollNormal, t = t, settled = true }
            break
        end
    end

    table.insert(points, { p = pos, t = t })
    if not stop then
        local floor = workspace:Raycast(pos, Vector3.new(0, -500, 0), rayParams)
        stop = {
            pos = floor and floor.Position or (pos - Vector3.new(0, radius, 0)),
            normal = floor and floor.Normal or Vector3.yAxis,
            t = t, settled = false,
        }
    end
    return points, bounces, land, stop, goalT, goalPart
end

-- earliest path point a car at cp can drive to before the ball gets there
local function findReach(points, radius, cp)
    local speed = math.max(learn.car, 40)
    for _, pt in ipairs(points) do
        if pt.p.Y - radius <= cp.Y + 6 then -- low enough to touch from the ground
            local flat = Vector3.new(pt.p.X - cp.X, 0, pt.p.Z - cp.Z).Magnitude
            if flat / speed + 0.25 <= pt.t then return pt end
        end
    end
    return nil
end

-- rough launch velocity if your car hits the ball right now
local function shotVelocity(b, ballVel, radius, car)
    if not car then return nil end
    local toBall = b.Position - car.Position
    if toBall.Magnitude - radius > CONFIG.ShotRange then return nil end
    local n = toBall.Unit
    local cv = car.AssemblyLinearVelocity
    local rel = (cv - ballVel):Dot(n)
    if rel < 8 then return nil end
    local dir = cv.Magnitude > 1 and (n * 0.6 + cv.Unit * 0.4).Unit or n
    return ballVel * 0.3 + dir * rel * learn.hit
end

---------------------------------------------------------------- UI
local enabled, showInfo = true, false

local gui = Instance.new("ScreenGui")
gui.Name = "TL_TrajectoryUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.DisplayOrder = 999
local okParent = pcall(function() gui.Parent = (gethui and gethui()) or game:GetService("CoreGui") end)
if not okParent or not gui.Parent then gui.Parent = LP:WaitForChild("PlayerGui") end

local function corner(inst, r) Instance.new("UICorner", inst).CornerRadius = UDim.new(0, r) end

local holder = Instance.new("Frame")
holder.Size = UDim2.fromOffset(176, 38) -- just the buttons; panel/info hang below without blocking touches
holder.Position = UDim2.new(0.5, -90, 0, 70)
holder.BackgroundTransparency = 1
holder.Parent = gui

local function topButton(text, x, w)
    local b = Instance.new("TextButton")
    b.Size = UDim2.fromOffset(w, 38)
    b.Position = UDim2.fromOffset(x, 0)
    b.BackgroundColor3 = C.Panel
    b.BackgroundTransparency = 0.1
    b.TextColor3 = C.LineStart
    b.Font = Enum.Font.GothamBold
    b.TextSize = 14
    b.Text = text
    b.AutoButtonColor = false
    b.Parent = holder
    corner(b, 10)
    local st = Instance.new("UIStroke", b)
    st.Color = C.LineStart
    st.Thickness = 1.5
    return b, st
end

local btn, btnStroke = topButton("TRAJ ON", 0, 100)
local menuBtn = topButton("MENU", 106, 70)

local info = Instance.new("TextLabel")
info.Size = UDim2.fromOffset(300, 30)
info.Position = UDim2.fromOffset(0, 42)
info.BackgroundTransparency = 0.35
info.BackgroundColor3 = Color3.fromRGB(10, 10, 14)
info.TextColor3 = Color3.fromRGB(220, 220, 220)
info.Font = Enum.Font.Code
info.TextSize = 10
info.TextWrapped = true
info.Visible = false
info.Parent = holder
corner(info, 6)

local panel = Instance.new("ScrollingFrame")
panel.Size = UDim2.fromOffset(230, 250)
panel.Position = UDim2.fromOffset(0, 76)
panel.CanvasSize = UDim2.new()
panel.AutomaticCanvasSize = Enum.AutomaticSize.Y
panel.ScrollBarThickness = 4
panel.BackgroundColor3 = C.Panel
panel.BackgroundTransparency = 0.08
panel.BorderSizePixel = 0
panel.Visible = false
panel.Parent = holder
corner(panel, 10)
local list = Instance.new("UIListLayout", panel)
list.Padding = UDim.new(0, 4)
list.SortOrder = Enum.SortOrder.LayoutOrder
local pad = Instance.new("UIPadding", panel)
pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 6), UDim.new(0, 6)
pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 6), UDim.new(0, 10)

local banner = Instance.new("TextLabel")
banner.AnchorPoint = Vector2.new(0.5, 0)
banner.Position = UDim2.new(0.5, 0, 0, 120)
banner.Size = UDim2.fromOffset(220, 34)
banner.BackgroundTransparency = 0.1
banner.TextColor3 = Color3.new(1, 1, 1)
banner.Font = Enum.Font.GothamBlack
banner.TextSize = 18
banner.Visible = false
banner.Parent = gui
corner(banner, 10)

-- off-screen pointer for the stop spot: badge pinned to the screen edge + a tip aimed at it
local edge = Instance.new("TextLabel")
edge.AnchorPoint = Vector2.new(0.5, 0.5)
edge.Size = UDim2.fromOffset(56, 56)
edge.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
edge.BackgroundTransparency = 0.2
edge.TextColor3 = C.Stop
edge.Font = Enum.Font.GothamBold
edge.TextSize = 13
edge.TextWrapped = true
edge.Visible = false
edge.Parent = gui
Instance.new("UICorner", edge).CornerRadius = UDim.new(1, 0)
local edgeStroke = Instance.new("UIStroke", edge)
edgeStroke.Color = C.Stop
edgeStroke.Thickness = 2

local tip = Instance.new("Frame")
tip.AnchorPoint = Vector2.new(0.5, 0.5)
tip.Size = UDim2.fromOffset(16, 16)
tip.BackgroundColor3 = C.Stop
tip.BorderSizePixel = 0
tip.Visible = false
tip.Parent = gui

---------------------------------------------------------------- markers (smoothed every frame)
local function newMarker() return { show = false, normal = Vector3.yAxis } end
local markers = { land = newMarker(), stop = newMarker(), reach = newMarker(), enemy = newMarker() }
local targets = {}

local function hideMain()
    if mainHidden or not visualsAlive() then return end
    mainHidden = true
    hideList(segs); hideList(dots)
    for _, r in pairs(rings) do hideRing(r) end
    beam.Visible = false
    edge.Visible, tip.Visible, banner.Visible = false, false, false
    table.clear(targets)
    for _, m in pairs(markers) do m.show = false end
end

local function hideShot()
    if shotHidden or not visualsAlive() then return end
    shotHidden = true
    hideList(shotSegs)
    shotLabel.bb.Enabled = false
end

local function hideEsp()
    if not visualsAlive() then return end
    espHi.Enabled = false
    espLabel.bb.Enabled = false
end

local function hideAll() hideMain(); hideShot(); hideEsp() end

-- markers glide toward the newest sim result so they don't jitter between sims
local function steer(m, target, dt)
    if not target then m.show = false; return end
    if not m.show or not m.pos or (target.pos - m.pos).Magnitude > 40 then
        m.pos = target.pos
    else
        m.pos = m.pos:Lerp(target.pos, 1 - math.exp(-dt * 14))
    end
    m.normal, m.text, m.color, m.edgeText, m.show = target.normal, target.text, target.color, target.edgeText, true
end

local function updateEdgeArrow(worldPos, label, color)
    local cam = workspace.CurrentCamera
    local vp, onScreen = cam:WorldToViewportPoint(worldPos)
    if onScreen and vp.Z > 0 then
        edge.Visible, tip.Visible = false, false
        return
    end
    local center = cam.ViewportSize / 2
    local dir = Vector2.new(vp.X, vp.Y) - center
    if vp.Z < 0 then dir = -dir end -- behind the camera the projection is mirrored
    if dir.Magnitude < 1e-3 then dir = Vector2.new(0, 1) end
    dir = dir.Unit
    local margin = 46
    local sx = dir.X ~= 0 and (center.X - margin) / math.abs(dir.X) or math.huge
    local sy = dir.Y ~= 0 and (center.Y - margin) / math.abs(dir.Y) or math.huge
    local at = center + dir * math.min(sx, sy)
    edge.Position = UDim2.fromOffset(at.X, at.Y)
    edge.Text = label
    edge.TextColor3, edgeStroke.Color, tip.BackgroundColor3 = color, color, color
    edge.Visible = true
    local tp = at + dir * 35
    tip.Position = UDim2.fromOffset(tp.X, tp.Y)
    tip.Rotation = math.deg(math.atan2(dir.Y, dir.X)) + 45
    tip.Visible = true
end

local pulse = 0

local function drawMarkers(b, radius, dt)
    pulse += dt
    local wobble = 1 + 0.08 * math.sin(pulse * 6)
    local ringR = math.max(3, radius * 1.1)
    for k, m in pairs(markers) do steer(m, targets[k], dt) end

    local m = markers.land
    if m.show then placeRing(rings.land, m.pos, m.normal, ringR * wobble, nil, m.text) else hideRing(rings.land) end

    m = markers.stop
    if m.show then
        placeRing(rings.stop, m.pos, m.normal, ringR * 1.3 * (2 - wobble), m.color, m.text)
        -- light beam so the stop spot is visible from across the field
        local up = m.normal.Unit
        local u = basis(up)
        beam.Size = Vector3.new(1.2, CONFIG.BeamHeight, 1.2)
        beam.CFrame = CFrame.fromMatrix(m.pos + up * (CONFIG.BeamHeight / 2), u, up)
        beam.Color3 = m.color
        beam.Transparency = 0.45 + 0.1 * math.sin(pulse * 4)
        beam.Visible = true
        if S.arrow then
            updateEdgeArrow(m.pos, m.edgeText or "STOP", m.color)
        else
            edge.Visible, tip.Visible = false, false
        end
    else
        hideRing(rings.stop)
        beam.Visible = false
        edge.Visible, tip.Visible = false, false
    end

    m = markers.reach
    if m.show then placeRing(rings.reach, m.pos, m.normal, ringR * 0.8, m.color, m.text) else hideRing(rings.reach) end

    m = markers.enemy
    if m.show then placeRing(rings.enemy, m.pos, m.normal, ringR * 0.7, nil, m.text, 0.25) else hideRing(rings.enemy) end

    local below = workspace:Raycast(b.Position, Vector3.new(0, -300, 0), rayParams)
    if below and (b.Position.Y - below.Position.Y) > radius + 3 then
        local height = b.Position.Y - below.Position.Y
        local sp, sn = surfaceAt(below.Position, below.Normal)
        placeRing(rings.shadow, sp, sn, radius, nil, nil, math.clamp(0.3 + height / 150, 0.3, 0.8))
    else
        hideRing(rings.shadow)
    end
end

---------------------------------------------------------------- path + shot drawing (at sim rate)
local function drawSegments(pool, points, startColor, endColor, baseAlpha)
    local w = WIDTHS[S.width] or 0.6
    local used = 0
    local total = math.max(points[#points].t, 1e-3)
    for i = 1, #points - 1 do
        if used >= #pool then break end
        local a, z = points[i].p, points[i + 1].p
        local len = (z - a).Magnitude
        if len > 0.01 then
            used += 1
            local s = pool[used]
            local frac = points[i].t / total
            s.Size = Vector3.new(w, w, len)
            s.CFrame = CFrame.lookAt(a, z) * CFrame.new(0, 0, -len / 2)
            s.Color3 = startColor:Lerp(endColor, frac)
            s.Transparency = baseAlpha + 0.5 * frac
            s.Visible = true
        end
    end
    hideList(pool, used + 1)
end

local function goalText(prefix, t, g)
    local own = isOwnGoal(g)
    if own == true then return string.format("OWN GOAL %s%.1fs", prefix, t), C.Enemy end
    if own == false then return string.format("GOAL %s%.1fs", prefix, t), C.Stop end
    return string.format("GOAL %s%.1fs", prefix, t), C.Late
end

local function drawPrediction(b, radius, vel, myCar)
    local pts, bnc, land, stop, goalT, goalPart = simulate(b.Position, vel, radius, S.predict)

    if S.path then
        drawSegments(segs, pts, C.LineStart, C.LineEnd, 0.05)
        for i, d in ipairs(dots) do
            local p = bnc[i]
            if p then d.CFrame = CFrame.new(p); d.Visible = true else d.Visible = false end
        end
    else
        hideList(segs); hideList(dots)
    end

    if S.land and land and land.t > 0.12 then
        local p, n = surfaceAt(land.pos, land.normal)
        targets.land = { pos = p, normal = n, text = string.format("%.1fs", land.t) }
    else
        targets.land = nil
    end

    if S.stop and stop and (stop.pos - b.Position).Magnitude > radius * 2 then
        local p, n = surfaceAt(stop.pos, stop.normal)
        local dist = math.floor((stop.pos - b.Position).Magnitude)
        targets.stop = {
            pos = p, normal = n,
            color = stop.settled and C.Stop or C.Shadow,
            text = stop.settled and string.format("STOP %.1fs · %d", stop.t, dist)
                or string.format("%ds+ · %d", math.floor(S.predict), dist),
            edgeText = stop.settled and string.format("STOP\n%.0fs", stop.t) or "BALL",
        }
    else
        targets.stop = nil
    end

    targets.reach, targets.enemy = nil, nil
    if S.reach and myCar then
        local mine = findReach(pts, radius, myCar.Position)
        local best, bestT = nil, math.huge
        for _, ec in ipairs(enemyCars()) do
            local r = findReach(pts, radius, ec.Position)
            if r and r.t < bestT then best, bestT = r, r.t end
        end
        if mine and mine.t > 0.15 then
            local win = mine.t <= bestT
            local p, n = groundUnder(mine.p, radius)
            targets.reach = {
                pos = p, normal = n,
                color = win and C.Reach or C.Late,
                text = best and string.format("%s %.1fs · them %.1fs", win and "GO" or "LATE", mine.t, bestT)
                    or string.format("GO %.1fs", mine.t),
            }
        end
        if best and bestT > 0.15 then
            local p, n = groundUnder(best.p, radius)
            targets.enemy = { pos = p, normal = n, text = string.format("THEM %.1fs", bestT) }
        end
    end

    if S.goal and goalT then
        local text, color = goalText("in ", goalT, goalPart)
        banner.Text, banner.BackgroundColor3, banner.Visible = text, color, true
    else
        banner.Visible = false
    end
end

local function drawShot(b, radius, vel, myCar)
    if not S.shot then return false end
    local sv = shotVelocity(b, vel, radius, myCar)
    if not sv then return false end
    local pts, _, _, _, goalT, goalPart = simulate(b.Position, sv, radius, CONFIG.ShotTime)
    drawSegments(shotSegs, pts, C.Shot, C.Shot, 0.15)
    local labelPos = b.Position + Vector3.new(0, radius + 8, 0)
    if goalT then
        local text, color = goalText("", goalT, goalPart)
        setLabel(shotLabel, labelPos, "SHOT: " .. text, color)
    else
        setLabel(shotLabel, labelPos, "SHOT", C.Shot)
    end
    shotHidden = false
    return true
end

local function updateEsp(b, vel, radius)
    if not S.esp then hideEsp(); return end
    if espHi.Adornee ~= b then espHi.Adornee = b end
    espHi.Enabled = true
    setLabel(espLabel, b.Position + Vector3.new(0, radius + 3, 0),
        string.format("%d sps", math.floor(vel.Magnitude)), C.Esp)
end

---------------------------------------------------------------- menu
local function applySettings()
    for _, a in ipairs(adorns) do a.AlwaysOnTop = S.xray end
    hideAll()
    saveAll()
end

local function row()
    local b = Instance.new("TextButton")
    b.Size = UDim2.new(1, 0, 0, 30)
    b.BackgroundColor3 = Color3.fromRGB(35, 35, 46)
    b.BorderSizePixel = 0
    b.Font = Enum.Font.GothamBold
    b.TextSize = 13
    b.AutoButtonColor = true
    b.Parent = panel
    corner(b, 6)
    return b
end

local function addToggle(key, label)
    local b = row()
    local function refresh()
        b.Text = label .. ": " .. (S[key] and "ON" or "OFF")
        b.TextColor3 = S[key] and C.LineStart or C.Off
    end
    bind(b.Activated, function()
        S[key] = not S[key]
        refresh(); applySettings()
    end)
    refresh()
end

local function addCycle(label, key, options, fmt)
    local b = row()
    b.TextColor3 = C.Reach
    local function refresh() b.Text = label .. ": " .. fmt(S[key]) end
    bind(b.Activated, function()
        local idx = table.find(options, S[key]) or 0
        S[key] = options[idx % #options + 1]
        refresh(); applySettings()
    end)
    refresh()
end

addToggle("path",   "Path line")
addToggle("stop",   "Stop ring + beam")
addToggle("arrow",  "Off-screen arrow")
addToggle("land",   "Landing ring")
addToggle("reach",  "Reach / race rings")
addToggle("shot",   "Shot preview")
addToggle("goal",   "Goal alert")
addToggle("esp",    "Ball ESP")
addToggle("xray",   "X-ray (draw on top)")
addToggle("lowLag", "Low lag mode")
addCycle("Predict", "predict", PREDICTS, function(v) return v .. "s" end)
addCycle("Line", "width", { 1, 2, 3 }, function(v) return WIDTH_NAMES[v] or "normal" end)
do
    local b = row()
    b.Text = "Reset learned physics"
    b.TextColor3 = C.Land
    bind(b.Activated, function()
        resetLearn(true)
        saveAll()
        b.Text = "Reset done"
        task.delay(1.2, function() if b.Parent then b.Text = "Reset learned physics" end end)
    end)
end

bind(menuBtn.Activated, function() panel.Visible = not panel.Visible end)

local function setEnabled(on)
    enabled = on
    btn.Text = on and "TRAJ ON" or "TRAJ OFF"
    btn.TextColor3 = on and C.LineStart or C.Off
    btnStroke.Color = btn.TextColor3
end

-- TRAJ: tap = toggle, hold = info line, drag = move the whole UI
do
    local dragging, startInput, startPos, moved, downAt
    bind(btn.InputBegan, function(input)
        if input.UserInputType == Enum.UserInputType.Touch
        or input.UserInputType == Enum.UserInputType.MouseButton1 then
            dragging, moved, downAt = true, false, os.clock()
            startInput, startPos = input.Position, holder.Position
        end
    end)
    bind(UIS.InputChanged, function(input)
        if not dragging then return end
        if input.UserInputType == Enum.UserInputType.Touch
        or input.UserInputType == Enum.UserInputType.MouseMovement then
            local d = input.Position - startInput
            if d.Magnitude > 10 then moved = true end
            if moved then
                holder.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X,
                                            startPos.Y.Scale, startPos.Y.Offset + d.Y)
            end
        end
    end)
    bind(UIS.InputEnded, function(input)
        if not dragging then return end
        if input.UserInputType == Enum.UserInputType.Touch
        or input.UserInputType == Enum.UserInputType.MouseButton1 then
            dragging = false
            if moved then return end
            if os.clock() - downAt > 0.8 then
                showInfo = not showInfo
                info.Visible = showInfo
                panel.Position = UDim2.fromOffset(0, showInfo and 76 or 42)
            else
                setEnabled(not enabled)
            end
        end
    end)
end
panel.Position = UDim2.fromOffset(0, 42)

---------------------------------------------------------------- main loop
local filterTimer, infoTimer, simTimer, saveTimer = 0, 0, 0, 15

bind(RunService.RenderStepped, function(dt)
    updateMotion()
    if not visualsAlive() then buildVisuals() end
    if not enabled then hideAll(); return end

    local b = pickBall(dt)
    if not b then hideAll(); info.Text = "looking for the ball..."; return end

    local now = os.clock()
    local radius = math.min(b.Size.X, b.Size.Y, b.Size.Z) / 2
    local myCar = carPartOf(LP)
    if myCar then updateCarSpeed(myCar, dt) end

    filterTimer -= dt
    if filterTimer <= 0 then refreshFilter(b); filterTimer = 1 end

    local vel = trackBall(b, now, radius)
    learnFromMotion(b, vel, now, radius)
    learnHit(b, vel, now, radius, myCar)

    -- shortly after a kickoff reset, the goal nearest your car is yours
    if kickoffAt and now - kickoffAt > 1.5 then
        kickoffAt = nil
        if myCar and next(goals) then ownGoalPos = nearestGoal(myCar.Position) end
    end

    saveTimer -= dt
    if saveTimer <= 0 then saveTimer = 15; saveAll() end

    updateEsp(b, vel, radius)

    if showInfo then
        infoTimer -= dt
        if infoTimer <= 0 then
            infoTimer = 0.25
            info.Text = string.format(
                "%s r%.0f %.0fsps | g%.0f e%.2f roll%.2f hit%.2f car%.0f\ngoals%d%s | car:%s | stop:%s land:%s",
                b.Name, radius, vel.Magnitude, learn.g, learn.e, learn.roll, learn.hit, learn.car,
                goalCount(), ownGoalPos and " (own known)" or "",
                myCar and "yes" or "no",
                markers.stop.show and "yes" or "no", markers.land.show and "yes" or "no")
        end
    end

    simTimer -= dt
    local simNow = simTimer <= 0
    if simNow then simTimer = 1 / (S.lowLag and 10 or 20) end

    -- shot preview runs even while the ball sits still (kickoffs, resting ball)
    if simNow and not drawShot(b, radius, vel, myCar) then hideShot() end

    if now < hideUntil or vel.Magnitude < CONFIG.MinSpeed then hideMain(); return end
    if simNow or mainHidden then
        drawPrediction(b, radius, vel, myCar)
        mainHidden = false
    end
    drawMarkers(b, radius, dt)
end)

---------------------------------------------------------------- cleanup hook
env.__TL_TRAJ = function()
    for _, c in ipairs(connections) do c:Disconnect() end
    saveAll()
    if folder then folder:Destroy() end
    gui:Destroy()
end
