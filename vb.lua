-- Volley Bomb AI | Roblox executor script (Luau, no UI library, no other loadstrings)
-- Walks under the ball, bumps it toward another player, and dives (E) when it is about to land.
-- Toggle with the on-screen button or Z (shift lock grabs the mouse, so use Z then).

if not game:IsLoaded() then game.Loaded:Wait() end

local CFG = {
	names     = { "ball", "bomb" }, -- lowercase name fragments that mark the ball
	hitRange  = 9,    -- studs: bump when the ball is this close
	diveRange = 16,   -- studs: dive when it is dropping this close and out of bump reach
	zone      = 30,   -- studs from your spot that the AI will chase to (keeps you in your square)
	cooldown  = 0.35, -- seconds between bumps
	aim       = true, -- face another player before bumping so the ball goes to them
	key       = Enum.KeyCode.Z,
}

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UIS = game:GetService("UserInputService")
local VIM = game:GetService("VirtualInputManager")
local StarterGui = game:GetService("StarterGui")
local lp = Players.LocalPlayer

local function notify(msg)
	print("[VolleyAI] " .. msg)
	pcall(StarterGui.SetCore, StarterGui, "SendNotification", { Title = "Volley AI", Text = msg, Duration = 5 })
end

local function make(class, props, parent)
	local o = Instance.new(class)
	for k, v in pairs(props) do o[k] = v end
	o.Parent = parent
	return o
end

-- GUI: executor's hidden container, then CoreGui, then PlayerGui. Old copies are removed first.
local containers = {}
for _, get in ipairs({
	function() return gethui() end,
	function() return game:GetService("CoreGui") end,
	function() return lp:WaitForChild("PlayerGui", 10) end,
}) do
	local ok, p = pcall(get)
	if ok and p then
		table.insert(containers, p)
		local old = p:FindFirstChild("VolleyAI")
		if old then old:Destroy() end
	end
end

local gui = make("ScreenGui", { Name = "VolleyAI", ResetOnSpawn = false, DisplayOrder = 999999 })
for _, p in ipairs(containers) do
	if pcall(function() gui.Parent = p end) and gui.Parent == p then break end
end

local frame = make("Frame", {
	Size = UDim2.fromOffset(190, 66), Position = UDim2.fromOffset(12, 90),
	BackgroundColor3 = Color3.fromRGB(22, 22, 28), Active = true, Draggable = true,
}, gui)
make("UICorner", {}, frame)
local btn = make("TextButton", {
	Size = UDim2.new(1, -12, 0, 32), Position = UDim2.fromOffset(6, 6),
	BackgroundColor3 = Color3.fromRGB(160, 45, 45), TextColor3 = Color3.new(1, 1, 1),
	Font = Enum.Font.GothamBold, TextSize = 16, Text = "AI: OFF  [Z]",
}, frame)
make("UICorner", {}, btn)
local status = make("TextLabel", {
	Size = UDim2.new(1, -12, 0, 20), Position = UDim2.fromOffset(6, 41),
	BackgroundTransparency = 1, TextColor3 = Color3.fromRGB(200, 200, 210),
	Font = Enum.Font.Gotham, TextSize = 12, TextXAlignment = Enum.TextXAlignment.Left,
	TextTruncate = Enum.TextTruncate.AtEnd, Text = "idle",
}, frame)

-- Ball tracking: anything named like the ball (or a sphere part) that isn't on a character.
local tracked, conns = {}, {}

local function matches(name)
	name = name:lower()
	for _, n in ipairs(CFG.names) do
		if name:find(n, 1, true) then return true end
	end
	return false
end

local function consider(o)
	if not o:IsA("BasePart") then return end
	local named = matches(o.Name) or (o.Parent and o.Parent:IsA("Model") and matches(o.Parent.Name))
	local sphere = o:IsA("Part") and o.Shape == Enum.PartType.Ball
	if not (named or sphere) then return end
	for _, pl in ipairs(Players:GetPlayers()) do
		if pl.Character and o:IsDescendantOf(pl.Character) then return end
	end
	tracked[o] = { pos = o.Position, vel = Vector3.zero }
end

for _, o in ipairs(workspace:GetDescendants()) do consider(o) end
table.insert(conns, workspace.DescendantAdded:Connect(consider))
table.insert(conns, workspace.DescendantRemoving:Connect(function(o) tracked[o] = nil end))

local function flat(v) return Vector3.new(v.X, 0, v.Z) end

-- Where the ball will be when it falls to height y (simple ballistic arc).
local function intercept(p, v, y)
	local a, b, c = 0.5 * workspace.Gravity, -v.Y, y - p.Y
	local disc = b * b - 4 * a * c
	local t = disc >= 0 and (-b + math.sqrt(disc)) / (2 * a) or -1
	if t < 0 then return Vector3.new(p.X, y, p.Z) end
	return Vector3.new(p.X + v.X * t, y, p.Z + v.Z * t)
end

local function face(root, pos)
	local look = Vector3.new(pos.X, root.Position.Y, pos.Z)
	if (look - root.Position).Magnitude > 0.1 then root.CFrame = CFrame.lookAt(root.Position, look) end
end

local function randomEnemy()
	local list = {}
	for _, pl in ipairs(Players:GetPlayers()) do
		local r = pl ~= lp and pl.Character and pl.Character:FindFirstChild("HumanoidRootPart")
		if r then table.insert(list, r.Position) end
	end
	return list[math.random(math.max(#list, 1))]
end

local function click()
	task.spawn(function()
		local vp = workspace.CurrentCamera.ViewportSize
		local ok = pcall(function()
			VIM:SendMouseButtonEvent(vp.X / 2, vp.Y / 2, 0, true, game, 0)
			task.wait(0.03)
			VIM:SendMouseButtonEvent(vp.X / 2, vp.Y / 2, 0, false, game, 0)
		end)
		if not ok and mouse1click then mouse1click() end
	end)
end

local function press(key)
	task.spawn(function()
		pcall(function()
			VIM:SendKeyEvent(true, key, false, game)
			task.wait(0.05)
			VIM:SendKeyEvent(false, key, false, game)
		end)
	end)
end

local on, home, lastAct, lastText = false, nil, 0, 0

local function setOn(v)
	on = v
	local r = lp.Character and lp.Character:FindFirstChild("HumanoidRootPart")
	home = r and r.Position
	btn.Text = (on and "AI: ON" or "AI: OFF") .. "  [Z]"
	btn.BackgroundColor3 = on and Color3.fromRGB(40, 150, 70) or Color3.fromRGB(160, 45, 45)
end

table.insert(conns, btn.MouseButton1Click:Connect(function() setOn(not on) end))
table.insert(conns, UIS.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == CFG.key then setOn(not on) end
end))

local function step(dt)
	local count = 0
	for part, s in pairs(tracked) do
		if not part.Parent then
			tracked[part] = nil
		else
			count = count + 1
			local p, v = part.Position, part.AssemblyLinearVelocity
			if v.Magnitude < 0.5 and dt > 0 then v = s.vel:Lerp((p - s.pos) / dt, 0.5) end
			s.pos, s.vel = p, v
		end
	end

	local ch = lp.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	if not (on and root and hum and hum.Health > 0) then
		if os.clock() - lastText > 0.25 then
			lastText = os.clock()
			status.Text = on and "waiting for character" or ("idle | " .. count .. " ball candidates")
		end
		return
	end

	-- New round put you in another square: re-centre there.
	if not home or flat(root.Position - home).Magnitude > CFG.zone * 2 then home = root.Position end

	local ball, best
	for part, s in pairs(tracked) do
		if s.vel.Magnitude > 1 then
			local d = (part.Position - root.Position).Magnitude
			if not best or d < best then ball, best = part, d end
		end
	end

	if not ball then
		if flat(root.Position - home).Magnitude > 2 then hum:MoveTo(home) end
		if os.clock() - lastText > 0.25 then
			lastText = os.clock()
			status.Text = "no moving ball | " .. count .. " candidates"
		end
		return
	end

	local vel = tracked[ball].vel
	local target = intercept(ball.Position, vel, root.Position.Y + 1)
	local inZone = flat(target - home).Magnitude <= CFG.zone
	hum:MoveTo(inZone and target or home)

	local rel = ball.Position - root.Position
	local now = os.clock()
	if now - lastAct >= CFG.cooldown then
		if rel.Magnitude <= CFG.hitRange and rel:Dot(vel) < 0 then
			lastAct = now
			local e = CFG.aim and randomEnemy()
			if e then
				face(root, e)
				local cam = workspace.CurrentCamera
				cam.CFrame = CFrame.lookAt(cam.CFrame.Position, e)
			end
			click()
		elseif inZone and vel.Y < 0 and rel.Y < 0.5 and flat(rel).Magnitude <= CFG.diveRange then
			lastAct = now + 0.7 -- dive recovery
			face(root, ball.Position)
			press(Enum.KeyCode.E)
		end
	end

	if now - lastText > 0.25 then
		lastText = now
		status.Text = string.format("%s | %.0f studs%s", ball.Name, best, inZone and "" or " (outside)")
	end
end

local reported = false
table.insert(conns, RunService.Heartbeat:Connect(function(dt)
	local ok, err = pcall(step, dt)
	if not ok and not reported then
		reported = true
		status.Text = "error: " .. tostring(err)
		notify("error: " .. tostring(err))
	end
end))

table.insert(conns, gui.Destroying:Connect(function()
	for _, c in ipairs(conns) do c:Disconnect() end
end))

notify(gui.Parent and "loaded. tap the button or press Z" or "loaded, but the GUI could not be placed. Z still toggles")
