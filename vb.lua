-- Volley Bomb AI v3 | Roblox executor script (Luau, no UI library, no other loadstrings)
-- Built from a real report: the ball is an anchored part the game moves itself (named after your
-- equipped ball skin), bumps go through RE/HitBall, bump and dive cooldowns are 0.5 s.
-- Aims by turning your character and, where the executor can hook calls, by turning the direction
-- inside the game's own HitBall call. Your camera is left alone unless cameraAim is true.
-- Toggle: AI button or Z. Report copies a debug dump to send back.

if not game:IsLoaded() then game.Loaded:Wait() end

local CFG = {
	names       = { "ball", "bomb" }, -- lowercase name fragments that mark the ball
	hitRange    = 9,     -- studs: bump when the ball is this close
	diveRange   = 16,    -- studs: furthest landing spot a dive can still reach
	diveLead    = 0.3,   -- seconds before landing to dive when you can't get under it
	zone        = 14,    -- studs: your square's radius when the tile under you can't be found
	standOff    = 3,     -- studs: stand behind the landing spot so it drops in front of you
	cooldown    = 0.5,   -- the game's bump cooldown
	maxTouches  = 3,     -- shown in the status line; any touch after the ball came back is a spike
	spike       = true,
	spikeChance = 0.35,  -- chance to spike a fresh ball instead of bumping it
	spikeDelay  = 0.15,  -- seconds from jump to click
	aimMin      = 20,    -- studs: closest player worth aiming at
	aimMax      = 140,   -- studs: furthest player worth aiming at
	cameraAim   = false, -- true: also flick the camera to the target for a moment, then put it back
	aimLift     = 0.3,   -- camera flick only: aim this many studs up per stud of distance
	key         = Enum.KeyCode.Z,
}

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UIS = game:GetService("UserInputService")
local VIM = game:GetService("VirtualInputManager")
local StarterGui = game:GetService("StarterGui")
local GuiService = game:GetService("GuiService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local lp = Players.LocalPlayer

local RED, GREEN = Color3.fromRGB(160, 45, 45), Color3.fromRGB(40, 150, 70)
local alive = true

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

local function flat(v) return Vector3.new(v.X, 0, v.Z) end

local function myRoot()
	return lp.Character and lp.Character:FindFirstChild("HumanoidRootPart")
end

---------------------------------------------------------------- GUI
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

---------------------------------------------------------------- Ball tracking
-- The ball is anchored and moved by the game, so velocity and gravity come from a least-squares fit
-- over the last few position samples. A sample far off the current fit means a hit: start a new arc.
local WINDOW = 0.5
local EXCLUDE = { BallShadow = true, BallSpawn = true }
local tracked, conns = {}, {}

local function matches(name)
	name = name:lower()
	for _, n in ipairs(CFG.names) do
		if name:find(n, 1, true) then return true end
	end
	return false
end

local function consider(o)
	if not o:IsA("BasePart") or EXCLUDE[o.Name] then return end
	local go = workspace:FindFirstChild("GameObjects") -- shop displays, NPC cosmetics, round areas
	if go and o:IsDescendantOf(go) then return end
	local sz = o.Size
	local ballSized = o.Parent == workspace and sz.X >= 1.5 and sz.X <= 8
		and math.abs(sz.X - sz.Y) < 0.5 and math.abs(sz.X - sz.Z) < 0.5
	local named = matches(o.Name) or (o.Parent and o.Parent:IsA("Model") and matches(o.Parent.Name))
	local sphere = o:IsA("Part") and o.Shape == Enum.PartType.Ball
	if not (ballSized or named or sphere) then return end
	for _, pl in ipairs(Players:GetPlayers()) do
		if pl.Character and o:IsDescendantOf(pl.Character) then return end
	end
	tracked[o] = {
		buf = {}, pos = o.Position, vel = Vector3.zero, g = workspace.Gravity, gUse = workspace.Gravity,
		fitT = 0, moved = 0, arcs = 0, shadowOff = 0,
	}
end

for _, o in ipairs(workspace:GetDescendants()) do consider(o) end
table.insert(conns, workspace.DescendantAdded:Connect(consider))
table.insert(conns, workspace.DescendantRemoving:Connect(function(o) tracked[o] = nil end))

local function solve3(a11, a12, a13, a21, a22, a23, a31, a32, a33, b1, b2, b3)
	local D = a11 * (a22 * a33 - a23 * a32) - a12 * (a21 * a33 - a23 * a31) + a13 * (a21 * a32 - a22 * a31)
	if math.abs(D) < 1e-12 then return nil end
	local Da = b1 * (a22 * a33 - a23 * a32) - a12 * (b2 * a33 - a23 * b3) + a13 * (b2 * a32 - a22 * b3)
	local Db = a11 * (b2 * a33 - a23 * b3) - b1 * (a21 * a33 - a23 * a31) + a13 * (a21 * b3 - b2 * a31)
	local Dc = a11 * (a22 * b3 - b2 * a32) - a12 * (a21 * b3 - b2 * a31) + b1 * (a21 * a32 - a22 * a31)
	return Da / D, Db / D, Dc / D
end

-- Fit x,z as lines and y as a parabola in time, measured back from the newest sample.
-- Returns position and velocity at the newest sample, and the gravity used.
local function fit(s)
	local buf, n = s.buf, #s.buf
	local last = buf[n]
	if n < 2 then return last.p, s.vel, s.g end
	local t0 = last.t
	local S0, S1, S2, S3, S4 = 0, 0, 0, 0, 0
	local X0, X1, Y0, Y1, Y2, Z0, Z1 = 0, 0, 0, 0, 0, 0, 0
	for i = 1, n do
		local e = buf[i]
		local t = e.t - t0
		local t2 = t * t
		S0, S1, S2, S3, S4 = S0 + 1, S1 + t, S2 + t2, S3 + t2 * t, S4 + t2 * t2
		X0, X1 = X0 + e.p.X, X1 + e.p.X * t
		Y0, Y1, Y2 = Y0 + e.p.Y, Y1 + e.p.Y * t, Y2 + e.p.Y * t2
		Z0, Z1 = Z0 + e.p.Z, Z1 + e.p.Z * t
	end
	local den = S0 * S2 - S1 * S1
	if den < 1e-9 then return last.p, s.vel, s.g end
	local vx, vz = (S0 * X1 - S1 * X0) / den, (S0 * Z1 - S1 * Z0) / den
	local x0, z0 = (X0 - vx * S1) / S0, (Z0 - vz * S1) / S0
	local span = t0 - buf[1].t
	local g, a, b = s.g, nil, nil
	if n >= 5 and span >= 0.12 then
		local c
		a, b, c = solve3(S0, S1, S2, S1, S2, S3, S2, S3, S4, Y0, Y1, Y2)
		local gf = c and -2 * c
		if gf and gf > 5 and gf < 800 then
			g = gf
			if n >= 6 and span >= 0.15 then s.g = s.g + (gf - s.g) * 0.25 end -- remembered for the next arc
		else
			a = nil
		end
	end
	if not a then -- too few samples for a parabola: use the remembered gravity, fit the rest as a line
		local W0, W1 = Y0 + 0.5 * g * S2, Y1 + 0.5 * g * S3
		b = (S0 * W1 - S1 * W0) / den
		a = (W0 - b * S1) / S0
	end
	return Vector3.new(x0, a, z0), Vector3.new(vx, b, vz), g
end

local function updateBall(part, s, now)
	local p = part.Position
	local buf = s.buf
	local last = buf[#buf]
	if last and (p - last.p).Magnitude < 0.01 then return end
	if last and #buf >= 3 then
		local dt = now - s.fitT
		local pred = s.pos + s.vel * dt - Vector3.new(0, 0.5 * s.gUse * dt * dt, 0)
		if (p - pred).Magnitude > 1.5 then -- someone hit it
			s.buf = { last }
			buf = s.buf
			s.arcs = s.arcs + 1
		end
	end
	buf[#buf + 1] = { t = now, p = p }
	while #buf > 2 and now - buf[1].t > WINDOW do table.remove(buf, 1) end
	s.pos, s.vel, s.gUse = fit(s)
	s.fitT, s.moved = now, now
end

-- Where the ball will be when it falls to height y, and how long until then.
local function intercept(p, v, g, y)
	local a, b, c = 0.5 * g, -v.Y, y - p.Y
	local disc = b * b - 4 * a * c
	local t = disc >= 0 and (-b + math.sqrt(disc)) / (2 * a) or -1
	if t < 0 then return Vector3.new(p.X, y, p.Z), 0 end
	return Vector3.new(p.X + v.X * t, y, p.Z + v.Z * t), t
end

---------------------------------------------------------------- Your square
local zonePart, home = nil, nil

local function partUnder(root)
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { lp.Character }
	local hit = workspace:Raycast(root.Position, Vector3.new(0, -12, 0), params)
	return hit and hit.Instance
end

-- A tile-sized part under you is your square; the 72x72 round floor or lobby is not.
local function tileUnder(root)
	local p = partUnder(root)
	if p and p.Size.X >= 6 and p.Size.Z >= 6 and p.Size.X <= 40 and p.Size.Z <= 40 then return p end
end

local function setHome(root)
	zonePart = tileUnder(root)
	home = zonePart and Vector3.new(zonePart.Position.X, root.Position.Y, zonePart.Position.Z) or root.Position
end

local function zoneRadius()
	return zonePart and math.max(zonePart.Size.X, zonePart.Size.Z) / 2 or CFG.zone
end

local function inZone(pos)
	if zonePart and zonePart.Parent then
		local l = zonePart.CFrame:PointToObjectSpace(pos)
		return math.abs(l.X) <= zonePart.Size.X / 2 + 1.5 and math.abs(l.Z) <= zonePart.Size.Z / 2 + 1.5
	end
	return flat(pos - home).Magnitude <= CFG.zone
end

---------------------------------------------------------------- Aiming
local aimPoint, aimUntil, camSaved = nil, 0, nil
local function aimActive() return aimPoint ~= nil and os.clock() < aimUntil end
local function aimAt(pos, secs) aimPoint, aimUntil = pos, os.clock() + secs end

local function face(root, pos)
	local look = Vector3.new(pos.X, root.Position.Y, pos.Z)
	if (look - root.Position).Magnitude > 0.1 then root.CFrame = CFrame.lookAt(root.Position, look) end
end

-- Runs after the camera script, so shift lock can't turn you back before the hit goes out.
local aimBind = "VolleyAIAim" .. tostring(os.clock())
RunService:BindToRenderStep(aimBind, Enum.RenderPriority.Camera.Value + 1, function()
	local cam = workspace.CurrentCamera
	if aimActive() then
		local root = myRoot()
		if root then face(root, aimPoint) end
		if CFG.cameraAim then
			if not camSaved then camSaved = cam.CFrame - cam.CFrame.Position end
			cam.CFrame = CFrame.lookAt(cam.CFrame.Position, aimPoint)
		end
	elseif camSaved then
		cam.CFrame = CFrame.new(cam.CFrame.Position) * camSaved -- put your view back
		camSaved = nil
	end
end)

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

---------------------------------------------------------------- Game remotes
local Net = ReplicatedStorage:FindFirstChild("Packages")
Net = Net and Net:FindFirstChild("Net")
local function remote(name) return Net and Net:FindFirstChild(name) end
local HitBall = remote("RE/HitBall")

local function ser(v, depth)
	depth = depth or 0
	local t = typeof(v)
	if t == "Vector3" then
		return string.format("V3(%.2f,%.2f,%.2f)", v.X, v.Y, v.Z)
	elseif t == "CFrame" then
		local p, l = v.Position, v.LookVector
		return string.format("CF(%.1f,%.1f,%.1f look %.2f,%.2f,%.2f)", p.X, p.Y, p.Z, l.X, l.Y, l.Z)
	elseif t == "Instance" then
		return v:GetFullName()
	elseif t == "number" then
		return v == math.floor(v) and tostring(v) or string.format("%.3f", v)
	elseif t == "string" then
		return string.format("%q", v:sub(1, 60))
	elseif t == "table" then
		if depth >= 2 then return "{...}" end
		local parts = {}
		for k, x in pairs(v) do
			if #parts >= 12 then parts[#parts + 1] = "..." break end
			parts[#parts + 1] = tostring(k) .. "=" .. ser(x, depth + 1)
		end
		return "{" .. table.concat(parts, ", ") .. "}"
	end
	return t .. ":" .. tostring(v)
end

local function serArgs(pack)
	local out = {}
	for i = 1, pack.n do out[i] = ser(pack[i]) end
	return "(" .. table.concat(out, ", ") .. ")"
end

-- Turn a direction toward the aim point, keeping its height so the game's arc stays the same.
local function yawToward(dir, from)
	local h = flat(aimPoint - from)
	if h.Magnitude < 0.1 then return dir end
	h = h.Unit
	local y = math.clamp(dir.Y, -0.95, 0.95)
	local r = math.sqrt(1 - y * y)
	return Vector3.new(h.X * r, y, h.Z * r)
end

local function rewrite(v, from)
	local t = typeof(v)
	if t == "Vector3" and math.abs(v.Magnitude - 1) < 0.15 and math.abs(v.Y) < 0.9 then
		return yawToward(v.Unit, from), true
	elseif t == "CFrame" then
		return CFrame.lookAt(v.Position, v.Position + yawToward(v.LookVector, from)), true
	end
	return v, false
end

-- Watch (and while the AI is aiming, steer) the game's own HitBall:FireServer calls.
local hook = { ok = false, fired = 0, aimed = 0, lastFire = 0, log = {} }
if HitBall and hookmetamethod and getnamecallmethod then
	local wrap = newcclosure or function(f) return f end
	local fromExecutor = checkcaller or function() return false end
	local old
	pcall(function()
		old = hookmetamethod(game, "__namecall", wrap(function(self, ...)
			if alive and self == HitBall and not fromExecutor() and getnamecallmethod() == "FireServer" then
				local args = table.pack(...)
				pcall(function()
					hook.fired, hook.lastFire = hook.fired + 1, os.clock()
					local entry = { orig = serArgs(args) }
					local root = myRoot()
					if aimActive() and root then
						local changed = false
						for i = 1, args.n do
							local v = args[i]
							if typeof(v) == "table" then
								local copy = {}
								for k, x in pairs(v) do
									local nx, c = rewrite(x, root.Position)
									copy[k], changed = nx, changed or c
								end
								args[i] = copy
							else
								local nv, c = rewrite(v, root.Position)
								args[i], changed = nv, changed or c
							end
						end
						if changed then
							hook.aimed = hook.aimed + 1
							entry.sent = serArgs(args)
						end
					end
					table.insert(hook.log, 1, entry)
					hook.log[4] = nil
				end)
				return old(self, table.unpack(args, 1, args.n))
			end
			return old(self, ...)
		end))
	end)
	hook.ok = old ~= nil
end

-- Keep the last few messages the server sends about the ball, for the report.
local recv = {}
for _, name in ipairs({ "RE/BallState", "RE/HitBall", "RE/BallService/Resync" }) do
	local r = remote(name)
	if r then
		local rec = { count = 0, last = {} }
		recv[name] = rec
		table.insert(conns, r.OnClientEvent:Connect(function(...)
			rec.count = rec.count + 1
			table.insert(rec.last, 1, table.pack(...))
			rec.last[4] = nil
		end))
	end
end

---------------------------------------------------------------- Input
-- Several ways to press bump/dive. With the hook on, three presses in a row that never reach
-- HitBall switch to the next way.
local METHODS = { "center", "tap", "signal", "exec" }
local method, misses, pending = 1, 0, nil

local function hudButton(name)
	local pg = lp:FindFirstChild("PlayerGui")
	local hud = pg and pg:FindFirstChild("HUD")
	hud = hud and hud:FindFirstChild("HUD")
	if not hud then return nil end
	local mob = hud:FindFirstChild("MobileControls")
	local b = mob and mob.Visible and mob:FindFirstChild(name)
	if b and b.Visible then return b end
	local bottom = hud:FindFirstChild("Bottom")
	return bottom and bottom:FindFirstChild(name)
end

local function vimClick(x, y)
	pcall(function()
		VIM:SendMouseButtonEvent(x, y, 0, true, game, 0)
		task.wait(0.03)
		VIM:SendMouseButtonEvent(x, y, 0, false, game, 0)
	end)
end

local function screenCenter()
	local vp = workspace.CurrentCamera.ViewportSize
	return vp.X / 2, vp.Y / 2
end

local function guiCenter(b)
	local p = b.AbsolutePosition + b.AbsoluteSize / 2
	local sg = b:FindFirstAncestorOfClass("ScreenGui")
	if sg and not sg.IgnoreGuiInset then p = p + GuiService:GetGuiInset() end
	return p.X, p.Y
end

local function fireButton(b)
	if not (b and b:IsA("GuiButton")) then return false end
	local fired = false
	for _, sig in ipairs({ b.Activated, b.MouseButton1Down, b.MouseButton1Click }) do
		if firesignal then
			fired = pcall(firesignal, sig) or fired
		elseif getconnections then
			local ok, list = pcall(getconnections, sig)
			for _, c in ipairs(ok and list or {}) do
				fired = pcall(function() c:Fire() end) or fired
			end
		end
	end
	return fired
end

local function pressKey(key)
	pcall(function()
		VIM:SendKeyEvent(true, key, false, game)
		task.wait(0.05)
		VIM:SendKeyEvent(false, key, false, game)
	end)
end

local function act(kind)
	if kind == "bump" then pending = os.clock() end
	task.spawn(function()
		local m = METHODS[method]
		local b = hudButton(kind == "dive" and "AbilityButton" or "BumpSpikeButton")
		if m == "tap" and b then
			vimClick(guiCenter(b))
		elseif m == "signal" and fireButton(b) then
			return
		elseif m == "exec" and kind == "bump" and mouse1click then
			mouse1click()
		elseif kind == "dive" then
			pressKey(Enum.KeyCode.E)
		else
			vimClick(screenCenter())
		end
	end)
end

---------------------------------------------------------------- AI
local on = false
local lastAct, lastTouch, lastText, lastTileCheck = 0, 0, 0, 0
local touches, possession, spikeRoll, aimTgt = 0, false, false, nil
local stats = { bumps = 0, spikes = 0, dives = 0, cameBack = 0, confirmed = 0 }
local lastErr, curBall = nil, nil

local function setOn(v)
	on = v
	local r = myRoot()
	if r then setHome(r) end
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

local function bump(root, tgt)
	if tgt then
		local d = flat(tgt.Position - root.Position).Magnitude
		aimAt(tgt.Position + Vector3.new(0, d * CFG.aimLift, 0), 0.35)
		task.delay(0.05, act, "bump") -- let the turn reach the server first
	else
		act("bump")
	end
end

local function spike(hum, tgt)
	if tgt then aimAt(tgt.Position, CFG.spikeDelay + 0.35) end
	task.spawn(pressKey, Enum.KeyCode.Space)
	hum.Jump = true
	task.delay(CFG.spikeDelay, act, "bump")
end

local function setStatus(text)
	if os.clock() - lastText > 0.25 then
		lastText = os.clock()
		status.Text = text
	end
end

local function step()
	local now = os.clock()
	local count = 0
	for part, s in pairs(tracked) do
		if not part.Parent then
			tracked[part] = nil
		else
			count = count + 1
			updateBall(part, s, now)
		end
	end

	-- Did the last press reach the game? (needs the hook)
	if pending and hook.ok and now - pending > 0.45 then
		if hook.lastFire >= pending then
			misses, stats.confirmed = 0, stats.confirmed + 1
		else
			misses = misses + 1
			if misses >= 3 then misses, method = 0, method % #METHODS + 1 end
		end
		pending = nil
	end

	local ch = lp.Character
	local root = ch and ch:FindFirstChild("HumanoidRootPart")
	local hum = ch and ch:FindFirstChildOfClass("Humanoid")
	if not (on and root and hum and hum.Health > 0) then
		curBall = nil
		setStatus(on and "waiting for character" or ("idle | " .. count .. " ball candidates"))
		return
	end

	if aimActive() then face(root, aimPoint) end

	-- Find your square again after a new round or a teleport.
	if not home then setHome(root) end
	if not possession and now - lastTileCheck > 2 then
		lastTileCheck = now
		local t = tileUnder(root)
		if (t and t ~= zonePart) or (not t and flat(root.Position - home).Magnitude > zoneRadius() * 2 + 6) then
			setHome(root)
		end
	end

	local ball, best
	for part, s in pairs(tracked) do
		if now - s.moved < 0.25 and s.vel.Magnitude > 1 then
			local d = (s.pos - root.Position).Magnitude
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
	local bpos, vel, g = s.pos, s.vel, math.clamp(s.gUse, 10, 800)

	-- BallShadow: if it sits away from the ball while it flies, it marks the landing spot. Use it.
	local shadow = workspace:FindFirstChild("BallShadow")
	if shadow then s.shadowOff = s.shadowOff + (flat(shadow.Position - bpos).Magnitude - s.shadowOff) * 0.1 end
	local marker = shadow and s.shadowOff > 3
	local groundY = shadow and shadow.Position.Y or root.Position.Y - 3

	local target = intercept(bpos, vel, g, root.Position.Y + 1)
	local landing, tLand = intercept(bpos, vel, g, groundY + 1.5)
	if marker then
		target = Vector3.new(shadow.Position.X, root.Position.Y + 1, shadow.Position.Z)
		landing = Vector3.new(shadow.Position.X, groundY, shadow.Position.Z)
	end
	local mine = inZone(landing)

	-- Possession: starts when the ball is coming down in your square, ends once it has left it.
	if mine and not possession then
		possession, touches = true, 0
		spikeRoll = math.random() < CFG.spikeChance
		aimTgt = pickTarget(home)
	elseif possession and not mine and not inZone(bpos) then
		possession, touches, aimTgt = false, 0, nil
	end
	if aimTgt and not aimTgt.Parent then aimTgt = pickTarget(home) end

	-- Stand so the ball drops in front of you, toward your target, never straight onto your head.
	local moveTo = home
	if mine then
		local away = aimTgt and flat(aimTgt.Position - target) or -flat(vel)
		moveTo = away.Magnitude > 0.1 and (target - away.Unit * CFG.standOff) or target
	end
	if flat(moveTo - root.Position).Magnitude > 0.5 then hum:MoveTo(moveTo) end

	local rel = bpos - root.Position
	local fr = flat(rel).Magnitude
	local approaching = rel:Dot(vel) < 0
	local ownHitRising = now - lastTouch < 0.8 and vel.Y > 0 -- your last touch is still going up: leave it
	if mine and now - lastAct >= CFG.cooldown and not ownHitRising then
		local wantSpike = CFG.spike and (touches >= 1 or spikeRoll)
		if approaching and wantSpike and fr <= 6 and rel.Y >= 2 and rel.Y <= 10 then
			touched("spikes")
			spike(hum, aimTgt)
		elseif approaching and rel.Magnitude <= CFG.hitRange and not (wantSpike and rel.Y > 4) then
			touched("bumps")
			bump(root, aimTgt)
		elseif vel.Y < 0 and tLand > 0 and tLand <= CFG.diveLead and rel.Magnitude > CFG.hitRange
			and flat(landing - root.Position).Magnitude <= CFG.diveRange then
			touched("dives")
			lastAct = now + 0.2 -- dive recovery on top of the cooldown
			face(root, landing)
			act("dive")
		end
	end

	setStatus(string.format("%s %.0f | t%d/%d%s", ball.Name, best, touches, CFG.maxTouches, mine and "" or " | out"))
end

---------------------------------------------------------------- Report
local function attrs(inst)
	local t = {}
	for k, v in pairs(inst:GetAttributes()) do t[#t + 1] = k .. "=" .. tostring(v) end
	return table.concat(t, ", ")
end

local function buildReport()
	local L = {}
	local function add(line) L[#L + 1] = line end
	local okE, exec = pcall(function() return (identifyexecutor()) end)
	local root = myRoot()
	add("Volley AI v3 report " .. os.date("%Y-%m-%d %H:%M:%S"))
	add("place " .. game.PlaceId .. " | executor " .. (okE and tostring(exec) or "?") .. " | AI " .. (on and "on" or "off"))
	add(string.format("bumps %d spikes %d dives %d came-back %d confirmed %d | touches now %d",
		stats.bumps, stats.spikes, stats.dives, stats.cameBack, stats.confirmed, touches))
	add(string.format("hook %s | HitBall fired %d, aimed %d | input %s",
		hook.ok and "on" or "unavailable", hook.fired, hook.aimed, METHODS[method]))
	add("last error: " .. tostring(lastErr or "none"))

	add("-- square --")
	add("zone: " .. (zonePart and string.format("tile %s size %.0fx%.0f", zonePart:GetFullName(), zonePart.Size.X, zonePart.Size.Z)
		or ("radius " .. CFG.zone)))
	local under = root and partUnder(root)
	add("standing on: " .. (under and string.format("%s size %.1f,%.1f,%.1f {%s}",
		under:GetFullName(), under.Size.X, under.Size.Y, under.Size.Z, attrs(under)) or "nothing"))
	local idStr, owned = tostring(lp.UserId), 0
	for _, o in ipairs(workspace:GetDescendants()) do
		if owned >= 15 then break end
		for k, v in pairs(o:GetAttributes()) do
			local sv = tostring(v)
			if sv == lp.Name or sv == idStr or sv == lp.DisplayName then
				owned = owned + 1
				add("tagged with you: " .. o:GetFullName() .. " ." .. k)
			end
		end
		if o:IsA("ObjectValue") and o.Value == lp then
			owned = owned + 1
			add("points at you: " .. o:GetFullName())
		end
	end

	add("-- ball --")
	if curBall and tracked[curBall] then
		local s = tracked[curBall]
		add(string.format("%s | speed %.1f | gravity fit %.0f (remembered %.0f) | arcs %d | shadow offset %.1f",
			curBall:GetFullName(), s.vel.Magnitude, s.gUse, s.g, s.arcs, s.shadowOff))
		for _, d in ipairs(curBall:GetDescendants()) do
			if d:IsA("TextLabel") and #d.Text > 0 then add("ball text: " .. d.Text) end
		end
	else
		add("no ball in play")
	end
	local n = 0
	for part, s in pairs(tracked) do
		n = n + 1
		if n > 20 then add("...") break end
		add(string.format("candidate %s [%s] size %.1f anchored %s speed %.1f {%s}",
			part:GetFullName(), part.ClassName, part.Size.X, tostring(part.Anchored), s.vel.Magnitude, attrs(part)))
	end

	add("-- HitBall calls (what the game sent, => what the AI changed it to) --")
	for _, e in ipairs(hook.log) do add(e.orig .. (e.sent and ("  =>  " .. e.sent) or "")) end
	add("-- from the server --")
	for name, rec in pairs(recv) do
		add(name .. " received " .. rec.count)
		for _, pk in ipairs(rec.last) do add("  " .. serArgs(pk)) end
	end

	add("-- numbers on screen --")
	n = 0
	local pg = lp:FindFirstChild("PlayerGui")
	for _, o in ipairs(pg and pg:GetDescendants() or {}) do
		if (o:IsA("TextLabel") or o:IsA("TextButton")) and o.Visible and #o.Text > 0 and #o.Text < 40 then
			local low = o.Text:lower()
			if o.Text:find("%d") or low:find("touch") or low:find("hit") then
				n = n + 1
				if n > 25 then add("...") break end
				add(o:GetFullName():gsub("^Players%.[^%.]+%.PlayerGui%.", "") .. " = " .. o.Text)
			end
		end
	end

	local names = {}
	for _, c in ipairs(workspace:GetChildren()) do
		if #names >= 80 then break end
		names[#names + 1] = c.Name
	end
	add("-- workspace --")
	add(table.concat(names, ", "))
	local go = workspace:FindFirstChild("GameObjects")
	if go then
		names = {}
		for _, c in ipairs(go:GetChildren()) do names[#names + 1] = c.Name end
		add("GameObjects: " .. table.concat(names, ", "))
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

---------------------------------------------------------------- Wiring
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

table.insert(conns, RunService.Heartbeat:Connect(function()
	local ok, err = pcall(step)
	if not ok and lastErr == nil then
		lastErr = tostring(err)
		status.Text = "error: " .. lastErr
		notify("error: " .. lastErr)
	end
end))

table.insert(conns, gui.Destroying:Connect(function()
	alive = false
	for _, c in ipairs(conns) do c:Disconnect() end
	RunService:UnbindFromRenderStep(aimBind)
end))

notify((gui.Parent and "loaded. tap AI or press Z" or "loaded, GUI could not be placed. Z still toggles")
	.. (hook.ok and "" or " (no hook: aiming by turning only)"))
