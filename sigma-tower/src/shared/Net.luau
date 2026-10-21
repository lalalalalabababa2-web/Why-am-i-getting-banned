-- One place that names every remote. The server creates them, the client waits for them.

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local EVENTS = {
	"UseWeapon", -- C→S (weaponId, "primary"|"special", aim)
	"SetBlock", -- C→S (bool)
	"SetSprint", -- C→S (bool)
	"Dash", -- C→S ()
	"FanumTax", -- C→S ()
	"MewPrompt", -- S→C (promptId, holdTime, window)
	"MewResult", -- C→S (promptId, success)
	"Elevator", -- S→C () open the floor picker
	"ElevatorGo", -- C→S (floor)
	"Notify", -- S→C (text, color?, big?)
	"Effect", -- S→C (kind, data)
	"PlaySound", -- C→S (soundboard index)
}

local FUNCTIONS = {
	"BuyWeapon", -- (weaponId) -> ok, message
	"Rebirth", -- () -> ok, message
	"ClaimDaily", -- () -> ok, message
}

local Net = {}

local folder: Folder
if RunService:IsServer() then
	folder = Instance.new("Folder")
	folder.Name = "Remotes"
	for _, name in EVENTS do
		local remote = Instance.new("RemoteEvent")
		remote.Name = name
		remote.Parent = folder
	end
	for _, name in FUNCTIONS do
		local remote = Instance.new("RemoteFunction")
		remote.Name = name
		remote.Parent = folder
	end
	folder.Parent = ReplicatedStorage
else
	folder = ReplicatedStorage:WaitForChild("Remotes") :: Folder
end

function Net.event(name: string): RemoteEvent
	return folder:WaitForChild(name) :: RemoteEvent
end

function Net.func(name: string): RemoteFunction
	return folder:WaitForChild(name) :: RemoteFunction
end

return Net
