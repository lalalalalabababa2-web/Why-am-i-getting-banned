-- WalkSpeed is recomputed from status attributes ten times a second, so slows, stuns, blocking,
-- sprinting and the mew bonus stack in one place instead of fighting over the property.
-- Also dresses each character: rebirth size, auras, VIP tag.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Net = require(Shared.Net)
local Passes = require(script.Parent.Passes)

local Movement = {}

local M = Config.Movement
local lastDash: { [Player]: number } = {}

local function setStatus(character: Model, key: string, seconds: number)
	local untilTime = os.clock() + seconds
	if (character:GetAttribute(key) or 0) < untilTime then
		character:SetAttribute(key, untilTime)
	end
end

function Movement.slow(character: Model, mult: number, seconds: number)
	setStatus(character, "SlowUntil", seconds)
	character:SetAttribute("SlowMult", mult)
end

function Movement.stun(character: Model, seconds: number)
	setStatus(character, "StunUntil", seconds)
end

function Movement.isStunned(character: Model): boolean
	return (character:GetAttribute("StunUntil") or 0) > os.clock()
end

local function recompute(character: Model, humanoid: Humanoid, player: Player?, base: number?)
	local now = os.clock()
	local speed = base or M.WalkSpeed
	if player then
		local mew = player:GetAttribute("MewStreak") or 0
		speed += math.min(Config.Mewing.MaxSpeedBonus, mew * Config.Mewing.SpeedPerStreak)
	end
	if character:GetAttribute("Sprinting") then
		speed *= M.SprintMult
	end
	if character:GetAttribute("Blocking") then
		speed *= M.BlockMult
	end
	if (character:GetAttribute("SlowUntil") or 0) > now then
		speed *= character:GetAttribute("SlowMult") or 1
	end
	local stunned = (character:GetAttribute("StunUntil") or 0) > now
	if stunned then
		speed = 0
	end
	humanoid.WalkSpeed = speed
	humanoid.JumpHeight = if stunned then 0 else M.JumpHeight
end

local function addAura(root: BasePart, name: string, color: Color3, rate: number)
	local aura = Instance.new("ParticleEmitter")
	aura.Name = name
	aura.Color = ColorSequence.new(color)
	aura.LightEmission = 1
	aura.Rate = rate
	aura.Lifetime = NumberRange.new(0.6, 1)
	aura.Speed = NumberRange.new(2, 4)
	aura.SpreadAngle = Vector2.new(180, 180)
	aura.Size = NumberSequence.new(1, 0)
	aura.Transparency = NumberSequence.new(0.3, 1)
	aura.Parent = root
	return aura
end

-- The mew aura grows with the streak.
local function updateMewAura(player: Player)
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	local aura = root and root:FindFirstChild("SigmaAura") :: ParticleEmitter?
	if aura then
		local streak = player:GetAttribute("MewStreak") or 0
		aura.Enabled = streak > 0
		aura.Rate = 5 + streak * 3
		local size = math.clamp(0.6 + streak * 0.2, 0.6, 4)
		aura.Size = NumberSequence.new(size, 0)
	end
end

-- Pass checks finish asynchronously and can land after the first spawn, so this is safe to
-- call again whenever one of those attributes changes.
local function addExtras(player: Player, character: Model)
	local root = character:FindFirstChild("HumanoidRootPart") :: BasePart?
	local head = character:FindFirstChild("Head") :: BasePart?
	if not root or not head then
		return
	end
	if (player:GetAttribute("Aura") or Passes.has(player, "GigaChad")) and not root:FindFirstChild("GigaAura") then
		addAura(root, "GigaAura", Color3.fromRGB(255, 210, 60), 20)
	end
	if Passes.has(player, "VIP") and not head:FindFirstChild("VipTag") then
		local tag = Instance.new("BillboardGui")
		tag.Name = "VipTag"
		tag.Size = UDim2.fromOffset(160, 30)
		tag.StudsOffset = Vector3.new(0, 3, 0)
		tag.MaxDistance = 80
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundTransparency = 1
		label.Text = "VIP SIGMA"
		label.Font = Enum.Font.FredokaOne
		label.TextScaled = true
		label.TextColor3 = Color3.fromRGB(255, 215, 0)
		label.TextStrokeTransparency = 0
		label.Parent = tag
		tag.Parent = head

		local a0 = Instance.new("Attachment")
		a0.Position = Vector3.new(0, 1, 0)
		a0.Parent = root
		local a1 = Instance.new("Attachment")
		a1.Position = Vector3.new(0, -1, 0)
		a1.Parent = root
		local trail = Instance.new("Trail")
		trail.Attachment0 = a0
		trail.Attachment1 = a1
		trail.Color = ColorSequence.new(Color3.fromRGB(255, 215, 0), Color3.fromRGB(255, 120, 0))
		trail.LightEmission = 1
		trail.Lifetime = 0.4
		trail.Parent = root
	end
end

local function dress(player: Player, character: Model)
	local humanoid = character:WaitForChild("Humanoid") :: Humanoid
	local root = character:WaitForChild("HumanoidRootPart") :: BasePart
	character:WaitForChild("Head")
	humanoid.UseJumpPower = false

	local rebirths = player:GetAttribute("Rebirths") or 0
	local scale = math.min(Config.Economy.MaxScale, 1 + rebirths * Config.Economy.RebirthScaleStep)
	if scale > 1 then
		task.defer(function()
			if character.Parent then
				character:ScaleTo(scale)
			end
		end)
	end

	addAura(root, "SigmaAura", Color3.fromRGB(160, 220, 255), 5)
	updateMewAura(player)
	addExtras(player, character)
end

function Movement.start()
	local function onPlayer(player: Player)
		player.CharacterAdded:Connect(function(character)
			dress(player, character)
		end)
		player:GetAttributeChangedSignal("MewStreak"):Connect(function()
			updateMewAura(player)
		end)
		for _, attribute in { "Aura", "Pass_GigaChad", "Pass_VIP" } do
			player:GetAttributeChangedSignal(attribute):Connect(function()
				if player.Character then
					addExtras(player, player.Character)
				end
			end)
		end
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, player in Players:GetPlayers() do
		onPlayer(player)
	end
	Players.PlayerRemoving:Connect(function(player)
		lastDash[player] = nil
	end)

	Net.event("SetSprint").OnServerEvent:Connect(function(player, on)
		if player.Character and typeof(on) == "boolean" then
			player.Character:SetAttribute("Sprinting", on)
		end
	end)

	-- The client moves itself (it owns its character); the server only grants the i-frames.
	Net.event("Dash").OnServerEvent:Connect(function(player)
		local character = player.Character
		if not character or Movement.isStunned(character) then
			return
		end
		local now = os.clock()
		if now - (lastDash[player] or 0) < M.Dash.Cooldown - 0.15 then
			return
		end
		lastDash[player] = now
		setStatus(character, "IFrameUntil", M.Dash.IFrames)
	end)

	task.spawn(function()
		while true do
			task.wait(0.1)
			for _, player in Players:GetPlayers() do
				local character = player.Character
				local humanoid = character and character:FindFirstChildOfClass("Humanoid")
				if humanoid and humanoid.Health > 0 then
					recompute(character :: Model, humanoid, player)
				end
			end
		end
	end)
end

-- NPCs call this from their own loops.
Movement.recompute = recompute

return Movement
