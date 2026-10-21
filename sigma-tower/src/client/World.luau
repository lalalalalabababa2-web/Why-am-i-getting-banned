-- Local-only atmosphere: fog and tint per floor, Grimace Hour purple, flickering backrooms
-- lights, and hiding the shakes you already grabbed. None of this touches the server.

local CollectionService = game:GetService("CollectionService")
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Util = require(Shared.Util)

local World = {}

local player = Players.LocalPlayer

local MOODS = {
	[1] = { FogEnd = 100000, FogColor = Color3.new(0, 0, 0), Tint = Color3.fromRGB(255, 240, 255), Ambient = Color3.fromRGB(90, 80, 120) },
	[4] = { FogEnd = 100000, FogColor = Color3.new(1, 1, 1), Tint = Color3.fromRGB(255, 250, 235), Ambient = Color3.fromRGB(140, 130, 120) },
	[7] = { FogEnd = 55, FogColor = Color3.fromRGB(120, 110, 50), Tint = Color3.fromRGB(255, 245, 190), Ambient = Color3.fromRGB(110, 100, 60) },
	[10] = { FogEnd = 100000, FogColor = Color3.new(0, 0, 0), Tint = Color3.fromRGB(240, 245, 255), Ambient = Color3.fromRGB(110, 110, 140) },
}

function World.start()
	local cc = Instance.new("ColorCorrectionEffect")
	cc.Name = "FloorMood"
	cc.Parent = Lighting
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.6
	bloom.Size = 30
	bloom.Threshold = 0.9
	bloom.Parent = Lighting

	local function hideCollected()
		local got = string.split(player:GetAttribute("Shakes") or "", ",")
		for _, shake in CollectionService:GetTagged("Shake") do
			local mine = table.find(got, tostring(shake:GetAttribute("ShakeId"))) ~= nil
			shake.LocalTransparencyModifier = if mine then 1 else 0
			local prompt = shake:FindFirstChildOfClass("ProximityPrompt")
			if prompt then
				prompt.Enabled = not mine
			end
			local light = shake:FindFirstChildOfClass("PointLight")
			if light then
				light.Enabled = not mine
			end
		end
	end
	player:GetAttributeChangedSignal("Shakes"):Connect(hideCollected)
	CollectionService:GetInstanceAddedSignal("Shake"):Connect(hideCollected)
	hideCollected()

	local accumulator = 0
	RunService.Heartbeat:Connect(function(dt)
		accumulator += dt
		if accumulator < 0.25 then
			return
		end
		accumulator = 0

		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		local floor = if root then Util.floorAt(root.Position.Y) else 1
		local mood = MOODS[floor]
		local grimace = workspace:GetAttribute("EventName") == "GrimaceHour"
		Lighting.FogStart = if floor == 7 then 4 else 0
		Lighting.FogEnd = if grimace and floor ~= 7 then 260 else mood.FogEnd
		Lighting.FogColor = if grimace then Color3.fromRGB(110, 40, 170) else mood.FogColor
		Lighting.Ambient = mood.Ambient
		cc.TintColor = if grimace then Color3.fromRGB(225, 190, 255) else mood.Tint
		cc.Saturation = if grimace then 0.4 else 0.15

		if floor == 7 then
			for _, light in CollectionService:GetTagged("FlickerLight") do
				local on = math.random() > 0.08
				light.Transparency = if on then 0 else 0.8
				local point = light:FindFirstChildOfClass("PointLight")
				if point then
					point.Enabled = on
				end
			end
		end
	end)
end

return World
