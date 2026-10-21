-- NPC bodies built from parts. A Humanoid only needs a root part, a head and a hip height to
-- walk and show a health bar, so the "body" is whatever silly shape gets welded on.

local Rigs = {}

export type Rig = { Model: Model, Humanoid: Humanoid, Root: BasePart }

local function weldPart(model: Model, root: BasePart, props: { [string]: any }, offset: CFrame): BasePart
	local part = Instance.new(props.ClassName or "Part") :: BasePart
	part.Anchored = false
	part.CanCollide = false
	part.Massless = true
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Material = Enum.Material.SmoothPlastic
	for key, value in props do
		if key ~= "ClassName" then
			(part :: any)[key] = value
		end
	end
	part.CFrame = root.CFrame * offset
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = root
	weld.Part1 = part
	weld.Parent = part
	part.Parent = model
	return part
end

local function badge(head: BasePart, text: string, color: Color3)
	local gui = Instance.new("BillboardGui")
	gui.Size = UDim2.fromOffset(90, 26)
	gui.StudsOffsetWorldSpace = Vector3.new(0, head.Size.Y + 1.5, 0)
	gui.MaxDistance = 90
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundColor3 = color
	label.TextColor3 = Color3.new(1, 1, 1)
	label.Font = Enum.Font.GothamBlack
	label.TextScaled = true
	label.Text = text
	label.Parent = gui
	gui.Parent = head
end

-- kind: "Grunt" | "Streamer" | "Boss". `ground` is the point the feet stand on.
function Rigs.npc(kind: string, name: string, ground: Vector3, scale: number, health: number, parent: Instance): Rig
	local model = Instance.new("Model")
	model.Name = name

	local rootSize = Vector3.new(2, 2, 1) * scale
	local hip = 2 * scale
	local root = Instance.new("Part")
	root.Name = "HumanoidRootPart"
	root.Size = rootSize
	root.Transparency = 1
	root.CFrame = CFrame.new(ground + Vector3.new(0, hip + rootSize.Y / 2, 0))
	root.Parent = model
	model.PrimaryPart = root

	local head
	if kind == "Grunt" then
		weldPart(model, root, {
			Name = "Bowl", Shape = Enum.PartType.Cylinder, Size = Vector3.new(2.4, 3, 3) * scale,
			Color = Color3.fromRGB(245, 245, 250),
		}, CFrame.new(0, -0.6 * scale, 0) * CFrame.Angles(0, 0, math.rad(90)))
		weldPart(model, root, {
			Name = "Tank", Size = Vector3.new(3, 3, 1) * scale, Color = Color3.fromRGB(235, 235, 240),
		}, CFrame.new(0, 0.6 * scale, 1.4 * scale))
		head = weldPart(model, root, {
			Name = "Head", Shape = Enum.PartType.Ball, Size = Vector3.one * 2 * scale, Color = Color3.fromRGB(255, 205, 160),
		}, CFrame.new(0, 1.2 * scale, -0.2 * scale))
	elseif kind == "Streamer" then
		weldPart(model, root, {
			Name = "Torso", Size = Vector3.new(2, 2, 1) * scale, Color = Color3.fromRGB(120, 60, 200),
		}, CFrame.new())
		weldPart(model, root, {
			Name = "Legs", Size = Vector3.new(2, 2, 1) * scale, Color = Color3.fromRGB(30, 30, 40),
		}, CFrame.new(0, -2 * scale, 0))
		head = weldPart(model, root, {
			Name = "Head", Size = Vector3.new(1.2, 1.2, 1.2) * scale, Color = Color3.fromRGB(255, 205, 160),
		}, CFrame.new(0, 1.6 * scale, 0))
		weldPart(model, root, {
			Name = "Headset", Size = Vector3.new(1.4, 0.3, 1.3) * scale, Color = Color3.fromRGB(20, 20, 20),
		}, CFrame.new(0, 2.25 * scale, 0))
		badge(head, "● LIVE", Color3.fromRGB(230, 30, 50))
	else
		weldPart(model, root, {
			Name = "Belly", Shape = Enum.PartType.Ball, Size = Vector3.one * 4.2 * scale, Color = Color3.fromRGB(240, 140, 60),
		}, CFrame.new(0, -0.6 * scale, -0.3 * scale))
		head = weldPart(model, root, {
			Name = "Head", Shape = Enum.PartType.Ball, Size = Vector3.one * 2 * scale, Color = Color3.fromRGB(255, 205, 160),
		}, CFrame.new(0, 2.2 * scale, 0))
		weldPart(model, root, {
			Name = "ChefHat", Shape = Enum.PartType.Cylinder, Size = Vector3.new(1.6, 1.8, 1.8) * scale,
			Color = Color3.new(1, 1, 1),
		}, CFrame.new(0, 3.6 * scale, 0) * CFrame.Angles(0, 0, math.rad(90)))
		for _, side in { -1, 1 } do
			weldPart(model, root, {
				Name = "Arm", Size = Vector3.new(0.9, 3, 0.9) * scale, Color = Color3.fromRGB(255, 205, 160),
			}, CFrame.new(side * 2.3 * scale, -0.3 * scale, -0.6 * scale) * CFrame.Angles(math.rad(-30), 0, 0))
		end
	end
	-- Eyes, so you can tell which way it's facing.
	for _, side in { -0.3, 0.3 } do
		weldPart(model, root, {
			Name = "Eye", Shape = Enum.PartType.Ball, Size = Vector3.one * 0.35 * scale, Color = Color3.new(0, 0, 0),
		}, root.CFrame:ToObjectSpace(head.CFrame) * CFrame.new(side * scale, 0.15 * scale, -head.Size.Z / 2))
	end

	local humanoid = Instance.new("Humanoid")
	humanoid.RigType = Enum.HumanoidRigType.R15
	humanoid.HipHeight = hip
	humanoid.MaxHealth = health
	humanoid.Health = health
	humanoid.DisplayName = name
	humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOn
	humanoid.NameDisplayDistance = 80
	humanoid.HealthDisplayDistance = 80
	humanoid.BreakJointsOnDeath = false
	humanoid.Parent = model

	model:AddTag("Damageable")
	model.Parent = parent
	root:SetNetworkOwner(nil)
	return { Model = model, Humanoid = humanoid, Root = root }
end

return Rigs
