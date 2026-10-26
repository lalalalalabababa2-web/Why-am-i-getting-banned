--[[
    Turbo League - Ball Trajectory Predictor (mobile) v4, fully automatic
    Roblox client Luau, for mobile executors (Delta, Codex, Arceus X, Fluxus...)

    Run once and forget it:
      - finds the ball by itself and re-checks every half second
      - predicts up to 6s ahead: flight, wall/ceiling bounces, rolling, and where it STOPS
      - learns the ball's gravity, bounciness and rolling slowdown from how it actually moves
      - rebuilds its visuals if the game wipes them between rounds

    On screen:
      cyan -> purple line : the path, color shifts with time
      orange dots         : bounces
      red ring + timer    : where it next hits the ground and in how many seconds
      green ring + timer  : where the ball comes to rest (white if it's still moving at 6s)
      white ring          : shadow straight under the ball while it's in the air

    TRAJ button : tap = on/off, drag = move, hold 1s = show/hide the info line
]]

---------------------------------------------------------------- config
local CONFIG = {
    BallNames       = { "ball", "soccerball", "gameball", "giantball", "football" },
    PredictTime     = 6,      -- seconds ahead
    StepTime        = 1/45,   -- sim step, coarser than a frame so long predictions stay cheap
    StepsPerSegment = 2,
    SimRate         = 30,     -- full re-sims per second
    MaxBounces      = 6,
    RollSpeed       = 18,     -- contacts slower than this (into the surface) are rolling, not bounces
    StopSpeed       = 2.5,    -- rolling slower than this = stopped
    Friction        = 0.85,   -- tangential speed kept on a bounce
    AirDrag         = 0.03,
    LineWidth       = 0.6,
    LineStart       = Color3.fromRGB(0, 220, 255),
    LineEnd         = Color3.fromRGB(190, 70, 255),
    BounceColor     = Color3.fromRGB(255, 170, 0),
    LandColor       = Color3.fromRGB(255, 60, 90),
    StopColor       = Color3.fromRGB(60, 255, 120),
    ShadowColor     = Color3.fromRGB(255, 255, 255),
    RingSegments    = 20,
    MinSpeed        = 3,
    IgnoreCars      = true,
    ShowInfo        = false,
}

---------------------------------------------------------------- services
local Players    = game:GetService("Players")
local RunService = game:GetService("RunService")
local UIS        = game:GetService("UserInputService")
local LP         = Players.LocalPlayer

local env = getgenv and getgenv() or {}
if env.__TL_TRAJ then pcall(env.__TL_TRAJ) end

-- learned values survive re-running the script
env.__TL_LEARN = env.__TL_LEARN or {}
local learn = env.__TL_LEARN
learn.g    = learn.g or workspace.Gravity
learn.e    = learn.e or 0.6
learn.roll = learn.roll or 0.4   -- fraction of speed lost per second while rolling

local connections = {}
local function bind(sig, fn) local c = sig:Connect(fn); table.insert(connections, c); return c end

---------------------------------------------------------------- visuals (self-healing)
local MAX_SEGMENTS = math.ceil(CONFIG.PredictTime / CONFIG.StepTime / CONFIG.StepsPerSegment) + CONFIG.MaxBounces * 2 + 4
local folder, segments, bounceDots
local landRing, stopRing, shadowRing   -- { parts = {...}, anchor = Part, label = TextLabel? }

local function makePart(shape, color)
    local p = Instance.new("Part")
    p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow = true, false, false, false, false
    p.Material     = Enum.Material.Neon
    p.Shape        = shape
    p.Color        = color
    p.Transparency = 1
    p.Size         = Vector3.new(0.1, 0.1, 0.1)
    p.Parent       = folder
    return p
end

-- a ring is a loop of thin blocks plus an invisible anchor that carries the timer label
local function makeRing(color, withLabel)
    local ring = { parts = {} }
    for i = 1, CONFIG.RingSegments do
        ring.parts[i] = makePart(Enum.PartType.Block, color)
    end
    if withLabel then
        local anchor = makePart(Enum.PartType.Block, color)
        local bb = Instance.new("BillboardGui")
        bb.Size = UDim2.fromOffset(70, 26)
        bb.StudsOffsetWorldSpace = Vector3.new(0, 4, 0)
        bb.AlwaysOnTop = true
        bb.Enabled = false
        bb.Parent = anchor
        local t = Instance.new("TextLabel")
        t.Size = UDim2.fromScale(1, 1)
        t.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
        t.BackgroundTransparency = 0.3
        t.TextColor3 = color
        t.Font = Enum.Font.GothamBold
        t.TextScaled = true
        t.Parent = bb
        Instance.new("UICorner", t).CornerRadius = UDim.new(0, 6)
        ring.anchor, ring.bb, ring.label = anchor, bb, t
    end
    return ring
end

local function hideRing(ring)
    for _, p in ipairs(ring.parts) do p.Transparency = 1 end
    if ring.bb then ring.bb.Enabled = false end
end

local function placeRing(ring, center, normal, radius, transparency, text, color)
    local up = normal.Unit
    local ref = math.abs(up.Y) < 0.99 and Vector3.yAxis or Vector3.xAxis
    local u = ref:Cross(up).Unit
    local v = up:Cross(u).Unit
    local n = #ring.parts
    local segLen = 2 * math.pi * radius / n * 1.08
    local c = center + up * 0.15
    for i, p in ipairs(ring.parts) do
        local th = (i - 1) / n * 2 * math.pi
        local pos = c + (u * math.cos(th) + v * math.sin(th)) * radius
        local tangent = -u * math.sin(th) + v * math.cos(th)
        p.Size = Vector3.new(0.5, 0.25, segLen)
        p.CFrame = CFrame.lookAt(pos, pos + tangent, up)
        p.Transparency = transparency
        if color then p.Color = color end
    end
    if ring.anchor then
        ring.anchor.CFrame = CFrame.new(c)
        if text then
            ring.label.Text = text
            if color then ring.label.TextColor3 = color end
            ring.bb.Enabled = true
        else
            ring.bb.Enabled = false
        end
    end
end

-- under the camera: games that clean workspace between rounds don't touch it
local function buildVisuals()
    if folder then pcall(function() folder:Destroy() end) end
    folder = Instance.new("Folder")
    folder.Name = "TL_Trajectory"
    folder.Parent = workspace.CurrentCamera or workspace
    segments, bounceDots = {}, {}
    for i = 1, MAX_SEGMENTS do segments[i] = makePart(Enum.PartType.Block, CONFIG.LineStart) end
    for i = 1, CONFIG.MaxBounces do
        bounceDots[i] = makePart(Enum.PartType.Ball, CONFIG.BounceColor)
        bounceDots[i].Size = Vector3.new(1.5, 1.5, 1.5)
    end
    landRing   = makeRing(CONFIG.LandColor, true)
    stopRing   = makeRing(CONFIG.StopColor, true)
    shadowRing = makeRing(CONFIG.ShadowColor, false)
end

local function visualsAlive()
    return folder and folder.Parent and folder.Parent == (workspace.CurrentCamera or workspace)
        and stopRing and stopRing.anchor.Parent == folder
end

buildVisuals()

local function hideFrom(list, startIdx)
    for i = startIdx, #list do list[i].Transparency = 1 end
end

local function hideAll()
    if not visualsAlive() then return end
    hideFrom(segments, 1)
    hideFrom(bounceDots, 1)
    hideRing(landRing)
    hideRing(stopRing)
    hideRing(shadowRing)
end

---------------------------------------------------------------- ball picking
local candidates, motion = {}, {}
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

for _, inst in ipairs(workspace:GetDescendants()) do considerPart(inst) end
bind(workspace.DescendantAdded, considerPart)
bind(workspace.DescendantRemoving, function(inst)
    candidates[inst], motion[inst] = nil, nil
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
    -- hysteresis so it doesn't flip between two close candidates
    if ball and ball.Parent and best ~= ball and bestScore < score(ball) + 25 then
        return ball
    end
    ball = best
    return ball
end

---------------------------------------------------------------- velocity (least-squares fit)
-- Fitting a line through recent positions beats frame deltas: replication arrives
-- in bursts, and a fit doesn't care. Gravity comes from a parabola fit on Y.
local samples = {}
local SAMPLE_KEEP = 0.4
local VEL_WINDOW  = 0.12
local hideUntil, trackedPart = 0, nil
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

-- y = a + b*t + c*t^2 over the buffer, returns acceleration (2c)
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
    local c = det(S0, S1, Y0, S1, S2, Y1, S2, S3, Y2) / D
    return 2 * c
end

local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude
rayParams.RespectCanCollide = true

local function groundBelow(pos, radius)
    return workspace:Raycast(pos, Vector3.new(0, -(radius + 3), 0), rayParams)
end

local vyLog, rollLog = {}, {}
local pendingBounce

local function learnFromMotion(b, vel, now, radius)
    local ground = groundBelow(b.Position, radius)
    local ceiling = workspace:Raycast(b.Position, Vector3.new(0, radius + 3, 0), rayParams)
    local airborne = not ground and not ceiling

    -- gravity: only from clean free-flight stretches
    if airborne and #samples >= 8 then
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

    -- rolling slowdown: exponential decay of ground speed while nothing hits it
    local h = Vector3.new(vel.X, 0, vel.Z).Magnitude
    if ground and math.abs(vel.Y) < 4 and h > 6 then
        table.insert(rollLog, { t = now, h = h })
        while #rollLog > 0 and now - rollLog[1].t > 0.5 do table.remove(rollLog, 1) end
        local first = rollLog[1]
        local span = now - first.t
        if span > 0.35 then
            local ratio = h / first.h
            -- only clean slowdowns; a speed-up means something hit it
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

local function trackBall(b, now, radius)
    if b ~= trackedPart then trackedPart = b; resetTracking(); pendingBounce = nil end
    local pos = b.Position
    local last = samples[#samples]

    if last and (pos - last.p).Magnitude > math.max(50, radius * 6) then
        resetTracking()            -- respawn / kickoff teleport
        hideUntil = now + 0.3
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

---------------------------------------------------------------- collision filter
local cars = {}
if CONFIG.IgnoreCars then
    local function considerSeat(inst)
        if inst:IsA("VehicleSeat") then
            local m = inst:FindFirstAncestorOfClass("Model")
            if m and m ~= workspace then cars[m] = true end
        end
    end
    for _, inst in ipairs(workspace:GetDescendants()) do considerSeat(inst) end
    bind(workspace.DescendantAdded, considerSeat)
end

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
end

---------------------------------------------------------------- simulation
local function cast(origin, radius, dir)
    if dir.Magnitude < 1e-4 then return nil end
    local ok, res = pcall(workspace.Spherecast, workspace, origin, radius, dir, rayParams)
    if ok then return res end
    return workspace:Raycast(origin, dir + dir.Unit * radius, rayParams)
end

-- result: points {pos, t}, bounces, land {pos, normal, t}, stop {pos, normal, t, settled}
local function simulate(pos, vel, radius)
    local g     = Vector3.new(0, -learn.g, 0)
    local dt    = CONFIG.StepTime
    local steps = math.floor(CONFIG.PredictTime / dt)
    local drag  = math.clamp(1 - CONFIG.AirDrag * dt, 0, 1)
    local roll  = math.exp(-learn.roll * dt)
    local castR = math.min(radius * 0.9, 250)

    local points  = { { p = pos, t = 0 } }
    local bounces = {}
    local land, stop
    local rolling, rollNormal = false, Vector3.yAxis
    local t = 0

    for i = 1, steps do
        t = i * dt
        if rolling then
            -- stick to the surface: gravity only pulls along it
            local gAlong = g - rollNormal * g:Dot(rollNormal)
            vel = (vel + gAlong * dt) * roll
        else
            vel = (vel + g * dt) * drag
        end

        local move = vel * dt
        local hit  = cast(pos, castR, move)

        if hit then
            local n = hit.Normal
            local into = -vel:Dot(n)
            pos = hit.Position + n * (radius + 0.02)
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
            -- rolling off a ledge, or along the floor: check it's still supported
            if rolling then
                local support = workspace:Raycast(pos, -rollNormal * (radius + 1), rayParams)
                if support then
                    rollNormal = support.Normal
                else
                    rolling = false
                end
            end
        end

        if i % CONFIG.StepsPerSegment == 0 then table.insert(points, { p = pos, t = t }) end

        if rolling and vel.Magnitude < CONFIG.StopSpeed then
            stop = { pos = pos - rollNormal * radius, normal = rollNormal, t = t, settled = true }
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
    return points, bounces, land, stop
end

---------------------------------------------------------------- drawing
local pulse = 0

local function draw(b, radius, points, bounces, land, stop)
    local w, used = CONFIG.LineWidth, 0
    local total = math.max(points[#points].t, 1e-3)
    for i = 1, #points - 1 do
        if used >= MAX_SEGMENTS then break end
        local a, z = points[i].p, points[i + 1].p
        local len = (z - a).Magnitude
        if len > 0.01 then
            used += 1
            local seg = segments[used]
            local frac = points[i].t / total
            seg.Size   = Vector3.new(w, w, len)
            seg.CFrame = CFrame.lookAt(a, z) * CFrame.new(0, 0, -len / 2)
            seg.Color  = CONFIG.LineStart:Lerp(CONFIG.LineEnd, frac)
            seg.Transparency = 0.1 + 0.5 * frac
        end
    end
    hideFrom(segments, used + 1)

    for i, d in ipairs(bounceDots) do
        local p = bounces[i]
        if p then d.Position = p; d.Transparency = 0.2 else d.Transparency = 1 end
    end

    local wobble = 1 + 0.08 * math.sin(pulse * 6)
    local ringR = math.max(3, radius * 1.1)

    if land and land.t > 0.05 then
        placeRing(landRing, land.pos, land.normal, ringR * wobble, 0.2,
            string.format("%.1fs", land.t))
    else
        hideRing(landRing)
    end

    if stop then
        local color = stop.settled and CONFIG.StopColor or CONFIG.ShadowColor
        local label = stop.settled and string.format("stop %.1fs", stop.t) or "6s+"
        -- skip the stop ring when it's basically where the ball already is
        if (stop.pos - b.Position).Magnitude > radius * 2 then
            placeRing(stopRing, stop.pos, stop.normal, ringR * (2 - wobble), 0.15, label, color)
        else
            hideRing(stopRing)
        end
    end

    -- shadow under the ball while airborne: shows exactly where it is above the floor
    local below = workspace:Raycast(b.Position, Vector3.new(0, -300, 0), rayParams)
    if below and (b.Position.Y - below.Position.Y) > radius + 3 then
        local height = b.Position.Y - below.Position.Y
        placeRing(shadowRing, below.Position, below.Normal, radius,
            math.clamp(0.3 + height / 150, 0.3, 0.8))
    else
        hideRing(shadowRing)
    end
end

---------------------------------------------------------------- mobile UI
local enabled, showInfo = true, CONFIG.ShowInfo

local gui = Instance.new("ScreenGui")
gui.Name = "TL_TrajectoryUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.DisplayOrder = 999
local okParent = pcall(function() gui.Parent = (gethui and gethui()) or game:GetService("CoreGui") end)
if not okParent or not gui.Parent then gui.Parent = LP:WaitForChild("PlayerGui") end

local holder = Instance.new("Frame")
holder.Size = UDim2.fromOffset(260, 70)
holder.Position = UDim2.new(0.5, -55, 0, 70)
holder.BackgroundTransparency = 1
holder.Parent = gui

local btn = Instance.new("TextButton")
btn.Size = UDim2.fromOffset(110, 38)
btn.BackgroundColor3 = Color3.fromRGB(20, 20, 28)
btn.BackgroundTransparency = 0.1
btn.TextColor3 = CONFIG.LineStart
btn.Font = Enum.Font.GothamBold
btn.TextSize = 14
btn.Text = "TRAJ: ON"
btn.AutoButtonColor = false
btn.Parent = holder
Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 10)
local stroke = Instance.new("UIStroke", btn)
stroke.Color = CONFIG.LineStart
stroke.Thickness = 1.5

local info = Instance.new("TextLabel")
info.Size = UDim2.fromOffset(260, 26)
info.Position = UDim2.fromOffset(0, 42)
info.BackgroundTransparency = 0.35
info.BackgroundColor3 = Color3.fromRGB(10, 10, 14)
info.TextColor3 = Color3.fromRGB(220, 220, 220)
info.Font = Enum.Font.Code
info.TextSize = 11
info.TextWrapped = true
info.Visible = showInfo
info.Parent = holder
Instance.new("UICorner", info).CornerRadius = UDim.new(0, 6)

local function setEnabled(on)
    enabled = on
    btn.Text = on and "TRAJ: ON" or "TRAJ: OFF"
    btn.TextColor3 = on and CONFIG.LineStart or Color3.fromRGB(150, 150, 150)
    stroke.Color = btn.TextColor3
    if not on then hideAll() end
end

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
            else
                setEnabled(not enabled)
            end
        end
    end)
end

---------------------------------------------------------------- main loop
local filterTimer, infoTimer, simTimer = 0, 0, 0

bind(RunService.RenderStepped, function(dt)
    updateMotion()
    if not enabled then return end
    if not visualsAlive() then buildVisuals() end

    local b = pickBall(dt)
    if not b then hideAll(); info.Text = "looking for the ball..."; return end

    local now = os.clock()
    local radius = math.min(b.Size.X, b.Size.Y, b.Size.Z) / 2
    pulse += dt

    filterTimer -= dt
    if filterTimer <= 0 then refreshFilter(b); filterTimer = 1 end

    -- tracking and learning run every frame, the long sim runs at SimRate
    local vel = trackBall(b, now, radius)
    learnFromMotion(b, vel, now, radius)

    if showInfo then
        infoTimer -= dt
        if infoTimer <= 0 then
            infoTimer = 0.25
            info.Text = string.format("%s | r%.0f | %.0f sps | g%.0f | e%.2f | roll%.2f",
                b.Name, radius, vel.Magnitude, learn.g, learn.e, learn.roll)
        end
    end

    if now < hideUntil or vel.Magnitude < CONFIG.MinSpeed then hideAll() return end

    simTimer -= dt
    if simTimer > 0 then return end
    simTimer = 1 / CONFIG.SimRate

    local pts, bnc, land, stop = simulate(b.Position, vel, radius)
    draw(b, radius, pts, bnc, land, stop)
end)

---------------------------------------------------------------- cleanup hook
env.__TL_TRAJ = function()
    for _, c in ipairs(connections) do c:Disconnect() end
    if folder then folder:Destroy() end
    gui:Destroy()
end
