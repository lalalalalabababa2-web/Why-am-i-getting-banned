-- Everything the server can make happen on your screen: toasts, flashes, the deep-fried
-- celebration, hit markers, knockback, the boss pull, camera shake.

local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Net = require(Shared.Net)
local Util = require(Shared.Util)
local Ui = require(script.Parent.Ui)

local Effects = {}

local player = Players.LocalPlayer
local gui: ScreenGui
local toasts: Frame
local flash: Frame
local center: Frame
local shakeUntil, shakeStrength = 0, 0

local function root(): BasePart?
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

function Effects.toast(text: string, color: Color3?, big: boolean?)
	local label = Ui.label(text, {
		Size = UDim2.new(1, 0, 0, if big then 38 else 26),
		BackgroundTransparency = 0.25, BackgroundColor3 = Ui.Dark,
		TextColor3 = color or Color3.new(1, 1, 1), TextXAlignment = Enum.TextXAlignment.Left,
		LayoutOrder = math.floor(os.clock() * 1000), Parent = toasts,
	})
	Ui.corner(6).Parent = label
	Ui.pad(5).Parent = label
	local items = {}
	for _, child in toasts:GetChildren() do
		if child:IsA("TextLabel") then
			table.insert(items, child)
		end
	end
	if #items > 6 then
		table.sort(items, function(a, b)
			return a.LayoutOrder < b.LayoutOrder
		end)
		items[1]:Destroy()
	end
	task.delay(if big then 6 else 4, function()
		if label.Parent then
			Ui.tween(label, 0.4, { TextTransparency = 1, BackgroundTransparency = 1, TextStrokeTransparency = 1 })
			task.wait(0.45)
			label:Destroy()
		end
	end)
end

-- Big centered text that pops in and fades.
function Effects.pop(text: string, color: Color3, seconds: number, size: number?)
	local label = Ui.label(text, {
		AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.32),
		Size = UDim2.fromScale(0.6, (size or 0.08) * 0.5), TextColor3 = color, Font = Ui.Bold,
		TextStrokeTransparency = 0, Parent = center,
	})
	Ui.tween(label, 0.15, { Size = UDim2.fromScale(0.6, size or 0.08) }, Enum.EasingStyle.Back)
	task.delay(seconds, function()
		Ui.tween(label, 0.3, { TextTransparency = 1, TextStrokeTransparency = 1 })
		task.wait(0.35)
		label:Destroy()
	end)
end

function Effects.shake(strength: number, seconds: number?)
	shakeStrength = math.max(shakeStrength, strength)
	shakeUntil = math.max(shakeUntil, os.clock() + (seconds or 0.4))
end

function Effects.flash(seconds: number, color: Color3?)
	flash.BackgroundColor3 = color or Color3.new(1, 1, 1)
	flash.BackgroundTransparency = 0
	task.delay(seconds * 0.4, function()
		Ui.tween(flash, seconds * 0.6, { BackgroundTransparency = 1 })
	end)
end

local function deepFried(data: { Title: string, Subtitle: string })
	local cc = Ui.new("ColorCorrectionEffect", {
		Saturation = 2.5, Contrast = 0.9, Brightness = 0.1, TintColor = Color3.fromRGB(255, 200, 150), Parent = Lighting,
	})
	local bloom = Ui.new("BloomEffect", { Intensity = 3, Size = 40, Threshold = 0.6, Parent = Lighting })
	local camera = workspace.CurrentCamera
	local fov = camera.FieldOfView
	Ui.tween(camera, 0.12, { FieldOfView = fov + 25 })
	task.delay(0.15, function()
		Ui.tween(camera, 0.6, { FieldOfView = fov }, Enum.EasingStyle.Elastic)
	end)
	Effects.shake(1.2, 1)
	Util.sound(Config.Sounds.DeepFried, gui, 1)

	local overlay = Ui.new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Parent = center })
	local title = Ui.label(data.Title, {
		AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.4), Size = UDim2.fromScale(0.9, 0.18),
		Font = Enum.Font.LuckiestGuy, TextColor3 = Color3.fromRGB(255, 240, 0), TextStrokeTransparency = 0,
		TextStrokeColor3 = Color3.fromRGB(255, 0, 80), Parent = overlay,
	})
	Ui.label(data.Subtitle, {
		AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.53), Size = UDim2.fromScale(0.7, 0.06),
		TextColor3 = Color3.new(1, 1, 1), Parent = overlay,
	})
	Ui.label("📸 clip this one", {
		AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.62), Size = UDim2.fromScale(0.4, 0.04),
		TextColor3 = Ui.Cyan, Parent = overlay,
	})
	local rng = Random.new()
	for _ = 1, 10 do
		Ui.label(({ "💀", "🔥", "😭", "🗿", "💯", "😤" })[rng:NextInteger(1, 6)], {
			AnchorPoint = Vector2.new(0.5, 0.5), Rotation = rng:NextNumber(-30, 30),
			Position = UDim2.fromScale(rng:NextNumber(0.05, 0.95), rng:NextNumber(0.1, 0.9)),
			Size = UDim2.fromScale(0.08, 0.1), Parent = overlay,
		})
	end
	-- Flare: a soft white blob that sweeps across.
	local flare = Ui.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(-0.1, 0.3), Size = UDim2.fromScale(0.25, 0.4),
		BackgroundColor3 = Color3.fromRGB(255, 250, 220), BackgroundTransparency = 0.4, Parent = overlay,
	}, { Ui.corner(400), Ui.new("UIGradient", { Transparency = NumberSequence.new(0, 1) }) })
	Ui.tween(flare, 1.5, { Position = UDim2.fromScale(1.1, 0.5) })

	local started = os.clock()
	local connection = RunService.RenderStepped:Connect(function()
		local t = os.clock() - started
		title.Rotation = math.sin(t * 40) * 4
		title.Position = UDim2.fromScale(0.5 + math.sin(t * 33) * 0.01, 0.4 + math.cos(t * 29) * 0.01)
	end)
	task.delay(2.8, function()
		connection:Disconnect()
		overlay:Destroy()
		cc:Destroy()
		bloom:Destroy()
	end)
end

local function pull(data: { Center: Vector3, Speed: number, Time: number })
	Effects.pop("RUN. IT'S PULLING YOU IN", Color3.fromRGB(255, 60, 60), data.Time, 0.07)
	local endsAt = os.clock() + data.Time
	local connection
	connection = RunService.RenderStepped:Connect(function(dt)
		local r = root()
		if os.clock() > endsAt or not r then
			connection:Disconnect()
			return
		end
		local toward = (data.Center - r.Position) * Vector3.new(1, 0, 1)
		if toward.Magnitude > 1 then
			r.CFrame += toward.Unit * data.Speed * dt
		end
	end)
end

local handlers: { [string]: (any) -> () } = {
	Flash = function(seconds)
		Effects.flash(seconds)
	end,
	DeepFried = deepFried,
	Pull = pull,
	Impulse = function(velocity: Vector3)
		local r = root()
		if r then
			r.AssemblyLinearVelocity += velocity
		end
	end,
	Shake = function(strength)
		Effects.shake(strength)
	end,
	Hitmarker = function(damage)
		local mark = Ui.label("✕ " .. damage, {
			AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.53, 0.47), Size = UDim2.fromOffset(80, 24),
			TextColor3 = Color3.fromRGB(255, 80, 80), Font = Ui.Bold, Parent = center,
		})
		Ui.tween(mark, 0.5, { Position = UDim2.fromScale(0.55, 0.42), TextTransparency = 1, TextStrokeTransparency = 1 })
		task.delay(0.5, mark.Destroy, mark)
	end,
	CoinsDelta = function(amount)
		local gain = amount > 0
		local text = (if gain then "+" else "-") .. Util.formatNumber(math.abs(amount)) .. " " .. Config.Names.Coins
		local mark = Ui.label(text, {
			Position = UDim2.new(0, 230, 0, 70), Size = UDim2.fromOffset(200, 22),
			TextColor3 = if gain then Ui.Gold else Color3.fromRGB(255, 80, 80), TextXAlignment = Enum.TextXAlignment.Left,
			Parent = center,
		})
		Ui.tween(mark, 0.9, { Position = UDim2.new(0, 230, 0, 40), TextTransparency = 1, TextStrokeTransparency = 1 })
		task.delay(0.9, mark.Destroy, mark)
	end,
	Mogged = function(seconds)
		Effects.pop("YOU GOT MOGGED 🗿", Color3.fromRGB(120, 200, 255), seconds, 0.1)
		Effects.shake(0.5, seconds)
	end,
	Scream = function()
		Effects.flash(0.5, Color3.fromRGB(40, 90, 255))
		Effects.shake(1.5, 0.8)
		Effects.pop("IT SEES YOU", Color3.fromRGB(80, 160, 255), 1.5, 0.12)
	end,
	TrainWarning = function(seconds)
		Effects.pop("🚇 TRAIN INCOMING", Color3.fromRGB(255, 50, 50), seconds, 0.07)
	end,
	Blocked = function()
		Effects.pop("BLOCKED", Ui.Cyan, 0.3, 0.05)
	end,
	MewGood = function(streak)
		Effects.pop("MEW x" .. streak .. " 🤫", Ui.Cyan, 1.2, 0.07)
	end,
	MewBreak = function(streak)
		Effects.pop("MEW STREAK BROKEN (" .. streak .. ") 💔", Color3.fromRGB(255, 60, 60), 1.8, 0.08)
		Effects.shake(1, 0.5)
	end,
}

function Effects.start()
	gui = Ui.screen("SigmaFx", 10)
	center = Ui.new("Frame", { Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Parent = gui })
	flash = Ui.new("Frame", {
		Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 1, ZIndex = 20, Parent = gui,
	})
	toasts = Ui.new("Frame", {
		Position = UDim2.new(0, 16, 0.42, 0), Size = UDim2.new(0.32, 0, 0.36, 0), BackgroundTransparency = 1, Parent = gui,
	}, { Ui.new("UIListLayout", {
		Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Bottom,
	}) })

	Net.event("Notify").OnClientEvent:Connect(Effects.toast)
	Net.event("Effect").OnClientEvent:Connect(function(kind, data)
		local handler = handlers[kind]
		if handler then
			handler(data)
		end
	end)

	RunService.RenderStepped:Connect(function()
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if not humanoid then
			return
		end
		if os.clock() < shakeUntil then
			local s = shakeStrength
			humanoid.CameraOffset = Vector3.new(math.random() - 0.5, math.random() - 0.5, 0) * s
		elseif shakeStrength > 0 then
			shakeStrength = 0
			humanoid.CameraOffset = Vector3.zero
		end
	end)
end

return Effects
