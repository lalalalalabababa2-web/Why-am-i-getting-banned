-- Elevator pads open the floor picker; the server checks the unlock and the distance to a pad
-- before moving anyone.

local CollectionService = game:GetService("CollectionService")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Net = require(Shared.Net)
local Comms = require(script.Parent.Comms)
local Data = require(script.Parent.Data)

local Elevator = {}

local arrivals: { [number]: CFrame } = {}

function Elevator.setArrival(floor: number, cframe: CFrame)
	arrivals[floor] = cframe
end

local function nearPad(character: Model): boolean
	local position = character:GetPivot().Position
	for _, pad in CollectionService:GetTagged("Elevator") do
		if (pad.Position - position).Magnitude < 18 then
			return true
		end
	end
	return false
end

function Elevator.start()
	local open = Net.event("Elevator")
	for _, pad in CollectionService:GetTagged("Elevator") do
		local prompt = pad:FindFirstChildOfClass("ProximityPrompt") :: ProximityPrompt
		prompt.Triggered:Connect(function(player)
			-- Reaching the north platform is the whole tutorial, so it unlocks the Kitchen.
			if pad:GetAttribute("Floor") == 1 then
				Data.update(player, function(data)
					if data.HighestFloor < 4 then
						data.HighestFloor = 4
						Comms.notify(player, "Floor 4 unlocked", Color3.fromRGB(0, 255, 170), true)
					end
				end)
			end
			open:FireClient(player)
		end)
	end

	Net.event("ElevatorGo").OnServerEvent:Connect(function(player, floor)
		local data = Data.get(player)
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if typeof(floor) ~= "number" or not Config.Floors[floor] or not arrivals[floor] or not data then
			return
		end
		if not humanoid or humanoid.Health <= 0 or not nearPad(character :: Model) then
			return
		end
		if floor > data.HighestFloor then
			Comms.notify(player, "Locked. Clear the floor below first.", Color3.fromRGB(255, 100, 100))
			return
		end
		if humanoid.Sit then
			humanoid.Sit = false
		end
		(character :: Model):PivotTo(arrivals[floor])
	end)
end

return Elevator
