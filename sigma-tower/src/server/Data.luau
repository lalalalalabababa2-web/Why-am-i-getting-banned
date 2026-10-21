-- Player saves. Everything persistent goes through here; everything else is session state.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)

local STORE_NAME = "SigmaTower_v1"
local AUTOSAVE = 90

local Data = {}

local profiles: { [Player]: { [string]: any } } = {}
local canSave: { [Player]: boolean } = {}
local loadedSignals: { [Player]: BindableEvent } = {}
local store: DataStore? = nil

local function defaults()
	return {
		Coins = 0,
		Rizz = 0,
		Rebirths = 0,
		Owned = { Slap = true },
		HighestFloor = 1,
		LoginStreak = 0,
		LastClaimDay = 0,
		Skins = {},
		Aura = false,
		BoostUntil = 0,
	}
end

local function reconcile(saved: { [string]: any })
	local data = defaults()
	for key, value in saved do
		if data[key] ~= nil and typeof(data[key]) == typeof(value) then
			data[key] = value
		end
	end
	return data
end

local function retry(fn: () -> any): (boolean, any)
	-- Studio without API access fails every time, so don't make the playtest wait on it.
	local attempts = if RunService:IsStudio() then 1 else 3
	local ok, result
	for attempt = 1, attempts do
		ok, result = pcall(fn)
		if ok then
			return true, result
		end
		if attempt < attempts then
			task.wait(attempt)
		end
	end
	return false, result
end

-- Mirrors save fields onto leaderstats and player attributes so every client can read them.
local function publish(player: Player)
	local data = profiles[player]
	if not data then
		return
	end
	local stats = player:FindFirstChild("leaderstats")
	if stats then
		(stats :: any)[Config.Names.Coins].Value = data.Coins;
		(stats :: any)[Config.Names.Rizz].Value = data.Rizz
	end
	local owned = {}
	for id in data.Owned do
		table.insert(owned, id)
	end
	player:SetAttribute("Coins", data.Coins)
	player:SetAttribute("Rizz", data.Rizz)
	player:SetAttribute("Rebirths", data.Rebirths)
	player:SetAttribute("Owned", table.concat(owned, ","))
	player:SetAttribute("HighestFloor", data.HighestFloor)
	player:SetAttribute("Aura", data.Aura)
	player:SetAttribute("BoostUntil", data.BoostUntil)
	player:SetAttribute("GoldVacuum", data.Skins.GoldVacuum == true)
end

local function makeLeaderstats(player: Player)
	local stats = Instance.new("Folder")
	stats.Name = "leaderstats"
	for _, name in { Config.Names.Coins, Config.Names.Rizz, Config.Names.Mew } do
		local value = Instance.new("IntValue")
		value.Name = name
		value.Parent = stats
	end
	stats.Parent = player
end

local function save(player: Player)
	local data = profiles[player]
	if not data or not canSave[player] or not store then
		return
	end
	local ok, err = retry(function()
		return (store :: DataStore):UpdateAsync("u" .. player.UserId, function()
			return data
		end)
	end)
	if not ok then
		warn("[Data] save failed for", player.Name, err)
	end
end

local function load(player: Player)
	makeLeaderstats(player)
	local data
	if store then
		local ok, saved = retry(function()
			return (store :: DataStore):GetAsync("u" .. player.UserId)
		end)
		if ok then
			data = reconcile(saved or {})
			canSave[player] = true
		elseif RunService:IsStudio() then
			data = defaults()
		else
			-- Saving defaults over a save we couldn't read would wipe it.
			player:Kick("Your save didn't load. Rejoin in a moment.")
			return
		end
	else
		data = defaults()
	end
	if RunService:IsStudio() then
		data.Rizz = math.max(data.Rizz, Config.Debug.StartRizz)
		data.Coins = math.max(data.Coins, Config.Debug.StartCoins)
	end
	if player.Parent == nil then
		return
	end
	profiles[player] = data
	publish(player)
	if loadedSignals[player] then
		loadedSignals[player]:Fire()
	end
end

function Data.get(player: Player): { [string]: any }?
	return profiles[player]
end

-- Yields until the player's save is in memory. Returns nil if they left first.
function Data.wait(player: Player): { [string]: any }?
	while not profiles[player] and player.Parent do
		local signal = loadedSignals[player]
		if not signal then
			return nil
		end
		signal.Event:Wait()
	end
	return profiles[player]
end

-- Raw change, no multipliers. Clamps at zero.
function Data.add(player: Player, key: string, amount: number)
	local data = profiles[player]
	if not data then
		return
	end
	data[key] = math.max(0, math.floor(data[key] + amount))
	publish(player)
end

-- Arbitrary edit of the save table, then republish.
function Data.update(player: Player, fn: (data: { [string]: any }) -> ())
	local data = profiles[player]
	if not data then
		return
	end
	fn(data)
	publish(player)
end

function Data.start()
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(STORE_NAME)
	end)
	if ok then
		store = result
	else
		warn("[Data] DataStores unavailable, progress won't save:", result)
	end

	local function onJoin(player: Player)
		loadedSignals[player] = Instance.new("BindableEvent")
		load(player)
	end
	Players.PlayerAdded:Connect(onJoin)
	for _, player in Players:GetPlayers() do
		task.spawn(onJoin, player)
	end

	Players.PlayerRemoving:Connect(function(player)
		save(player)
		profiles[player] = nil
		canSave[player] = nil
		if loadedSignals[player] then
			loadedSignals[player]:Fire() -- wakes anyone still in Data.wait
			loadedSignals[player]:Destroy()
			loadedSignals[player] = nil
		end
	end)

	game:BindToClose(function()
		local pending = 0
		for player in profiles do
			pending += 1
			task.spawn(function()
				save(player)
				pending -= 1
			end)
		end
		local deadline = os.clock() + 25
		while pending > 0 and os.clock() < deadline do
			task.wait(0.1)
		end
	end)

	task.spawn(function()
		while true do
			task.wait(AUTOSAVE)
			for player in profiles do
				task.spawn(save, player)
			end
		end
	end)
end

return Data
