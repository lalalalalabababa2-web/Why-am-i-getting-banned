-- Game pass ownership, published as Pass_<Key> attributes on the player.

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)

local Passes = {}

function Passes.has(player: Player, key: string): boolean
	return player:GetAttribute("Pass_" .. key) == true
end

local function check(player: Player)
	for key, pass in Config.GamePasses do
		local owned = false
		if RunService:IsStudio() and Config.Debug.GrantAllPasses then
			owned = true
		elseif pass.Id ~= 0 then
			local ok, result = pcall(MarketplaceService.UserOwnsGamePassAsync, MarketplaceService, player.UserId, pass.Id)
			owned = ok and result
		end
		player:SetAttribute("Pass_" .. key, owned)
	end
end

function Passes.start()
	Players.PlayerAdded:Connect(check)
	for _, player in Players:GetPlayers() do
		task.spawn(check, player)
	end
	MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, purchased)
		if not purchased then
			return
		end
		for key, pass in Config.GamePasses do
			if pass.Id == passId then
				player:SetAttribute("Pass_" .. key, true)
			end
		end
	end)
end

return Passes
