-- Geometry helpers. The whole map is made of these at server start.

local Build = {}

local map = Instance.new("Folder")
map.Name = "Map"
map.Parent = workspace

local effects = Instance.new("Folder")
effects.Name = "Effects"
effects.Parent = workspace

Build.Map = map
Build.Effects = effects

-- part({ Size = ..., CFrame = ..., Color = ..., Parent = ... }). Anchored by default, and a part
-- that doesn't collide doesn't block weapon rays either.
function Build.part(props: { [string]: any }): BasePart
	local className = props.ClassName or "Part"
	local p = Instance.new(className) :: BasePart
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Material = Enum.Material.SmoothPlastic
	local parent = props.Parent
	for key, value in props do
		if key ~= "ClassName" and key ~= "Parent" then
			(p :: any)[key] = value
		end
	end
	if props.CanCollide == false and props.CanQuery == nil then
		p.CanQuery = false
	end
	p.Parent = parent or map
	return p
end

function Build.folder(name: string, parent: Instance?): Folder
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = parent or map
	return f
end

-- Big text painted on a face of a part.
function Build.sign(part: BasePart, face: Enum.NormalId, text: string, color: Color3?, font: Enum.Font?)
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 20
	gui.LightInfluence = 0
	gui.Parent = part
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextScaled = true
	label.Font = font or Enum.Font.FredokaOne
	label.TextColor3 = color or Color3.new(1, 1, 1)
	label.TextStrokeTransparency = 0.3
	label.Parent = gui
	return label
end

-- A closed box: floor, ceiling and four walls, the floor's top face at `center.Y`.
function Build.room(parent: Instance, center: Vector3, size: Vector3, opts: { [string]: any }?)
	local o = opts or {}
	local wall = o.WallColor or Color3.fromRGB(40, 40, 50)
	local t = 4
	local half = size / 2
	local floor = Build.part({
		Name = "Floor", Parent = parent, Size = Vector3.new(size.X + t * 2, t, size.Z + t * 2),
		CFrame = CFrame.new(center - Vector3.new(0, t / 2, 0)),
		Color = o.FloorColor or Color3.fromRGB(60, 60, 70), Material = o.FloorMaterial or Enum.Material.Concrete,
	})
	Build.part({
		Name = "Ceiling", Parent = parent, Size = Vector3.new(size.X + t * 2, t, size.Z + t * 2),
		CFrame = CFrame.new(center + Vector3.new(0, size.Y + t / 2, 0)),
		Color = o.CeilingColor or wall, Material = o.WallMaterial or Enum.Material.Concrete,
		Transparency = o.CeilingTransparency or 0,
	})
	local walls = {}
	for i, spec in {
		{ Vector3.new(0, 0, -half.Z - t / 2), Vector3.new(size.X + t * 2, size.Y, t) },
		{ Vector3.new(0, 0, half.Z + t / 2), Vector3.new(size.X + t * 2, size.Y, t) },
		{ Vector3.new(-half.X - t / 2, 0, 0), Vector3.new(t, size.Y, size.Z) },
		{ Vector3.new(half.X + t / 2, 0, 0), Vector3.new(t, size.Y, size.Z) },
	} do
		if not (o.SkipWalls and o.SkipWalls[i]) then
			walls[i] = Build.part({
				Name = "Wall", Parent = parent, Size = spec[2],
				CFrame = CFrame.new(center + spec[1] + Vector3.new(0, size.Y / 2, 0)),
				Color = wall, Material = o.WallMaterial or Enum.Material.Concrete,
				Transparency = o.WallTransparency or 0,
			})
		end
	end
	return floor, walls
end

function Build.light(parent: BasePart, color: Color3, range: number, brightness: number?)
	local light = Instance.new("PointLight")
	light.Color = color
	light.Range = range
	light.Brightness = brightness or 2
	light.Shadows = false
	light.Parent = parent
	return light
end

-- A glowing pad with a prompt. Floors call this for their elevator.
function Build.elevator(parent: Instance, cframe: CFrame): BasePart
	local pad = Build.part({
		Name = "ElevatorPad", Parent = parent, Size = Vector3.new(12, 1, 12), CFrame = cframe,
		Color = Color3.fromRGB(0, 255, 170), Material = Enum.Material.Neon,
	})
	local frame = Build.part({
		Name = "ElevatorFrame", Parent = parent, Size = Vector3.new(14, 16, 1),
		CFrame = cframe * CFrame.new(0, 8, 6.5), Color = Color3.fromRGB(30, 30, 35), Material = Enum.Material.Metal,
	})
	Build.sign(frame, Enum.NormalId.Front, "▲ ELEVATOR ▲", Color3.fromRGB(0, 255, 170))
	Build.sign(frame, Enum.NormalId.Back, "▲ ELEVATOR ▲", Color3.fromRGB(0, 255, 170))
	Build.light(pad, Color3.fromRGB(0, 255, 170), 18)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Ride"
	prompt.ObjectText = "Elevator"
	prompt.KeyboardKeyCode = Enum.KeyCode.R
	prompt.MaxActivationDistance = 12
	prompt.RequiresLineOfSight = false
	prompt.Parent = pad
	pad:AddTag("Elevator")
	return pad
end

return Build
