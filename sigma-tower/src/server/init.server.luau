-- Brainrot Battleground: Sigma Tower, server entry point.
-- Builds the whole tower from code, then starts every service. Nothing is placed by hand.

local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")

local Build = require(script.Build)
local Data = require(script.Data)
local Passes = require(script.Passes)
local Economy = require(script.Economy)
local Combat = require(script.Combat)
local Movement = require(script.Movement)
local Weapons = require(script.Weapons)
local Boss = require(script.Boss)
local Elevator = require(script.Elevator)
local Events = require(script.Events)
local Mewing = require(script.Mewing)
local Shop = require(script.Shop)

local Floors = {
	[1] = require(script.Floors.Subway),
	[4] = require(script.Floors.Kitchen),
	[7] = require(script.Floors.Backrooms),
	[10] = require(script.Floors.Penthouse),
}

-- A template place's baseplate and spawn would sit right inside Floor 1.
for _, name in { "Baseplate", "SpawnLocation" } do
	local leftover = workspace:FindFirstChild(name)
	if leftover then
		leftover:Destroy()
	end
end

-- An Atmosphere overrides fog, and the client uses fog per floor.
for _, child in Lighting:GetChildren() do
	if child:IsA("Atmosphere") then
		child:Destroy()
	end
end
Lighting.ClockTime = 20
Lighting.Brightness = 1.5
Lighting.Ambient = Color3.fromRGB(90, 90, 110)
Lighting.OutdoorAmbient = Color3.fromRGB(90, 90, 110)
Lighting.FogEnd = 100000
Players.RespawnTime = 3

for floor, module in Floors do
	Elevator.setArrival(floor, module.build())
end

Data.start()
Passes.start()
Economy.start()
Combat.start()
Movement.start()
Weapons.start()
Boss.start()
Elevator.start()
Events.start()
Mewing.start()
Shop.start()
for _, module in Floors do
	module.start()
end

print("[SigmaTower] tower built, " .. #Build.Map:GetDescendants() .. " instances")
