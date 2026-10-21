-- Random "MEW NOW" prompts. Hold the key long enough inside the window and the streak grows
-- (more speed, bigger aura, more Rizz); miss one and it all resets.
-- The server checks the hold took at least as long as it should have, so a client can't
-- answer the instant the prompt arrives.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Net = require(Shared.Net)
local Util = require(Shared.Util)
local Comms = require(script.Parent.Comms)
local Economy = require(script.Parent.Economy)

local Mewing = {}

local M = Config.Mewing
local pending: { [Player]: { Id: number, At: number } } = {}
local nextId = 0

local function setStreak(player: Player, streak: number)
	player:SetAttribute("MewStreak", streak)
	local stats = player:FindFirstChild("leaderstats")
	local value = stats and stats:FindFirstChild(Config.Names.Mew) :: IntValue?
	if value then
		value.Value = streak
	end
end

local function fail(player: Player)
	pending[player] = nil
	if (player:GetAttribute("MewStreak") or 0) > 0 then
		Comms.effect(player, "MewBreak", player:GetAttribute("MewStreak"))
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if root then
			Util.sound(Config.Sounds.MewBreak, root, 1)
		end
	end
	setStreak(player, 0)
end

local function loop(player: Player)
	while player.Parent do
		task.wait(math.random(M.IntervalMin, M.IntervalMax))
		local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
		if player.Parent and humanoid and humanoid.Health > 0 then
			nextId += 1
			local id = nextId
			pending[player] = { Id = id, At = os.clock() }
			Net.event("MewPrompt"):FireClient(player, id, M.HoldTime, M.Window)
			task.wait(M.Window + 1.5)
			if pending[player] and pending[player].Id == id then
				fail(player)
			end
		end
	end
end

function Mewing.start()
	Players.PlayerAdded:Connect(function(player)
		setStreak(player, 0)
		task.spawn(loop, player)
	end)
	for _, player in Players:GetPlayers() do
		setStreak(player, 0)
		task.spawn(loop, player)
	end
	Players.PlayerRemoving:Connect(function(player)
		pending[player] = nil
	end)

	Net.event("MewResult").OnServerEvent:Connect(function(player, id, success)
		local p = pending[player]
		if not p or p.Id ~= id then
			return
		end
		local elapsed = os.clock() - p.At
		if success == true and elapsed >= M.HoldTime * 0.8 and elapsed <= M.Window + 1 then
			pending[player] = nil
			local streak = (player:GetAttribute("MewStreak") or 0) + 1
			setStreak(player, streak)
			Economy.reward(player, 0, M.RizzPerStreak * streak)
			Comms.effect(player, "MewGood", streak)
		else
			fail(player)
		end
	end)
end

return Mewing
