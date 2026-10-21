-- Weapon tools and everything they do, plus the Fanum Tax key ability.
-- The client sends "I used weapon X toward point P". The server checks ownership, the equipped
-- tool, cooldowns and range, then resolves the hit itself, so a modified client can't skip rules.

local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Net = require(Shared.Net)
local Util = require(Shared.Util)
local Build = require(script.Parent.Build)
local Combat = require(script.Parent.Combat)
local Comms = require(script.Parent.Comms)
local Data = require(script.Parent.Data)
local Economy = require(script.Parent.Economy)
local Movement = require(script.Parent.Movement)
local Passes = require(script.Parent.Passes)

local Weapons = {}

local W = Config.Weapons
local cooldowns: { [Player]: { [string]: number } } = {}

-- Allows a little latency slack so honest clients on bad wifi don't get eaten.
local function ready(player: Player, key: string, cooldown: number): boolean
	local now = os.clock()
	local map = cooldowns[player]
	if not map then
		map = {}
		cooldowns[player] = map
	end
	if now - (map[key] or -math.huge) < cooldown - 0.1 then
		return false
	end
	map[key] = now
	return true
end

local function equippedWeapon(character: Model): string?
	local tool = character:FindFirstChildOfClass("Tool")
	return tool and tool:GetAttribute("WeaponId") :: string?
end

local function knockback(target: Combat.Target, velocity: Vector3)
	if target.Player then
		Comms.effect(target.Player, "Impulse", velocity)
	elseif not target.Model:GetAttribute("StunImmune") then
		target.Root.AssemblyLinearVelocity += velocity
	end
end

local function groundBelow(position: Vector3): Vector3
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Include
	params.FilterDescendantsInstances = { Build.Map }
	local hit = workspace:Raycast(position + Vector3.new(0, 3, 0), Vector3.new(0, -40, 0), params)
	return if hit then hit.Position else position
end

local function burst(position: Vector3, color: Color3, radius: number)
	local ball = Build.part({
		Name = "Burst", Parent = Build.Effects, Shape = Enum.PartType.Ball, Size = Vector3.one,
		CFrame = CFrame.new(position), Color = color, Material = Enum.Material.Neon,
		CanCollide = false, CanTouch = false, CastShadow = false, Transparency = 0.2,
	})
	TweenService:Create(ball, TweenInfo.new(0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.one * radius * 2, Transparency = 1,
	}):Play()
	Debris:AddItem(ball, 0.4)
end

local function splash(attacker: Player, center: Vector3, radius: number, damage: number)
	burst(center, W.ShakeBlaster.Color, radius)
	for _, target in Combat.targets() do
		if (target.Root.Position - center).Magnitude <= radius + 1.5 and Combat.canHit(attacker, target.Model) then
			Combat.damage(attacker, target.Humanoid, damage, { source = center })
		end
	end
end

local function setStealth(character: Model, on: boolean)
	character:SetAttribute("Stealth", on)
	for _, d in character:GetDescendants() do
		if d:IsA("BasePart") or d:IsA("Decal") then
			if on then
				d:SetAttribute("StealthT", d.Transparency)
				d.Transparency = 1
			elseif d:GetAttribute("StealthT") ~= nil then
				d.Transparency = d:GetAttribute("StealthT")
				d:SetAttribute("StealthT", nil)
			end
		elseif d:IsA("ParticleEmitter") or d:IsA("Trail") or d:IsA("BillboardGui") then
			if on then
				d:SetAttribute("StealthOn", d.Enabled)
				d.Enabled = false
			elseif d:GetAttribute("StealthOn") ~= nil then
				d.Enabled = d:GetAttribute("StealthOn")
				d:SetAttribute("StealthOn", nil)
			end
		end
	end
	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.DisplayDistanceType = if on then Enum.HumanoidDisplayDistanceType.None
			else Enum.HumanoidDisplayDistanceType.Viewer
	end
end

local function taxEvasion(player: Player, character: Model)
	local s = W.FanumVacuum.Special
	local root = character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return
	end
	character.Archivable = true
	local decoy = character:Clone()
	character.Archivable = false
	if decoy then
		for _, d in decoy:GetDescendants() do
			if d:IsA("BaseScript") or d:IsA("Tool") or d:IsA("ForceField") or d:IsA("ParticleEmitter") then
				d:Destroy()
			elseif d:IsA("BasePart") then
				d.CanCollide = false
			end
		end
		decoy.Name = player.DisplayName
		decoy.Parent = Build.Effects
		local decoyRoot = decoy:FindFirstChild("HumanoidRootPart") :: BasePart?
		local decoyHumanoid = decoy:FindFirstChildOfClass("Humanoid")
		if decoyRoot and decoyHumanoid then
			decoyRoot:SetNetworkOwner(nil)
			decoyHumanoid:MoveTo(root.Position + root.CFrame.LookVector * s.CloneRun)
		end
		Debris:AddItem(decoy, s.StealthTime)
	end
	setStealth(character, true)
	task.delay(s.StealthTime, function()
		if character.Parent then
			setStealth(character, false)
		end
	end)
end

local function puddle(attacker: Player, at: Vector3)
	local s = W.ShakeBlaster.Special
	local ground = groundBelow(at)
	local part = Build.part({
		Name = "Puddle", Parent = Build.Effects, Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.3, s.Radius * 2, s.Radius * 2),
		CFrame = CFrame.new(ground + Vector3.new(0, 0.15, 0)) * CFrame.Angles(0, 0, math.rad(90)),
		Color = W.ShakeBlaster.Color, Material = Enum.Material.Neon, Transparency = 0.35,
		CanCollide = false, CanTouch = false, CastShadow = false,
	})
	Debris:AddItem(part, s.Duration)
	task.spawn(function()
		local endsAt = os.clock() + s.Duration
		while os.clock() < endsAt and part.Parent do
			for _, target in Combat.targets() do
				local offset = target.Root.Position - ground
				if Vector3.new(offset.X, 0, offset.Z).Magnitude <= s.Radius and math.abs(offset.Y) < 6
					and Combat.canHit(attacker, target.Model)
				then
					Movement.slow(target.Model, s.SlowMult, s.SlowTime)
				end
			end
			task.wait(0.25)
		end
	end)
end

local function steal(thief: Player, victim: Player, pct: number, minimum: number?): number
	local amount = Economy.steal(thief, victim, pct, minimum)
	if amount > 0 then
		Comms.effect(thief, "CoinsDelta", amount)
		Comms.effect(victim, "CoinsDelta", -amount)
	end
	return amount
end

local function primary(player: Player, character: Model, id: string, aim: Vector3)
	local w = W[id]
	local root = character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return
	end

	if w.Kind == "Melee" then
		local best, bestDistance = nil, w.Range
		for _, target in Combat.targets() do
			local offset = target.Root.Position - root.Position
			if target.Model ~= character and offset.Magnitude <= bestDistance
				and offset.Unit:Dot(root.CFrame.LookVector) > 0.3 and Combat.canHit(player, target.Model)
			then
				best, bestDistance = target, offset.Magnitude
			end
		end
		if best then
			Combat.damage(player, best.Humanoid, w.Damage)
			knockback(best, (root.CFrame.LookVector + Vector3.new(0, 0.4, 0)) * w.Knockback)
			burst(best.Root.Position, w.Color, 3)
		end
	elseif w.Kind == "Lob" then
		local result, origin, direction = Combat.cast(character, aim, w.Range, 0.5)
		local impact = if result then result.Position else origin + direction
		local travel = (impact - origin).Magnitude / w.ProjectileSpeed
		local shot = Build.part({
			Name = "Shake", Parent = Build.Effects, Size = Vector3.new(1, 1.6, 1), CFrame = CFrame.new(origin),
			Color = w.Color, Material = Enum.Material.Neon, CanCollide = false, CanTouch = false,
		})
		TweenService:Create(shot, TweenInfo.new(travel, Enum.EasingStyle.Linear), {
			CFrame = CFrame.new(impact) * CFrame.Angles(math.pi * 4, 0, math.pi * 2),
		}):Play()
		Debris:AddItem(shot, travel)
		task.delay(travel, splash, player, impact, w.SplashRadius, w.Damage)
	elseif w.Kind == "Beam" then
		local result, origin, direction = Combat.cast(character, aim, w.Range, 1.5)
		local hitAt = if result then result.Position else origin + direction
		Combat.beam(root.Position, hitAt, if player:GetAttribute("GoldVacuum") then Color3.fromRGB(255, 200, 40) else w.Color, 0.8, 0.1)
		local humanoid, model = Combat.hitHumanoid(result)
		if humanoid and model and Combat.canHit(player, model) then
			Combat.damage(player, humanoid, w.Damage, { source = root.Position })
			local victim = Players:GetPlayerFromCharacter(model)
			if victim then
				steal(player, victim, w.StealPct, w.StealMin)
			end
		end
	elseif w.Kind == "Hitscan" then
		local result, origin, direction = Combat.cast(character, aim, w.Range, 1.2)
		local hitAt = if result then result.Position else origin + direction
		Combat.beam(origin, hitAt, w.Color, 0.5, 0.15)
		local humanoid, model = Combat.hitHumanoid(result)
		if humanoid and model and Combat.canHit(player, model) then
			Combat.damage(player, humanoid, w.Damage, { source = origin })
		end
	end
end

local function special(player: Player, character: Model, id: string, aim: Vector3)
	local s = W[id].Special
	if id == "ShakeBlaster" then
		local result, origin, direction = Combat.cast(character, aim, W.ShakeBlaster.Range, 0.5)
		puddle(player, if result then result.Position else origin + direction)
	elseif id == "FanumVacuum" then
		taxEvasion(player, character)
	elseif id == "GigaStare" or id == "MewShield" then
		local result, origin, direction = Combat.cast(character, aim, s.Range, 1.5)
		local hitAt = if result then result.Position else origin + direction
		Combat.beam(origin, hitAt, if id == "GigaStare" then Color3.new(1, 1, 1) else W.MewShield.Color, 0.9, 0.25)
		local humanoid, model = Combat.hitHumanoid(result)
		if not (humanoid and model and Combat.canHit(player, model)) then
			return
		end
		local victim = Players:GetPlayerFromCharacter(model)
		if id == "GigaStare" then
			Combat.damage(player, humanoid, s.Damage, { source = origin })
			if victim then
				Comms.effect(victim, "Flash", s.BlindTime)
			elseif not model:GetAttribute("StunImmune") then
				Movement.stun(model, s.BlindTime * 0.6)
			end
		else
			if not model:GetAttribute("StunImmune") then
				Movement.stun(model, s.StunTime)
			end
			model:SetAttribute("MoggedUntil", os.clock() + s.StunTime)
			if victim then
				Comms.effect(victim, "Mogged", s.StunTime)
			end
		end
	end
end

local function fanumTax(player: Player)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return
	end
	local F = Config.FanumTax
	local cooldown = if Passes.has(player, "InfiniteTax") then F.PassCooldown else F.Cooldown
	if not ready(player, "FanumTax", cooldown) then
		return
	end
	local total, victims = 0, 0
	for _, other in Players:GetPlayers() do
		local otherRoot = other ~= player and other.Character and other.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if otherRoot and (otherRoot.Position - root.Position).Magnitude <= F.Radius then
			local amount = steal(player, other, F.StealPct, 1)
			if amount > 0 then
				total += amount
				victims += 1
				Comms.notify(other, player.DisplayName .. " FANUM TAXED you (-" .. Util.formatNumber(amount) .. ")",
					Color3.fromRGB(255, 90, 90))
			end
		end
	end
	burst(root.Position, Color3.fromRGB(255, 200, 40), F.Radius)
	Util.sound(Config.Sounds.TaxSteal, root, 1)
	if victims > 0 then
		Comms.notify(player, "Taxed " .. victims .. " people for " .. Util.formatNumber(total), Color3.fromRGB(255, 220, 80), true)
	else
		Comms.notify(player, "Nobody in range to tax", Color3.fromRGB(200, 200, 200))
	end
end

function Weapons.giveTool(player: Player, id: string)
	local w = W[id]
	local backpack = player:FindFirstChildOfClass("Backpack")
	if not w or not backpack then
		return
	end
	for _, existing in backpack:GetChildren() do
		if existing:GetAttribute("WeaponId") == id then
			return
		end
	end
	local tool = Instance.new("Tool")
	tool.Name = w.Name
	tool.ToolTip = w.Blurb
	tool.CanBeDropped = false
	tool:SetAttribute("WeaponId", id)
	local handleSize = ({
		ShakeBlaster = Vector3.new(1, 2.2, 1),
		FanumVacuum = Vector3.new(1, 1, 3.5),
		MewShield = Vector3.new(3.5, 4, 0.5),
	})[id]
	if handleSize then
		local handle = Instance.new("Part")
		handle.Name = "Handle"
		handle.Size = handleSize
		handle.Color = if id == "FanumVacuum" and player:GetAttribute("GoldVacuum") then Color3.fromRGB(255, 200, 40) else w.Color
		handle.Material = if id == "MewShield" then Enum.Material.ForceField else Enum.Material.SmoothPlastic
		handle.CanCollide = false
		handle.Massless = true
		handle.Parent = tool
	else
		tool.RequiresHandle = false
	end
	tool.Parent = backpack
end

function Weapons.start()
	local function onCharacter(player: Player)
		local data = Data.wait(player)
		if not data then
			return
		end
		local ids = {}
		for id in data.Owned do
			if W[id] then
				table.insert(ids, id)
			end
		end
		table.sort(ids, function(a, b)
			return W[a].Order < W[b].Order
		end)
		for _, id in ids do
			Weapons.giveTool(player, id)
		end
	end
	local function onPlayer(player: Player)
		player.CharacterAdded:Connect(function()
			onCharacter(player)
		end)
		if player.Character then
			task.spawn(onCharacter, player)
		end
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, player in Players:GetPlayers() do
		onPlayer(player)
	end
	Players.PlayerRemoving:Connect(function(player)
		cooldowns[player] = nil
	end)

	Net.event("UseWeapon").OnServerEvent:Connect(function(player, id, mode, aim)
		if typeof(id) ~= "string" or typeof(aim) ~= "Vector3" or (mode ~= "primary" and mode ~= "special") then
			return
		end
		local w = W[id]
		local data = Data.get(player)
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if not w or not data or not data.Owned[id] or not humanoid or humanoid.Health <= 0 then
			return
		end
		if equippedWeapon(character :: Model) ~= id or Movement.isStunned(character :: Model) then
			return
		end
		if mode == "primary" then
			if w.Kind ~= "Shield" and ready(player, id, w.Cooldown) then
				primary(player, character :: Model, id, aim)
			end
		elseif w.Special and ready(player, id .. ":special", w.Special.Cooldown) then
			special(player, character :: Model, id, aim)
		end
	end)

	Net.event("SetBlock").OnServerEvent:Connect(function(player, on)
		local character = player.Character
		if character and typeof(on) == "boolean" then
			character:SetAttribute("Blocking", on and equippedWeapon(character) == "MewShield")
		end
	end)

	Net.event("FanumTax").OnServerEvent:Connect(fanumTax)

	-- Unequipping the shield (or dying with it) mustn't leave a block stuck on.
	task.spawn(function()
		while true do
			task.wait(0.25)
			for _, player in Players:GetPlayers() do
				local character = player.Character
				if character and character:GetAttribute("Blocking") and equippedWeapon(character) ~= "MewShield" then
					character:SetAttribute("Blocking", false)
				end
			end
		end
	end)
end

return Weapons
