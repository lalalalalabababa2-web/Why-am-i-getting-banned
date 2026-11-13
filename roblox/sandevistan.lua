--[[
    SANDEVISTAN  //  client-side time-dilation illusion
    Engine:   Roblox (Luau), any game, R6 + R15
    Target:   mobile executors on Android (also runs on PC executors)
    Form:     one file, no dependencies, no HTTP, no assets to upload

    WHAT IT DOES
      You speed up for real (Humanoid.WalkSpeed). Everyone else only LOOKS slow:
      each nearby character is hidden locally and replaced by a non-colliding copy
      that replays that character's real movement from a buffer at SlowMotionFactor
      speed. When the ability ends the copies fast-forward along the path they
      actually walked and hand back to the real characters. Nothing here touches
      server time, other players' movement, hitboxes or damage.

    RUNNING IT ON A PHONE
      Pasting a file this size through a phone clipboard often cuts it short, and a
      cut-off script fails silently. Run loader.lua (next to this file) instead: it
      downloads this script and shows any error on screen. This script itself makes
      no HTTP requests either way.
      When it starts you get a "Sandevistan - Loaded" notification and a small panel
      at the top centre of the screen. If start-up fails you get a red error box.

    CONTROLS
      Panel (drag it by the title bar):
        ACTIVATE button ... start / stop. Shows time left, then cooldown.
        SPEED ............. your run speed while active (20-120)
        SLOW-MO ........... playback speed of everyone else (0.05x-0.50x)
        DURATION .......... seconds per use, far left = no limit (testing)
        COOLDOWN .......... seconds between uses, far left = off (testing)
        QUALITY ........... LOW / MED / HIGH
        "-" / "+" ......... collapse to the title bar and button / open the settings
                            (starts collapsed on small screens)
        "X" ............... tap twice to unload the script completely
      Keyboard (if you have one): CONFIG.ToggleKey, default Q.
      From another script: getgenv().__SANDEVISTAN.Toggle() / .Cleanup()

    KNOWN LIMITS (by design, not bugs)
      * The slow-motion is a picture. Real hitboxes stay where the server says
        they are, so the longer you stay active the further a slowed copy is
        from the character it stands in for (up to CONFIG.MaxVisualLag seconds).
      * WalkSpeed is the only thing changed about your movement. If the game
        resets or lowers it, the script backs off instead of fighting it.
      * Roblox has no chromatic-aberration, radial-blur or screen-warp effect.
        Those are approximated with edge fringes, FOV, blur and UI speed lines.
      * Global sound muffling only reaches SoundGroups, the ambient reverb and
        the sounds of slowed characters.
]]

--------------------------------------------------------------------------------
-- CONFIG
--------------------------------------------------------------------------------
local CONFIG = {
    -- ability
    SandevistanSpeed   = 65,        -- studs/s while active
    MaxSpeed           = 120,       -- top of the speed slider
    SlowMotionFactor   = 0.15,      -- how fast others appear to move (0.15 = about 6.7x slower)
    ActivationDuration = 12,        -- seconds, 0 = no limit
    Cooldown           = 8,         -- seconds, 0 = off
    AfterimageLimit    = 12,        -- most afterimages alive at once
    EffectQuality      = "Medium",  -- "Low" | "Medium" | "High"
    CameraFOVBoost     = 12,        -- degrees added at full speed

    -- movement feel
    RampIn             = 0.45,      -- seconds to reach full speed / full effects
    RampOut            = 0.70,      -- seconds to wind back down
    MovementAssist     = true,      -- tighter turning and braking on the ground
    TurnAssist         = 12,        -- higher = snappier direction changes
    BrakeAssist        = 9,         -- higher = less sliding when you let go
    SpeedReapplyLimit  = 3,         -- times per use the boost may be put back after the game changes WalkSpeed (0 = never)
    SpeedReapplyDelay  = 0.4,       -- seconds to wait before putting it back
    SprintLean         = true,      -- lean the upper body forward while running (local only)

    -- camera
    CameraShake        = 0.006,     -- radians at full speed, 0 = none

    -- slow-motion illusion
    IncludeNPCs        = true,      -- also slow non-player characters
    NpcScanDepth       = 4,         -- how deep under Workspace to look for NPC models
    MaxVisualLag       = 12,        -- seconds a copy may fall behind its real character
    ProxyReturnTime    = 0.6,       -- seconds for copies to catch up when the ability ends
    MaxProxyInstances  = 700,       -- characters bigger than this are left alone
    MuffleAudio        = true,

    -- afterimages
    AfterimageMaxParts = 24,        -- parts copied per afterimage

    -- input
    ToggleKey          = Enum.KeyCode.Q,
}

local QUALITY = {
    Low = {
        MaxProxies = 3, ProxyRadius = 55, SnapshotRate = 10, ProxyPoseEvery = 2, ProxyShadows = false,
        GhostCap = 6, GhostSpacing = 8, GhostLife = 0.36, GhostSteps = 5, GhostRecolor = false,
        BoltSegments = 10, BoltRate = 5,
        SparkRate = 8, FlowRate = 5, BurstCount = 12,
        ArmBeams = false, LimbTrails = 0, Light = false, ShockBall = false,
        SpeedLines = 8, Shake = 0.6, Bloom = false, Blur = false, MotionBlur = false, SlowPitch = false,
        NpcBudget = 150,
    },
    Medium = {
        MaxProxies = 5, ProxyRadius = 85, SnapshotRate = 15, ProxyPoseEvery = 2, ProxyShadows = false,
        GhostCap = 12, GhostSpacing = 5.5, GhostLife = 0.5, GhostSteps = 8, GhostRecolor = false,
        BoltSegments = 20, BoltRate = 9,
        SparkRate = 16, FlowRate = 10, BurstCount = 24,
        ArmBeams = true, LimbTrails = 2, Light = true, ShockBall = true,
        SpeedLines = 14, Shake = 1, Bloom = true, Blur = true, MotionBlur = false, SlowPitch = false,
        NpcBudget = 300,
    },
    High = {
        MaxProxies = 8, ProxyRadius = 120, SnapshotRate = 20, ProxyPoseEvery = 1, ProxyShadows = true,
        GhostCap = 18, GhostSpacing = 4, GhostLife = 0.6, GhostSteps = 14, GhostRecolor = true,
        BoltSegments = 32, BoltRate = 14,
        SparkRate = 28, FlowRate = 16, BurstCount = 40,
        ArmBeams = true, LimbTrails = 4, Light = true, ShockBall = true,
        SpeedLines = 22, Shake = 1, Bloom = true, Blur = true, MotionBlur = true, SlowPitch = true,
        NpcBudget = 400,
    },
}

--------------------------------------------------------------------------------
-- SERVICES / BOOT
--------------------------------------------------------------------------------
if not game:IsLoaded() then
    game.Loaded:Wait()
end

local Players          = game:GetService("Players")
local RunService       = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local TweenService     = game:GetService("TweenService")
local Lighting         = game:GetService("Lighting")
local SoundService     = game:GetService("SoundService")
local Workspace        = game:GetService("Workspace")

local player = Players.LocalPlayer
while not player do
    Players:GetPropertyChangedSignal("LocalPlayer"):Wait()
    player = Players.LocalPlayer
end

local VERSION      = "1.0.0"
local ENV_KEY      = "__SANDEVISTAN"
local NAME_GUI     = "SandevistanUI"
local NAME_OVERLAY = "SandevistanOverlay"
local NAME_ERROR   = "SandevistanError"
local NAME_FOLDER  = "SandevistanFX"
local NAME_RENDER  = "SandevistanRenderStep"
local POST_NAMES   = { "SandevistanCC", "SandevistanBloom", "SandevistanBlur" }

-- Executors expose a shared table through getgenv(); plain _G is the fallback.
local sharedEnv = _G
do
    local ok, env = pcall(function()
        return getgenv()
    end)
    if ok and type(env) == "table" then
        sharedEnv = env
    end
end

-- Running the script again first tears down the copy that is already running.
do
    local previous = sharedEnv[ENV_KEY]
    if type(previous) == "table" and type(previous.Cleanup) == "function" then
        pcall(previous.Cleanup)
    end
    sharedEnv[ENV_KEY] = nil
end

--------------------------------------------------------------------------------
-- HELPERS
--------------------------------------------------------------------------------
local clamp, floor, max, min, abs = math.clamp, math.floor, math.max, math.min, math.abs
local exp, sin, cos, random = math.exp, math.sin, math.cos, math.random
local TAU = math.pi * 2

local RED       = Color3.fromRGB(255, 42, 62)
local BOLT_RED  = Color3.fromRGB(255, 84, 96)
local GHOST_A   = Color3.fromRGB(255, 45, 70)
local GHOST_B   = Color3.fromRGB(150, 0, 40)
local WHITE     = Color3.new(1, 1, 1)
local TINT      = Color3.fromRGB(255, 198, 202)
local GHOST_START_TRANSPARENCY = 0.45
local SPARK_TEXTURE = "rbxasset://textures/particles/sparkles_main.dds"

local destroyed = false
local connections = {}

local function track(connection)
    connections[#connections + 1] = connection
    return connection
end

local function new(className, props, parent)
    local inst = Instance.new(className)
    if props then
        for key, value in pairs(props) do
            inst[key] = value
        end
    end
    if parent then
        inst.Parent = parent
    end
    return inst
end

local function safeSet(inst, prop, value)
    return pcall(function()
        inst[prop] = value
    end)
end

local function smooth(x)
    return x * x * (3 - 2 * x)
end

local function approach(current, target, step)
    if current < target then
        return min(current + step, target)
    end
    return max(current - step, target)
end

local function damp(rate, dt)
    return 1 - exp(-rate * dt)
end

local function randUnit()
    local z = random() * 2 - 1
    local a = random() * TAU
    local r = math.sqrt(max(0, 1 - z * z))
    return Vector3.new(r * cos(a), z, r * sin(a))
end

local function quality()
    return QUALITY[CONFIG.EffectQuality] or QUALITY.Medium
end

local function isPress(input)
    local t = input.UserInputType
    return t == Enum.UserInputType.Touch or t == Enum.UserInputType.MouseButton1
end

--------------------------------------------------------------------------------
-- MODULE TABLES
--------------------------------------------------------------------------------
local Ability = { active = false, cooling = false, startedAt = 0, endedAt = 0, blendLin = 0, blend = 0 }
local Char    = { model = nil, hum = nil, root = nil, head = nil, alive = false, conns = {} }
local Move    = { engaged = false }
local Cam     = { engaged = false, kick = 0, punch = 0, seed = random() * 100 }
local Lean    = { amount = 0 }
local FX      = { folder = nil, frame = 0, flash = 0, spike = 0, speedFrac = 0, firstPerson = false, nextProbe = 0 }
local Rig     = { items = {}, toggles = {}, lightB = 0 }
local Bolts   = { parts = {}, die = {}, loc = {}, moveParts = {}, moveCFs = {}, cursor = 0, nextAt = 0, alive = 0 }
local Ghosts  = { rigs = {}, src = {}, alive = 0, travel = 0, lastSpawn = 0, dirty = false }
local Shock   = {}
local Overlay = { lines = {} }
local Post    = {}
local Audio   = { engaged = false, eqs = {}, lastBlend = -1 }
local Npc     = { known = setmetatable({}, { __mode = "k" }), queue = {}, depth = {}, head = 1, tail = 0, running = false, nextPass = 0 }
local Proxies = { list = {}, byModel = {}, failed = setmetatable({}, { __mode = "k" }), enabled = false, serial = 0, nextSnap = 0, nextCheck = 0, nextBuild = 0 }
local Pointer = { active = {} }
local UI      = { nextRefresh = 0, minimized = false, qButtons = {} }

local hardReset, bindRender, unbindRender, cleanup

-- Every cosmetic subsystem runs through guard(). If one throws (an engine change,
-- an odd rig), that one subsystem is switched off for the session and the rest of
-- the ability keeps working, instead of one bad effect taking everything down.
local broken = {}
local onBroken = {
    ["camera"] = function()
        pcall(Cam.restoreNow)
    end,
    ["slow-motion"] = function()
        Proxies.enabled = false
        pcall(Proxies.clearAll)
    end,
    ["afterimages"] = function()
        pcall(Ghosts.reset)
        Ghosts.alive = 0
    end,
    ["lightning"] = function()
        pcall(Bolts.reset)
        Bolts.alive = 0
    end,
    ["body effects"] = function()
        pcall(Rig.destroy)
    end,
    ["shockwave"] = function()
        pcall(Shock.reset)
    end,
    ["screen overlay"] = function()
        pcall(Overlay.hide)
    end,
    ["post effects"] = function()
        pcall(Post.destroy)
    end,
    ["audio"] = function()
        pcall(Audio.finish)
    end,
    ["sprint lean"] = function()
        pcall(Lean.stop)
    end,
}

local function guard(name, fn, ...)
    if broken[name] then
        return
    end
    local ok, err = pcall(fn, ...)
    if not ok then
        broken[name] = true
        warn("[Sandevistan] " .. name .. " switched off after an error: " .. tostring(err))
        if onBroken[name] then
            onBroken[name]()
        end
    end
end

--------------------------------------------------------------------------------
-- TIMERS
--------------------------------------------------------------------------------
local function cooldownRemaining(now)
    if not Ability.cooling then
        return 0
    end
    local remaining = Ability.endedAt + CONFIG.Cooldown - now
    if remaining <= 0 then
        Ability.cooling = false
        return 0
    end
    return remaining
end

local function durationRemaining(now)
    if CONFIG.ActivationDuration <= 0 then
        return math.huge
    end
    return Ability.startedAt + CONFIG.ActivationDuration - now
end

--------------------------------------------------------------------------------
-- FX FOLDER  (everything we put in the 3D world lives under one local Folder)
--------------------------------------------------------------------------------
function FX.getFolder()
    local folder = FX.folder
    if folder and folder.Parent == Workspace then
        return folder
    end
    -- First use, or the game deleted it: every pooled object under it is gone too.
    Proxies.clearAll()
    Bolts.reset()
    Ghosts.reset()
    Shock.ring, Shock.ball = nil, nil
    folder = new("Folder", { Name = NAME_FOLDER })
    folder.Parent = Workspace
    FX.folder = folder
    return folder
end

--------------------------------------------------------------------------------
-- LIGHTNING  (pooled neon segments stored in root-local space so arcs ride along)
--------------------------------------------------------------------------------
function Bolts.ensure(count)
    local folder = FX.getFolder()
    local parts = Bolts.parts
    for i = #parts + 1, count do
        parts[i] = new("Part", {
            Name = "Arc", Anchored = true, CanCollide = false, CanTouch = false, CanQuery = false,
            CastShadow = false, Material = Enum.Material.Neon, Color = BOLT_RED, Transparency = 1,
            Size = Vector3.new(0.1, 0.1, 1),
        }, folder)
        Bolts.die[i] = 0
        Bolts.loc[i] = CFrame.new()
    end
end

local function boltAlloc(now, limit)
    local n = min(#Bolts.parts, limit)
    for _ = 1, n do
        Bolts.cursor = Bolts.cursor % n + 1
        if Bolts.die[Bolts.cursor] <= now then
            return Bolts.cursor
        end
    end
    return nil
end

function Bolts.arc(fromLocal, toLocal, segments, thickness, jitter, life, now, limit)
    local prev = fromLocal
    for s = 1, segments do
        local point = fromLocal:Lerp(toLocal, s / segments)
        if s < segments then
            point += randUnit() * jitter
        end
        local delta = point - prev
        local length = delta.Magnitude
        if length > 0.05 then
            local i = boltAlloc(now, limit)
            if not i then
                return
            end
            local part = Bolts.parts[i]
            part.Size = Vector3.new(thickness, thickness, length)
            part.Transparency = 0.05
            Bolts.loc[i] = CFrame.lookAt(prev + delta * 0.5, point)
            Bolts.die[i] = now + life
        end
        prev = point
    end
end

function Bolts.burst(now, q)
    Bolts.ensure(q.BoltSegments)
    local count = floor(q.BoltSegments / 5)
    for _ = 1, count do
        local dir = randUnit() * Vector3.new(1, 0.45, 1)
        if dir.Magnitude > 0.05 then
            local reach = dir.Unit * (6 + random() * 6)
            Bolts.arc(randUnit() * 0.6, reach, 5, 0.16, 1.1, 0.16 + random() * 0.14, now, q.BoltSegments)
        end
    end
end

function Bolts.update(now, q)
    local root = Char.root
    local rooted = root ~= nil and root.Parent ~= nil
    if Ability.active and rooted and not FX.firstPerson and now >= Bolts.nextAt then
        Bolts.nextAt = now + (0.6 + random() * 0.8) / q.BoltRate
        Bolts.ensure(q.BoltSegments)
        local shape = Vector3.new(1.4, 2.5, 1.4)
        local dirA = randUnit()
        local dirB = (dirA + randUnit() * 0.8).Unit
        Bolts.arc(dirA * shape, dirB * shape * (1 + random() * 0.4), 3 + floor(random() * 2), 0.07 + random() * 0.05,
            0.45, 0.07 + random() * 0.06, now, q.BoltSegments)
    end

    local parts, die, loc = Bolts.parts, Bolts.die, Bolts.loc
    local moveParts, moveCFs = Bolts.moveParts, Bolts.moveCFs
    local k = 0
    local rootCF
    if rooted then
        rootCF = root.CFrame
    end
    for i = 1, #parts do
        local d = die[i]
        if d > 0 then
            if now >= d or not rootCF then
                parts[i].Transparency = 1
                die[i] = 0
            else
                k += 1
                moveParts[k] = parts[i]
                moveCFs[k] = rootCF * loc[i]
            end
        end
    end
    for j = #moveParts, k + 1, -1 do
        moveParts[j] = nil
        moveCFs[j] = nil
    end
    if k > 0 then
        Workspace:BulkMoveTo(moveParts, moveCFs, Enum.BulkMoveMode.FireCFrameChanged)
    end
    Bolts.alive = k
end

function Bolts.hideAll()
    for i = 1, #Bolts.parts do
        Bolts.parts[i].Transparency = 1
        Bolts.die[i] = 0
    end
    Bolts.alive = 0
end

function Bolts.reset()
    for i = 1, #Bolts.parts do
        Bolts.parts[i]:Destroy()
    end
    table.clear(Bolts.parts)
    table.clear(Bolts.die)
    table.clear(Bolts.loc)
    table.clear(Bolts.moveParts)
    table.clear(Bolts.moveCFs)
    Bolts.cursor, Bolts.alive = 0, 0
end

--------------------------------------------------------------------------------
-- AFTERIMAGES  (one stripped template of the character, cloned into a small pool)
--------------------------------------------------------------------------------
function Ghosts.reset()
    for i = 1, #Ghosts.rigs do
        Ghosts.rigs[i].model:Destroy()
    end
    table.clear(Ghosts.rigs)
    if Ghosts.template then
        Ghosts.template:Destroy()
        Ghosts.template = nil
    end
    table.clear(Ghosts.src)
    Ghosts.alive, Ghosts.owner = 0, nil
end

local function makeGhostPart(source)
    local ok, copy = pcall(source.Clone, source)
    if not ok or not copy then
        return nil
    end
    -- Keep only what gives the part its shape; no scripts, joints, decals or effects.
    for _, child in ipairs(copy:GetChildren()) do
        if child:IsA("DataModelMesh") then
            if child:IsA("FileMesh") then
                child.TextureId = ""
            end
        else
            child:Destroy()
        end
    end
    if copy:IsA("MeshPart") then
        copy.TextureID = ""
    end
    copy.Anchored = true
    copy.CanCollide = false
    copy.CanTouch = false
    copy.CanQuery = false
    copy.CastShadow = false
    copy.Massless = true
    copy.Material = Enum.Material.Neon
    copy.Color = GHOST_A
    copy.Transparency = 1
    copy.LocalTransparencyModifier = 0
    return copy
end

function Ghosts.prepare()
    local model = Char.model
    if Ghosts.template and Ghosts.owner == model and not Ghosts.dirty then
        return true
    end
    Ghosts.reset()
    Ghosts.dirty = false
    if not model then
        return false
    end
    local template = new("Model", { Name = "GhostTemplate" })
    local src = Ghosts.src
    local descendants = model:GetDescendants()
    for i = 1, #descendants do
        local d = descendants[i]
        if d:IsA("BasePart") and d.Name ~= "HumanoidRootPart" and d.Transparency < 0.95
            and not d:FindFirstChildOfClass("WrapLayer") then
            local copy = makeGhostPart(d)
            if copy then
                src[#src + 1] = d
                copy.Name = tostring(#src)
                copy.Parent = template
                if #src >= CONFIG.AfterimageMaxParts then
                    break
                end
            end
        end
    end
    if #src == 0 then
        template:Destroy()
        return false
    end
    Ghosts.template, Ghosts.owner = template, model
    return true
end

local function newGhostRig(folder)
    local model = Ghosts.template:Clone()
    model.Name = "Ghost"
    local count = #Ghosts.src
    local parts = table.create(count)
    for i = 1, count do
        local part = model:FindFirstChild(tostring(i))
        if not part then
            model:Destroy()
            return nil
        end
        parts[i] = part
    end
    model.Parent = folder
    return { model = model, parts = parts, cfs = table.create(count), alive = false, born = 0, life = 0.5, step = -1 }
end

function Ghosts.spawn(now, q)
    local folder = FX.getFolder()
    if not Ghosts.prepare() then
        return
    end
    local cap = min(CONFIG.AfterimageLimit, q.GhostCap)
    if cap < 1 then
        return
    end
    local rigs = Ghosts.rigs
    local rig, oldest
    for i = 1, #rigs do
        local r = rigs[i]
        if not r.alive then
            rig = r
            break
        end
        if not oldest or r.born < oldest.born then
            oldest = r
        end
    end
    if not rig then
        if #rigs < cap then
            rig = newGhostRig(folder)
            if rig then
                rigs[#rigs + 1] = rig
            end
        else
            rig = oldest
        end
    end
    if not rig then
        return
    end
    local src, cfs = Ghosts.src, rig.cfs
    for i = 1, #src do
        cfs[i] = src[i].CFrame
    end
    Workspace:BulkMoveTo(rig.parts, cfs, Enum.BulkMoveMode.FireCFrameChanged)
    if not rig.alive then
        Ghosts.alive += 1
    end
    rig.alive, rig.born, rig.life, rig.step = true, now, q.GhostLife, -1
end

local function hideGhost(rig)
    local parts = rig.parts
    for i = 1, #parts do
        parts[i].Transparency = 1
    end
    rig.alive = false
end

function Ghosts.update(now, q, speed)
    local root = Char.root
    if Ability.active and Ability.blend > 0.35 and root and root.Parent and not FX.firstPerson then
        local position = root.Position
        local last = Ghosts.lastPos
        if last then
            local step = (position - last).Magnitude
            if step < 40 then
                Ghosts.travel += step
            else
                Ghosts.travel = 0 -- teleport, not running
            end
        end
        Ghosts.lastPos = position
        -- Spacing is in studs, so faster running leaves more afterimages per second.
        if Ghosts.travel >= q.GhostSpacing and speed > max(20, (Move.baseSpeed or 16) * 1.25)
            and now - Ghosts.lastSpawn >= 0.03 then
            Ghosts.travel = 0
            Ghosts.lastSpawn = now
            Ghosts.spawn(now, q)
        end
    else
        Ghosts.lastPos = nil
        Ghosts.travel = 0
    end

    if Ghosts.alive <= 0 then
        return
    end
    local rigs = Ghosts.rigs
    local steps = q.GhostSteps
    for i = 1, #rigs do
        local rig = rigs[i]
        if rig.alive then
            local a = (now - rig.born) / rig.life
            if a >= 1 then
                hideGhost(rig)
                Ghosts.alive -= 1
            else
                -- Fade in a few steps instead of every frame to keep property writes low.
                local s = floor(a * steps)
                if s ~= rig.step then
                    rig.step = s
                    local transparency = GHOST_START_TRANSPARENCY + (1 - GHOST_START_TRANSPARENCY) * a
                    local parts = rig.parts
                    if q.GhostRecolor then
                        local color = GHOST_A:Lerp(GHOST_B, a)
                        for j = 1, #parts do
                            parts[j].Transparency = transparency
                            parts[j].Color = color
                        end
                    else
                        for j = 1, #parts do
                            parts[j].Transparency = transparency
                        end
                    end
                end
            end
        end
    end
end

function Ghosts.hideAll()
    for i = 1, #Ghosts.rigs do
        if Ghosts.rigs[i].alive then
            hideGhost(Ghosts.rigs[i])
        end
    end
    Ghosts.alive = 0
    Ghosts.lastPos = nil
    Ghosts.travel = 0
end

--------------------------------------------------------------------------------
-- SHOCKWAVE
--------------------------------------------------------------------------------
local function tweenThenHide(inst, seconds, goal, hide)
    local tween = TweenService:Create(inst, TweenInfo.new(seconds, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), goal)
    if hide then
        tween.Completed:Connect(function(state)
            if state == Enum.PlaybackState.Completed then
                inst.Transparency = 1
            end
        end)
    end
    tween:Play()
end

function Shock.reset()
    if Shock.ring then
        Shock.ring:Destroy()
    end
    if Shock.ball then
        Shock.ball:Destroy()
    end
    Shock.ring, Shock.ball = nil, nil
end

function Shock.play(position, implode, q)
    local folder = FX.getFolder()
    if not (Shock.ring and Shock.ring.Parent == folder) then
        Shock.ring = new("Part", {
            Name = "Ring", Shape = Enum.PartType.Cylinder, Anchored = true, CanCollide = false, CanTouch = false,
            CanQuery = false, CastShadow = false, Material = Enum.Material.Neon, Color = RED, Transparency = 1,
            Size = Vector3.new(0.12, 2, 2),
        }, folder)
    end
    if not (Shock.ball and Shock.ball.Parent == folder) then
        Shock.ball = new("Part", {
            Name = "Pulse", Shape = Enum.PartType.Ball, Anchored = true, CanCollide = false, CanTouch = false,
            CanQuery = false, CastShadow = false, Material = Enum.Material.ForceField, Color = RED, Transparency = 1,
            Size = Vector3.new(3, 3, 3),
        }, folder)
    end
    local ring, ball = Shock.ring, Shock.ball
    -- A cylinder's axis is X, so roll it 90 degrees to lay the disc flat on the ground.
    ring.CFrame = CFrame.new(position - Vector3.new(0, 2.6, 0)) * CFrame.Angles(0, 0, math.rad(90))
    ball.CFrame = CFrame.new(position)
    if implode then
        ring.Size = Vector3.new(0.12, 30, 30)
        ring.Transparency = 0.9
        tweenThenHide(ring, 0.28, { Size = Vector3.new(0.12, 1, 1), Transparency = 0.5 }, true)
        if q.ShockBall then
            ball.Size = Vector3.new(22, 22, 22)
            ball.Transparency = 0.95
            tweenThenHide(ball, 0.28, { Size = Vector3.new(2, 2, 2), Transparency = 0.3 }, true)
        end
    else
        ring.Size = Vector3.new(0.12, 2, 2)
        ring.Transparency = 0.4
        tweenThenHide(ring, 0.5, { Size = Vector3.new(0.12, 52, 52), Transparency = 1 }, false)
        if q.ShockBall then
            ball.Size = Vector3.new(3, 3, 3)
            ball.Transparency = 0.1
            tweenThenHide(ball, 0.45, { Size = Vector3.new(30, 30, 30), Transparency = 1 }, false)
        end
    end
end

--------------------------------------------------------------------------------
-- CHARACTER RIG FX  (sparks, arm energy, trails, glow; built once per character)
--------------------------------------------------------------------------------
function Rig.destroy()
    for i = 1, #Rig.items do
        Rig.items[i]:Destroy()
    end
    table.clear(Rig.items)
    table.clear(Rig.toggles)
    Rig.model, Rig.core, Rig.burst, Rig.light = nil, nil, nil, nil
    Rig.state, Rig.lightB = nil, 0
end

function Rig.ensure(q)
    local model = Char.model
    if Rig.model == model and Rig.builtFor == CONFIG.EffectQuality and Rig.core and Rig.core.Parent then
        return
    end
    Rig.destroy()
    if not model then
        return
    end
    local torso = model:FindFirstChild("UpperTorso") or model:FindFirstChild("Torso") or Char.root
    if not (torso and torso:IsA("BasePart")) then
        return
    end
    Rig.model, Rig.builtFor = model, CONFIG.EffectQuality

    local items, toggles = Rig.items, Rig.toggles
    local function keep(inst, toggled)
        items[#items + 1] = inst
        if toggled then
            toggles[#toggles + 1] = inst
        end
        return inst
    end
    local redSequence = ColorSequence.new(Color3.fromRGB(255, 96, 104), Color3.fromRGB(255, 0, 40))

    local core = keep(new("Attachment", { Name = "SandevistanCore" }, torso))
    Rig.core = core

    -- Small electric sparks thrown off the body the whole time.
    keep(new("ParticleEmitter", {
        Name = "Sparks", Enabled = false, Rate = q.SparkRate, Texture = SPARK_TEXTURE,
        Lifetime = NumberRange.new(0.12, 0.3), Speed = NumberRange.new(6, 16), SpreadAngle = Vector2.new(180, 180),
        Rotation = NumberRange.new(0, 360), RotSpeed = NumberRange.new(-360, 360), Drag = 5,
        Size = NumberSequence.new(0.3, 0), Transparency = NumberSequence.new(0, 1),
        Color = redSequence, LightEmission = 1, LightInfluence = 0, ZOffset = 0.5,
    }, core), true)

    -- One-shot burst used on activation and deactivation.
    Rig.burst = keep(new("ParticleEmitter", {
        Name = "Burst", Enabled = false, Rate = 0, Texture = SPARK_TEXTURE,
        Lifetime = NumberRange.new(0.25, 0.5), Speed = NumberRange.new(22, 44), SpreadAngle = Vector2.new(180, 180),
        Rotation = NumberRange.new(0, 360), Drag = 6,
        Size = NumberSequence.new(0.55, 0), Transparency = NumberSequence.new(0, 1),
        Color = redSequence, LightEmission = 1, LightInfluence = 0,
    }, core))

    -- Ribbon behind the torso.
    local top = keep(new("Attachment", { Name = "SandevistanTrailTop", Position = Vector3.new(0, 0.9, 0) }, torso))
    local bottom = keep(new("Attachment", { Name = "SandevistanTrailBottom", Position = Vector3.new(0, -0.9, 0) }, torso))
    keep(new("Trail", {
        Name = "SandevistanTrail", Enabled = false, Attachment0 = top, Attachment1 = bottom,
        Lifetime = 0.4, MinLength = 0.05, FaceCamera = true, LightEmission = 1, LightInfluence = 0,
        Color = redSequence, Transparency = NumberSequence.new(0.45, 1), WidthScale = NumberSequence.new(1, 0.2),
    }, torso), true)

    -- Energy running shoulder to hand, plus particles flowing the same way.
    local function arm(upperName, lowerName, classicName)
        local upper = model:FindFirstChild(upperName) or model:FindFirstChild(classicName)
        local lower = model:FindFirstChild(lowerName) or upper
        if not (upper and lower and upper:IsA("BasePart") and lower:IsA("BasePart")) then
            return
        end
        local a0 = keep(new("Attachment", { Name = "SandevistanArmTop", Position = Vector3.new(0, upper.Size.Y * 0.5, 0) }, upper))
        local a1 = keep(new("Attachment", { Name = "SandevistanArmEnd", Position = Vector3.new(0, -lower.Size.Y * 0.5, 0) }, lower))
        if q.ArmBeams then
            keep(new("Beam", {
                Name = "SandevistanArmBeam", Enabled = false, Attachment0 = a0, Attachment1 = a1,
                Width0 = 0.3, Width1 = 0.12, Segments = 4, FaceCamera = true, LightEmission = 1, LightInfluence = 0,
                Color = redSequence, Transparency = NumberSequence.new(0.35, 0.7),
                Texture = SPARK_TEXTURE, TextureSpeed = 3, TextureLength = 1.5, TextureMode = Enum.TextureMode.Wrap,
            }, upper), true)
        end
        keep(new("ParticleEmitter", {
            Name = "Flow", Enabled = false, Rate = q.FlowRate, Texture = SPARK_TEXTURE, LockedToPart = true,
            EmissionDirection = Enum.NormalId.Bottom, Lifetime = NumberRange.new(0.2, 0.35),
            Speed = NumberRange.new(5, 9), SpreadAngle = Vector2.new(8, 8),
            Size = NumberSequence.new(0.24, 0.05), Transparency = NumberSequence.new(0.1, 1),
            Color = redSequence, LightEmission = 1, LightInfluence = 0,
        }, a0), true)
    end
    arm("LeftUpperArm", "LeftHand", "Left Arm")
    arm("RightUpperArm", "RightHand", "Right Arm")

    -- Thin trails off the hands (and feet on High).
    local function limbTrail(partName, classicName)
        local part = model:FindFirstChild(partName) or model:FindFirstChild(classicName)
        if not (part and part:IsA("BasePart")) then
            return
        end
        local low = -part.Size.Y * 0.5
        local a0 = keep(new("Attachment", { Name = "SandevistanLimbA", Position = Vector3.new(0, low, 0) }, part))
        local a1 = keep(new("Attachment", { Name = "SandevistanLimbB", Position = Vector3.new(0, low + min(0.5, part.Size.Y), 0) }, part))
        keep(new("Trail", {
            Name = "SandevistanLimbTrail", Enabled = false, Attachment0 = a0, Attachment1 = a1,
            Lifetime = 0.25, MinLength = 0.05, FaceCamera = true, LightEmission = 1, LightInfluence = 0,
            Color = redSequence, Transparency = NumberSequence.new(0.3, 1), WidthScale = NumberSequence.new(1, 0),
        }, part), true)
    end
    if q.LimbTrails >= 2 then
        limbTrail("LeftHand", "Left Arm")
        limbTrail("RightHand", "Right Arm")
    end
    if q.LimbTrails >= 4 then
        limbTrail("LeftFoot", "Left Leg")
        limbTrail("RightFoot", "Right Leg")
    end

    if q.Light then
        Rig.light = keep(new("PointLight", {
            Name = "SandevistanGlow", Enabled = false, Color = RED, Range = 14, Brightness = 0, Shadows = false,
        }, torso))
    end
end

-- In first person these sit right on the camera, so they are switched off there.
function Rig.setActive(on)
    local visible = on and not FX.firstPerson
    if Rig.state == visible then
        return
    end
    Rig.state = visible
    for i = 1, #Rig.toggles do
        Rig.toggles[i].Enabled = visible
    end
end

function Rig.update(blend)
    local light = Rig.light
    if not light then
        return
    end
    local brightness = blend * 1.6
    if FX.firstPerson then
        brightness = 0
    end
    if abs(brightness - Rig.lightB) > 0.02 or (brightness == 0 and Rig.lightB ~= 0) then
        Rig.lightB = brightness
        light.Brightness = brightness
        light.Enabled = brightness > 0.02
    end
end

--------------------------------------------------------------------------------
-- SCREEN OVERLAY  (edge glow, colour fringe, flash, speed lines; never takes input)
--------------------------------------------------------------------------------
function Overlay.build(host)
    local gui = new("ScreenGui", {
        Name = NAME_OVERLAY, ResetOnSpawn = false, IgnoreGuiInset = true, DisplayOrder = 8990,
        ZIndexBehavior = Enum.ZIndexBehavior.Sibling, Enabled = false,
    })
    pcall(function()
        gui.ScreenInsets = Enum.ScreenInsets.None -- cover the notch area too
    end)
    Overlay.gui = gui

    local function edge(name, color, anchor, position, size, horizontal, fromFarSide)
        local frame = new("Frame", {
            Name = name, Active = false, BackgroundColor3 = color, BackgroundTransparency = 1, BorderSizePixel = 0,
            AnchorPoint = anchor, Position = position, Size = size,
        }, gui)
        local a, b = 0, 1
        if fromFarSide then
            a, b = 1, 0
        end
        local rotation = 90
        if horizontal then
            rotation = 0
        end
        -- The gradient is what makes this a soft edge instead of a solid bar.
        new("UIGradient", { Rotation = rotation, Transparency = NumberSequence.new(a, b) }, frame)
        return frame
    end

    local edgeColor = Color3.fromRGB(255, 20, 45)
    Overlay.edges = {
        edge("Top", edgeColor, Vector2.new(0, 0), UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 0.2, 0), false, false),
        edge("Bottom", edgeColor, Vector2.new(0, 1), UDim2.new(0, 0, 1, 0), UDim2.new(1, 0, 0.2, 0), false, true),
        edge("Left", edgeColor, Vector2.new(0, 0), UDim2.new(0, 0, 0, 0), UDim2.new(0.14, 0, 1, 0), true, false),
        edge("Right", edgeColor, Vector2.new(1, 0), UDim2.new(1, 0, 0, 0), UDim2.new(0.14, 0, 1, 0), true, true),
    }
    -- Cyan bands just inside the red edges stand in for chromatic aberration.
    local fringeColor = Color3.fromRGB(40, 230, 255)
    Overlay.fringeLeft = edge("FringeLeft", fringeColor, Vector2.new(0, 0), UDim2.new(0, 3, 0, 0), UDim2.new(0.1, 0, 1, 0), true, false)
    Overlay.fringeRight = edge("FringeRight", fringeColor, Vector2.new(1, 0), UDim2.new(1, -3, 0, 0), UDim2.new(0.1, 0, 1, 0), true, true)

    Overlay.flash = new("Frame", {
        Name = "Flash", Active = false, BackgroundColor3 = Color3.fromRGB(255, 84, 96), BackgroundTransparency = 1,
        BorderSizePixel = 0, Size = UDim2.new(1, 0, 1, 0),
    }, gui)

    for i = 1, QUALITY.High.SpeedLines do
        local frame = new("Frame", {
            Name = "Line", Active = false, Visible = false, AnchorPoint = Vector2.new(0.5, 0.5),
            BackgroundColor3 = Color3.fromRGB(255, 205, 210), BorderSizePixel = 0, Size = UDim2.fromOffset(80, 1),
        }, gui)
        Overlay.lines[i] = { frame = frame, die = 0, shown = false }
    end

    gui.Parent = host
end

function Overlay.show()
    if Overlay.gui then
        Overlay.gui.Enabled = true
    end
end

function Overlay.hide()
    if not Overlay.gui then
        return
    end
    Overlay.gui.Enabled = false
    for i = 1, #Overlay.lines do
        local line = Overlay.lines[i]
        if line.shown then
            line.frame.Visible = false
            line.shown = false
        end
        line.die = 0
    end
end

function Overlay.update(now, blend, q)
    local gui = Overlay.gui
    if not gui then
        return
    end
    local speedFrac = FX.speedFrac

    local pulse = 0.5 + 0.5 * sin(now * 5.2)
    local edgeTransparency = 1 - clamp(blend * (0.3 + 0.14 * pulse) + FX.flash * 0.25, 0, 1)
    for i = 1, 4 do
        Overlay.edges[i].BackgroundTransparency = edgeTransparency
    end

    local fringeTransparency = 1 - clamp(blend * (0.07 + 0.05 * speedFrac) + FX.spike * 0.3, 0, 1)
    local offset = floor(3 + 14 * FX.spike + 4 * speedFrac)
    Overlay.fringeLeft.BackgroundTransparency = fringeTransparency
    Overlay.fringeRight.BackgroundTransparency = fringeTransparency
    Overlay.fringeLeft.Position = UDim2.new(0, offset, 0, 0)
    Overlay.fringeRight.Position = UDim2.new(1, -offset, 0, 0)

    Overlay.flash.BackgroundTransparency = 1 - clamp(FX.flash * 0.55, 0, 1)

    -- Speed lines: short streaks around the rim pointing at the screen centre.
    local intensity = blend * clamp((speedFrac - 0.25) / 0.5, 0, 1)
    local size = gui.AbsoluteSize
    local halfW, halfH = size.X * 0.5, size.Y * 0.5
    local lines = Overlay.lines
    for i = 1, #lines do
        local line = lines[i]
        if i > q.SpeedLines or intensity <= 0.02 then
            if line.shown then
                line.frame.Visible = false
                line.shown = false
            end
        elseif now >= line.die then
            local angle = random() * TAU
            local reach = 0.6 + random() * 0.5
            local c, s = cos(angle), sin(angle)
            local frame = line.frame
            frame.Position = UDim2.fromOffset(halfW + c * halfW * reach, halfH + s * halfH * reach)
            frame.Rotation = math.deg(math.atan2(s * halfH, c * halfW))
            frame.Size = UDim2.fromOffset(60 + random() * (140 + 120 * speedFrac), 1 + floor(random() * 2))
            frame.BackgroundTransparency = 1 - intensity * (0.25 + random() * 0.45)
            line.die = now + 0.05 + random() * 0.09
            if not line.shown then
                frame.Visible = true
                line.shown = true
            end
        end
    end
end

--------------------------------------------------------------------------------
-- POST-PROCESSING  (our own effect instances; the game's are never edited)
--------------------------------------------------------------------------------
function Post.destroy()
    if Post.cc then
        Post.cc:Destroy()
    end
    if Post.bloom then
        Post.bloom:Destroy()
    end
    if Post.blur then
        Post.blur:Destroy()
    end
    Post.cc, Post.bloom, Post.blur = nil, nil, nil
end

function Post.ensure()
    local cc, bloom, blur = Post.cc, Post.bloom, Post.blur
    if cc and bloom and blur and cc.Parent == Lighting and bloom.Parent == Lighting and blur.Parent == Lighting then
        return
    end
    Post.destroy()
    Post.cc = new("ColorCorrectionEffect", { Name = POST_NAMES[1], Enabled = false }, Lighting)
    Post.bloom = new("BloomEffect", { Name = POST_NAMES[2], Enabled = false, Intensity = 0, Size = 24, Threshold = 1.1 }, Lighting)
    Post.blur = new("BlurEffect", { Name = POST_NAMES[3], Enabled = false, Size = 0 }, Lighting)
end

function Post.disable()
    if Post.cc then
        Post.cc.Enabled = false
    end
    if Post.bloom then
        Post.bloom.Enabled = false
    end
    if Post.blur then
        Post.blur.Enabled = false
    end
end

function Post.update(blend, q)
    local cc = Post.cc
    if not (cc and Post.bloom and Post.blur) then
        return
    end
    cc.Enabled = true
    cc.TintColor = WHITE:Lerp(TINT, blend)
    cc.Contrast = 0.16 * blend
    cc.Saturation = -0.2 * blend
    cc.Brightness = 0.03 * blend + 0.1 * FX.flash

    local bloom = Post.bloom
    if q.Bloom then
        bloom.Enabled = true
        bloom.Intensity = 0.8 * blend + 0.8 * FX.flash
    elseif bloom.Enabled then
        bloom.Enabled = false
    end

    local blurSize = 0
    if q.Blur then
        blurSize = 14 * FX.spike * FX.spike
        if q.MotionBlur then
            blurSize += 3 * blend * FX.speedFrac
        end
    end
    local blur = Post.blur
    if blurSize > 0.3 then
        blur.Size = blurSize
        blur.Enabled = true
    elseif blur.Enabled then
        blur.Enabled = false
    end
end

--------------------------------------------------------------------------------
-- AUDIO  (muffle where Roblox lets a client do it)
--------------------------------------------------------------------------------
function Audio.begin()
    if Audio.engaged or not CONFIG.MuffleAudio then
        return
    end
    Audio.engaged = true
    Audio.lastBlend = -1
    pcall(function()
        Audio.prevReverb = SoundService.AmbientReverb
        SoundService.AmbientReverb = Enum.ReverbType.UnderWater
        Audio.setReverb = SoundService.AmbientReverb
    end)
    for _, child in ipairs(SoundService:GetChildren()) do
        if child:IsA("SoundGroup") then
            Audio.eqs[#Audio.eqs + 1] = new("EqualizerSoundEffect", {
                Name = "SandevistanEQ", HighGain = 0, MidGain = 0, LowGain = 0,
            }, child)
        end
    end
end

function Audio.update(blend)
    if not Audio.engaged or abs(blend - Audio.lastBlend) < 0.01 then
        return
    end
    Audio.lastBlend = blend
    for i = 1, #Audio.eqs do
        local eq = Audio.eqs[i]
        eq.HighGain = -30 * blend
        eq.MidGain = -10 * blend
    end
end

function Audio.finish()
    if not Audio.engaged then
        return
    end
    Audio.engaged = false
    pcall(function()
        -- Only put the reverb back if it is still the value we set.
        if Audio.setReverb ~= nil and SoundService.AmbientReverb == Audio.setReverb then
            SoundService.AmbientReverb = Audio.prevReverb
        end
    end)
    Audio.prevReverb, Audio.setReverb = nil, nil
    for i = 1, #Audio.eqs do
        Audio.eqs[i]:Destroy()
    end
    table.clear(Audio.eqs)
end

--------------------------------------------------------------------------------
-- SPRINT LEAN  (adds to the animation pose on Stepped; nothing permanent is set)
--------------------------------------------------------------------------------
function Lean.stop()
    if Lean.conn then
        Lean.conn:Disconnect()
        Lean.conn = nil
    end
    local joint = Lean.joint
    if joint and Lean.lastSet and joint.Transform == Lean.lastSet then
        joint.Transform = Lean.lastBase
    end
    Lean.joint, Lean.lastSet, Lean.lastBase, Lean.amount = nil, nil, nil, 0
end

function Lean.step(_, dt)
    local joint = Lean.joint
    if not joint or joint.Parent == nil then
        Lean.stop()
        return
    end
    local target = 0
    if Ability.active and not FX.firstPerson then
        target = Lean.maxAngle * FX.speedFrac * Ability.blend
    end
    Lean.amount += (target - Lean.amount) * damp(10, dt)
    if not Ability.active and Lean.amount < 0.003 then
        Lean.stop()
        return
    end
    -- If the Animator did not rewrite Transform since our last write, build on the
    -- pose we saved instead of on our own output, so the lean can never stack up.
    local current = joint.Transform
    local base = current
    if Lean.lastSet and current == Lean.lastSet then
        base = Lean.lastBase
    end
    local c0 = joint.C0.Rotation
    joint.Transform = (c0:Inverse() * CFrame.Angles(-Lean.amount, 0, 0) * c0) * base
    Lean.lastSet = joint.Transform
    Lean.lastBase = base
end

function Lean.begin()
    if not CONFIG.SprintLean or Lean.conn then
        return
    end
    local model = Char.model
    if not model then
        return
    end
    local joint, degrees
    local upper = model:FindFirstChild("UpperTorso")
    if upper then
        joint, degrees = upper:FindFirstChild("Waist"), 13
    elseif Char.root then
        joint, degrees = Char.root:FindFirstChild("RootJoint"), 8
    end
    if not (joint and joint:IsA("Motor6D")) then
        return
    end
    Lean.joint, Lean.maxAngle, Lean.amount = joint, math.rad(degrees), 0
    Lean.conn = RunService.Stepped:Connect(function(t, dt)
        if not pcall(Lean.step, t, dt) then
            pcall(Lean.stop)
        end
    end)
end

--------------------------------------------------------------------------------
-- CAMERA  (FOV and shake are layered on top of whatever the camera already does)
--------------------------------------------------------------------------------
local function camAdopt(cam)
    Cam.cam = cam
    Cam.baseFOV = cam.FieldOfView
    Cam.lastFOV = cam.FieldOfView
    Cam.yield, Cam.fight, Cam.quiet, Cam.quietNeed = false, 0, 0, 0.75
    Cam.preShake, Cam.lastShake = nil, nil
end

function Cam.begin()
    local cam = Workspace.CurrentCamera
    if not cam then
        return
    end
    -- Re-activating during the wind-down keeps the baseline we already saved.
    if not (Cam.engaged and Cam.cam == cam) then
        camAdopt(cam)
        Cam.gain = 1
    end
    Cam.engaged = true
    Cam.punch = 1
    Cam.kick = 0.012
end

function Cam.update(dt, now, q)
    if not Cam.engaged then
        return
    end
    local cam = Workspace.CurrentCamera
    if not cam then
        return
    end
    if cam ~= Cam.cam then
        camAdopt(cam)
        Cam.gain = 0
    end

    -- Field of view -------------------------------------------------------
    local current = cam.FieldOfView
    if Cam.yield then
        -- Something else is driving FOV every frame. Stay out until it settles.
        if abs(current - Cam.watch) > 0.02 then
            Cam.watch = current
            Cam.quiet = 0
        else
            Cam.quiet += dt
            if Cam.quiet >= Cam.quietNeed then
                Cam.yield, Cam.fight, Cam.gain = false, 0, 0
                Cam.baseFOV, Cam.lastFOV = current, current
                Cam.quietNeed = min(Cam.quietNeed * 2, 6)
            end
        end
    elseif abs(current - Cam.lastFOV) > 0.02 then
        -- Changed by the game since our last write: that is the new baseline.
        Cam.baseFOV = current
        Cam.lastFOV = current
        Cam.fight += 1
        if Cam.fight >= 3 then
            Cam.yield, Cam.watch, Cam.quiet = true, current, 0
        end
    else
        Cam.fight = 0
    end

    if not Cam.yield then
        Cam.gain = min(1, Cam.gain + dt * 3)
        local offset = CONFIG.CameraFOVBoost * Ability.blend * (0.35 + 0.65 * FX.speedFrac) * Cam.gain
        if Cam.punch > 0 then
            -- Quick dip before the widen: the "world snaps" beat on activation.
            Cam.punch = max(0, Cam.punch - dt / 0.45)
            local p = 1 - Cam.punch
            offset -= 4 * sin(p * math.pi) * (1 - p) * Cam.gain
        end
        local want = clamp(Cam.baseFOV + offset, 1, 120)
        if abs(want - current) > 0.005 then
            cam.FieldOfView = want
        end
        Cam.lastFOV = cam.FieldOfView
    end

    -- Shake ----------------------------------------------------------------
    -- If nobody recomputed the camera since last frame, take our old shake back
    -- out first so it can never accumulate into drift.
    if Cam.lastShake then
        if cam.CFrame == Cam.lastShake then
            cam.CFrame = Cam.preShake
        end
        Cam.lastShake, Cam.preShake = nil, nil
    end
    Cam.kick = max(0, Cam.kick - dt * 0.05)
    local amplitude = CONFIG.CameraShake * q.Shake * Ability.blend * (0.25 + 0.75 * FX.speedFrac) + Cam.kick
    if amplitude > 0.0001 and cam.CameraType ~= Enum.CameraType.Scriptable then
        local t = now * 14
        local before = cam.CFrame
        cam.CFrame = before * CFrame.Angles(
            math.noise(t, Cam.seed) * amplitude,
            math.noise(Cam.seed, t) * amplitude,
            math.noise(t, t * 0.37, Cam.seed) * amplitude * 0.5)
        Cam.preShake = before
        Cam.lastShake = cam.CFrame
    end
end

function Cam.restoreNow()
    if not Cam.engaged then
        return
    end
    Cam.engaged = false
    local cam = Cam.cam
    if cam and cam.Parent then
        if Cam.lastShake and cam.CFrame == Cam.lastShake then
            cam.CFrame = Cam.preShake
        end
        -- Only put FOV back if the value on the camera is still the one we wrote.
        if not Cam.yield and Cam.lastFOV and abs(cam.FieldOfView - Cam.lastFOV) <= 0.02 then
            cam.FieldOfView = Cam.baseFOV
        end
    end
    Cam.lastShake, Cam.preShake = nil, nil
    Cam.kick, Cam.punch = 0, 0
end

--------------------------------------------------------------------------------
-- MOVEMENT  (WalkSpeed only; writes happen on ramps and slider changes, not every frame)
--------------------------------------------------------------------------------
local function writeSpeed(hum, value)
    hum.WalkSpeed = value
    Move.lastWritten = hum.WalkSpeed
end

function Move.begin()
    local hum = Char.hum
    -- Re-activating during the wind-down keeps the original speed we already saved.
    if not (Move.engaged and Move.hum == hum) then
        Move.hum = hum
        Move.baseSpeed = hum.WalkSpeed
        Move.normalSpeed = hum.WalkSpeed
        Move.lastWritten = hum.WalkSpeed
    end
    Move.engaged = true
    Move.overrides, Move.holdUntil, Move.gain = 0, 0, 1
    Move.yielded, Move.suppressed = false, false
end

function Move.update(dt, now)
    if not Move.engaged then
        return
    end
    local hum = Move.hum
    if not hum or hum.Parent == nil or hum ~= Char.hum then
        Move.engaged = false
        return
    end

    local current = hum.WalkSpeed
    if abs(current - Move.lastWritten) > 0.05 then
        -- The game (or the server) changed WalkSpeed. Treat its value as the new
        -- normal speed and decide whether we are allowed to boost again.
        Move.baseSpeed = current
        Move.lastWritten = current
        Move.gain = 0
        if Ability.active then
            Move.overrides += 1
            Move.suppressed = current < Move.normalSpeed - 0.05 -- slowed or stunned: leave it alone
            if Move.overrides > CONFIG.SpeedReapplyLimit then
                Move.yielded = true
            else
                Move.holdUntil = now + CONFIG.SpeedReapplyDelay
            end
        else
            Move.yielded = true
        end
        UI.nextRefresh = 0
    end

    if Move.yielded or Move.suppressed or now < Move.holdUntil then
        return
    end

    Move.gain = min(1, Move.gain + dt / 0.35)
    local boosted = max(clamp(CONFIG.SandevistanSpeed, 0, CONFIG.MaxSpeed), Move.baseSpeed)
    local target = Move.baseSpeed + (boosted - Move.baseSpeed) * Ability.blend * Move.gain
    if abs(target - current) > 0.01 then
        writeSpeed(hum, target)
    end

    -- Ground handling: steer the horizontal velocity toward the stick direction
    -- and bleed off the slide when the stick is released.
    if not (CONFIG.MovementAssist and Ability.active and Ability.blend > 0.6) then
        return
    end
    local root = Char.root
    if not root or root.Parent == nil or root.Anchored then
        return
    end
    if hum.FloorMaterial == Enum.Material.Air or hum.Sit or hum.PlatformStand then
        return
    end
    local state = hum:GetState()
    if state ~= Enum.HumanoidStateType.Running and state ~= Enum.HumanoidStateType.RunningNoPhysics then
        return
    end
    local velocity = root.AssemblyLinearVelocity
    local flat = Vector3.new(velocity.X, 0, velocity.Z)
    local direction = hum.MoveDirection
    local steered
    if direction.Magnitude > 0.05 then
        local desired = Vector3.new(direction.X, 0, direction.Z) * hum.WalkSpeed
        steered = flat:Lerp(desired, damp(CONFIG.TurnAssist, dt))
    elseif flat.Magnitude > Move.baseSpeed + 2 then
        steered = flat * exp(-CONFIG.BrakeAssist * dt)
    end
    if steered then
        root.AssemblyLinearVelocity = Vector3.new(steered.X, velocity.Y, steered.Z)
    end
end

function Move.restoreNow()
    if not Move.engaged then
        return
    end
    Move.engaged = false
    local hum = Move.hum
    -- Only restore if WalkSpeed is still the value we wrote; otherwise the game
    -- has already set its own and that one stands.
    if hum and hum.Parent and abs(hum.WalkSpeed - Move.lastWritten) <= 0.05 then
        hum.WalkSpeed = Move.baseSpeed
    end
    Move.hum = nil
    Move.yielded, Move.suppressed = false, false
end

--------------------------------------------------------------------------------
-- NPC REGISTRY  (a few instances per frame, never one big Workspace scan)
--------------------------------------------------------------------------------
function Npc.step(now, budget)
    if not CONFIG.IncludeNPCs then
        return
    end
    local queue, depth = Npc.queue, Npc.depth
    if not Npc.running then
        if now < Npc.nextPass then
            return
        end
        table.clear(queue)
        table.clear(depth)
        local children = Workspace:GetChildren()
        for i = 1, #children do
            queue[i] = children[i]
            depth[i] = 1
        end
        Npc.head, Npc.tail, Npc.running = 1, #children, true
        return
    end
    local head, tail = Npc.head, Npc.tail
    local spent = 0
    while head <= tail and spent < budget do
        local inst, level = queue[head], depth[head]
        queue[head], depth[head] = nil, nil
        head += 1
        spent += 1
        if inst ~= FX.folder then
            local className = inst.ClassName
            local isModel = className == "Model" or className == "Actor"
            if isModel and inst:FindFirstChildOfClass("Humanoid") then
                if not Players:GetPlayerFromCharacter(inst) then
                    Npc.known[inst] = true
                end
            elseif (isModel or className == "Folder" or className == "WorldModel") and level < CONFIG.NpcScanDepth then
                local children = inst:GetChildren()
                for i = 1, #children do
                    tail += 1
                    queue[tail] = children[i]
                    depth[tail] = level + 1
                end
                spent += #children * 0.1
            end
        end
    end
    Npc.head, Npc.tail = head, tail
    if head > tail then
        Npc.running = false
        if Ability.active then
            Npc.nextPass = now + 2
        else
            Npc.nextPass = now + 8
        end
    end
end

--------------------------------------------------------------------------------
-- SLOW-MOTION PROXIES
--   real character: hidden locally (LocalTransparencyModifier, effects off)
--   proxy:          a cleaned clone with its rig intact, anchored, no collisions,
--                   posed from buffered snapshots played back at SlowMotionFactor
--------------------------------------------------------------------------------
local STRIP_CLASS = {
    Animator = true, AnimationController = true, TouchTransmitter = true, ClickDetector = true,
    ProximityPrompt = true, Dialog = true,
}
local classKind = {}

-- Classify once per ClassName so walking a character costs one table lookup per instance.
local function kindOf(inst)
    local className = inst.ClassName
    local kind = classKind[className]
    if kind == nil then
        if inst:IsA("BasePart") then
            kind = "part"
        elseif inst:IsA("Decal") then
            kind = "decal"
        elseif className == "Motor6D" then
            kind = "motor"
        elseif inst:IsA("JointInstance") or className == "WeldConstraint" then
            kind = "weld"
        elseif className == "Sound" then
            kind = "sound"
        elseif className == "Humanoid" then
            kind = "humanoid"
        elseif className == "ForceField" then
            kind = "forcefield"
        elseif inst:IsA("ParticleEmitter") or className == "Fire" or className == "Smoke" or className == "Sparkles" then
            kind = "particle"
        elseif inst:IsA("Trail") or inst:IsA("Beam") or inst:IsA("Light") or className == "BillboardGui" or className == "Highlight" then
            kind = "toggle"
        elseif STRIP_CLASS[className] or inst:IsA("LuaSourceContainer") or inst:IsA("Constraint") or inst:IsA("BodyMover") then
            kind = "strip"
        else
            kind = false
        end
        classKind[className] = kind
    end
    return kind
end

-- Records are stored flat (instance, property, previous, written) to avoid a table each.
local function hideProp(record, inst, prop, value)
    local previous = inst[prop]
    if previous == value then
        return
    end
    inst[prop] = value
    local n = #record
    record[n + 1], record[n + 2], record[n + 3], record[n + 4] = inst, prop, previous, value
end

local function restoreOne(inst, prop, previous, written)
    -- If the game changed it in the meantime, the game's value wins.
    if inst[prop] == written then
        inst[prop] = previous
    end
end

local function hideInstance(proxy, inst)
    local kind = kindOf(inst)
    if kind == "part" or kind == "decal" then
        hideProp(proxy.record, inst, "LocalTransparencyModifier", 1)
    elseif kind == "particle" or kind == "toggle" then
        hideProp(proxy.record, inst, "Enabled", false)
    elseif kind == "forcefield" then
        hideProp(proxy.record, inst, "Visible", false)
    elseif kind == "sound" and CONFIG.MuffleAudio and #proxy.sfx < 8 then
        proxy.sfx[#proxy.sfx + 1] = new("EqualizerSoundEffect", {
            Name = "SandevistanEQ", HighGain = -28, MidGain = -10, LowGain = 0,
        }, inst)
        if quality().SlowPitch then
            proxy.sfx[#proxy.sfx + 1] = new("PitchShiftSoundEffect", { Name = "SandevistanPitch", Octave = 0.75 }, inst)
        end
    end
end

-- Pair every instance in the real character with its counterpart in the clone.
-- Clone() skips non-Archivable children, so the walk skips them too.
local function pairTree(real, copy, realToCopy, copyToReal)
    realToCopy[real] = copy
    copyToReal[copy] = real
    local realChildren = real:GetChildren()
    local copyChildren = copy:GetChildren()
    local ci = 1
    for i = 1, #realChildren do
        local r = realChildren[i]
        if r.Archivable then
            local c = copyChildren[ci]
            if c and c.ClassName == r.ClassName and c.Name == r.Name then
                ci += 1
                pairTree(r, c, realToCopy, copyToReal)
            else
                for j = ci, #copyChildren do
                    local candidate = copyChildren[j]
                    if candidate.ClassName == r.ClassName and candidate.Name == r.Name then
                        ci = j + 1
                        pairTree(r, candidate, realToCopy, copyToReal)
                        break
                    end
                end
            end
        end
    end
end

local function setTimeScale(inst, value)
    inst.TimeScale = value
end

local function releaseProxy(proxy)
    if proxy.dead then
        return
    end
    proxy.dead = true
    if proxy.conn then
        proxy.conn:Disconnect()
        proxy.conn = nil
    end
    -- Show the real character again and remove the copy in the same frame.
    local record = proxy.record
    for i = #record - 3, 1, -4 do
        pcall(restoreOne, record[i], record[i + 1], record[i + 2], record[i + 3])
    end
    table.clear(record)
    for i = 1, #proxy.sfx do
        proxy.sfx[i]:Destroy()
    end
    table.clear(proxy.sfx)
    if proxy.clone then
        proxy.clone:Destroy()
        proxy.clone = nil
    end
    if Proxies.byModel[proxy.model] == proxy then
        Proxies.byModel[proxy.model] = nil
    end
end

local function capture(proxy, now)
    local snap = table.remove(proxy.free)
    if not snap then
        snap = { t = 0, anchor = nil, joints = table.create(proxy.jointCount), loose = table.create(proxy.looseCount) }
    end
    -- Read each real part once, then derive joint-space poses from those.
    local world, realParts = proxy.world, proxy.realParts
    for i = 1, #realParts do
        world[i] = realParts[i].CFrame
    end
    local anchorCF = world[1]
    snap.t = now
    snap.anchor = anchorCF
    local joints, jointA, jointB = snap.joints, proxy.jointA, proxy.jointB
    for i = 1, proxy.jointCount do
        joints[i] = world[jointA[i]]:ToObjectSpace(world[jointB[i]])
    end
    local loose, looseIndex = snap.loose, proxy.looseIndex
    for i = 1, proxy.looseCount do
        loose[i] = anchorCF:ToObjectSpace(world[looseIndex[i]])
    end
    proxy.snaps[#proxy.snaps + 1] = snap
end

local function pose(proxy, withJoints)
    local snaps = proxy.snaps
    while #snaps >= 2 and snaps[2].t <= proxy.play do
        proxy.free[#proxy.free + 1] = table.remove(snaps, 1)
    end
    local a, b = snaps[1], snaps[2]
    if not a then
        return
    end
    local alpha = 0
    if b then
        alpha = clamp((proxy.play - a.t) / max(b.t - a.t, 0.0001), 0, 1)
    end

    local anchorCF = a.anchor
    if b then
        anchorCF = anchorCF:Lerp(b.anchor, alpha)
    end
    -- Moving the anchored part carries the whole jointed rig with it.
    proxy.anchor.CFrame = anchorCF

    if withJoints then
        local motors, c0Inverse, c1 = proxy.motors, proxy.c0Inverse, proxy.c1
        for i = 1, proxy.jointCount do
            local relative = a.joints[i]
            if b then
                relative = relative:Lerp(b.joints[i], alpha)
            end
            -- part1 = part0 * C0 * Transform * C1^-1  =>  Transform = C0^-1 * relative * C1
            motors[i].Transform = c0Inverse[i] * relative * c1[i]
        end
    end

    local looseParts = proxy.looseParts
    for i = 1, proxy.looseCount do
        local relative = a.loose[i]
        if b then
            relative = relative:Lerp(b.loose[i], alpha)
        end
        looseParts[i].CFrame = anchorCF * relative
    end
end

local function buildProxyInto(proxy, candidate, now, q)
    local model, realRoot = candidate.model, candidate.root
    local realDescendants = model:GetDescendants()
    if #realDescendants > CONFIG.MaxProxyInstances then
        proxy.failed = true
        return
    end

    -- Player characters are not Archivable by default; flip it only for the clone call.
    local wasArchivable = model.Archivable
    model.Archivable = true
    local ok, clone = pcall(model.Clone, model)
    model.Archivable = wasArchivable
    if not ok or not clone then
        proxy.failed = true
        return
    end
    proxy.clone = clone

    local realToCopy, copyToReal = {}, {}
    pairTree(model, clone, realToCopy, copyToReal)

    -- Clean the clone: no scripts, sounds, physics constraints or animation drivers.
    local parts, motors, welds = {}, {}, {}
    local isMine = {}
    local cloneHum
    local cloneDescendants = clone:GetDescendants()
    for i = 1, #cloneDescendants do
        local d = cloneDescendants[i]
        if d.Parent ~= nil then
            local kind = kindOf(d)
            if kind == "strip" or kind == "sound" then
                pcall(d.Destroy, d)
            elseif kind == "part" then
                parts[#parts + 1] = d
                isMine[d] = true
            elseif kind == "motor" then
                motors[#motors + 1] = d
            elseif kind == "weld" then
                welds[#welds + 1] = d
            elseif kind == "particle" then
                pcall(setTimeScale, d, clamp(CONFIG.SlowMotionFactor, 0, 1))
            elseif kind == "humanoid" and not cloneHum then
                cloneHum = d
            end
        end
    end
    for i = 1, #parts do
        local part = parts[i]
        part.Anchored = false
        part.CanCollide = false
        part.CanTouch = false
        part.CanQuery = false
        part.Massless = true
        part.LocalTransparencyModifier = 0
        if not q.ProxyShadows then
            part.CastShadow = false
        end
    end
    if cloneHum then
        -- The Humanoid stays only so clothing and name tags render; it must not simulate.
        safeSet(cloneHum, "BreakJointsOnDeath", false)
        safeSet(cloneHum, "RequiresNeck", false)
        safeSet(cloneHum, "EvaluateStateMachine", false)
        proxy.cloneHum = cloneHum
    end

    -- Anchor: the body part jointed to HumanoidRootPart. The invisible root itself
    -- is dropped from the clone so its Humanoid has no root part to drive.
    local rootCopy = realToCopy[realRoot]
    local anchor
    if rootCopy and isMine[rootCopy] then
        for i = 1, #motors do
            local m = motors[i]
            local p0, p1 = m.Part0, m.Part1
            local other
            if p0 == rootCopy then
                other = p1
            elseif p1 == rootCopy then
                other = p0
            end
            if other and isMine[other] and copyToReal[other] then
                anchor = other
                break
            end
        end
        if anchor then
            isMine[rootCopy] = nil
            rootCopy:Destroy()
        else
            anchor = rootCopy
        end
    end
    if not anchor then
        for i = 1, #parts do
            local part = parts[i]
            if isMine[part] and copyToReal[part] then
                anchor = part
                break
            end
        end
    end
    if not anchor then
        proxy.failed = true
        return
    end

    -- Joint graph: which parts hang off the anchor through joints that stay.
    local adjacency = {}
    local function link(p0, p1)
        local list0 = adjacency[p0]
        if not list0 then
            list0 = {}
            adjacency[p0] = list0
        end
        list0[#list0 + 1] = p1
        local list1 = adjacency[p1]
        if not list1 then
            list1 = {}
            adjacency[p1] = list1
        end
        list1[#list1 + 1] = p0
    end
    local liveMotors = {}
    for i = 1, #motors do
        local m = motors[i]
        if m.Parent ~= nil then
            local p0, p1 = m.Part0, m.Part1
            if p0 and p1 and isMine[p0] and isMine[p1] then
                m.Enabled = true -- ragdolls disable these; the copy is always posed through them
                link(p0, p1)
                liveMotors[#liveMotors + 1] = m
            else
                m:Destroy() -- one end was outside the character (or was the root we removed)
            end
        end
    end
    for i = 1, #welds do
        local w = welds[i]
        if w.Parent ~= nil then
            local p0, p1 = w.Part0, w.Part1
            if p0 and p1 and isMine[p0] and isMine[p1] then
                if w.Enabled then
                    link(p0, p1)
                end
            else
                w:Destroy() -- never leave the copy welded to something in the real world
            end
        end
    end
    local reached = { [anchor] = true }
    local frontier, cursor = { anchor }, 1
    while cursor <= #frontier do
        local list = adjacency[frontier[cursor]]
        cursor += 1
        if list then
            for i = 1, #list do
                local neighbour = list[i]
                if not reached[neighbour] then
                    reached[neighbour] = true
                    frontier[#frontier + 1] = neighbour
                end
            end
        end
    end

    -- Parts with no path to the anchor get placed one by one, so nothing may still
    -- tie them to each other.
    for i = 1, #liveMotors do
        local m = liveMotors[i]
        if not (reached[m.Part0] and reached[m.Part1]) then
            m:Destroy()
        end
    end
    for i = 1, #welds do
        local w = welds[i]
        if w.Parent ~= nil and not (reached[w.Part0] and reached[w.Part1]) then
            w:Destroy()
        end
    end

    -- Index the real parts we need to sample; index 1 is always the anchor's.
    local realParts, realIndex = {}, {}
    local function indexOf(realPart)
        local i = realIndex[realPart]
        if not i then
            i = #realParts + 1
            realParts[i] = realPart
            realIndex[realPart] = i
        end
        return i
    end
    indexOf(copyToReal[anchor])

    local jointCount = 0
    local driven, c0Inverse, c1, jointA, jointB = {}, {}, {}, {}, {}
    for i = 1, #liveMotors do
        local m = liveMotors[i]
        local p0, p1 = m.Part0, m.Part1
        local r0, r1 = copyToReal[p0], copyToReal[p1]
        if m.Parent ~= nil and reached[p0] and reached[p1] and r0 and r1 then
            jointCount += 1
            driven[jointCount] = m
            c0Inverse[jointCount] = m.C0:Inverse()
            c1[jointCount] = m.C1
            jointA[jointCount] = indexOf(r0)
            jointB[jointCount] = indexOf(r1)
        end
    end

    -- Parts with no joint path to the anchor are anchored and placed directly.
    local looseCount = 0
    local looseParts, looseIndex = {}, {}
    local liveParts = {}
    for i = 1, #parts do
        local part = parts[i]
        if isMine[part] and part.Parent ~= nil then
            if reached[part] then
                liveParts[#liveParts + 1] = part
            else
                local realPart = copyToReal[part]
                if realPart then
                    part.Anchored = true
                    looseCount += 1
                    looseParts[looseCount] = part
                    looseIndex[looseCount] = indexOf(realPart)
                    liveParts[#liveParts + 1] = part
                else
                    part:Destroy()
                end
            end
        end
    end
    anchor.Anchored = true

    proxy.anchor = anchor
    proxy.anchorReal = copyToReal[anchor]
    proxy.parts = liveParts
    proxy.motors, proxy.c0Inverse, proxy.c1 = driven, c0Inverse, c1
    proxy.jointA, proxy.jointB, proxy.jointCount = jointA, jointB, jointCount
    proxy.looseParts, proxy.looseIndex, proxy.looseCount = looseParts, looseIndex, looseCount
    proxy.realParts = realParts
    proxy.world = table.create(#realParts)

    -- First snapshot is "now", so the copy starts exactly on top of the original.
    -- The clone keeps the model's name: a Humanoid without a DisplayName shows it.
    capture(proxy, now)
    pose(proxy, true)
    clone.Parent = FX.folder

    -- Hide the original in the same frame the copy appears.
    for i = 1, #realDescendants do
        hideInstance(proxy, realDescendants[i])
    end
    hideProp(proxy.record, candidate.hum, "DisplayDistanceType", Enum.HumanoidDisplayDistanceType.None)
    proxy.conn = model.DescendantAdded:Connect(function(added)
        if not proxy.dead then
            pcall(hideInstance, proxy, added)
        end
    end)
end

local function tryBuildProxy(candidate, now, q)
    Proxies.serial += 1
    local proxy = {
        id = Proxies.serial, model = candidate.model, realHum = candidate.hum, realRoot = candidate.root,
        state = "live", play = now, far = false, guardHits = 0,
        record = {}, sfx = {}, snaps = {}, free = {},
    }
    local ok, err = pcall(buildProxyInto, proxy, candidate, now, q)
    if not ok or proxy.failed then
        releaseProxy(proxy)
        Proxies.failed[candidate.model] = true
        if not ok then
            warn("[Sandevistan] could not copy " .. tostring(candidate.model) .. ": " .. tostring(err))
        end
        return nil
    end
    return proxy
end

local function beginReturn(proxy)
    if proxy.state ~= "returning" then
        proxy.state = "returning"
        proxy.returnTime = 0
        proxy.returnFrom = proxy.play
    end
end

local candidates = {}

local function consider(model, origin, radius)
    if Proxies.byModel[model] or Proxies.failed[model] then
        return
    end
    if not model:IsDescendantOf(Workspace) then
        Npc.known[model] = nil
        return
    end
    local hum = model:FindFirstChildOfClass("Humanoid")
    local root = model:FindFirstChild("HumanoidRootPart")
    if not hum or not root or not root:IsA("BasePart") or hum.Health <= 0 then
        return
    end
    local distance = (root.Position - origin).Magnitude
    if distance <= radius then
        candidates[#candidates + 1] = { model = model, hum = hum, root = root, distance = distance }
    end
end

local function byDistance(a, b)
    return a.distance < b.distance
end

local function gatherCandidates(origin, radius)
    table.clear(candidates)
    local list = Players:GetPlayers()
    for i = 1, #list do
        local other = list[i]
        if other ~= player and other.Character then
            consider(other.Character, origin, radius)
        end
    end
    if CONFIG.IncludeNPCs then
        for model in pairs(Npc.known) do
            if model ~= Char.model then
                consider(model, origin, radius)
            end
        end
    end
    table.sort(candidates, byDistance)
end

function Proxies.begin(now)
    Proxies.enabled = true
    table.clear(Proxies.failed)
    Proxies.nextCheck, Proxies.nextBuild, Proxies.nextSnap = 0, 0, now
    for i = 1, #Proxies.list do
        local proxy = Proxies.list[i]
        if proxy.state == "returning" then
            proxy.state = "live"
        end
    end
end

function Proxies.finish(instant)
    Proxies.enabled = false
    table.clear(candidates)
    if instant then
        Proxies.clearAll()
        return
    end
    for i = 1, #Proxies.list do
        beginReturn(Proxies.list[i])
    end
end

function Proxies.clearAll()
    local list = Proxies.list
    for i = #list, 1, -1 do
        releaseProxy(list[i])
        list[i] = nil
    end
    table.clear(Proxies.byModel)
    table.clear(candidates)
end

-- Heartbeat: sample real characters, look after existing copies, build new ones.
function Proxies.heartbeat(now)
    local list = Proxies.list
    if not Proxies.enabled and #list == 0 then
        return
    end
    local q = quality()

    if now >= Proxies.nextSnap then
        Proxies.nextSnap = now + 1 / q.SnapshotRate
        for i = 1, #list do
            if list[i].state == "live" then
                capture(list[i], now)
            end
        end
    end

    if now >= Proxies.nextCheck then
        Proxies.nextCheck = now + 0.25
        local origin
        if Char.root and Char.root.Parent then
            origin = Char.root.Position
        end
        for i = #list, 1, -1 do
            local proxy = list[i]
            if not proxy.model:IsDescendantOf(Workspace) or not proxy.anchorReal:IsDescendantOf(Workspace) then
                -- Left, respawned or streamed out: nothing left to hand back to.
                releaseProxy(proxy)
                table.remove(list, i)
            else
                if proxy.state == "live" then
                    local distance = 0
                    if origin then
                        distance = (proxy.realRoot.Position - origin).Magnitude
                    end
                    proxy.far = distance > q.ProxyRadius * 0.6
                    if proxy.realHum.Health <= 0 or distance > q.ProxyRadius * 2.5 then
                        beginReturn(proxy)
                    end
                end
                -- A copy must never block anyone. If a Humanoid keeps switching
                -- collisions back on, the Humanoid goes (clothing is the price).
                local parts = proxy.parts
                local hit = false
                for j = 1, #parts do
                    if parts[j].CanCollide then
                        parts[j].CanCollide = false
                        hit = true
                    end
                end
                if hit then
                    proxy.guardHits += 1
                    if proxy.guardHits >= 3 and proxy.cloneHum then
                        proxy.cloneHum:Destroy()
                        proxy.cloneHum = nil
                    end
                end
                local cloneHum, realHum = proxy.cloneHum, proxy.realHum
                if cloneHum and realHum.Health > 0 then
                    if cloneHum.MaxHealth ~= realHum.MaxHealth then
                        cloneHum.MaxHealth = realHum.MaxHealth
                    end
                    if cloneHum.Health ~= realHum.Health then
                        cloneHum.Health = realHum.Health
                    end
                end
            end
        end
        if Proxies.enabled and origin then
            gatherCandidates(origin, q.ProxyRadius)
        end
    end

    -- At most one new copy per tick so a crowd never causes a hitch.
    if Proxies.enabled and now >= Proxies.nextBuild and #list < q.MaxProxies and #candidates > 0 then
        local candidate = table.remove(candidates, 1)
        while candidate and (Proxies.byModel[candidate.model] or not candidate.model:IsDescendantOf(Workspace)) do
            candidate = table.remove(candidates, 1)
        end
        if candidate then
            Proxies.nextBuild = now + 0.04
            FX.getFolder()
            local proxy = tryBuildProxy(candidate, now, q)
            if proxy then
                list[#list + 1] = proxy
                Proxies.byModel[candidate.model] = proxy
            end
        end
    end
end

-- Render step: advance each copy's playback clock and pose it.
function Proxies.render(dt, now, q)
    local list = Proxies.list
    local frame = FX.frame
    local i = 1
    while i <= #list do
        local proxy = list[i]
        local finished = false
        if proxy.state == "live" then
            local rate = clamp(CONFIG.SlowMotionFactor, 0.01, 1)
            local lag = now - proxy.play
            local soft = CONFIG.MaxVisualLag * 0.85
            if lag > soft then
                -- Near the lag cap, ease up to real speed so the buffer stays bounded.
                rate += (1 - rate) * clamp((lag - soft) / max(CONFIG.MaxVisualLag - soft, 0.01), 0, 1)
            end
            proxy.play = min(proxy.play + dt * rate, now)
        else
            -- Fast-forward along the recorded path (never a straight line through
            -- walls) and land on the live pose.
            capture(proxy, now)
            proxy.returnTime += dt
            local a = clamp(proxy.returnTime / max(CONFIG.ProxyReturnTime, 0.05), 0, 1)
            proxy.play = proxy.returnFrom + (now - proxy.returnFrom) * smooth(a)
            finished = a >= 1
        end
        if finished then
            releaseProxy(proxy)
            list[i] = list[#list]
            list[#list] = nil
        else
            local every = q.ProxyPoseEvery
            if proxy.far then
                every += 1
            end
            pose(proxy, proxy.state ~= "live" or (frame + proxy.id) % every == 0)
            i += 1
        end
    end
end

--------------------------------------------------------------------------------
-- FX ORCHESTRATION + LOOPS
--------------------------------------------------------------------------------
local function emitBurst(count)
    if Rig.burst then
        Rig.burst:Emit(count)
    end
end

function FX.begin(now)
    local q = quality()
    local position = Char.root.Position
    FX.flash, FX.spike = 1, 1
    guard("body effects", Rig.ensure, q)
    guard("body effects", Rig.setActive, true)
    guard("body effects", emitBurst, q.BurstCount)
    guard("post effects", Post.ensure)
    guard("screen overlay", Overlay.show)
    guard("shockwave", Shock.play, position, false, q)
    guard("lightning", Bolts.burst, now, q)
    guard("sprint lean", Lean.begin)
    Ghosts.lastPos, Ghosts.travel = position, 0
end

function FX.finish(instant)
    pcall(Rig.setActive, false)
    if instant then
        return
    end
    FX.flash = max(FX.flash, 0.45)
    local root = Char.root
    if root and root.Parent then
        local q = quality()
        guard("shockwave", Shock.play, root.Position, true, q)
        guard("body effects", emitBurst, floor(q.BurstCount * 0.5))
    end
end

local function rebuildRig()
    Rig.ensure(quality())
    Rig.state = nil
    Rig.setActive(true)
end

function FX.onQualityChanged()
    pcall(Ghosts.reset)
    pcall(Bolts.hideAll)
    if Ability.active then
        guard("body effects", rebuildRig)
    end
end

local renderBound = false

local function renderBody(dt)
    local now = os.clock()
    local q = quality()
    local blend = Ability.blend
    FX.frame += 1

    local root = Char.root
    local speed = 0
    if root and root.Parent then
        local velocity = root.AssemblyLinearVelocity
        speed = Vector3.new(velocity.X, 0, velocity.Z).Magnitude
    end
    FX.speedFrac += (clamp(speed / max(CONFIG.SandevistanSpeed, 1), 0, 1) - FX.speedFrac) * damp(8, dt)
    FX.flash = max(0, FX.flash - dt / 0.3)
    FX.spike = max(0, FX.spike - dt / 0.4)

    if now >= FX.nextProbe then
        FX.nextProbe = now + 0.15
        local cam, head = Workspace.CurrentCamera, Char.head
        local firstPerson = false
        if cam and head and head.Parent then
            firstPerson = (cam.CFrame.Position - head.Position).Magnitude < 1.6
        end
        if firstPerson ~= FX.firstPerson then
            FX.firstPerson = firstPerson
            guard("body effects", Rig.setActive, Ability.active)
        end
    end

    guard("camera", Cam.update, dt, now, q)
    guard("slow-motion", Proxies.render, dt, now, q)
    guard("afterimages", Ghosts.update, now, q, speed)
    guard("lightning", Bolts.update, now, q)
    guard("body effects", Rig.update, blend)
    guard("screen overlay", Overlay.update, now, blend, q)
    guard("post effects", Post.update, blend, q)
    guard("audio", Audio.update, blend)

    if not Ability.active and Ability.blendLin <= 0 and #Proxies.list == 0 and Ghosts.alive == 0
        and Bolts.alive == 0 and FX.flash <= 0 and FX.spike <= 0 then
        Overlay.hide()
        Post.disable()
        unbindRender()
    end
end

local function renderStep(dt)
    if destroyed then
        return
    end
    local ok, err = pcall(renderBody, dt)
    if not ok then
        warn("[Sandevistan] render error, resetting: " .. tostring(err))
        Ability.stop("error", true)
        hardReset()
    end
end

function bindRender()
    if not renderBound then
        renderBound = true
        -- One step after the camera so FOV and shake sit on top of the camera's own update.
        RunService:BindToRenderStep(NAME_RENDER, Enum.RenderPriority.Camera.Value + 1, renderStep)
    end
end

function unbindRender()
    if renderBound then
        renderBound = false
        pcall(function()
            RunService:UnbindFromRenderStep(NAME_RENDER)
        end)
    end
end

-- Puts every touched property back right now. Safe to call at any time.
function hardReset()
    Ability.blendLin, Ability.blend = 0, 0
    Proxies.enabled = false
    FX.flash, FX.spike, FX.speedFrac = 0, 0, 0
    -- Each step is isolated so one failure can never leave the others undone.
    pcall(Move.restoreNow)
    pcall(Cam.restoreNow)
    pcall(Audio.finish)
    pcall(Lean.stop)
    pcall(Proxies.clearAll)
    pcall(Ghosts.hideAll)
    pcall(Bolts.hideAll)
    pcall(Rig.setActive, false)
    pcall(Rig.update, 0)
    pcall(Overlay.hide)
    pcall(Post.disable)
    unbindRender()
end

local function heartbeatBody(dt)
    local now = os.clock()
    local budget = 50
    if Ability.active then
        budget = quality().NpcBudget
    end
    Npc.step(now, budget)

    if not (Ability.active or Ability.blendLin > 0 or Ability.cooling or #Proxies.list > 0) then
        return
    end

    if Ability.active then
        local hum, root = Char.hum, Char.root
        if not (Char.alive and hum and root and hum.Parent and root.Parent) then
            Ability.stop("character lost", true)
        elseif durationRemaining(now) <= 0 then
            Ability.stop("timeout", false)
        end
    end

    -- One master 0..1 value drives speed and every effect, in and out.
    local target = 0
    if Ability.active then
        target = 1
    end
    if Ability.blendLin ~= target then
        local seconds = CONFIG.RampOut
        if target == 1 then
            seconds = CONFIG.RampIn
        end
        Ability.blendLin = approach(Ability.blendLin, target, dt / max(seconds, 0.01))
        Ability.blend = smooth(Ability.blendLin)
    end

    Move.update(dt, now)
    if not Ability.active and Ability.blendLin <= 0 then
        -- Wind-down finished: hand speed, camera and audio back.
        Move.restoreNow()
        pcall(Cam.restoreNow)
        pcall(Audio.finish)
    end
    guard("slow-motion", Proxies.heartbeat, now)

    if now >= UI.nextRefresh then
        UI.nextRefresh = now + 0.1
        UI.refresh(now)
    end
end

--------------------------------------------------------------------------------
-- ABILITY
--------------------------------------------------------------------------------
function Ability.start()
    if destroyed or Ability.active then
        return false
    end
    local now = os.clock()
    if cooldownRemaining(now) > 0 then
        UI.deny()
        return false
    end
    local hum, root = Char.hum, Char.root
    if not (Char.alive and hum and root and hum.Parent and root.Parent and hum.Health > 0) then
        UI.deny()
        return false
    end
    Ability.active = true
    Ability.startedAt = now
    local ok, err = pcall(function()
        Move.begin()
        guard("camera", Cam.begin)
        guard("audio", Audio.begin)
        guard("slow-motion", Proxies.begin, now)
        FX.begin(now)
        bindRender()
    end)
    if not ok then
        warn("[Sandevistan] activation failed, resetting: " .. tostring(err))
        Ability.active = false
        hardReset()
        UI.refresh(now)
        return false
    end
    UI.refresh(now)
    return true
end

function Ability.stop(_, instant)
    if Ability.active then
        Ability.active = false
        Ability.endedAt = os.clock()
        Ability.cooling = CONFIG.Cooldown > 0
        pcall(FX.finish, instant)
        pcall(Proxies.finish, instant)
    end
    if instant then
        hardReset()
    end
    UI.refresh()
end

function Ability.toggle()
    if Ability.active then
        Ability.stop("manual", false)
    else
        Ability.start()
    end
end

--------------------------------------------------------------------------------
-- CHARACTER TRACKING
--------------------------------------------------------------------------------
local function clearCharConns()
    for i = 1, #Char.conns do
        Char.conns[i]:Disconnect()
    end
    table.clear(Char.conns)
end

local function bindCharacter(model)
    clearCharConns()
    Char.model, Char.hum, Char.root, Char.head, Char.alive = model, nil, nil, nil, false
    if not model then
        UI.refresh()
        return
    end
    task.spawn(function()
        local root = model:WaitForChild("HumanoidRootPart", 15)
        local hum = model:FindFirstChildOfClass("Humanoid") or model:WaitForChild("Humanoid", 15)
        if destroyed or Char.model ~= model or not root or not hum or not hum:IsA("Humanoid") then
            return
        end
        Char.hum, Char.root = hum, root
        Char.head = model:FindFirstChild("Head")
        Char.alive = hum.Health > 0
        Char.conns[#Char.conns + 1] = hum.Died:Connect(function()
            if Char.hum == hum then
                Char.alive = false
                Ability.stop("death", true)
            end
        end)
        -- New accessory or tool: rebuild the afterimage template next time it is needed.
        local function appearanceChanged(child)
            if child:IsA("Accessory") or child:IsA("Tool") or child:IsA("BasePart") then
                Ghosts.dirty = true
            end
        end
        Char.conns[#Char.conns + 1] = model.ChildAdded:Connect(appearanceChanged)
        Char.conns[#Char.conns + 1] = model.ChildRemoved:Connect(appearanceChanged)
        UI.refresh()
    end)
end

--------------------------------------------------------------------------------
-- UI
--------------------------------------------------------------------------------
local THEME = {
    panel  = Color3.fromRGB(27, 27, 30),
    header = Color3.fromRGB(20, 20, 22),
    line   = Color3.fromRGB(48, 48, 54),
    track  = Color3.fromRGB(46, 46, 52),
    button = Color3.fromRGB(38, 38, 43),
    text   = Color3.fromRGB(232, 232, 236),
    dim    = Color3.fromRGB(142, 142, 150),
    red    = RED,
    redDim = Color3.fromRGB(112, 22, 34),
}
local function enumItem(enumType, name, fallback)
    local ok, item = pcall(function()
        return enumType[name]
    end)
    if ok and item then
        return item
    end
    return fallback
end
local FONT = enumItem(Enum.Font, "GothamMedium", Enum.Font.SourceSans)
local FONT_BOLD = enumItem(Enum.Font, "GothamBold", Enum.Font.SourceSansBold)
local PANEL_W, HEADER_H, PAD, TOGGLE_H, ROW_H, GAP = 208, 28, 8, 40, 28, 3
local ROWS = 5
local SETTINGS_Y = HEADER_H + PAD + TOGGLE_H + GAP + 2
local FULL_H = SETTINGS_Y + ROWS * (ROW_H + GAP) + PAD - GAP
local MINI_H = HEADER_H + PAD + TOGGLE_H + PAD

local function corner(inst, radius)
    new("UICorner", { CornerRadius = UDim.new(0, radius) }, inst)
end

-- One pair of global listeners follows whichever finger (or the mouse) started a drag.
function Pointer.capture(input, onMove)
    local key = input
    if input.UserInputType == Enum.UserInputType.MouseButton1 then
        key = "mouse"
    end
    Pointer.active[key] = onMove
end

local function guiHost()
    local ok, host = pcall(function()
        return gethui()
    end)
    if ok and typeof(host) == "Instance" then
        return host
    end
    local okCore, core = pcall(function()
        local coreGui = game:GetService("CoreGui")
        local probe = Instance.new("Folder")
        probe.Parent = coreGui -- throws without permission
        probe:Destroy()
        return coreGui
    end)
    if okCore and core then
        return core
    end
    return player:WaitForChild("PlayerGui")
end

function UI.setPanelPosition(x, y)
    local panel, gui = UI.panel, UI.gui
    local screen = gui.AbsoluteSize
    local size = panel.AbsoluteSize
    if screen.X > 0 and screen.Y > 0 then
        x = clamp(x, 0, max(0, screen.X - size.X))
        y = clamp(y, 0, max(0, screen.Y - HEADER_H))
    end
    panel.Position = UDim2.fromOffset(floor(x), floor(y))
end

function UI.setQuality(name)
    if not QUALITY[name] then
        return
    end
    local changed = CONFIG.EffectQuality ~= name
    CONFIG.EffectQuality = name
    for key, button in pairs(UI.qButtons) do
        local selected = key == name
        if selected then
            button.BackgroundColor3 = THEME.red
            button.TextColor3 = THEME.text
        else
            button.BackgroundColor3 = THEME.button
            button.TextColor3 = THEME.dim
        end
    end
    if changed then
        FX.onQualityChanged()
    end
end

function UI.deny()
    local sub = UI.sub
    if not sub then
        return
    end
    sub.TextColor3 = THEME.red
    task.delay(0.25, function()
        if not destroyed and UI.sub == sub then
            sub.TextColor3 = THEME.dim
        end
    end)
end

function UI.refresh(now)
    if destroyed or not UI.gui then
        return
    end
    now = now or os.clock()
    local main, sub, bar, toggle = UI.main, UI.sub, UI.bar, UI.toggle
    if Ability.active then
        local remaining = durationRemaining(now)
        local fraction = 1
        local text = "NO TIME LIMIT"
        if remaining ~= math.huge then
            text = string.format("%.1fs LEFT", max(remaining, 0))
            fraction = clamp(remaining / CONFIG.ActivationDuration, 0, 1)
        end
        if Move.yielded or Move.suppressed then
            text = text .. "  -  SPEED HELD"
        end
        main.Text = "ACTIVE"
        main.TextColor3 = THEME.text
        sub.Text = text
        toggle.BackgroundColor3 = THEME.redDim
        UI.toggleStroke.Color = THEME.red
        UI.dot.BackgroundColor3 = THEME.red
        bar.BackgroundColor3 = THEME.red
        bar.Size = UDim2.new(fraction, 0, 1, 0)
        return
    end

    toggle.BackgroundColor3 = THEME.button
    UI.toggleStroke.Color = THEME.line
    UI.dot.BackgroundColor3 = THEME.dim
    local cooldown = cooldownRemaining(now)
    if cooldown > 0 then
        main.Text = "COOLDOWN"
        main.TextColor3 = THEME.dim
        sub.Text = string.format("%.1fs", cooldown)
        bar.BackgroundColor3 = THEME.dim
        bar.Size = UDim2.new(clamp(1 - cooldown / max(CONFIG.Cooldown, 0.01), 0, 1), 0, 1, 0)
    else
        main.Text = "ACTIVATE"
        main.TextColor3 = THEME.text
        if Char.alive and Char.hum then
            sub.Text = "READY"
        else
            sub.Text = "WAITING FOR CHARACTER"
        end
        bar.Size = UDim2.new(0, 0, 1, 0)
    end
end

local function makeSlider(parent, index, title, minimum, maximum, step, initial, format, apply)
    local row = new("Frame", {
        Name = title, Active = true, BackgroundTransparency = 1,
        Position = UDim2.fromOffset(0, (index - 1) * (ROW_H + GAP)), Size = UDim2.new(1, 0, 0, ROW_H),
    }, parent)
    new("TextLabel", {
        BackgroundTransparency = 1, Size = UDim2.new(0.6, 0, 0, 14), Font = FONT, Text = title, TextSize = 10,
        TextColor3 = THEME.dim, TextXAlignment = Enum.TextXAlignment.Left,
    }, row)
    local valueLabel = new("TextLabel", {
        BackgroundTransparency = 1, AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, 0, 0, 0),
        Size = UDim2.new(0.4, 0, 0, 14), Font = FONT_BOLD, Text = "", TextSize = 10,
        TextColor3 = THEME.text, TextXAlignment = Enum.TextXAlignment.Right,
    }, row)
    local trackBar = new("Frame", {
        BackgroundColor3 = THEME.track, BorderSizePixel = 0, AnchorPoint = Vector2.new(0, 0.5),
        Position = UDim2.new(0, 0, 0, 21), Size = UDim2.new(1, 0, 0, 4),
    }, row)
    corner(trackBar, 2)
    local fill = new("Frame", { BackgroundColor3 = THEME.red, BorderSizePixel = 0, Size = UDim2.new(0, 0, 1, 0) }, trackBar)
    corner(fill, 2)
    local knob = new("Frame", {
        BackgroundColor3 = THEME.text, BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 0.5),
        Position = UDim2.new(0, 0, 0.5, 0), Size = UDim2.fromOffset(8, 14),
    }, trackBar)
    corner(knob, 2)

    local function show(value)
        local alpha = clamp((value - minimum) / (maximum - minimum), 0, 1)
        fill.Size = UDim2.new(alpha, 0, 1, 0)
        knob.Position = UDim2.new(alpha, 0, 0.5, 0)
        valueLabel.Text = format(value)
    end

    local function setFromX(x)
        local alpha = clamp((x - trackBar.AbsolutePosition.X) / max(trackBar.AbsoluteSize.X, 1), 0, 1)
        local value = minimum + alpha * (maximum - minimum)
        value = clamp(floor(value / step + 0.5) * step, minimum, maximum)
        apply(value)
        show(value)
    end

    -- The whole row is the touch target, not just the thin track.
    row.InputBegan:Connect(function(input)
        if isPress(input) then
            setFromX(input.Position.X)
            Pointer.capture(input, function(position)
                setFromX(position.X)
            end)
        end
    end)

    show(clamp(initial, minimum, maximum))
end

function UI.build(host)
    local gui = new("ScreenGui", {
        Name = NAME_GUI, ResetOnSpawn = false, IgnoreGuiInset = false, DisplayOrder = 9000,
        ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
    })
    UI.gui = gui

    local viewport = Vector2.new(800, 400)
    if Workspace.CurrentCamera then
        viewport = Workspace.CurrentCamera.ViewportSize
    end
    -- Phones report a small logical screen (about 800 x 370), so the panel is
    -- scaled down there and starts collapsed; "+" opens the settings.
    local scale = clamp(viewport.Y / 480, 0.7, 1)
    local startHeight = FULL_H
    UI.minimized = viewport.Y < 500
    if UI.minimized then
        startHeight = MINI_H
    end
    local panel = new("Frame", {
        Name = "Panel", Active = true, BackgroundColor3 = THEME.panel, BorderSizePixel = 0, ClipsDescendants = true,
        Position = UDim2.fromOffset(max(8, floor((viewport.X - PANEL_W * scale) * 0.5)), 6),
        Size = UDim2.fromOffset(PANEL_W, startHeight),
    }, gui)
    new("UIScale", { Scale = scale }, panel)
    corner(panel, 4)
    new("UIStroke", { Color = THEME.line, Thickness = 1 }, panel)
    UI.panel = panel

    -- Header: drag area on the left, two buttons on the right (no overlap between them).
    local header = new("Frame", {
        Name = "Header", BackgroundColor3 = THEME.header, BorderSizePixel = 0, Size = UDim2.new(1, 0, 0, HEADER_H),
    }, panel)
    UI.dot = new("Frame", {
        Name = "Dot", BackgroundColor3 = THEME.dim, BorderSizePixel = 0, AnchorPoint = Vector2.new(0, 0.5),
        Position = UDim2.new(0, 9, 0.5, 0), Size = UDim2.fromOffset(6, 6),
    }, header)
    new("TextLabel", {
        BackgroundTransparency = 1, Position = UDim2.fromOffset(22, 0), Size = UDim2.new(1, -22 - HEADER_H * 2, 1, 0),
        Font = FONT_BOLD, Text = "SANDEVISTAN", TextSize = 11, TextColor3 = THEME.text,
        TextXAlignment = Enum.TextXAlignment.Left,
    }, header)
    local dragArea = new("Frame", {
        Name = "Drag", Active = true, BackgroundTransparency = 1, Size = UDim2.new(1, -HEADER_H * 2, 1, 0),
    }, header)

    local function headerButton(name, text, slot)
        return new("TextButton", {
            Name = name, AutoButtonColor = false, BackgroundColor3 = THEME.header, BorderSizePixel = 0,
            AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -HEADER_H * slot, 0, 0),
            Size = UDim2.fromOffset(HEADER_H, HEADER_H), Font = FONT_BOLD, Text = text, TextSize = 13,
            TextColor3 = THEME.dim,
        }, header)
    end
    local minimize = headerButton("Minimize", "-", 1)
    local close = headerButton("Close", "X", 0)

    dragArea.InputBegan:Connect(function(input)
        if isPress(input) then
            local start = input.Position
            local originX, originY = panel.Position.X.Offset, panel.Position.Y.Offset
            Pointer.capture(input, function(position)
                UI.setPanelPosition(originX + position.X - start.X, originY + position.Y - start.Y)
            end)
        end
    end)

    -- Main button: state, time left / cooldown, and a progress bar along the bottom.
    local toggle = new("TextButton", {
        Name = "Toggle", AutoButtonColor = false, BackgroundColor3 = THEME.button, BorderSizePixel = 0,
        ClipsDescendants = true, Position = UDim2.fromOffset(PAD, HEADER_H + PAD),
        Size = UDim2.new(1, -PAD * 2, 0, TOGGLE_H), Text = "",
    }, panel)
    corner(toggle, 3)
    UI.toggle = toggle
    UI.toggleStroke = new("UIStroke", {
        Color = THEME.line, Thickness = 1, ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
    }, toggle)
    UI.main = new("TextLabel", {
        BackgroundTransparency = 1, Position = UDim2.fromOffset(0, 5), Size = UDim2.new(1, 0, 0, 16),
        Font = FONT_BOLD, Text = "ACTIVATE", TextSize = 13, TextColor3 = THEME.text,
    }, toggle)
    UI.sub = new("TextLabel", {
        BackgroundTransparency = 1, Position = UDim2.fromOffset(0, 21), Size = UDim2.new(1, 0, 0, 12),
        Font = FONT, Text = "WAITING FOR CHARACTER", TextSize = 10, TextColor3 = THEME.dim,
    }, toggle)
    local barBack = new("Frame", {
        BackgroundColor3 = THEME.track, BorderSizePixel = 0, AnchorPoint = Vector2.new(0, 1),
        Position = UDim2.new(0, 0, 1, 0), Size = UDim2.new(1, 0, 0, 3),
    }, toggle)
    UI.bar = new("Frame", { BackgroundColor3 = THEME.red, BorderSizePixel = 0, Size = UDim2.new(0, 0, 1, 0) }, barBack)
    toggle.Activated:Connect(Ability.toggle)

    -- Settings.
    local settings = new("Frame", {
        Name = "Settings", BackgroundTransparency = 1, Position = UDim2.fromOffset(PAD, SETTINGS_Y),
        Size = UDim2.new(1, -PAD * 2, 0, ROWS * (ROW_H + GAP)),
    }, panel)

    makeSlider(settings, 1, "SPEED", 20, max(CONFIG.MaxSpeed, 21), 1, CONFIG.SandevistanSpeed, function(value)
        return string.format("%d", value)
    end, function(value)
        CONFIG.SandevistanSpeed = value
    end)
    makeSlider(settings, 2, "SLOW-MO", 0.05, 0.5, 0.01, CONFIG.SlowMotionFactor, function(value)
        return string.format("%.2fx", value)
    end, function(value)
        CONFIG.SlowMotionFactor = value
    end)
    makeSlider(settings, 3, "DURATION", 0, 30, 1, CONFIG.ActivationDuration, function(value)
        if value <= 0 then
            return "NO LIMIT"
        end
        return string.format("%ds", value)
    end, function(value)
        CONFIG.ActivationDuration = value
        UI.nextRefresh = 0
    end)
    makeSlider(settings, 4, "COOLDOWN", 0, 30, 1, CONFIG.Cooldown, function(value)
        if value <= 0 then
            return "OFF"
        end
        return string.format("%ds", value)
    end, function(value)
        CONFIG.Cooldown = value
        UI.refresh()
    end)

    local qualityRow = new("Frame", {
        Name = "Quality", BackgroundTransparency = 1, Position = UDim2.fromOffset(0, 4 * (ROW_H + GAP)),
        Size = UDim2.new(1, 0, 0, ROW_H),
    }, settings)
    new("TextLabel", {
        BackgroundTransparency = 1, Size = UDim2.new(0, 54, 1, 0), Font = FONT, Text = "QUALITY", TextSize = 10,
        TextColor3 = THEME.dim, TextXAlignment = Enum.TextXAlignment.Left,
    }, qualityRow)
    local captions = { Low = "LOW", Medium = "MED", High = "HIGH" }
    local buttonWidth = floor((PANEL_W - PAD * 2 - 54 - 6) / 3)
    for i, name in ipairs({ "Low", "Medium", "High" }) do
        local button = new("TextButton", {
            Name = name, AutoButtonColor = false, BackgroundColor3 = THEME.button, BorderSizePixel = 0,
            Position = UDim2.fromOffset(54 + (i - 1) * (buttonWidth + 3), 3),
            Size = UDim2.fromOffset(buttonWidth, ROW_H - 6), Font = FONT_BOLD, Text = captions[name], TextSize = 10,
            TextColor3 = THEME.dim,
        }, qualityRow)
        corner(button, 3)
        UI.qButtons[name] = button
        button.Activated:Connect(function()
            UI.setQuality(name)
        end)
    end
    if not QUALITY[CONFIG.EffectQuality] then
        CONFIG.EffectQuality = "Medium"
    end
    UI.setQuality(CONFIG.EffectQuality)

    minimize.Activated:Connect(function()
        UI.minimized = not UI.minimized
        local height = FULL_H
        if UI.minimized then
            height = MINI_H
            minimize.Text = "+"
        else
            minimize.Text = "-"
            settings.Visible = true
        end
        local tween = TweenService:Create(panel, TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
            Size = UDim2.fromOffset(PANEL_W, height),
        })
        tween.Completed:Connect(function()
            if UI.minimized then
                settings.Visible = false
            end
        end)
        tween:Play()
    end)

    -- Two taps to unload, so a stray thumb cannot remove the script mid-run.
    close.Activated:Connect(function()
        local now = os.clock()
        if UI.closeArmed and now - UI.closeArmed < 2.5 then
            cleanup()
            return
        end
        UI.closeArmed = now
        close.Text = "?"
        close.TextColor3 = THEME.red
        task.delay(2.5, function()
            if not destroyed and UI.closeArmed == now then
                UI.closeArmed = nil
                close.Text = "X"
                close.TextColor3 = THEME.dim
            end
        end)
    end)

    -- Keep the panel on screen when the phone rotates or the window resizes.
    gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
        UI.setPanelPosition(panel.Position.X.Offset, panel.Position.Y.Offset)
    end)

    if UI.minimized then
        minimize.Text = "+"
        settings.Visible = false
    end

    gui.Parent = host
    -- Once the screen size is known, make sure the panel really is on screen.
    task.defer(function()
        if not destroyed and UI.gui == gui then
            UI.setPanelPosition(panel.Position.X.Offset, panel.Position.Y.Offset)
        end
    end)
end

--------------------------------------------------------------------------------
-- CLEANUP + INIT
--------------------------------------------------------------------------------
local runtime = { Version = VERSION, Config = CONFIG }

function cleanup()
    if destroyed then
        return
    end
    if Ability.active then
        Ability.active = false
        Ability.endedAt = os.clock()
    end
    pcall(hardReset)
    destroyed = true
    for i = 1, #connections do
        connections[i]:Disconnect()
    end
    table.clear(connections)
    clearCharConns()
    table.clear(Pointer.active)
    pcall(Rig.destroy)
    pcall(Ghosts.reset)
    pcall(Bolts.reset)
    pcall(Post.destroy)
    if FX.folder then
        FX.folder:Destroy()
        FX.folder = nil
    end
    if Overlay.gui then
        Overlay.gui:Destroy()
        Overlay.gui = nil
    end
    if UI.gui then
        UI.gui:Destroy()
        UI.gui = nil
    end
    if sharedEnv[ENV_KEY] == runtime then
        sharedEnv[ENV_KEY] = nil
    end
end

-- Leftovers from a copy that died without cleaning up (crash, different environment).
local function sweepLeftovers(host)
    pcall(function()
        RunService:UnbindFromRenderStep(NAME_RENDER)
    end)
    local hosts = { host }
    local playerGui = player:FindFirstChildOfClass("PlayerGui")
    if playerGui and playerGui ~= host then
        hosts[2] = playerGui
    end
    for _, parent in ipairs(hosts) do
        for _, name in ipairs({ NAME_GUI, NAME_OVERLAY, NAME_ERROR }) do
            local old = parent:FindFirstChild(name)
            while old do
                old:Destroy()
                old = parent:FindFirstChild(name)
            end
        end
    end
    local oldFolder = Workspace:FindFirstChild(NAME_FOLDER)
    while oldFolder do
        oldFolder:Destroy()
        oldFolder = Workspace:FindFirstChild(NAME_FOLDER)
    end
    for _, name in ipairs(POST_NAMES) do
        local old = Lighting:FindFirstChild(name)
        while old do
            old:Destroy()
            old = Lighting:FindFirstChild(name)
        end
    end
    local character = player.Character
    if character then
        for _, inst in ipairs(character:GetDescendants()) do
            if string.sub(inst.Name, 1, 11) == "Sandevistan" then
                inst:Destroy()
            end
        end
    end
end

-- If start-up fails, say so on screen: on a phone nobody is watching the console.
local function showFatal(message)
    warn("[Sandevistan] failed to start: " .. message)
    pcall(function()
        local parent
        local ok, hidden = pcall(function()
            return gethui()
        end)
        if ok and typeof(hidden) == "Instance" then
            parent = hidden
        else
            parent = player:FindFirstChildOfClass("PlayerGui")
        end
        local gui = Instance.new("ScreenGui")
        gui.Name = NAME_ERROR
        gui.ResetOnSpawn = false
        gui.DisplayOrder = 9999
        local box = Instance.new("TextButton")
        box.AutoButtonColor = false
        box.BackgroundColor3 = Color3.fromRGB(27, 27, 30)
        box.BorderSizePixel = 0
        box.Position = UDim2.new(0.1, 0, 0.08, 0)
        box.Size = UDim2.new(0.8, 0, 0.5, 0)
        box.Font = Enum.Font.Code
        box.TextSize = 12
        box.TextWrapped = true
        box.TextXAlignment = Enum.TextXAlignment.Left
        box.TextYAlignment = Enum.TextYAlignment.Top
        box.TextColor3 = Color3.fromRGB(255, 96, 104)
        box.Text = "SANDEVISTAN failed to start. Screenshot this, then tap to close.\n\n" .. message
        box.Parent = gui
        box.Activated:Connect(function()
            gui:Destroy()
        end)
        gui.Parent = parent
    end)
end

local function notify(text)
    pcall(function()
        game:GetService("StarterGui"):SetCore("SendNotification", { Title = "Sandevistan", Text = text, Duration = 6 })
    end)
end

local function init()
    local host = guiHost()
    sweepLeftovers(host)
    guard("screen overlay", Overlay.build, host)
    UI.build(host)

    track(UserInputService.InputChanged:Connect(function(input)
        local onMove
        if input.UserInputType == Enum.UserInputType.MouseMovement then
            onMove = Pointer.active.mouse
        elseif input.UserInputType == Enum.UserInputType.Touch then
            onMove = Pointer.active[input]
        end
        if onMove then
            onMove(input.Position)
        end
    end))

    track(UserInputService.InputEnded:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 then
            Pointer.active.mouse = nil
        elseif input.UserInputType == Enum.UserInputType.Touch then
            Pointer.active[input] = nil
        end
    end))

    track(UserInputService.InputBegan:Connect(function(input, processed)
        if not processed and CONFIG.ToggleKey and input.KeyCode == CONFIG.ToggleKey then
            Ability.toggle()
        end
    end))

    track(RunService.Heartbeat:Connect(function(dt)
        if destroyed then
            return
        end
        local ok, err = pcall(heartbeatBody, dt)
        if not ok then
            warn("[Sandevistan] update error, resetting: " .. tostring(err))
            Ability.stop("error", true)
            hardReset()
        end
    end))

    track(player.CharacterAdded:Connect(bindCharacter))

    track(player.CharacterRemoving:Connect(function(model)
        if Char.model == model then
            Ability.stop("character removed", true)
            Rig.destroy()
            Ghosts.reset()
            bindCharacter(nil)
        end
    end))

    if player.Character then
        bindCharacter(player.Character)
    end

    runtime.Cleanup = cleanup
    runtime.Toggle = Ability.toggle
    runtime.IsActive = function()
        return Ability.active
    end
    sharedEnv[ENV_KEY] = runtime

    UI.refresh()
end

local started, startError = xpcall(init, debug.traceback)
if started then
    local keyName = "no key bound"
    if CONFIG.ToggleKey then
        keyName = "key " .. CONFIG.ToggleKey.Name
    end
    print(string.format("[Sandevistan] v%s loaded - tap ACTIVATE (%s).", VERSION, keyName))
    notify("Loaded. The panel is at the top of the screen.")
else
    pcall(cleanup)
    showFatal(tostring(startError))
end
