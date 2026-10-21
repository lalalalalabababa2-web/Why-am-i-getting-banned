-- Weapon purchases, rebirths, the daily streak and the soundboard pass.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Net = require(Shared.Net)
local Util = require(Shared.Util)
local Comms = require(script.Parent.Comms)
local Data = require(script.Parent.Data)
local Passes = require(script.Parent.Passes)
local Weapons = require(script.Parent.Weapons)

local Shop = {}

local lastSound: { [Player]: number } = {}

local function today(): number
	return os.time() // 86400
end

-- Which day of the streak the next claim is, and whether it's claimable right now.
local function dailyState(data: { [string]: any }): (number, boolean)
	local day = today()
	if data.LastClaimDay >= day then
		return data.LoginStreak, false
	elseif data.LastClaimDay == day - 1 then
		return data.LoginStreak % #Config.Daily + 1, true
	end
	return 1, true
end

local function publishDaily(player: Player)
	local data = Data.get(player)
	if data then
		local nextDay, claimable = dailyState(data)
		player:SetAttribute("DailyDay", nextDay)
		player:SetAttribute("DailyClaimable", claimable)
	end
end

function Shop.start()
	Players.PlayerAdded:Connect(function(player)
		if Data.wait(player) then
			publishDaily(player)
		end
	end)
	for _, player in Players:GetPlayers() do
		task.spawn(function()
			if Data.wait(player) then
				publishDaily(player)
			end
		end)
	end
	Players.PlayerRemoving:Connect(function(player)
		lastSound[player] = nil
	end)

	Net.func("BuyWeapon").OnServerInvoke = function(player, id)
		local data = Data.get(player)
		local weapon = typeof(id) == "string" and Config.Weapons[id]
		if not data or not weapon then
			return false, "Unknown weapon"
		end
		if data.Owned[id] then
			return false, "Already yours"
		end
		if data.Rizz < weapon.Price then
			return false, "Need " .. Util.formatNumber(weapon.Price - data.Rizz) .. " more Rizz"
		end
		Data.update(player, function(d)
			d.Rizz -= weapon.Price
			d.Owned[id] = true
		end)
		Weapons.giveTool(player, id)
		return true, "Unlocked " .. weapon.Name
	end

	Net.func("Rebirth").OnServerInvoke = function(player)
		local data = Data.get(player)
		if not data then
			return false, "Still loading"
		end
		local cost = Config.Economy.RebirthBaseCost * (data.Rebirths + 1)
		if data.Rizz < cost then
			return false, "Need " .. Util.formatNumber(cost) .. " Rizz"
		end
		Data.update(player, function(d)
			d.Rizz = 0
			d.Coins = 0
			d.Rebirths += 1
		end)
		Comms.notify(nil, player.DisplayName .. " rebirthed as a bigger meme (x" .. data.Rebirths .. ")", Color3.fromRGB(255, 120, 255), true)
		player:LoadCharacter()
		return true, "Reborn"
	end

	Net.func("ClaimDaily").OnServerInvoke = function(player)
		local data = Data.get(player)
		if not data then
			return false, "Still loading"
		end
		local day, claimable = dailyState(data)
		if not claimable then
			return false, "Come back tomorrow"
		end
		local reward = Config.Daily[day]
		Data.update(player, function(d)
			d.LoginStreak = day
			d.LastClaimDay = today()
			d.Coins += reward.Coins or 0
			d.Rizz += reward.Rizz or 0
			if reward.Skin then
				d.Skins[reward.Skin] = true
			end
			if reward.Aura then
				d.Aura = true
			end
			if reward.BoostMinutes then
				d.BoostUntil = math.max(d.BoostUntil, os.time()) + reward.BoostMinutes * 60
			end
		end)
		publishDaily(player)
		return true, "Day " .. day .. " claimed"
	end

	Net.event("PlaySound").OnServerEvent:Connect(function(player, index)
		local entry = typeof(index) == "number" and Config.Sounds.Soundboard[index]
		local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if not entry or not root or not Passes.has(player, "Soundboard") then
			return
		end
		if os.clock() - (lastSound[player] or 0) < 1.5 then
			return
		end
		lastSound[player] = os.clock()
		Util.sound(entry.Id, root, 1)
	end)
end

return Shop
