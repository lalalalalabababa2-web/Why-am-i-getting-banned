-- Floor 10. King of the hill: whoever sits in the Streamer Chair farms Rizz and the whole
-- server hears about it.

local Players = game:GetService("Players")

local server = script.Parent.Parent
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Util = require(Shared.Util)
local Build = require(server.Build)
local Comms = require(server.Comms)
local Economy = require(server.Economy)

local Penthouse = {}

local Y = Config.Floors[10].BaseY
local SIZE, HEIGHT = 180, 50

local folder: Folder
local seat: Seat
local liveLabel: TextLabel

function Penthouse.build(): CFrame
	folder = Build.folder("Floor10_Penthouse")
	Build.room(folder, Vector3.new(0, Y, 0), Vector3.new(SIZE, HEIGHT, SIZE), {
		FloorColor = Color3.fromRGB(235, 235, 240), FloorMaterial = Enum.Material.Marble,
		WallColor = Color3.fromRGB(150, 200, 255), WallMaterial = Enum.Material.Glass, WallTransparency = 0.55,
		CeilingColor = Color3.fromRGB(20, 20, 30),
	})

	-- LED wall.
	local led = Build.part({
		Name = "LedWall", Parent = folder, Size = Vector3.new(90, 34, 1), CFrame = CFrame.new(0, Y + 22, SIZE / 2 - 1),
		Color = Color3.fromRGB(10, 10, 15),
	})
	liveLabel = Build.sign(led, Enum.NormalId.Front, "● LIVE\nchair is empty", Color3.fromRGB(255, 60, 90), Enum.Font.LuckiestGuy)
	for i = 0, 8 do
		local strip = Build.part({
			Name = "LedStrip", Parent = folder, Size = Vector3.new(SIZE - 10, 0.4, 0.4),
			CFrame = CFrame.new(0, Y + HEIGHT - 1, -SIZE / 2 + 10 + i * 20),
			Color = Color3.fromHSV(i / 9, 1, 1), Material = Enum.Material.Neon, CanCollide = false,
		})
		Build.light(strip, strip.Color, 28, 1)
	end

	-- Stream desk with the setup that started it all.
	local desk = Build.part({
		Name = "Desk", Parent = folder, Size = Vector3.new(24, 1, 8), CFrame = CFrame.new(-55, Y + 4, 60),
		Color = Color3.fromRGB(25, 25, 30),
	})
	for _, dx in { -7, 0, 7 } do
		local monitor = Build.part({
			Name = "Monitor", Parent = folder, Size = Vector3.new(6, 4, 0.3), CFrame = desk.CFrame * CFrame.new(dx, 3, 2.5),
			Color = Color3.fromRGB(10, 10, 10),
		})
		Build.sign(monitor, Enum.NormalId.Front, "CHAT: W W W", Color3.fromRGB(0, 255, 120))
	end
	for _, dx in { -10, 10 } do
		Build.part({
			Name = "DeskLeg", Parent = folder, Size = Vector3.new(1, 3.5, 7), CFrame = desk.CFrame * CFrame.new(dx, -2.25, 0),
			Color = Color3.fromRGB(40, 40, 45),
		})
	end

	-- Dais and throne in the middle.
	Build.part({
		Name = "Dais", Parent = folder, Shape = Enum.PartType.Cylinder, Size = Vector3.new(3, 30, 30),
		CFrame = CFrame.new(0, Y + 1.5, 0) * CFrame.Angles(0, 0, math.rad(90)), Color = Color3.fromRGB(40, 20, 60),
		Material = Enum.Material.Marble,
	})
	Build.part({
		Name = "DaisRing", Parent = folder, Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.3, 31, 31),
		CFrame = CFrame.new(0, Y + 3, 0) * CFrame.Angles(0, 0, math.rad(90)), Color = Color3.fromRGB(255, 200, 40),
		Material = Enum.Material.Neon, CanCollide = false,
	})
	seat = Build.part({
		ClassName = "Seat", Name = Config.Names.Throne, Parent = folder, Size = Vector3.new(5, 1.2, 5),
		CFrame = CFrame.new(0, Y + 3.6, 0), Color = Color3.fromRGB(255, 200, 40), Material = Enum.Material.Metal,
	}) :: Seat
	local back = Build.part({
		Name = "ThroneBack", Parent = folder, Size = Vector3.new(5, 8, 1), CFrame = seat.CFrame * CFrame.new(0, 4.5, 2.6),
		Color = Color3.fromRGB(255, 200, 40), Material = Enum.Material.Metal,
	})
	Build.sign(back, Enum.NormalId.Back, "SIGMA", Color3.fromRGB(120, 40, 0), Enum.Font.LuckiestGuy)
	for _, side in { -1, 1 } do
		Build.part({
			Name = "ThroneArm", Parent = folder, Size = Vector3.new(1, 2, 5), CFrame = seat.CFrame * CFrame.new(side * 3, 1, 0),
			Color = Color3.fromRGB(255, 200, 40), Material = Enum.Material.Metal,
		})
	end
	Build.light(back, Color3.fromRGB(255, 210, 80), 30, 3)

	local elevator = Build.elevator(folder, CFrame.new(SIZE / 2 - 14, Y + 0.5, 0) * CFrame.Angles(0, math.rad(90), 0))
	elevator:SetAttribute("Floor", 10)
	return CFrame.new(0, Y + 3, -SIZE / 2 + 15)
end

function Penthouse.start()
	local holder: Player? = nil
	local heldFor = 0
	task.spawn(function()
		while true do
			task.wait(1)
			local occupant = seat.Occupant
			local player = occupant and Players:GetPlayerFromCharacter(occupant.Parent)
			if player ~= holder then
				holder = player
				heldFor = 0
				if player then
					Comms.notify(nil, "👑 " .. player.DisplayName .. " took the " .. Config.Names.Throne .. "!", Color3.fromRGB(255, 210, 60), true)
					Util.sound(Config.Sounds.Throne, seat, 1)
				end
				workspace:SetAttribute("ThroneHolder", if player then player.DisplayName else "")
			end
			if holder then
				heldFor += 1
				Economy.reward(holder, 0, Config.Economy.ThroneRizzPerSecond)
				liveLabel.Text = "● LIVE: " .. holder.DisplayName .. "\n" .. heldFor .. "s on the chair"
			else
				liveLabel.Text = "● LIVE\nchair is empty"
			end
		end
	end)
end

return Penthouse
