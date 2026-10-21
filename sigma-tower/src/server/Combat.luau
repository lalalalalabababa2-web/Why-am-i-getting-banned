-- The one damage pipeline. Every hit in the game, player or NPC, goes through Combat.damage so
-- shields, i-frames, PvP rules, kill credit and streaks all behave the same everywhere.

local CollectionService = game:GetService("CollectionService")
local Debris = game:GetService("Debris")
local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Util = require(Shared.Util)
local Build = require(script.Parent.Build)
local Comms = require(script.Parent.Comms)
local Economy = require(script.Parent.Economy)

local Combat = {}

export type Target = { Model: Model, Humanoid: Humanoid, Root: BasePart, Player: Player? }
type DamageOpts = { source: Vector3?, noReflect: boolean?, unblockable: boolean? }

local damageListeners: { (attacker: Player?, humanoid: Humanoid, dealt: number) -> () } = {}

local castParams = RaycastParams.new()
castParams.FilterType = Enum.RaycastFilterType.Exclude

function Combat.humanoidFromPart(part: Instance): (Humanoid?, Model?)
	local model = part:FindFirstAncestorWhichIsA("Model")
	while model do
		local humanoid = model:FindFirstChildOfClass("Humanoid")
		if humanoid then
			return humanoid, model
		end
		model = model:FindFirstAncestorWhichIsA("Model")
	end
	return nil, nil
end

function Combat.hitHumanoid(result: RaycastResult?): (Humanoid?, Model?)
	if not result then
		return nil, nil
	end
	return Combat.humanoidFromPart(result.Instance)
end

-- Every living thing that can take damage: player characters plus models tagged Damageable.
function Combat.targets(): { Target }
	local list = {}
	local function add(model: Model, player: Player?)
		local humanoid = model:FindFirstChildOfClass("Humanoid")
		local root = model:FindFirstChild("HumanoidRootPart") :: BasePart?
		if humanoid and root and humanoid.Health > 0 then
			table.insert(list, { Model = model, Humanoid = humanoid, Root = root, Player = player })
		end
	end
	for _, player in Players:GetPlayers() do
		if player.Character then
			add(player.Character, player)
		end
	end
	for _, model in CollectionService:GetTagged("Damageable") do
		if model:IsA("Model") and model:IsDescendantOf(workspace) then
			add(model, nil)
		end
	end
	return list
end

-- Server-side aim: a fat ray from the attacker's head toward where the client says it aimed.
-- The client only picks a direction; walls and range are decided here.
function Combat.cast(character: Model, aim: Vector3, range: number, radius: number?): (RaycastResult?, Vector3, Vector3)
	local head = character:FindFirstChild("Head") :: BasePart?
	local origin = if head then head.Position else character:GetPivot().Position
	local direction = aim - origin
	if direction.Magnitude < 0.01 then
		direction = character:GetPivot().LookVector
	end
	direction = direction.Unit * range
	castParams.FilterDescendantsInstances = { character, Build.Effects }
	local result = workspace:Spherecast(origin, radius or 1.2, direction, castParams)
	return result, origin, direction
end

function Combat.pvpAllowed(a: Player, b: Player): boolean
	local ra = a.Character and a.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
	local rb = b.Character and b.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not ra or not rb then
		return false
	end
	return Config.Floors[Util.floorAt(ra.Position.Y)].PvP and Config.Floors[Util.floorAt(rb.Position.Y)].PvP
end

-- Whether attacker is allowed to hurt this model at all.
function Combat.canHit(attacker: Player?, model: Model): boolean
	local victim = Players:GetPlayerFromCharacter(model)
	if not victim then
		return true
	end
	if victim == attacker then
		return false
	end
	return attacker == nil or Combat.pvpAllowed(attacker, victim)
end

function Combat.beam(from: Vector3, to: Vector3, color: Color3, width: number?, life: number?)
	local distance = (to - from).Magnitude
	if distance < 0.1 then
		return
	end
	local w = width or 0.4
	local beam = Build.part({
		Name = "Beam", Parent = Build.Effects, Size = Vector3.new(w, w, distance),
		CFrame = CFrame.lookAt(from, to) * CFrame.new(0, 0, -distance / 2),
		Color = color, Material = Enum.Material.Neon, CanCollide = false, CanTouch = false, CastShadow = false,
	})
	Debris:AddItem(beam, life or 0.12)
end

function Combat.onDamaged(callback: (attacker: Player?, humanoid: Humanoid, dealt: number) -> ())
	table.insert(damageListeners, callback)
end

function Combat.damage(attacker: Player?, humanoid: Humanoid, amount: number, opts: DamageOpts?): number
	local o: DamageOpts = opts or {}
	if humanoid.Health <= 0 or amount <= 0 then
		return 0
	end
	local model = humanoid.Parent :: Model
	if not Combat.canHit(attacker, model) then
		return 0
	end
	local now = os.clock()
	local root = model:FindFirstChild("HumanoidRootPart") :: BasePart?

	if not o.unblockable and root then
		if (model:GetAttribute("IFrameUntil") or 0) > now then
			return 0
		end
		if model:GetAttribute("Blocking") then
			local source = o.source
			if not source and attacker and attacker.Character then
				source = attacker.Character:GetPivot().Position
			end
			if source then
				local flat = (source - root.Position) * Vector3.new(1, 0, 1)
				if flat.Magnitude < 0.01 or flat.Unit:Dot(root.CFrame.LookVector) > Config.Weapons.MewShield.BlockArc then
					local defender = Players:GetPlayerFromCharacter(model)
					local attackerHumanoid = attacker and attacker.Character and attacker.Character:FindFirstChildOfClass("Humanoid")
					if attackerHumanoid and defender and not o.noReflect then
						local attackerRoot = (attackerHumanoid.Parent :: Model):FindFirstChild("HumanoidRootPart") :: BasePart?
						if attackerRoot then
							Combat.beam(root.Position, attackerRoot.Position, Config.Weapons.MewShield.Color, 0.6, 0.2)
						end
						Combat.damage(defender, attackerHumanoid, amount * Config.Weapons.MewShield.ReflectPct, {
							noReflect = true, source = root.Position,
						})
					end
					if defender then
						Comms.effect(defender, "Blocked", nil)
					end
					return 0
				end
			end
		end
	end

	if (model:GetAttribute("MoggedUntil") or 0) > now then
		amount *= Config.Weapons.MewShield.Special.DamageTakenMult
	end
	if attacker then
		humanoid:SetAttribute("LastAttacker", attacker.UserId)
		humanoid:SetAttribute("LastHitAt", now)
	end
	local before = humanoid.Health
	humanoid:TakeDamage(amount)
	local dealt = before - humanoid.Health
	if dealt > 0 then
		for _, callback in damageListeners do
			task.spawn(callback, attacker, humanoid, dealt)
		end
		if attacker then
			Comms.effect(attacker, "Hitmarker", math.floor(dealt + 0.5))
		end
	end
	return dealt
end

-- Instant death for hazards (trains, getting eaten). Ignores shields and force fields.
function Combat.kill(humanoid: Humanoid)
	if humanoid.Health > 0 then
		humanoid.Health = 0
	end
end

-- The player who last hit this humanoid recently enough to deserve the kill.
function Combat.creditFor(humanoid: Humanoid): Player?
	local userId = humanoid:GetAttribute("LastAttacker")
	local at = humanoid:GetAttribute("LastHitAt") or 0
	if userId and os.clock() - at <= Config.Economy.CreditWindow then
		return Players:GetPlayerByUserId(userId)
	end
	return nil
end

-- The deep-fried celebration screen, plus a server-wide shoutout.
function Combat.moment(player: Player, title: string, subtitle: string)
	Comms.effect(player, "DeepFried", { Title = title, Subtitle = subtitle })
	Comms.notify(nil, player.DisplayName .. ": " .. title, Color3.fromRGB(255, 80, 200), true)
end

function Combat.awardKill(killer: Player, victimName: string, reward: { Coins: number, Rizz: number })
	Economy.reward(killer, reward.Coins, reward.Rizz)
	local streak = (killer:GetAttribute("KillStreak") or 0) :: number + 1
	killer:SetAttribute("KillStreak", streak)
	Comms.notify(killer, "Mogged " .. victimName .. " (" .. streak .. " streak)", Color3.fromRGB(120, 255, 120))
	if table.find(Config.Economy.StreakMoments, streak) then
		Combat.moment(killer, streak .. " KILL STREAK", "absolutely sigma behaviour")
	end
end

function Combat.start()
	local function onCharacter(player: Player, character: Model)
		local humanoid = character:WaitForChild("Humanoid") :: Humanoid
		humanoid.Died:Connect(function()
			player:SetAttribute("KillStreak", 0)
			local killer = Combat.creditFor(humanoid)
			if killer and killer ~= player then
				Combat.awardKill(killer, player.DisplayName, Config.Economy.PlayerKill)
			end
		end)
	end
	local function onPlayer(player: Player)
		player:SetAttribute("KillStreak", 0)
		player.CharacterAdded:Connect(function(character)
			onCharacter(player, character)
		end)
		if player.Character then
			task.spawn(onCharacter, player, player.Character)
		end
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, player in Players:GetPlayers() do
		onPlayer(player)
	end
end

return Combat
