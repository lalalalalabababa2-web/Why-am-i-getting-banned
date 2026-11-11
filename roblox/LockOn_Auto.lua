--[[
    Lock-On (auto only) + small UI
    Roblox (Luau) · LocalScript / client-side

    Always locks the camera onto the closest player (closest visible one
    first). Pauses the camera while they're behind a wall.
    UI: one ON/OFF button, a status line, drag by the title, X to unload.
    Lead is worked out from where the target actually moved, not from the
    velocity they report, so anti-lock / ragdoll velocity can't throw the aim.
    Run it again to replace the old copy.
]]

local Players          = game:GetService("Players")
local RunService       = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local LocalPlayer = Players.LocalPlayer

local RANGE       = 300   -- studs
local SMOOTHNESS  = 12    -- higher = snappier
local PREDICTION  = 0.08  -- seconds of velocity lead
local MAX_SPEED   = 120   -- studs/s; faster than this is a teleport, not movement
local MAX_PITCH   = 70    -- degrees

local ENV = (typeof(getgenv) == "function" and getgenv()) or _G
if ENV.__lockOnStop then pcall(ENV.__lockOnStop) end

local enabled = true
local target, lastScan = nil, 0
local motion = { char = nil, pos = nil, t = 0, vel = Vector3.zero }
-- the direction we're steering. Kept here instead of re-read from the camera each
-- frame, so Roblox's follow camera (mobile auto-rotate) can't tug against it
local lookDir = nil
local rayParams = RaycastParams.new()
rayParams.FilterType = Enum.RaycastFilterType.Exclude

----------------------------------------------------------------------
-- UI
----------------------------------------------------------------------

local GREEN = Color3.fromRGB(80, 210, 130)
local GREY  = Color3.fromRGB(58, 58, 72)
local RED   = Color3.fromRGB(255, 72, 72)
local AMBER = Color3.fromRGB(255, 190, 70)
local BG    = Color3.fromRGB(18, 18, 24)
local TEXT  = Color3.fromRGB(235, 235, 242)
local DIM   = Color3.fromRGB(145, 145, 162)

local function make(class, props, parent)
	local inst = Instance.new(class)
	for k, v in pairs(props) do inst[k] = v end
	inst.Parent = parent
	return inst
end

local function round(inst, r)
	make("UICorner", { CornerRadius = UDim.new(0, r) }, inst)
end

local guiParent
if typeof(gethui) == "function" then
	local ok, h = pcall(gethui)
	if ok then guiParent = h end
end
guiParent = guiParent or LocalPlayer:WaitForChild("PlayerGui")

local gui = make("ScreenGui", { Name = "LockOnAuto", ResetOnSpawn = false, DisplayOrder = 50 }, guiParent)

local panel = make("Frame", {
	Size = UDim2.fromOffset(210, 104),
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 64), -- top-center, clear of the mobile thumbstick
	BackgroundColor3 = BG,
	BorderSizePixel = 0,
	Active = true,
}, gui)
round(panel, 10)
make("UIStroke", { Color = Color3.fromRGB(58, 58, 74), Thickness = 1 }, panel)

local title = make("TextLabel", {
	Position = UDim2.fromOffset(12, 0),
	Size = UDim2.new(1, -44, 0, 30),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamBold,
	TextSize = 13,
	TextColor3 = TEXT,
	TextXAlignment = Enum.TextXAlignment.Left,
	Text = "LOCK-ON",
}, panel)

local closeBtn = make("TextButton", {
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -6, 0, 5),
	Size = UDim2.fromOffset(20, 20),
	BackgroundColor3 = GREY,
	Font = Enum.Font.GothamBold,
	TextSize = 12,
	TextColor3 = DIM,
	Text = "X",
}, panel)
round(closeBtn, 5)

local toggleBtn = make("TextButton", {
	Position = UDim2.fromOffset(10, 32),
	Size = UDim2.new(1, -20, 0, 32),
	BackgroundColor3 = GREEN,
	Font = Enum.Font.GothamBold,
	TextSize = 13,
	TextColor3 = BG,
	Text = "",
}, panel)
round(toggleBtn, 8)

local status = make("TextLabel", {
	Position = UDim2.fromOffset(12, 70),
	Size = UDim2.new(1, -24, 0, 26),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamMedium,
	TextSize = 12,
	TextColor3 = DIM,
	TextXAlignment = Enum.TextXAlignment.Left,
	TextTruncate = Enum.TextTruncate.AtEnd,
	Text = "",
}, panel)

local function renderToggle()
	toggleBtn.Text = enabled and "AUTO LOCK: ON" or "AUTO LOCK: OFF"
	toggleBtn.BackgroundColor3 = enabled and GREEN or GREY
	toggleBtn.TextColor3 = enabled and BG or DIM
end
renderToggle()

toggleBtn.MouseButton1Click:Connect(function()
	enabled = not enabled
	if not enabled then target = nil end
	renderToggle()
end)

-- drag by the title
local dragConns = {}
do
	-- only the finger (or mouse) that grabbed the title moves the panel,
	-- so steering with the thumbstick never drags it along
	local dragInput, dragStart, startPos
	title.Active = true
	title.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1
			or input.UserInputType == Enum.UserInputType.Touch then
			dragInput, dragStart, startPos = input, input.Position, panel.Position
		end
	end)
	table.insert(dragConns, UserInputService.InputChanged:Connect(function(input)
		if not dragInput then return end
		local isTouch = dragInput.UserInputType == Enum.UserInputType.Touch
		if (isTouch and input == dragInput)
			or (not isTouch and input.UserInputType == Enum.UserInputType.MouseMovement) then
			local d = input.Position - dragStart
			panel.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X,
				startPos.Y.Scale, startPos.Y.Offset + d.Y)
		end
	end))
	table.insert(dragConns, UserInputService.InputEnded:Connect(function(input)
		if dragInput and (input == dragInput
			or (input.UserInputType == Enum.UserInputType.MouseButton1
				and dragInput.UserInputType == Enum.UserInputType.MouseButton1)) then
			dragInput = nil
		end
	end))
end

local function setStatus(text, color)
	status.Text = text
	status.TextColor3 = color
end

----------------------------------------------------------------------
-- lock-on
----------------------------------------------------------------------

local function aimPart(char)
	return char:FindFirstChild("UpperTorso") or char:FindFirstChild("Torso")
		or char:FindFirstChild("HumanoidRootPart")
end

local function valid(char)
	if not char or not char.Parent then return false end
	local hum = char:FindFirstChildOfClass("Humanoid")
	return hum and hum.Health > 0 and aimPart(char) ~= nil
end

local function canSee(char, point)
	local cam = workspace.CurrentCamera
	local ignore = { char, cam, LocalPlayer.Character }
	local origin = cam.CFrame.Position
	for _ = 1, 8 do
		rayParams.FilterDescendantsInstances = ignore
		local hit = workspace:Raycast(origin, point - origin, rayParams)
		if not hit then return true end
		if hit.Instance.Transparency < 0.6 and hit.Instance.CanCollide then return false end
		table.insert(ignore, hit.Instance) -- see through glass / invisible walls
	end
	return false
end

-- closest player you can see; if nobody's visible, the closest one overall
local function closestPlayer(root)
	local seen, seenDist = nil, RANGE
	local any, anyDist = nil, RANGE
	local myTeam = LocalPlayer.Team
	for _, plr in ipairs(Players:GetPlayers()) do
		local char = plr.Character
		if plr ~= LocalPlayer and (myTeam == nil or plr.Team ~= myTeam) and valid(char) then
			local part = aimPart(char)
			local dist = (part.Position - root.Position).Magnitude
			if dist < anyDist then
				any, anyDist = char, dist
			end
			if dist < seenDist and canSee(char, part.Position) then
				seen, seenDist = char, dist
			end
		end
	end
	return seen or any
end

local function nameOf(char)
	local plr = Players:GetPlayerFromCharacter(char)
	return plr and plr.DisplayName or char.Name
end

local MAX_Y = math.sin(math.rad(MAX_PITCH))
local function clampPitch(dir)
	local flat = Vector3.new(dir.X, 0, dir.Z)
	if flat.Magnitude < 1e-3 then return nil end
	local y = math.clamp(dir.Unit.Y, -MAX_Y, MAX_Y)
	return flat.Unit * math.sqrt(1 - y * y) + Vector3.new(0, y, 0)
end

RunService:BindToRenderStep("LockOnAuto", Enum.RenderPriority.Last.Value, function(dt)
	if not enabled then
		lookDir = nil
		setStatus("Off", DIM)
		return
	end

	local cam = workspace.CurrentCamera
	local char = LocalPlayer.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	if not cam or not root then
		target, lookDir = nil, nil
		setStatus("Waiting for your character...", DIM)
		return
	end

	local now = os.clock()

	-- always the closest player, re-checked 10x a second
	if not valid(target) then target = nil end
	if not target or now - lastScan > 0.1 then
		lastScan = now
		target = closestPlayer(root)
	end
	if not target then
		lookDir = nil
		setStatus("Searching...", AMBER)
		return
	end

	local part = aimPart(target)
	local dist = math.floor((part.Position - root.Position).Magnitude)

	-- pause behind walls
	if not canSee(target, part.Position) then
		lookDir = nil -- hand the camera back; ease in again when they reappear
		setStatus(nameOf(target) .. " · behind wall", AMBER)
		return
	end
	setStatus(nameOf(target) .. " · " .. dist .. " studs", RED)

	-- lead from real movement: AssemblyLinearVelocity can be faked (anti-lock
	-- scripts) or garbage (ragdolls), which is what pointed the camera at the floor
	if motion.char ~= target or not motion.pos then
		motion.char, motion.pos, motion.t, motion.vel = target, part.Position, now, Vector3.zero
	elseif now - motion.t >= 0.1 then -- wide window: replication arrives in steps
		local v = (part.Position - motion.pos) / (now - motion.t)
		if v.Magnitude > MAX_SPEED then v = Vector3.zero end
		motion.vel = motion.vel:Lerp(v, 0.4)
		motion.pos, motion.t = part.Position, now
	end
	local aim = part.Position + motion.vel * PREDICTION

	-- turn the camera, orbiting around Focus so zoom / shift-lock stay intact
	local camCF = cam.CFrame
	local focus = cam.Focus.Position
	local orbit = cam.CameraType ~= Enum.CameraType.Scriptable and (focus - camCF.Position).Magnitude < 100
	local desired = clampPitch(aim - (orbit and focus or camCF.Position))
	if not desired then return end

	local alpha = 1 - math.exp(-SMOOTHNESS * dt)
	local dir = clampPitch((lookDir or camCF.LookVector):Lerp(desired, alpha)) or desired
	lookDir = dir
	local rot = CFrame.lookAt(Vector3.zero, dir)
	if orbit then
		cam.CFrame = rot + (focus - rot:VectorToWorldSpace(camCF:PointToObjectSpace(focus)))
	else
		cam.CFrame = rot + camCF.Position
	end
end)

ENV.__lockOnStop = function()
	RunService:UnbindFromRenderStep("LockOnAuto")
	for _, c in ipairs(dragConns) do c:Disconnect() end
	gui:Destroy()
	ENV.__lockOnStop = nil
end

closeBtn.MouseButton1Click:Connect(function()
	ENV.__lockOnStop()
end)

print("[LockOn] auto lock running")
