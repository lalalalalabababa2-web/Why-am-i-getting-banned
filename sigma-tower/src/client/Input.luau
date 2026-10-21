-- Weapons and abilities from the player's side. Click (or tap) fires the equipped weapon,
-- E its special, F Fanum Tax, Q dash, Shift sprint. Touch buttons appear on mobile.
-- Local cooldowns only drive the UI; the server enforces the real ones.

local ContextActionService = game:GetService("ContextActionService")
local Players = game:GetService("Players")
local SoundService = game:GetService("SoundService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Net = require(Shared.Net)
local Util = require(Shared.Util)
local Hud = require(script.Parent.Hud)

local Input = {}

local player = Players.LocalPlayer
local mouse = player:GetMouse()
local useWeapon = Net.event("UseWeapon")
local setBlock = Net.event("SetBlock")

local equipped: string? = nil
local holding = false
local lastPrimary = 0
local specialEnds: { [string]: number } = {}
local sprinting = false
local phonk: Sound? = nil

local function aim(): Vector3
	return mouse.Hit.Position
end

local function stopPhonk()
	if phonk then
		phonk:Destroy()
		phonk = nil
	end
end

local function firePrimary(id: string): boolean
	local w = Config.Weapons[id]
	local now = os.clock()
	if now - lastPrimary < w.Cooldown then
		return false
	end
	lastPrimary = now
	useWeapon:FireServer(id, "primary", aim())
	return true
end

-- Tools get re-parented into the character on every equip, so wire each one only once.
local wired: { [Tool]: boolean } = setmetatable({}, { __mode = "k" }) :: any

local function wire(tool: Tool, id: string)
	if wired[tool] then
		return
	end
	wired[tool] = true
	local w = Config.Weapons[id]
	tool.Activated:Connect(function()
		if equipped ~= id then
			return
		end
		if w.Kind == "Shield" then
			setBlock:FireServer(true)
		elseif w.Kind == "Beam" then
			holding = true
			task.spawn(function()
				while holding and equipped == id do
					firePrimary(id)
					task.wait(w.Cooldown)
				end
			end)
		else
			firePrimary(id)
		end
	end)
	tool.Deactivated:Connect(function()
		holding = false
		if w.Kind == "Shield" then
			setBlock:FireServer(false)
		end
	end)
	tool.Unequipped:Connect(function()
		if equipped == id then
			equipped = nil
			holding = false
			Hud.setChip("E", nil)
			if w.Kind == "Shield" then
				setBlock:FireServer(false)
			end
			stopPhonk()
		end
	end)
end

local function onEquipped(tool: Tool)
	local id = tool:GetAttribute("WeaponId") :: string?
	if not id or not Config.Weapons[id] then
		return
	end
	local w = Config.Weapons[id]
	equipped = id
	wire(tool, id)
	Hud.setChip("E", if w.Special then w.Special.Name else nil)
	Hud.cooldown("E", math.max(0, (specialEnds[id] or 0) - os.clock()))
	if id == "MewShield" then
		stopPhonk()
		phonk = Util.sound(Config.Sounds.Phonk, SoundService, math.min(1, 0.2 + (player:GetAttribute("KillStreak") or 0) * 0.08), true)
	end
end

local function special(_, state: Enum.UserInputState)
	if state ~= Enum.UserInputState.Begin then
		return Enum.ContextActionResult.Pass
	end
	local id = equipped
	local w = id and Config.Weapons[id]
	if not id or not w or not w.Special then
		return Enum.ContextActionResult.Pass
	end
	if os.clock() < (specialEnds[id] or 0) then
		return Enum.ContextActionResult.Sink
	end
	specialEnds[id] = os.clock() + w.Special.Cooldown
	Hud.cooldown("E", w.Special.Cooldown)
	useWeapon:FireServer(id, "special", aim())
	return Enum.ContextActionResult.Sink
end

local function fanumTax(_, state: Enum.UserInputState)
	if state ~= Enum.UserInputState.Begin or Hud.cooldownLeft("F") > 0 then
		return Enum.ContextActionResult.Pass
	end
	local F = Config.FanumTax
	Hud.cooldown("F", if player:GetAttribute("Pass_InfiniteTax") then F.PassCooldown else F.Cooldown)
	Net.event("FanumTax"):FireServer()
	return Enum.ContextActionResult.Sink
end

local function dash(_, state: Enum.UserInputState)
	if state ~= Enum.UserInputState.Begin or Hud.cooldownLeft("Q") > 0 then
		return Enum.ContextActionResult.Pass
	end
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not humanoid or not root or humanoid.WalkSpeed == 0 then
		return Enum.ContextActionResult.Pass
	end
	local D = Config.Movement.Dash
	Hud.cooldown("Q", D.Cooldown)
	local direction = humanoid.MoveDirection
	if direction.Magnitude < 0.1 then
		direction = root.CFrame.LookVector
	end
	direction = Vector3.new(direction.X, 0, direction.Z).Unit
	Net.event("Dash"):FireServer()
	local velocity = Instance.new("LinearVelocity")
	local attachment = root:FindFirstChild("RootAttachment") :: Attachment?
	if attachment then
		velocity.Attachment0 = attachment
		velocity.VelocityConstraintMode = Enum.VelocityConstraintMode.Plane
		velocity.PrimaryTangentAxis = Vector3.xAxis
		velocity.SecondaryTangentAxis = Vector3.zAxis
		velocity.PlaneVelocity = Vector2.new(direction.X, direction.Z) * D.Speed
		velocity.MaxForce = math.huge
		velocity.RelativeTo = Enum.ActuatorRelativeTo.World
		velocity.Parent = root
		task.delay(D.Time, velocity.Destroy, velocity)
	end
	return Enum.ContextActionResult.Sink
end

local function sprint(_, state: Enum.UserInputState, input: InputObject)
	local touch = input.UserInputType == Enum.UserInputType.Touch
	if touch then
		-- Touch buttons can't be held comfortably while steering, so they toggle.
		if state == Enum.UserInputState.Begin then
			sprinting = not sprinting
			Net.event("SetSprint"):FireServer(sprinting)
		end
	elseif state == Enum.UserInputState.Begin or state == Enum.UserInputState.End then
		sprinting = state == Enum.UserInputState.Begin
		Net.event("SetSprint"):FireServer(sprinting)
	end
	return Enum.ContextActionResult.Pass
end

function Input.start()
	mouse.TargetFilter = workspace:WaitForChild("Effects")

	local function onCharacter(character: Model)
		equipped = nil
		holding = false
		sprinting = false
		stopPhonk()
		character.ChildAdded:Connect(function(child)
			if child:IsA("Tool") then
				onEquipped(child)
			end
		end)
	end
	player.CharacterAdded:Connect(onCharacter)
	if player.Character then
		onCharacter(player.Character)
	end

	ContextActionService:BindAction("SigmaSpecial", special, true, Enum.KeyCode.E, Enum.KeyCode.ButtonX)
	ContextActionService:BindAction("SigmaTax", fanumTax, true, Enum.KeyCode.F, Enum.KeyCode.ButtonY)
	ContextActionService:BindAction("SigmaDash", dash, true, Enum.KeyCode.Q, Enum.KeyCode.ButtonB)
	ContextActionService:BindAction("SigmaSprint", sprint, true, Enum.KeyCode.LeftShift, Enum.KeyCode.ButtonL3)
	ContextActionService:SetTitle("SigmaSpecial", "E")
	ContextActionService:SetTitle("SigmaTax", "TAX")
	ContextActionService:SetTitle("SigmaDash", "DASH")
	ContextActionService:SetTitle("SigmaSprint", "RUN")
	ContextActionService:SetPosition("SigmaSpecial", UDim2.new(1, -200, 1, -150))
	ContextActionService:SetPosition("SigmaTax", UDim2.new(1, -260, 1, -100))
	ContextActionService:SetPosition("SigmaDash", UDim2.new(1, -200, 1, -210))
	ContextActionService:SetPosition("SigmaSprint", UDim2.new(1, -140, 1, -230))

	-- Phonk gets louder with the kill streak.
	player:GetAttributeChangedSignal("KillStreak"):Connect(function()
		if phonk then
			phonk.Volume = math.min(1, 0.2 + (player:GetAttribute("KillStreak") or 0) * 0.08)
		end
	end)
end

return Input
