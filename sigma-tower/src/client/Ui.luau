-- Tiny helpers so the UI can be written as nested tables instead of 400 lines of property sets.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Ui = {}

Ui.Font = Enum.Font.FredokaOne
Ui.Bold = Enum.Font.GothamBlack
Ui.Dark = Color3.fromRGB(18, 16, 28)
Ui.Panel = Color3.fromRGB(32, 28, 48)
Ui.Accent = Color3.fromRGB(255, 70, 200)
Ui.Cyan = Color3.fromRGB(0, 230, 255)
Ui.Gold = Color3.fromRGB(255, 205, 50)
Ui.Green = Color3.fromRGB(80, 255, 140)

-- Ui.new("Frame", { Size = ..., Parent = ... }, { child, child })
function Ui.new(className: string, props: { [string]: any }?, children: { Instance }?): any
	local instance = Instance.new(className)
	local parent = nil
	if props then
		for key, value in props do
			if key == "Parent" then
				parent = value
			else
				(instance :: any)[key] = value
			end
		end
	end
	if children then
		for _, child in children do
			child.Parent = instance
		end
	end
	if parent then
		instance.Parent = parent
	end
	return instance
end

function Ui.corner(radius: number?): UICorner
	return Ui.new("UICorner", { CornerRadius = UDim.new(0, radius or 10) })
end

function Ui.stroke(color: Color3?, thickness: number?): UIStroke
	return Ui.new("UIStroke", {
		Color = color or Color3.new(0, 0, 0), Thickness = thickness or 2,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	})
end

function Ui.pad(px: number): UIPadding
	local u = UDim.new(0, px)
	return Ui.new("UIPadding", { PaddingTop = u, PaddingBottom = u, PaddingLeft = u, PaddingRight = u })
end

function Ui.list(direction: Enum.FillDirection?, gap: number?, align: Enum.HorizontalAlignment?): UIListLayout
	return Ui.new("UIListLayout", {
		FillDirection = direction or Enum.FillDirection.Vertical,
		Padding = UDim.new(0, gap or 6),
		SortOrder = Enum.SortOrder.LayoutOrder,
		HorizontalAlignment = align or Enum.HorizontalAlignment.Left,
	})
end

function Ui.label(text: string, props: { [string]: any }?): TextLabel
	local base = {
		BackgroundTransparency = 1, Text = text, Font = Ui.Font, TextColor3 = Color3.new(1, 1, 1),
		TextScaled = true, TextStrokeTransparency = 0.4,
	}
	for key, value in (props or {}) :: { [string]: any } do
		base[key] = value
	end
	return Ui.new("TextLabel", base)
end

function Ui.button(text: string, color: Color3, props: { [string]: any }?): TextButton
	local base = {
		BackgroundColor3 = color, Text = text, Font = Ui.Font, TextColor3 = Color3.new(1, 1, 1),
		TextScaled = true, TextStrokeTransparency = 0.5, AutoButtonColor = true,
	}
	for key, value in (props or {}) :: { [string]: any } do
		base[key] = value
	end
	return Ui.new("TextButton", base, { Ui.corner(8), Ui.stroke(Color3.new(0, 0, 0), 2), Ui.pad(4) })
end

function Ui.screen(name: string, order: number?): ScreenGui
	return Ui.new("ScreenGui", {
		Name = name, ResetOnSpawn = false, IgnoreGuiInset = true, DisplayOrder = order or 0,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
end

function Ui.tween(instance: Instance, seconds: number, props: { [string]: any }, style: Enum.EasingStyle?)
	local tween = TweenService:Create(instance, TweenInfo.new(seconds, style or Enum.EasingStyle.Quad, Enum.EasingDirection.Out), props)
	tween:Play()
	return tween
end

return Ui
