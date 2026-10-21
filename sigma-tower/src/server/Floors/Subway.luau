-- Floor 1. Spawn on the south platform, cross the tracks between trains, ride up from the north.

local CollectionService = game:GetService("CollectionService")
local RunService = game:GetService("RunService")

local server = script.Parent.Parent
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Util = require(Shared.Util)
local Build = require(server.Build)
local Combat = require(server.Combat)
local Comms = require(server.Comms)
local Npc = require(server.Npc)

local Subway = {}

local S = Config.Subway
local Y = Config.Floors[1].BaseY
local WIDTH, DEPTH, HEIGHT = 240, 180, 44
local TRENCH = 14 -- half-width of the track trench
local TRAIN_LENGTH, TRAIN_WIDTH, TRAIN_HEIGHT = 150, 22, 12

local SLANG = { "NO CAP", "SKIBIDI", "OHIO", "GYATT", "RIZZ", "FANUM TAX", "SIGMA", "BUSSIN", "MEWING", "L + RATIO", "IT'S GIVING", "DELULU" }
local NEON = {
	Color3.fromRGB(255, 50, 200), Color3.fromRGB(0, 230, 255), Color3.fromRGB(180, 255, 0), Color3.fromRGB(255, 160, 0),
}

local folder: Folder
local warningLights: { BasePart } = {}
local train: Model

local function buildTunnelWall(side: number)
	local x = side * (WIDTH / 2 + 2)
	local wallColor = Color3.fromRGB(25, 25, 35)
	local opening = 18 -- tunnel height above the trench floor
	for _, z in { -(DEPTH / 2 + TRENCH) / 2, (DEPTH / 2 + TRENCH) / 2 } do
		Build.part({
			Name = "Wall", Parent = folder, Size = Vector3.new(4, HEIGHT, DEPTH / 2 - TRENCH),
			CFrame = CFrame.new(x, Y - 4 + HEIGHT / 2, z), Color = wallColor, Material = Enum.Material.Concrete,
		})
	end
	Build.part({
		Name = "Wall", Parent = folder, Size = Vector3.new(4, HEIGHT - opening, TRENCH * 2),
		CFrame = CFrame.new(x, Y - 4 + opening + (HEIGHT - opening) / 2, 0), Color = wallColor, Material = Enum.Material.Concrete,
	})
	-- A short dark tunnel beyond the opening, capped so nobody walks off into the void.
	local tunnelX = side * (WIDTH / 2 + 4 + 40)
	Build.part({
		Name = "TunnelFloor", Parent = folder, Size = Vector3.new(80, 2, TRENCH * 2),
		CFrame = CFrame.new(tunnelX, Y - 5, 0), Color = Color3.fromRGB(20, 20, 20),
	})
	for _, z in { -TRENCH - 1, TRENCH + 1 } do
		Build.part({
			Name = "TunnelWall", Parent = folder, Size = Vector3.new(80, opening, 2),
			CFrame = CFrame.new(tunnelX, Y - 4 + opening / 2, z), Color = Color3.fromRGB(15, 15, 20),
		})
	end
	Build.part({
		Name = "TunnelRoof", Parent = folder, Size = Vector3.new(80, 2, TRENCH * 2 + 4),
		CFrame = CFrame.new(tunnelX, Y - 4 + opening + 1, 0), Color = Color3.fromRGB(15, 15, 20),
	})
	Build.part({
		Name = "TunnelCap", Parent = folder, Size = Vector3.new(2, opening, TRENCH * 2),
		CFrame = CFrame.new(side * (WIDTH / 2 + 4 + 80), Y - 4 + opening / 2, 0), Color = Color3.new(0, 0, 0),
	})
end

local function buildTrain(): Model
	local model = Instance.new("Model")
	model.Name = "Train"
	local body = Build.part({
		Name = "Body", Parent = model, Size = Vector3.new(TRAIN_LENGTH, TRAIN_HEIGHT, TRAIN_WIDTH),
		CFrame = CFrame.new(0, -1000, 0), Color = Color3.fromRGB(190, 195, 205), Material = Enum.Material.DiamondPlate,
		CanCollide = false, CanQuery = true, CanTouch = false,
	})
	model.PrimaryPart = body
	for _, z in { -TRAIN_WIDTH / 2 - 0.1, TRAIN_WIDTH / 2 + 0.1 } do
		Build.part({
			Name = "Stripe", Parent = model, Size = Vector3.new(TRAIN_LENGTH, 1.5, 0.2),
			CFrame = body.CFrame * CFrame.new(0, 1, z), Color = Color3.fromRGB(255, 0, 120), Material = Enum.Material.Neon,
			CanCollide = false, CanTouch = false,
		})
	end
	local front = Build.part({
		Name = "Front", Parent = model, Size = Vector3.new(0.2, TRAIN_HEIGHT - 2, TRAIN_WIDTH - 2),
		CFrame = body.CFrame * CFrame.new(TRAIN_LENGTH / 2 + 0.1, 0, 0), Color = Color3.fromRGB(20, 20, 30),
		CanCollide = false, CanTouch = false,
	})
	Build.sign(front, Enum.NormalId.Right, "TIKTOK EXPRESS", Color3.fromRGB(0, 255, 230))
	Build.light(front, Color3.fromRGB(255, 255, 220), 40, 4)
	for _, part in model:GetChildren() do
		if part ~= body and part:IsA("BasePart") then
			local weld = Instance.new("WeldConstraint")
			weld.Part0 = body
			weld.Part1 = part
			weld.Parent = part
		end
	end
	model.Parent = folder
	return model
end

function Subway.build(): CFrame
	folder = Build.folder("Floor1_Subway")
	Build.room(folder, Vector3.new(0, Y - 4, 0), Vector3.new(WIDTH, HEIGHT, DEPTH), {
		FloorColor = Color3.fromRGB(35, 30, 30), WallColor = Color3.fromRGB(25, 25, 35), SkipWalls = { [3] = true, [4] = true },
	})
	buildTunnelWall(-1)
	buildTunnelWall(1)

	local platformDepth = DEPTH / 2 - TRENCH
	for _, side in { -1, 1 } do
		local z = side * (TRENCH + platformDepth / 2)
		Build.part({
			Name = "Platform", Parent = folder, Size = Vector3.new(WIDTH, 4, platformDepth),
			CFrame = CFrame.new(0, Y - 2, z), Color = Color3.fromRGB(70, 70, 80), Material = Enum.Material.Slate,
		})
		Build.part({
			Name = "EdgeStripe", Parent = folder, Size = Vector3.new(WIDTH, 0.2, 1.5),
			CFrame = CFrame.new(0, Y + 0.1, side * (TRENCH + 0.75)), Color = Color3.fromRGB(255, 220, 0), Material = Enum.Material.Neon,
			CanCollide = false,
		})
		-- Warning strips along the trench walls; they flash red before a train.
		local strip = Build.part({
			Name = "Warning", Parent = folder, Size = Vector3.new(WIDTH, 0.6, 0.3),
			CFrame = CFrame.new(0, Y - 1, side * (TRENCH - 0.2)), Color = Color3.fromRGB(40, 0, 0), Material = Enum.Material.Neon,
			CanCollide = false,
		})
		table.insert(warningLights, strip)
	end
	for _, z in { -5, 5 } do
		Build.part({
			Name = "Rail", Parent = folder, Size = Vector3.new(WIDTH + 170, 0.5, 0.6),
			CFrame = CFrame.new(0, Y - 3.75, z), Color = Color3.fromRGB(120, 110, 100), Material = Enum.Material.Metal,
		})
	end

	-- Ceiling neon tubes and graffiti.
	for i = 0, 5 do
		local tube = Build.part({
			Name = "NeonTube", Parent = folder, Size = Vector3.new(WIDTH - 20, 0.6, 0.6),
			CFrame = CFrame.new(0, Y + HEIGHT - 6, -75 + i * 30), Color = NEON[i % #NEON + 1], Material = Enum.Material.Neon,
			CanCollide = false,
		})
		Build.light(tube, tube.Color, 30, 1.2)
	end
	local rng = Random.new()
	for i, word in SLANG do
		local north = i % 2 == 0
		local z = if north then DEPTH / 2 - 0.6 else -DEPTH / 2 + 0.6
		local x = -WIDTH / 2 + 20 + ((i - 1) // 2) * (WIDTH - 40) / 5
		local poster = Build.part({
			Name = "Graffiti", Parent = folder, Size = Vector3.new(26, 9, 0.2),
			CFrame = CFrame.lookAt(Vector3.new(x, Y + 12 + rng:NextNumber(-3, 6), z), Vector3.new(x, Y + 12, 0))
				* CFrame.Angles(0, 0, math.rad(rng:NextNumber(-8, 8))),
			Transparency = 1, CanCollide = false,
		})
		Build.sign(poster, Enum.NormalId.Front, word, NEON[rng:NextInteger(1, #NEON)], Enum.Font.Bangers)
	end

	-- Turnstile spawns on the south platform.
	for _, x in { -30, 0, 30 } do
		local spawn = Build.part({
			ClassName = "SpawnLocation", Name = "Spawn", Parent = folder, Size = Vector3.new(8, 1, 8),
			CFrame = CFrame.new(x, Y + 0.5, -DEPTH / 2 + 18), Color = Color3.fromRGB(0, 230, 255), Material = Enum.Material.Neon,
			Neutral = true, Duration = 5,
		})
		for _, side in { -1, 1 } do
			Build.part({
				Name = "Turnstile", Parent = folder, Size = Vector3.new(0.8, 4, 6),
				CFrame = spawn.CFrame * CFrame.new(side * 4.6, 2, 0), Color = Color3.fromRGB(160, 160, 170), Material = Enum.Material.Metal,
			})
		end
	end

	local elevator = Build.elevator(folder, CFrame.new(0, Y + 0.5, DEPTH / 2 - 15))
	elevator:SetAttribute("Floor", 1)

	train = buildTrain()
	return CFrame.new(0, Y + 3, -DEPTH / 2 + 30)
end

local function runTrain()
	for _, strip in warningLights do
		strip.Color = Color3.fromRGB(255, 0, 0)
	end
	Comms.effectFloor(1, "TrainWarning", S.TrainWarning)
	Util.sound(Config.Sounds.TrainHorn, warningLights[1], 1)
	task.wait(S.TrainWarning)

	local direction = if math.random() < 0.5 then 1 else -1
	local startX = -direction * (WIDTH / 2 + 80 + TRAIN_LENGTH / 2)
	local endX = -startX
	local y = Y - 3.5 + TRAIN_HEIGHT / 2
	local x = startX
	local half = Vector3.new(TRAIN_LENGTH, TRAIN_HEIGHT, TRAIN_WIDTH) / 2 + Vector3.new(1, 1, 1)
	local rotation = if direction == 1 then CFrame.new() else CFrame.Angles(0, math.pi, 0)

	while (endX - x) * direction > 0 do
		local dt = RunService.Heartbeat:Wait()
		x += direction * S.TrainSpeed * dt
		local cf = CFrame.new(x, y, 0) * rotation
		train:PivotTo(cf)
		for _, target in Combat.targets() do
			if not CollectionService:HasTag(target.Model, "Boss") then
				local p = cf:PointToObjectSpace(target.Root.Position)
				if math.abs(p.X) < half.X and math.abs(p.Y) < half.Y and math.abs(p.Z) < half.Z then
					Combat.kill(target.Humanoid)
					if target.Player then
						Comms.notify(nil, target.Player.DisplayName .. " got hit by the TikTok Express", Color3.fromRGB(255, 80, 80))
					end
				end
			end
		end
	end
	train:PivotTo(CFrame.new(0, -1000, 0))
	for _, strip in warningLights do
		strip.Color = Color3.fromRGB(40, 0, 0)
	end
end

local function spawnNpc(kind: string)
	local north = math.random() < 0.6
	local z = (if north then 1 else -1) * math.random(TRENCH + 8, DEPTH / 2 - 12)
	local ground = Vector3.new(math.random(-WIDTH / 2 + 15, WIDTH / 2 - 15), Y, z)
	Npc.spawn({
		Kind = kind,
		Name = if kind == "Grunt" then Config.Names.Grunt else Config.Names.Streamer,
		Ground = ground,
		Floor = 1,
		Health = S.NpcHealth,
		Damage = S.NpcDamage,
		Speed = if kind == "Grunt" then 12 else 14,
		AttackCooldown = S.NpcAttackCooldown,
		AggroRange = S.NpcAggroRange,
		WanderRadius = 25,
		Parent = folder,
		OnDeath = function()
			task.delay(S.NpcRespawn, spawnNpc, kind)
		end,
	})
end

function Subway.start()
	for _ = 1, S.Grunts do
		spawnNpc("Grunt")
	end
	for _ = 1, S.Streamers do
		spawnNpc("Streamer")
	end
	task.spawn(function()
		while true do
			task.wait(math.random(S.TrainIntervalMin, S.TrainIntervalMax))
			runTrain()
		end
	end)
end

return Subway
