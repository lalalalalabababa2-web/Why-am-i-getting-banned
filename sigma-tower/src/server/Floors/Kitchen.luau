-- Floor 4. A fast-food kitchen at 300% scale with the boss in the middle. Dealing at least 1%
-- of its health when it dies unlocks Floor 7 for you.

local Players = game:GetService("Players")

local server = script.Parent.Parent
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Boss = require(server.Boss)
local Build = require(server.Build)
local Comms = require(server.Comms)
local Data = require(server.Data)

local Kitchen = {}

local K = Config.Kitchen
local Y = Config.Floors[4].BaseY
local SIZE, HEIGHT = 260, 80

local folder: Folder

local function cylinder(name: string, size: Vector3, position: Vector3, color: Color3, material: Enum.Material?)
	-- Cylinders run along X, so stand them up.
	return Build.part({
		Name = name, Parent = folder, Shape = Enum.PartType.Cylinder, Size = Vector3.new(size.Y, size.X, size.Z),
		CFrame = CFrame.new(position) * CFrame.Angles(0, 0, math.rad(90)), Color = color,
		Material = material or Enum.Material.SmoothPlastic,
	})
end

local function burger(at: Vector3)
	local layers = {
		{ 4, Color3.fromRGB(215, 150, 70) },
		{ 3, Color3.fromRGB(110, 60, 30) },
		{ 1.2, Color3.fromRGB(255, 200, 0) },
		{ 1.5, Color3.fromRGB(90, 200, 70) },
		{ 5, Color3.fromRGB(225, 160, 75) },
	}
	local y = at.Y
	for i, layer in layers do
		local width = if i == 3 or i == 4 then 34 else 30
		cylinder("Burger", Vector3.new(width, layer[1], width), Vector3.new(at.X, y + layer[1] / 2, at.Z), layer[2])
		y += layer[1]
	end
end

local function fries(at: Vector3)
	Build.part({
		Name = "FriesBox", Parent = folder, Size = Vector3.new(18, 22, 12), CFrame = CFrame.new(at + Vector3.new(0, 11, 0)),
		Color = Color3.fromRGB(220, 30, 30),
	})
	local rng = Random.new(4)
	for _ = 1, 14 do
		Build.part({
			Name = "Fry", Parent = folder, Size = Vector3.new(1.6, 14, 1.6),
			CFrame = CFrame.new(at + Vector3.new(rng:NextNumber(-7, 7), 26, rng:NextNumber(-4, 4)))
				* CFrame.Angles(rng:NextNumber(-0.25, 0.25), 0, rng:NextNumber(-0.25, 0.25)),
			Color = Color3.fromRGB(255, 210, 80),
		})
	end
end

local function soda(at: Vector3)
	cylinder("Cup", Vector3.new(16, 30, 16), at + Vector3.new(0, 15, 0), Color3.fromRGB(150, 70, 220))
	cylinder("Lid", Vector3.new(17, 1, 17), at + Vector3.new(0, 30.5, 0), Color3.new(1, 1, 1))
	Build.part({
		Name = "Straw", Parent = folder, Size = Vector3.new(1.2, 16, 1.2),
		CFrame = CFrame.new(at + Vector3.new(2, 37, 0)) * CFrame.Angles(0, 0, math.rad(-12)), Color = Color3.fromRGB(255, 255, 255),
	})
end

function Kitchen.build(): CFrame
	folder = Build.folder("Floor4_Kitchen")
	Build.room(folder, Vector3.new(0, Y, 0), Vector3.new(SIZE, HEIGHT, SIZE), {
		FloorColor = Color3.fromRGB(240, 240, 240), WallColor = Color3.fromRGB(250, 220, 120), WallMaterial = Enum.Material.SmoothPlastic,
	})
	-- Checkerboard tiles.
	local tile = 20
	for i = 0, SIZE / tile - 1 do
		for j = 0, SIZE / tile - 1 do
			if (i + j) % 2 == 0 then
				Build.part({
					Name = "Tile", Parent = folder, Size = Vector3.new(tile, 0.1, tile),
					CFrame = CFrame.new(-SIZE / 2 + tile / 2 + i * tile, Y + 0.05, -SIZE / 2 + tile / 2 + j * tile),
					Color = Color3.fromRGB(200, 30, 40), CanCollide = false,
				})
			end
		end
	end

	-- A table you can climb onto, which matters when the boss is pulling.
	local tableTop = Build.part({
		Name = "TableTop", Parent = folder, Size = Vector3.new(60, 3, 36), CFrame = CFrame.new(-80, Y + 14, 70),
		Color = Color3.fromRGB(130, 85, 50), Material = Enum.Material.Wood,
	})
	for _, dx in { -27, 27 } do
		for _, dz in { -15, 15 } do
			Build.part({
				Name = "TableLeg", Parent = folder, Size = Vector3.new(3, 12.5, 3),
				CFrame = tableTop.CFrame * CFrame.new(dx, -7.75, dz), Color = Color3.fromRGB(100, 65, 40), Material = Enum.Material.Wood,
			})
		end
	end
	burger(Vector3.new(85, Y, -70))
	fries(Vector3.new(90, Y, 70))
	soda(Vector3.new(-90, Y, -75))

	-- Menu boards and lights.
	for i, line in { "BIG BACK MENU", "WAFFLE SLAM .... 35 DMG", "GRAVITY PULL .... INSTANT DEATH" } do
		local board = Build.part({
			Name = "Menu", Parent = folder, Size = Vector3.new(70, 8, 0.4),
			CFrame = CFrame.new(0, Y + HEIGHT - 10 - (i - 1) * 9, SIZE / 2 - 0.5), Color = Color3.fromRGB(20, 20, 20),
		})
		Build.sign(board, Enum.NormalId.Front, line, Color3.fromRGB(255, 220, 0), Enum.Font.LuckiestGuy)
	end
	for _, x in { -80, 0, 80 } do
		for _, z in { -80, 0, 80 } do
			local lamp = Build.part({
				Name = "Lamp", Parent = folder, Size = Vector3.new(8, 1, 8), CFrame = CFrame.new(x, Y + HEIGHT - 1, z),
				Color = Color3.fromRGB(255, 250, 230), Material = Enum.Material.Neon, CanCollide = false,
			})
			Build.light(lamp, Color3.fromRGB(255, 240, 210), 60, 1.5)
		end
	end

	local elevator = Build.elevator(folder, CFrame.new(0, Y + 0.5, SIZE / 2 - 14))
	elevator:SetAttribute("Floor", 4)
	return CFrame.new(0, Y + 3, -SIZE / 2 + 15)
end

local function spawnBoss()
	local playersHere = math.max(1, #Comms.playersOnFloor(4))
	Boss.spawn({
		Name = Config.Names.Boss,
		Ground = Vector3.new(0, Y, 0),
		Floor = 4,
		MaxHealth = K.BaseHealth + K.HealthPerPlayer * playersHere,
		Enrage = true,
		Reward = Config.Economy.BossKill,
		Parent = folder,
		OnDefeated = function(contributors)
			for _, player in contributors do
				Data.update(player, function(data)
					if data.HighestFloor < 7 then
						data.HighestFloor = 7
						Comms.notify(player, "Floor 7 unlocked. Take the elevator.", Color3.fromRGB(0, 255, 170), true)
					end
				end)
			end
			for _, player in Players:GetPlayers() do
				Comms.notify(player, Config.Names.Boss .. " respawns in " .. K.Respawn .. "s", Color3.fromRGB(255, 200, 120))
			end
			task.delay(K.Respawn, spawnBoss)
		end,
	})
end

function Kitchen.start()
	spawnBoss()
end

return Kitchen
