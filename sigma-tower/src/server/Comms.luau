-- Server → client toasts and screen effects.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage").Shared
local Net = require(Shared.Net)
local Util = require(Shared.Util)

local Comms = {}

local notify = Net.event("Notify")
local effect = Net.event("Effect")

-- player = nil sends to everyone.
function Comms.notify(player: Player?, text: string, color: Color3?, big: boolean?)
	if player then
		notify:FireClient(player, text, color, big)
	else
		notify:FireAllClients(text, color, big)
	end
end

function Comms.effect(player: Player, kind: string, data: any?)
	effect:FireClient(player, kind, data)
end

function Comms.playersOnFloor(floor: number): { Player }
	local list = {}
	for _, player in Players:GetPlayers() do
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if root and humanoid and humanoid.Health > 0 and Util.floorAt(root.Position.Y) == floor then
			table.insert(list, player)
		end
	end
	return list
end

function Comms.effectFloor(floor: number, kind: string, data: any?)
	for _, player in Comms.playersOnFloor(floor) do
		effect:FireClient(player, kind, data)
	end
end

return Comms
