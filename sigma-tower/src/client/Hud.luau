-- Always-on screen info: currencies, floor, event timer, throne holder, boss health,
-- squad board, ability cooldowns and the menu buttons.

local CollectionService = game:GetService("CollectionService")
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Util = require(Shared.Util)
local Ui = require(script.Parent.Ui)

local Hud = {}

local player = Players.LocalPlayer
local gui: ScreenGui
local chips: { [string]: { Frame: Frame, Shade: Frame, Timer: TextLabel, Name: TextLabel, EndsAt: number, Length: number } } = {}
local buttons: Frame

local function clock(seconds: number): string
	seconds = math.max(0, math.floor(seconds))
	return string.format("%d:%02d", seconds // 60, seconds % 60)
end

-- Marks key as cooling down for `length` seconds from now.
function Hud.cooldown(key: string, length: number)
	local chip = chips[key]
	if chip then
		chip.EndsAt = os.clock() + length
		chip.Length = length
	end
end

function Hud.cooldownLeft(key: string): number
	local chip = chips[key]
	return if chip then math.max(0, chip.EndsAt - os.clock()) else 0
end

function Hud.setChip(key: string, name: string?)
	local chip = chips[key]
	if chip then
		chip.Frame.Visible = name ~= nil
		chip.Name.Text = name or ""
	end
end

function Hud.addButton(text: string, color: Color3, onClick: () -> (), order: number): TextButton
	local button = Ui.button(text, color, { Size = UDim2.new(1, 0, 0, 44), LayoutOrder = order, Parent = buttons })
	button.Activated:Connect(onClick)
	return button
end

local function makeChip(parent: Frame, key: string, order: number)
	local frame = Ui.new("Frame", {
		Size = UDim2.fromOffset(84, 58), BackgroundColor3 = Ui.Dark, BackgroundTransparency = 0.15, LayoutOrder = order,
		Parent = parent,
	}, { Ui.corner(8), Ui.stroke(Ui.Accent, 2) })
	Ui.label(key, {
		Position = UDim2.fromOffset(4, 2), Size = UDim2.fromOffset(22, 20), TextColor3 = Ui.Gold, Font = Ui.Bold, Parent = frame,
	})
	local name = Ui.label("", { Position = UDim2.new(0, 4, 0, 24), Size = UDim2.new(1, -8, 0, 28), Parent = frame })
	local shade = Ui.new("Frame", {
		Size = UDim2.fromScale(1, 0), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.35, ZIndex = 2, Parent = frame,
	}, { Ui.corner(8) })
	local timer = Ui.label("", {
		Size = UDim2.fromScale(1, 1), ZIndex = 3, Font = Ui.Bold, TextColor3 = Color3.new(1, 1, 1), Parent = frame,
	})
	chips[key] = { Frame = frame, Shade = shade, Timer = timer, Name = name, EndsAt = 0, Length = 1 }
end

function Hud.start()
	gui = Ui.screen("SigmaHud", 1)

	-- Stats, top left under the Roblox top bar.
	local stats = Ui.new("Frame", {
		Position = UDim2.fromOffset(16, 64), Size = UDim2.fromOffset(220, 120), BackgroundColor3 = Ui.Dark,
		BackgroundTransparency = 0.2, Parent = gui,
	}, { Ui.corner(12), Ui.stroke(Ui.Accent, 2), Ui.pad(8), Ui.list(nil, 2) })
	local coins = Ui.label("", { Size = UDim2.new(1, 0, 0, 26), TextColor3 = Ui.Gold, TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = 1, Parent = stats })
	local rizz = Ui.label("", { Size = UDim2.new(1, 0, 0, 26), TextColor3 = Ui.Accent, TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = 2, Parent = stats })
	local mult = Ui.label("", { Size = UDim2.new(1, 0, 0, 18), TextColor3 = Color3.fromRGB(200, 200, 220), TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = 3, Parent = stats })
	local floorLabel = Ui.label("", { Size = UDim2.new(1, 0, 0, 22), TextColor3 = Ui.Cyan, TextXAlignment = Enum.TextXAlignment.Left, LayoutOrder = 4, Parent = stats })

	-- Event banner, throne line and boss bar stack in the top middle.
	local top = Ui.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0), Position = UDim2.new(0.5, 0, 0, 60), Size = UDim2.fromOffset(420, 140),
		BackgroundTransparency = 1, Parent = gui,
	}, { Ui.list(nil, 4, Enum.HorizontalAlignment.Center) })
	local banner = Ui.label("", {
		Size = UDim2.new(1, 0, 0, 30), BackgroundTransparency = 0.2, BackgroundColor3 = Color3.fromRGB(110, 20, 160),
		Font = Ui.Bold, LayoutOrder = 1, Parent = top,
	})
	Ui.corner(8).Parent = banner
	Ui.pad(4).Parent = banner
	local throne = Ui.label("", { Size = UDim2.new(1, 0, 0, 22), TextColor3 = Ui.Gold, LayoutOrder = 2, Parent = top })
	local bossFrame = Ui.new("Frame", {
		Size = UDim2.new(1, 0, 0, 40), BackgroundTransparency = 1, LayoutOrder = 3, Visible = false, Parent = top,
	})
	local bossName = Ui.label("", { Size = UDim2.new(1, 0, 0, 18), TextColor3 = Color3.fromRGB(255, 120, 80), Parent = bossFrame })
	local bossBack = Ui.new("Frame", {
		Position = UDim2.fromOffset(0, 20), Size = UDim2.new(1, 0, 0, 16), BackgroundColor3 = Color3.fromRGB(40, 10, 10), Parent = bossFrame,
	}, { Ui.corner(6), Ui.stroke(Color3.new(0, 0, 0), 2) })
	local bossFill = Ui.new("Frame", {
		Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(255, 60, 40), Parent = bossBack,
	}, { Ui.corner(6) })

	-- Most Sigma Squad, right side under the player list.
	local squads = Ui.label("", {
		AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -16, 0.42, 0), Size = UDim2.fromOffset(200, 90),
		BackgroundTransparency = 0.25, BackgroundColor3 = Ui.Dark, TextScaled = false, TextSize = 14,
		TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, TextWrapped = true,
		Visible = false, Parent = gui,
	})
	Ui.corner(8).Parent = squads
	Ui.pad(6).Parent = squads

	-- Cooldown chips above the hotbar.
	local chipRow = Ui.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 1), Position = UDim2.new(0.5, 0, 1, -96), Size = UDim2.fromOffset(380, 58),
		BackgroundTransparency = 1, Parent = gui,
	}, { Ui.list(Enum.FillDirection.Horizontal, 8, Enum.HorizontalAlignment.Center) })
	makeChip(chipRow, "E", 1)
	makeChip(chipRow, "F", 2)
	makeChip(chipRow, "Q", 3)
	Hud.setChip("E", nil)
	Hud.setChip("F", "Fanum Tax")
	Hud.setChip("Q", "Dash")

	buttons = Ui.new("Frame", {
		AnchorPoint = Vector2.new(1, 0), Position = UDim2.new(1, -16, 0.62, 0), Size = UDim2.fromOffset(130, 220),
		BackgroundTransparency = 1, Parent = gui,
	}, { Ui.list(nil, 6) })

	local tick = 0
	RunService.Heartbeat:Connect(function(dt)
		local now = os.clock()
		for _, chip in chips do
			local left = chip.EndsAt - now
			if left > 0 then
				chip.Shade.Size = UDim2.fromScale(1, left / chip.Length)
				chip.Timer.Text = string.format("%.1f", left)
			else
				chip.Shade.Size = UDim2.fromScale(1, 0)
				chip.Timer.Text = ""
			end
		end

		tick += dt
		if tick < 0.2 then
			return
		end
		tick = 0

		coins.Text = "💰 " .. Util.formatNumber(player:GetAttribute("Coins") or 0)
		rizz.Text = "😎 " .. Util.formatNumber(player:GetAttribute("Rizz") or 0) .. " " .. Config.Names.Rizz
		mult.Text = string.format("x%.2f rizz · x%.2f coins · %d rebirths",
			player:GetAttribute("RizzMult") or 1, player:GetAttribute("CoinMult") or 1, player:GetAttribute("Rebirths") or 0)

		local character = player.Character
		local rootPart = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		local floor = if rootPart then Util.floorAt(rootPart.Position.Y) else 1
		floorLabel.Text = "Floor " .. floor .. ": " .. Config.Floors[floor].Name

		local serverNow = workspace:GetServerTimeNow()
		if (workspace:GetAttribute("EventName") or "") ~= "" then
			banner.Text = "🔥 " .. workspace:GetAttribute("EventTitle") .. " · " .. workspace:GetAttribute("EventBlurb")
				.. " · " .. clock((workspace:GetAttribute("EventEndsAt") or 0) - serverNow)
			banner.BackgroundColor3 = Color3.fromRGB(160, 30, 200)
		else
			banner.Text = "Next: " .. (workspace:GetAttribute("NextEventTitle") or "?") .. " in "
				.. clock((workspace:GetAttribute("NextEventAt") or 0) - serverNow)
			banner.BackgroundColor3 = Color3.fromRGB(50, 30, 70)
		end

		local holder = workspace:GetAttribute("ThroneHolder") or ""
		throne.Text = if holder ~= "" then "👑 " .. holder .. " is on the " .. Config.Names.Throne else ""
		throne.Visible = holder ~= ""

		local boss = nil
		for _, model in CollectionService:GetTagged("Boss") do
			if model:GetAttribute("Floor") == floor then
				boss = model
			end
		end
		local bossHumanoid = boss and boss:FindFirstChildOfClass("Humanoid")
		bossFrame.Visible = bossHumanoid ~= nil and bossHumanoid.Health > 0
		if bossHumanoid then
			bossName.Text = bossHumanoid.DisplayName .. "  " .. Util.formatNumber(bossHumanoid.Health) .. " / "
				.. Util.formatNumber(bossHumanoid.MaxHealth)
			bossFill.Size = UDim2.fromScale(math.clamp(bossHumanoid.Health / bossHumanoid.MaxHealth, 0, 1), 1)
		end

		local ok, list = pcall(HttpService.JSONDecode, HttpService, workspace:GetAttribute("Squads") or "[]")
		if ok and #list > 0 then
			local lines = { "MOST SIGMA SQUAD" }
			for i, squad in list do
				table.insert(lines, i .. ". " .. table.concat(squad.Names, ", ") .. "  (" .. Util.formatNumber(squad.Rizz) .. ")")
			end
			squads.Text = table.concat(lines, "\n")
			squads.Visible = true
		else
			squads.Visible = false
		end
	end)
end

return Hud
