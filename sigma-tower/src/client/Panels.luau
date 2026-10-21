-- Popup menus: shop, daily streak, elevator floor picker, soundboard.

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local SocialService = game:GetService("SocialService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Net = require(Shared.Net)
local Util = require(Shared.Util)
local Effects = require(script.Parent.Effects)
local Hud = require(script.Parent.Hud)
local Ui = require(script.Parent.Ui)

local Panels = {}

local player = Players.LocalPlayer
local gui: ScreenGui
local panels: { [string]: { Frame: Frame, Refresh: () -> () } } = {}
local openName: string? = nil

function Panels.close()
	if openName then
		panels[openName].Frame.Visible = false
		openName = nil
	end
end

function Panels.open(name: string)
	Panels.close()
	local panel = panels[name]
	panel.Refresh()
	panel.Frame.Visible = true
	openName = name
end

function Panels.toggle(name: string)
	if openName == name then
		Panels.close()
	else
		Panels.open(name)
	end
end

-- A centered window with a title and a scrolling body. `refresh` rebuilds the body.
local function makePanel(name: string, title: string, refresh: (body: ScrollingFrame) -> ())
	local frame = Ui.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5), Size = UDim2.new(0.9, 0, 0.75, 0),
		BackgroundColor3 = Ui.Panel, Visible = false, Parent = gui,
	}, {
		Ui.corner(16), Ui.stroke(Ui.Accent, 3),
		Ui.new("UISizeConstraint", { MaxSize = Vector2.new(560, 520) }),
	})
	Ui.label(title, {
		Position = UDim2.fromOffset(16, 10), Size = UDim2.new(1, -80, 0, 36), Font = Enum.Font.LuckiestGuy,
		TextColor3 = Ui.Gold, TextXAlignment = Enum.TextXAlignment.Left, Parent = frame,
	})
	local close = Ui.button("X", Color3.fromRGB(200, 40, 60), {
		AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -10, 0, 10), Size = UDim2.fromOffset(36, 36), Parent = frame,
	})
	close.Activated:Connect(Panels.close)
	local body = Ui.new("ScrollingFrame", {
		Position = UDim2.fromOffset(12, 56), Size = UDim2.new(1, -24, 1, -68), BackgroundTransparency = 1,
		CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y, ScrollBarThickness = 6, Parent = frame,
	})
	panels[name] = {
		Frame = frame,
		Refresh = function()
			for _, child in body:GetChildren() do
				if not child:IsA("UIListLayout") then
					child:Destroy()
				end
			end
			if not body:FindFirstChildOfClass("UIListLayout") then
				Ui.list(nil, 8).Parent = body
			end
			refresh(body)
		end,
	}
end

-- One row: text on the left, a button on the right.
local function row(body: Instance, order: number, title: string, subtitle: string, buttonText: string?, color: Color3?, onClick: (() -> ())?)
	local frame = Ui.new("Frame", {
		Size = UDim2.new(1, -8, 0, 64), BackgroundColor3 = Ui.Dark, LayoutOrder = order, Parent = body,
	}, { Ui.corner(10) })
	Ui.label(title, {
		Position = UDim2.fromOffset(10, 6), Size = UDim2.new(1, -140, 0, 24), TextXAlignment = Enum.TextXAlignment.Left,
		Parent = frame,
	})
	Ui.label(subtitle, {
		Position = UDim2.fromOffset(10, 32), Size = UDim2.new(1, -140, 0, 26), TextXAlignment = Enum.TextXAlignment.Left,
		TextColor3 = Color3.fromRGB(190, 190, 210), Font = Enum.Font.Gotham, TextStrokeTransparency = 1, TextWrapped = true,
		Parent = frame,
	})
	if buttonText then
		local button = Ui.button(buttonText, color or Ui.Accent, {
			AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -10, 0.5, 0), Size = UDim2.fromOffset(118, 42), Parent = frame,
		})
		if onClick then
			button.Activated:Connect(onClick)
		else
			button.AutoButtonColor = false
		end
	end
end

local function shop(body: ScrollingFrame)
	local owned = string.split(player:GetAttribute("Owned") or "", ",")
	local rizz = player:GetAttribute("Rizz") or 0
	local ids = {}
	for id in Config.Weapons do
		table.insert(ids, id)
	end
	table.sort(ids, function(a, b)
		return Config.Weapons[a].Order < Config.Weapons[b].Order
	end)
	for i, id in ids do
		local w = Config.Weapons[id]
		if table.find(owned, id) then
			row(body, i, w.Name, w.Blurb, "OWNED", Color3.fromRGB(60, 60, 80))
		else
			row(body, i, w.Name, w.Blurb, Util.formatNumber(w.Price) .. " Rizz", if rizz >= w.Price then Ui.Green else Color3.fromRGB(120, 60, 60),
				function()
					local ok, message = Net.func("BuyWeapon"):InvokeServer(id)
					Effects.toast(message, if ok then Ui.Green else Color3.fromRGB(255, 100, 100), ok)
					Panels.open("Shop")
				end)
		end
	end

	local rebirths = player:GetAttribute("Rebirths") or 0
	local cost = Config.Economy.RebirthBaseCost * (rebirths + 1)
	row(body, 50, "Rebirth as a Bigger Meme",
		string.format("Resets coins and Rizz. +%.1fx multiplier and a bigger body forever.", Config.Economy.RebirthMultStep),
		Util.formatNumber(cost) .. " Rizz", Color3.fromRGB(200, 60, 255), function()
			local ok, message = Net.func("Rebirth"):InvokeServer()
			Effects.toast(message, if ok then Ui.Green else Color3.fromRGB(255, 100, 100), ok)
			Panels.close()
		end)

	local order = 100
	for key, pass in Config.GamePasses do
		order += 1
		local has = player:GetAttribute("Pass_" .. key)
		row(body, order, pass.Name, if has then "Owned" else "Game pass", if has then "OWNED" else "R$ " .. pass.Price,
			if has then Color3.fromRGB(60, 60, 80) else Ui.Gold, if has then nil else function()
				if pass.Id == 0 then
					Effects.toast("This pass isn't set up yet (Config.GamePasses)", Color3.fromRGB(255, 180, 80))
				else
					MarketplaceService:PromptGamePassPurchase(player, pass.Id)
				end
			end)
	end
end

local function daily(body: ScrollingFrame)
	local current = player:GetAttribute("DailyDay") or 1
	local claimable = player:GetAttribute("DailyClaimable") == true
	for day, reward in Config.Daily do
		local text = reward.Label
			or (if reward.Coins then Util.formatNumber(reward.Coins) .. " " .. Config.Names.Coins
				else Util.formatNumber(reward.Rizz or 0) .. " " .. Config.Names.Rizz)
		local isToday = day == current
		local buttonText = if isToday and claimable then "CLAIM" elseif day < current or (isToday and not claimable) then "✓" else nil
		row(body, day, "Day " .. day, text, buttonText, if isToday and claimable then Ui.Green else Color3.fromRGB(60, 60, 80),
			if isToday and claimable then function()
				local ok, message = Net.func("ClaimDaily"):InvokeServer()
				Effects.toast(message, if ok then Ui.Green else Color3.fromRGB(255, 100, 100), ok)
				Panels.open("Daily")
			end else nil)
	end
end

local function elevator(body: ScrollingFrame)
	local highest = player:GetAttribute("HighestFloor") or 1
	local hints = { [4] = "Reach the north platform on Floor 1", [7] = "Help kill " .. Config.Names.Boss, [10] = "Find all " .. Config.Backrooms.Shakes .. " shakes in the Backrooms" }
	for i, floor in Config.FloorOrder do
		local unlocked = floor <= highest
		row(body, i, "Floor " .. floor .. ": " .. Config.Floors[floor].Name,
			if unlocked then (if Config.Floors[floor].PvP then "PvP on" else "PvE only") else "Locked: " .. (hints[floor] or ""),
			if unlocked then "GO" else "LOCKED", if unlocked then Ui.Cyan else Color3.fromRGB(80, 50, 50),
			if unlocked then function()
				Net.event("ElevatorGo"):FireServer(floor)
				Panels.close()
			end else nil)
	end
end

local function soundboard(body: ScrollingFrame)
	for i, entry in Config.Sounds.Soundboard do
		if entry.Id ~= "" then
			row(body, i, entry.Name, "Everyone nearby hears it", "PLAY", Ui.Accent, function()
				Net.event("PlaySound"):FireServer(i)
			end)
		end
	end
end

local function invite()
	local ok, canInvite = pcall(SocialService.CanSendGameInviteAsync, SocialService, player)
	if ok and canInvite then
		SocialService:PromptGameInvite(player)
	else
		Effects.toast("Invites aren't available here", Color3.fromRGB(255, 180, 80))
	end
end

function Panels.start()
	gui = Ui.screen("SigmaPanels", 5)
	makePanel("Shop", "SIGMA SHOP", shop)
	makePanel("Daily", "SKIBIDI DAILY STREAK", daily)
	makePanel("Elevator", "ELEVATOR", elevator)
	makePanel("Soundboard", "SOUNDBOARD", soundboard)

	Hud.addButton("🛒 Shop", Ui.Accent, function()
		Panels.toggle("Shop")
	end, 1)
	local dailyButton = Hud.addButton("🎁 Daily", Color3.fromRGB(60, 160, 90), function()
		Panels.toggle("Daily")
	end, 2)
	Hud.addButton("👥 Invite (+25%)", Color3.fromRGB(40, 120, 220), invite, 3)
	local soundButton = Hud.addButton("🔊 Sounds", Color3.fromRGB(200, 120, 30), function()
		Panels.toggle("Soundboard")
	end, 4)

	local function refreshButtons()
		local hasSounds = false
		for _, entry in Config.Sounds.Soundboard do
			hasSounds = hasSounds or entry.Id ~= ""
		end
		soundButton.Visible = player:GetAttribute("Pass_Soundboard") == true and hasSounds
		dailyButton.Text = if player:GetAttribute("DailyClaimable") then "🎁 Daily (!)" else "🎁 Daily"
	end
	player.AttributeChanged:Connect(function(name)
		refreshButtons()
		-- Not on every Rizz tick: rebuilding the rows each second would eat clicks.
		if openName == "Shop" and (name == "Owned" or name == "Rebirths") then
			panels.Shop.Refresh()
		end
	end)
	refreshButtons()

	Net.event("Elevator").OnClientEvent:Connect(function()
		Panels.open("Elevator")
	end)

	-- Pop the daily streak on join if there's something to claim.
	task.spawn(function()
		for _ = 1, 20 do
			if player:GetAttribute("DailyClaimable") ~= nil then
				break
			end
			task.wait(0.5)
		end
		if player:GetAttribute("DailyClaimable") then
			Panels.open("Daily")
		end
	end)
end

return Panels
