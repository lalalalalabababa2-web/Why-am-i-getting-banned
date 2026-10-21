-- Melee mobs: chase the nearest visible player on their floor, slap them, wander otherwise.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Util = require(Shared.Util)
local Combat = require(script.Parent.Combat)
local Movement = require(script.Parent.Movement)
local Rigs = require(script.Parent.Rigs)

local Npc = {}

export type Spec = {
	Kind: string,
	Name: string,
	Ground: Vector3,
	Floor: number,
	Health: number,
	Damage: number,
	Speed: number,
	AttackCooldown: number,
	AggroRange: number,
	WanderRadius: number,
	Parent: Instance,
	OnDeath: (() -> ())?,
}

local function nearestPlayer(position: Vector3, floor: number, range: number): Combat.Target?
	local best, bestDistance = nil, range
	for _, player in Players:GetPlayers() do
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if humanoid and root and humanoid.Health > 0 and not character:GetAttribute("Stealth")
			and Util.floorAt(root.Position.Y) == floor
		then
			local distance = (root.Position - position).Magnitude
			if distance < bestDistance then
				best, bestDistance = { Model = character :: Model, Humanoid = humanoid, Root = root, Player = player }, distance
			end
		end
	end
	return best
end

function Npc.spawn(spec: Spec)
	local rig = Rigs.npc(spec.Kind, spec.Name, spec.Ground, 1, spec.Health, spec.Parent)
	local home = spec.Ground
	local lastAttack = 0
	local nextWander = 0

	rig.Humanoid.Died:Connect(function()
		local killer = Combat.creditFor(rig.Humanoid)
		if killer then
			Combat.awardKill(killer, spec.Name, Config.Economy.NpcKill)
		end
		task.delay(1.5, function()
			rig.Model:Destroy()
		end)
		if spec.OnDeath then
			spec.OnDeath()
		end
	end)

	task.spawn(function()
		while rig.Humanoid.Health > 0 and rig.Model.Parent do
			Movement.recompute(rig.Model, rig.Humanoid, nil, spec.Speed)
			local target = nearestPlayer(rig.Root.Position, spec.Floor, spec.AggroRange)
			if target and not Movement.isStunned(rig.Model) then
				rig.Humanoid:MoveTo(target.Root.Position)
				local now = os.clock()
				if (target.Root.Position - rig.Root.Position).Magnitude < 5.5 and now - lastAttack > spec.AttackCooldown then
					lastAttack = now
					Combat.damage(nil, target.Humanoid, spec.Damage, { source = rig.Root.Position })
				end
			elseif os.clock() > nextWander then
				nextWander = os.clock() + math.random(2, 5)
				local angle = math.random() * math.pi * 2
				local r = math.random() * spec.WanderRadius
				rig.Humanoid:MoveTo(home + Vector3.new(math.cos(angle) * r, 0, math.sin(angle) * r))
			end
			task.wait(0.3)
		end
	end)
	return rig
end

return Npc
