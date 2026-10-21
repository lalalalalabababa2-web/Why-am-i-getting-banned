-- Rewards with multipliers, passive income, friend bonus and the Most Sigma Squad board.

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Data = require(script.Parent.Data)
local Passes = require(script.Parent.Passes)

local Economy = {}

local E = Config.Economy

-- friends[a][b] = true, filled once per pair when someone joins
local friends: { [Player]: { [Player]: boolean } } = {}

function Economy.rizzMultiplier(player: Player): number
	local m = 1 + (player:GetAttribute("Rebirths") or 0) * E.RebirthMultStep
	if Passes.has(player, "GigaChad") then
		m *= 2
	end
	if (player:GetAttribute("BoostUntil") or 0) > os.time() then
		m *= 5
	end
	return m * (1 + (player:GetAttribute("FriendBonus") or 0) :: number)
end

function Economy.coinMultiplier(player: Player): number
	local m = 1 + (player:GetAttribute("Rebirths") or 0) * E.RebirthMultStep
	m *= 1 + (player:GetAttribute("FriendBonus") or 0) :: number
	return m * (workspace:GetAttribute("CoinEventMult") or 1) :: number
end

function Economy.reward(player: Player, coins: number, rizz: number)
	if coins > 0 then
		Data.add(player, "Coins", coins * Economy.coinMultiplier(player))
	end
	if rizz > 0 then
		Data.add(player, "Rizz", rizz * Economy.rizzMultiplier(player))
	end
end

-- Takes a cut of victim's coins and hands it to thief. Returns how much moved.
function Economy.steal(thief: Player, victim: Player, pct: number, minimum: number?): number
	local data = Data.get(victim)
	if not data or data.Coins <= 0 then
		return 0
	end
	local amount = math.min(data.Coins, math.max(minimum or 0, math.floor(data.Coins * pct)))
	Data.add(victim, "Coins", -amount)
	Data.add(thief, "Coins", amount)
	return amount
end

local function refreshFriendBonus()
	for _, player in Players:GetPlayers() do
		local count = 0
		for other in (friends[player] or {}) :: { [Player]: boolean } do
			if other.Parent then
				count += 1
			end
		end
		player:SetAttribute("FriendBonus", math.min(E.FriendBonusCap, count * E.FriendBonusPer))
	end
end

-- Friend groups (connected through friendships in this server) ranked by combined Rizz.
local function refreshSquads()
	local seen: { [Player]: boolean } = {}
	local squads = {}
	for _, player in Players:GetPlayers() do
		if not seen[player] then
			local members, total, queue = {}, 0, { player }
			seen[player] = true
			while #queue > 0 do
				local p = table.remove(queue) :: Player
				table.insert(members, p.DisplayName)
				total += p:GetAttribute("Rizz") or 0
				for other in (friends[p] or {}) :: { [Player]: boolean } do
					if other.Parent and not seen[other] then
						seen[other] = true
						table.insert(queue, other)
					end
				end
			end
			if #members > 1 then
				table.insert(squads, { Names = members, Rizz = total })
			end
		end
	end
	table.sort(squads, function(a, b)
		return a.Rizz > b.Rizz
	end)
	while #squads > 3 do
		table.remove(squads)
	end
	workspace:SetAttribute("Squads", HttpService:JSONEncode(squads))
end

function Economy.start()
	Players.PlayerAdded:Connect(function(player)
		friends[player] = {}
		for _, other in Players:GetPlayers() do
			if other ~= player then
				local ok, isFriend = pcall(player.IsFriendsWith, player, other.UserId)
				if ok and isFriend then
					friends[player][other] = true
					friends[other] = friends[other] or {}
					friends[other][player] = true
				end
			end
		end
		refreshFriendBonus()
	end)
	Players.PlayerRemoving:Connect(function(player)
		friends[player] = nil
		for _, set in friends do
			set[player] = nil
		end
		refreshFriendBonus()
	end)

	task.spawn(function()
		local tick = 0
		while true do
			task.wait(1)
			tick += 1
			for _, player in Players:GetPlayers() do
				if Data.get(player) then
					Economy.reward(player, E.PassiveCoins, E.PassiveRizz)
					player:SetAttribute("RizzMult", Economy.rizzMultiplier(player))
					player:SetAttribute("CoinMult", Economy.coinMultiplier(player))
				end
			end
			if tick % 10 == 0 then
				refreshSquads()
			end
		end
	end)
end

return Economy
