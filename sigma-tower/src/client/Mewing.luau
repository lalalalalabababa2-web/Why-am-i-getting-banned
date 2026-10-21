-- The "MEW NOW" quick-time prompt: hold M (or the touch button) until the bar fills.

local ContextActionService = game:GetService("ContextActionService")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local Ui = require(script.Parent.Ui)

local Mewing = {}

local ACTION = "SigmaMew"

function Mewing.start()
	local gui = Ui.screen("SigmaMew", 4)
	local frame = Ui.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.62), Size = UDim2.fromOffset(320, 96),
		BackgroundColor3 = Ui.Dark, BackgroundTransparency = 0.1, Visible = false, Parent = gui,
	}, { Ui.corner(14), Ui.stroke(Ui.Cyan, 3) })
	local title = Ui.label("🤫 MEW NOW! hold M", {
		Position = UDim2.fromOffset(10, 8), Size = UDim2.new(1, -20, 0, 34), Font = Enum.Font.LuckiestGuy,
		TextColor3 = Ui.Cyan, Parent = frame,
	})
	local barBack = Ui.new("Frame", {
		Position = UDim2.fromOffset(14, 50), Size = UDim2.new(1, -28, 0, 16), BackgroundColor3 = Color3.fromRGB(40, 40, 60),
		Parent = frame,
	}, { Ui.corner(8) })
	local bar = Ui.new("Frame", {
		Size = UDim2.fromScale(0, 1), BackgroundColor3 = Ui.Cyan, Parent = barBack,
	}, { Ui.corner(8) })
	local timer = Ui.new("Frame", {
		Position = UDim2.fromOffset(14, 74), Size = UDim2.new(1, -28, 0, 6), BackgroundColor3 = Ui.Accent, Parent = frame,
	}, { Ui.corner(3) })

	local activeId: number? = nil
	local held = false
	local progress = 0
	local holdTime, deadline, window = 1, 0, 1
	local result = Net.event("MewResult")

	local function finish(success: boolean)
		if activeId then
			result:FireServer(activeId, success)
		end
		activeId = nil
		held = false
		frame.Visible = false
		ContextActionService:UnbindAction(ACTION)
	end

	local function onAction(_, state: Enum.UserInputState)
		if state == Enum.UserInputState.Begin then
			held = true
		elseif state == Enum.UserInputState.End or state == Enum.UserInputState.Cancel then
			held = false
		end
		return Enum.ContextActionResult.Sink
	end

	Net.event("MewPrompt").OnClientEvent:Connect(function(id, hold, windowSeconds)
		activeId = id
		holdTime, window = hold, windowSeconds
		deadline = os.clock() + windowSeconds
		progress = 0
		held = false
		frame.Visible = true
		title.Text = "🤫 MEW NOW! hold M"
		ContextActionService:BindAction(ACTION, onAction, true, Enum.KeyCode.M, Enum.KeyCode.ButtonR1)
		ContextActionService:SetTitle(ACTION, "MEW")
		ContextActionService:SetPosition(ACTION, UDim2.new(0.5, -35, 0.62, 60))
	end)

	RunService.Heartbeat:Connect(function(dt)
		if not activeId then
			return
		end
		if held then
			progress += dt / holdTime
		else
			progress = math.max(0, progress - dt / holdTime * 2)
		end
		bar.Size = UDim2.fromScale(math.clamp(progress, 0, 1), 1)
		timer.Size = UDim2.new(math.clamp((deadline - os.clock()) / window, 0, 1), -28, 0, 6)
		if progress >= 1 then
			finish(true)
		elseif os.clock() > deadline then
			finish(false)
		end
	end)
end

return Mewing
