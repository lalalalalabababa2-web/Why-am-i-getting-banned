-- Volley Bomb AI v2 | Roblox executor script (Luau, no UI library, no other loadstrings)
-- Positions so the ball drops in front of you (not on your head), aims every touch at another
-- player, spikes a ball that came back, dives (E) when it is about to land out of reach.
-- Toggle: AI button or Z (shift lock grabs the mouse, so use Z then). Report copies a debug dump.

if not game:IsLoaded() then game.Loaded:Wait() end

local CFG = {
	names       = { "ball", "bomb" }, -- lowercase name fragments that mark the ball
	hitRange    = 9,     -- studs: bump when the ball is this close
	diveRange   = 16,    -- studs: dive when it is dropping this close and out of bump reach
	zone        = 30,    -- studs from your spot that count as your square
	standOff    = 3,     -- studs: stand behind the landing spot so it drops in front of you
	cooldown    = 0.35,  -- seconds between touches
	maxTouches  = 3,     -- shown in the status line; any touch after the ball came back is a spike
	spike       = true,
	spikeChance = 0.35,  -- chance to spike a fresh ball instead of bumping it
	spikeDelay  = 0.15,  -- seconds from jump to click
	aimMin      = 20,    -- studs: closest player worth aiming at (further means it leaves your square)
	aimMax      = 140,   -- studs: furthest player worth aiming at
	aimLift     = 0.3,   -- bumps aim this many studs up per stud of distance, so they arc over
	key         = Enum.KeyCode.Z,
}

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UIS = game:GetService("UserInputService")
local VIM = game:GetService("VirtualInputManager")
local StarterGui = game:GetService("StarterGui")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local lp = Players.LocalPlayer

local RED, GREEN = Color3.fromRGB(160, 45, 45), Color3.fromRGB(40, 150, 70)

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
	Size = UDim2.fromOffset(136, 42), Position = UDim2.fromOffset(10, 90),
	BackgroundColor3 = Color3.fromRGB(22, 22, 28), BackgroundTransparency = 0.1,
	Active = true, Draggable = true,
}, gui)
make("UICorner", { CornerRadius = UDim.new(0, 6) }, frame)

local function smallButton(text, x, w, color)
	local b = make("TextButton", {
		Size = UDim2.fromOffset(w, 20), Position = UDim2.fromOffset(x, 4),
		BackgroundColor3 = color, TextColor3 = Color3.new(1, 1, 1),
		Font = Enum.Font.GothamBold, TextSize = 11, Text = text,
	}, frame)
	make("UICorner", { CornerRadius = UDim.new(0, 4) }, b)
	return b
end

local btn = smallButton("AI OFF", 4, 70, RED)
local reportBtn = smallButton("Report", 78, 54, Color3.fromRGB(60, 60, 95))
local status = make("TextLabel", {
	Size = UDim2.fromOffset(128, 13), Position = UDim2.fromOffset(4, 26),
	BackgroundTransparency = 1, TextColor3 = Color3.fromRGB(200, 200, 210),
	Font = Enum.Font.Gotham, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left,
	TextTruncate = Enum.TextTruncate.AtEnd, Text = "idle",
}, frame)

-- Ball tracking: anything named like the ball (or a sphere part) that isn't on a character.
-- Each ball keeps a smoothed velocity and its own measured gravity (the game may not use workspace's).
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
	tracked[o] = { pos = o.Position, vel = Vector3.zero, g = workspace.Gravity }
end

for _, o in ipairs(workspace:GetDescendants()) do consider(o) end
table.insert(conns, workspace.DescendantAdded:Connect(consider))
table.insert(conns, workspace.DescendantRemoving:Connect(function(o) tracked[o] = nil end))

local function flat(v) return Vector3.new(v.X, 0, v.Z) end

-- Where the ball will be when it falls to height y.
local function intercept(p, v, g, y)
	local a, b, c = 0.5 * g, -v.Y, y - p.Y
	local disc = b * b - 4 * a * c
	local t = disc >= 0 and (-b + math.sqrt(disc)) / (2 * a) or -1
	if t < 0 then return Vector3.new(p.X, y, p.Z) end
	return Vector3.new(p.X + v.X * t, y, p.Z + v.Z * t)
end

local function face(root, pos)
	local look = Vector3.new(pos.X, root.Position.Y, pos.Z)
	if (look - root.Position).Magnitude > 0.1 then root.CFrame = CFrame.lookAt(root.Position, look) end
end

-- Target: a living player in range, biased toward far ones so the ball travels well out of your square.
local function pickTarget(from)
	local best, bestScore
	for _, pl in ipairs(Players:GetPlayers()) do
		local c = pl ~= lp and pl.Character
		local r = c and c:FindFirstChild("HumanoidRootPart")
		local h = c and c:FindFirstChildOfClass("Humanoid")
		if r and h and h.Health > 0 then
			local d = flat(r.Position - from).Magnitude
			if d >= CFG.aimMin and d <= CFG.aimMax then
				local score = d + math.random() * 25
				if not bestScore or score > bestScore then best, bestScore = r, score end
			end
		end
	end
	return best
end

-- Aim is held after the camera script runs each frame, so the game reads our direction when the
-- click lands instead of snapping back to wherever you were looking.
local aimPoint, aimUntil = nil, 0
local aimBind = "VolleyAIAim" .. tostring(os.clock())
RunService:BindToRenderStep(aimBind, Enum.RenderPriority.Camera.Value + 1, function()
	if not aimPoint or os.clock() > aimUntil then return end
	local cam = workspace.CurrentCamera
	cam.CFrame = CFrame.lookAt(cam.CFrame.Position, aimPoint)
	local root = lp.Character and lp.Character:FindFirstChild("HumanoidRootPart")
	if root then face(root, aimPoint) end
end)

local function aimAt(pos, secs) aimPoint, aimUntil = pos, os.clock() + secs end

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

local function bump(root, tgt)
	if tgt then
		local d = flat(tgt.Position - root.Position).Magnitude
		aimAt(tgt.Position + Vector3.new(0, d * CFG.aimLift, 0), 0.3)
		task.delay(0.05, click)
	else
		click()
	end
end

local function spike(hum, tgt)
	if tgt then aimAt(tgt.Position, CFG.spikeDelay + 0.3) end
	press(Enum.KeyCode.Space)
	hum.Jump = true
	task.delay(CFG.spikeDelay, click)
end

-- State
local on, home = false, nil
local lastAct, lastTouch, lastText = 0, 0, 0
local touches, possession, spikeRoll, aimTgt = 0, false, false, nil
local stats = { bumps = 0, spikes = 0, dives = 0, cameBack = 0 }
local lastErr, curBall = nil, nil

local function setOn(v)
	on = v
	local r = lp.Character and lp.Character:FindFirstChild("HumanoidRootPart")
	home = r and r.Position
	touches, possession, aimTgt = 0, false, nil
	btn.Text = on and "AI ON" or "AI OFF"
	btn.BackgroundColor3 = on and GREEN or RED
end

local function touched(kind)
	if touches >= 1 then stats.cameBack = stats.cameBack + 1 end
	touches = touches + 1
	stats[kind] = stats[kind] + 1
	lastTouch, lastAct = os.clock(), os.clock()
end

local function setStatus(text)
	if os.clock() - lastText > 0.25 then
		lastText = os.clock()
		status.Text = text
	end
end

local function step(dt)
	local count = 0
	for part, s in pairs(tracked) do
		if not part.Parent then
			tracked[part] = nil
		else
			count = count + 1
			local p, v = part.Position, part.AssemblyLinearVelocity
			if v.Magnitude < 0.5 and dt > 0 then v = s.vel:Lerp((p - s.pos) / dt, 0.5) end
			if dt > 0 and v.Magnitude > 1 then
				local acc = -(v.Y - s.vel.Y) / dt
				if math.abs(acc) < 1500 then s.g = s.g + (acc - s.g) * 0.05 end -- skip hits and bounces
			end
			s.pos, s.vel = p, v
		end
	end

	local ch = lp.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	if not (on and root and hum and hum.Health > 0) then
		curBall = nil
		setStatus(on and "waiting for character" or ("idle | " .. count .. " ball candidates"))
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
	curBall = ball

	if not ball then
		touches, possession = 0, false
		if flat(root.Position - home).Magnitude > 2 then hum:MoveTo(home) end
		setStatus("no moving ball | " .. count .. " candidates")
		return
	end

	local s = tracked[ball]
	local vel, g = s.vel, math.clamp(s.g, 30, 800)
	local target = intercept(ball.Position, vel, g, root.Position.Y + 1)
	local inZone = flat(target - home).Magnitude <= CFG.zone
	local now = os.clock()

	-- Possession: starts when the ball heads into your square, ends when it is gone from it.
	if inZone and not possession then
		possession, touches = true, 0
		spikeRoll = math.random() < CFG.spikeChance
		aimTgt = pickTarget(home)
	elseif possession and not inZone and flat(ball.Position - home).Magnitude > CFG.zone then
		possession, touches, aimTgt = false, 0, nil
	end
	if aimTgt and not aimTgt.Parent then aimTgt = pickTarget(home) end

	-- Stand so the ball drops in front of you, toward your target, never straight onto your head.
	local moveTo = home
	if inZone then
		local away = aimTgt and flat(aimTgt.Position - target) or -flat(vel)
		moveTo = away.Magnitude > 0.1 and (target - away.Unit * CFG.standOff) or target
	end
	if flat(moveTo - root.Position).Magnitude > 0.5 then hum:MoveTo(moveTo) end

	local rel = ball.Position - root.Position
	local fr = flat(rel).Magnitude
	local approaching = rel:Dot(vel) < 0
	local ownHitRising = now - lastTouch < 0.8 and vel.Y > 0 -- our last touch is still going up: leave it
	if inZone and now - lastAct >= CFG.cooldown and not ownHitRising then
		local wantSpike = CFG.spike and (touches >= 1 or spikeRoll)
		if approaching and wantSpike and fr <= 6 and rel.Y >= 2 and rel.Y <= 10 then
			touched("spikes")
			spike(hum, aimTgt)
		elseif approaching and rel.Magnitude <= CFG.hitRange and not (wantSpike and rel.Y > 4) then
			touched("bumps")
			bump(root, aimTgt)
		elseif vel.Y < 0 and rel.Y < 0.5 and rel.Magnitude > CFG.hitRange and fr <= CFG.diveRange then
			touched("dives")
			lastAct = now + 0.7 -- dive recovery
			face(root, ball.Position)
			press(Enum.KeyCode.E)
		end
	end

	setStatus(string.format("%s %.0f | t%d/%d%s", ball.Name, best, touches, CFG.maxTouches, inZone and "" or " | out"))
end

-- Report: everything needed to tune this to the game, copied to the clipboard.
local function attrs(inst)
	local t = {}
	for k, v in pairs(inst:GetAttributes()) do t[#t + 1] = k .. "=" .. tostring(v) end
	return table.concat(t, ", ")
end

local function buildReport()
	local L = {}
	local function add(line) L[#L + 1] = line end
	local okE, exec = pcall(function() return (identifyexecutor()) end)
	add("Volley AI report " .. os.date("%Y-%m-%d %H:%M:%S"))
	add("place " .. game.PlaceId .. " | executor " .. (okE and tostring(exec) or "?") .. " | AI " .. (on and "on" or "off"))
	add(string.format("bumps %d spikes %d dives %d came-back %d | touches now %d",
		stats.bumps, stats.spikes, stats.dives, stats.cameBack, touches))
	add("last error: " .. tostring(lastErr or "none"))
	add("target ball: " .. (curBall and curBall:GetFullName() or "none"))

	add("-- ball candidates --")
	local n = 0
	for part, s in pairs(tracked) do
		n = n + 1
		if n > 30 then add("...") break end
		add(string.format("%s [%s] size %.1f,%.1f,%.1f speed %.1f g %.0f anchored %s {%s}",
			part:GetFullName(), part.ClassName, part.Size.X, part.Size.Y, part.Size.Z,
			s.vel.Magnitude, s.g, tostring(part.Anchored), attrs(part)))
	end

	add("-- me --")
	add("player {" .. attrs(lp) .. "}")
	if lp.Character then add("character {" .. attrs(lp.Character) .. "}") end
	local ls = lp:FindFirstChild("leaderstats")
	if ls then
		for _, v in ipairs(ls:GetChildren()) do
			local okV, val = pcall(function() return v.Value end)
			add("leaderstat " .. v.Name .. " = " .. (okV and tostring(val) or "?"))
		end
	end

	add("-- remotes --")
	n = 0
	for _, o in ipairs(ReplicatedStorage:GetDescendants()) do
		if o:IsA("RemoteEvent") or o:IsA("RemoteFunction") or o:IsA("UnreliableRemoteEvent") then
			n = n + 1
			if n > 60 then add("...") break end
			add(o.ClassName .. " " .. o:GetFullName())
		end
	end

	add("-- on-screen text --")
	n = 0
	local pg = lp:FindFirstChild("PlayerGui")
	for _, o in ipairs(pg and pg:GetDescendants() or {}) do
		if (o:IsA("TextLabel") or o:IsA("TextButton")) and o.Visible and #o.Text > 0 and #o.Text < 40 then
			n = n + 1
			if n > 40 then add("...") break end
			add(o:GetFullName() .. " = " .. o.Text)
		end
	end
	return table.concat(L, "\n")
end

local function copyText(text)
	local wrote = writefile and pcall(writefile, "VolleyAI_report.txt", text)
	local clip = setclipboard or toclipboard
	if clip and pcall(clip, text) then return "Copied", "report copied to clipboard" end
	if wrote then return "Saved", "saved VolleyAI_report.txt in your executor's workspace folder" end
	return "F9", "report printed to the F9 console"
end

table.insert(conns, btn.MouseButton1Click:Connect(function() setOn(not on) end))
table.insert(conns, reportBtn.MouseButton1Click:Connect(function()
	local ok, text = pcall(buildReport)
	text = ok and text or ("report failed: " .. tostring(text))
	print(text)
	local short, long = copyText(text)
	reportBtn.Text = short
	notify(long)
	task.delay(1.5, function() reportBtn.Text = "Report" end)
end))
table.insert(conns, UIS.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == CFG.key then setOn(not on) end
end))

table.insert(conns, RunService.Heartbeat:Connect(function(dt)
	local ok, err = pcall(step, dt)
	if not ok and lastErr == nil then
		lastErr = tostring(err)
		status.Text = "error: " .. lastErr
		notify("error: " .. lastErr)
	end
end))

table.insert(conns, gui.Destroying:Connect(function()
	for _, c in ipairs(conns) do c:Disconnect() end
	RunService:UnbindFromRenderStep(aimBind)
end))

notify(gui.Parent and "loaded. tap AI or press Z" or "loaded, but the GUI could not be placed. Z still toggles")
