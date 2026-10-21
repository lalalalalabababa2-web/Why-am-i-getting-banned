-- Big Back boss. Phase 1 slams telegraphed circles under players; below EnrageAt health it
-- starts the gravitational pull, and anyone who gets dragged into it is eaten.

local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Util = require(Shared.Util)
local Build = require(script.Parent.Build)
local Combat = require(script.Parent.Combat)
local Comms = require(script.Parent.Comms)
local Economy = require(script.Parent.Economy)
local Rigs = require(script.Parent.Rigs)

local Boss = {}

local K = Config.Kitchen
local SCALE = 5

export type Spec = {
	Name: string,
	Ground: Vector3,
	Floor: number,
	MaxHealth: number,
	Enrage: boolean,
	Reward: { Coins: number, Rizz: number },
	Parent: Instance,
	OnDefeated: ((contributors: { Player }) -> ())?,
}

export type Handle = { Model: Model, Humanoid: Humanoid, Destroy: () -> () }

local damageBy: { [Humanoid]: { [Player]: number } } = {}

local function slam(spec: Spec, center: Vector3)
	local ring = Build.part({
		Name = "Telegraph", Parent = Build.Effects, Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.4, K.SlamRadius * 2, K.SlamRadius * 2),
		CFrame = CFrame.new(center + Vector3.new(0, 0.25, 0)) * CFrame.Angles(0, 0, math.rad(90)),
		Color = Color3.fromRGB(255, 40, 40), Material = Enum.Material.Neon, Transparency = 0.6,
		CanCollide = false, CanTouch = false, CastShadow = false,
	})
	TweenService:Create(ring, TweenInfo.new(K.SlamTelegraph / 4, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
		Transparency = 0.25,
	}):Play()
	task.delay(K.SlamTelegraph, function()
		ring:Destroy()
		local wave = Build.part({
			Name = "Shockwave", Parent = Build.Effects, Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(1, 2, 2), CFrame = CFrame.new(center) * CFrame.Angles(0, 0, math.rad(90)),
			Color = Color3.fromRGB(255, 200, 80), Material = Enum.Material.Neon, CanCollide = false, CanTouch = false,
		})
		TweenService:Create(wave, TweenInfo.new(0.3), {
			Size = Vector3.new(1, K.SlamRadius * 2.2, K.SlamRadius * 2.2), Transparency = 1,
		}):Play()
		Debris:AddItem(wave, 0.35)
		for _, player in Comms.playersOnFloor(spec.Floor) do
			local character = player.Character :: Model
			local root = character:FindFirstChild("HumanoidRootPart") :: BasePart
			local offset = root.Position - center
			if Vector3.new(offset.X, 0, offset.Z).Magnitude <= K.SlamRadius and math.abs(offset.Y) < 10 then
				local humanoid = character:FindFirstChildOfClass("Humanoid") :: Humanoid
				if Combat.damage(nil, humanoid, K.SlamDamage, { source = center }) > 0 then
					local out = Vector3.new(offset.X, 0, offset.Z)
					out = if out.Magnitude > 0.1 then out.Unit else Vector3.zero
					Comms.effect(player, "Impulse", out * K.SlamKnockback + Vector3.new(0, 45, 0))
				end
			end
			Comms.effect(player, "Shake", 0.6)
		end
	end)
end

function Boss.spawn(spec: Spec): Handle
	local rig = Rigs.npc("Boss", spec.Name, spec.Ground, SCALE, spec.MaxHealth, spec.Parent)
	rig.Model:AddTag("Boss")
	rig.Model:SetAttribute("StunImmune", true)
	rig.Model:SetAttribute("Floor", spec.Floor)
	rig.Humanoid.WalkSpeed = 8
	damageBy[rig.Humanoid] = {}

	local alive = true
	local enraged = false
	local lastSlam = os.clock()
	local lastPull = 0
	local pullingUntil = 0
	local lastContact: { [Player]: number } = {}

	local handle: Handle = {
		Model = rig.Model,
		Humanoid = rig.Humanoid,
		Destroy = function()
			alive = false
			damageBy[rig.Humanoid] = nil
			rig.Model:Destroy()
		end,
	}

	rig.Humanoid.Died:Connect(function()
		if not alive then
			return
		end
		alive = false
		local contributors = {}
		for player, dealt in (damageBy[rig.Humanoid] or {}) :: { [Player]: number } do
			if player.Parent and dealt >= spec.MaxHealth * 0.01 then
				table.insert(contributors, player)
				Economy.reward(player, spec.Reward.Coins, spec.Reward.Rizz)
				Combat.moment(player, "BOSS DOWN", spec.Name .. " got mogged")
			end
		end
		damageBy[rig.Humanoid] = nil
		for _, part in rig.Model:GetDescendants() do
			if part:IsA("BasePart") then
				TweenService:Create(part, TweenInfo.new(1.5), { Transparency = 1 }):Play()
			end
		end
		Debris:AddItem(rig.Model, 1.6)
		if spec.OnDefeated then
			spec.OnDefeated(contributors)
		end
	end)

	task.spawn(function()
		while alive and rig.Humanoid.Health > 0 do
			local now = os.clock()
			local root = rig.Root
			local onFloor = {}
			for _, player in Comms.playersOnFloor(spec.Floor) do
				if not (player.Character :: Model):GetAttribute("Stealth") then
					table.insert(onFloor, player)
				end
			end

			-- Walk toward the closest player.
			local nearest, nearestDistance = nil, math.huge
			for _, player in onFloor do
				local r = (player.Character :: Model):FindFirstChild("HumanoidRootPart") :: BasePart
				local d = (r.Position - root.Position).Magnitude
				if d < nearestDistance then
					nearest, nearestDistance = r, d
				end
			end
			if nearest and now > pullingUntil then
				rig.Humanoid:MoveTo(nearest.Position)
			end

			-- Belly contact hurts.
			for _, player in onFloor do
				local character = player.Character :: Model
				local r = character:FindFirstChild("HumanoidRootPart") :: BasePart
				local flat = (r.Position - root.Position) * Vector3.new(1, 0, 1)
				if flat.Magnitude < 4.5 * SCALE / 2 + 2 and now - (lastContact[player] or 0) > 1 then
					lastContact[player] = now
					Combat.damage(nil, character:FindFirstChildOfClass("Humanoid") :: Humanoid, K.ContactDamage, {
						source = root.Position,
					})
				end
			end

			if now - lastSlam > K.SlamCooldown and #onFloor > 0 then
				lastSlam = now
				local pool = table.clone(onFloor)
				for _ = 1, math.min(K.SlamTargets, #pool) do
					local player = table.remove(pool, math.random(#pool)) :: Player
					local r = (player.Character :: Model):FindFirstChild("HumanoidRootPart") :: BasePart
					slam(spec, r.Position - Vector3.new(0, 3, 0))
				end
				Util.sound(Config.Sounds.Slam, root, 1)
			end

			if spec.Enrage and not enraged and rig.Humanoid.Health / rig.Humanoid.MaxHealth <= K.EnrageAt then
				enraged = true
				rig.Humanoid.WalkSpeed = 11
				for _, part in rig.Model:GetChildren() do
					if part:IsA("BasePart") and part.Name == "Belly" then
						part.Color = Color3.fromRGB(220, 40, 40)
					end
				end
				for _, player in onFloor do
					Comms.notify(player, spec.Name .. " IS ENRAGED. RUN FROM THE PULL", Color3.fromRGB(255, 60, 60), true)
				end
				lastPull = now - K.PullCooldown + 2
			end

			if enraged and now - lastPull > K.PullCooldown then
				lastPull = now
				pullingUntil = now + K.PullTime
				rig.Humanoid:MoveTo(root.Position)
				for _, player in onFloor do
					Comms.effect(player, "Pull", { Center = root.Position, Speed = K.PullSpeed, Time = K.PullTime })
				end
			end
			if now < pullingUntil then
				for _, player in onFloor do
					local character = player.Character :: Model
					local r = character:FindFirstChild("HumanoidRootPart") :: BasePart
					if ((r.Position - root.Position) * Vector3.new(1, 0, 1)).Magnitude < K.EatRadius then
						Combat.kill(character:FindFirstChildOfClass("Humanoid") :: Humanoid)
						Comms.notify(nil, player.DisplayName .. " got eaten by " .. spec.Name, Color3.fromRGB(255, 120, 60))
					end
				end
			end

			task.wait(if now < pullingUntil then 0.1 else 0.25)
		end
	end)

	return handle
end

function Boss.start()
	Combat.onDamaged(function(attacker, humanoid, dealt)
		local tally = damageBy[humanoid]
		if tally and attacker then
			tally[attacker] = (tally[attacker] or 0) + dealt
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		for _, tally in damageBy do
			tally[player] = nil
		end
	end)
end

return Boss
