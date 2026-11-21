-- Volley Bomb AI v4 | Roblox executor script (Luau, no UI library, no other loadstrings)
-- Reads the ball's exact flight from the game's BallState messages (origin, velocity, gravity,
-- landing time, squares), so it knows where and when the ball lands and whose square that is.
-- Steers the direction inside the game's own HitBall call toward the spot in an occupied enemy
-- square furthest from whoever stands there, using bump/spike speeds learned from your own hits.
-- Camera untouched. Toggle: AI button or Z. Report copies a debug dump.

if not game:IsLoaded() then game.Loaded:Wait() end

local CFG = {
	hitRange    = 9,     -- studs: bump when the ball is this close
	hitHeight   = 1.5,   -- studs above your root where you meet the ball
	diveRange   = 16,    -- studs: furthest landing spot a dive can still reach
	diveLead    = 0.3,   -- seconds before landing to dive when you can't get under it
	standOff    = 2,     -- studs: stand behind the hit spot so the ball meets you in front
	cooldown    = 0.5,   -- the game's bump cooldown
	spike       = true,
	spikeChance = 0.35,  -- chance to spike a fresh ball instead of bumping it
	spikeDelay  = 0.15,  -- seconds from jump to click
	assist      = true,  -- also aim your own hits while the AI is off
	zone        = 25,    -- studs: square radius used only when the game sends no squares
	names       = { "ball", "bomb" }, -- fallback ball finder when the game sends no BallState
	cameraAim   = false, -- true: also flick the camera to the aim for a moment, then put it back
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

---------------------------------------------------------------- Flight maths
-- A flight is { Origin, Velocity, Gravity, Time, EndTime } in server time, the same shape the
-- game's BallState uses: position = Origin + Velocity*t + Gravity*t*t/2.
local function ballAt(st, T)
	local dt = T - st.Time
	return st.Origin + st.Velocity * dt + st.Gravity * (0.5 * dt * dt)
end

local function velAt(st, T) return st.Velocity + st.Gravity * (T - st.Time) end

-- Server time when the ball comes down through height H (the later crossing), or nil.
local function timeAtHeight(st, H)
	local a, b, c = 0.5 * st.Gravity.Y, st.Velocity.Y, st.Origin.Y - H
	if math.abs(a) < 1e-6 then
		if math.abs(b) < 1e-6 then return nil end
		local t = -c / b
		return t >= 0 and st.Time + t or nil
	end
	local disc = b * b - 4 * a * c
	if disc < 0 then return nil end
	local r = math.sqrt(disc)
	local t = math.max((-b - r) / (2 * a), (-b + r) / (2 * a))
	return t >= 0 and st.Time + t or nil
end

---------------------------------------------------------------- Fallback tracking
-- Only used when the game sends no BallState: fit the ball's last half second of movement.
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
	local go = workspace:FindFirstChild("GameObjects") -- shop displays, NPC cosmetics, zones
	if go and o:IsDescendantOf(go) then return end
	local sz = o.Size
	local ballSized = o.Parent == workspace and sz.X >= 1.5 and sz.X <= 8
		and math.abs(sz.X - sz.Y) < 0.5 and math.abs(sz.X - sz.Z) < 0.5
	local named = matches(o.Name) or (o.Parent and o.Parent:IsA("Model") and matches(o.Parent.Name))
	local sphere = o:IsA("Part") and o.Shape == Enum.PartType.Ball
	if not (ballSized or named or sphere) then return end
	local m = o:FindFirstAncestorOfClass("Model")
	if m and m:FindFirstChildOfClass("Humanoid") then return end -- players and bots
	tracked[o] = {
		buf = {}, pos = o.Position, vel = Vector3.zero, g = workspace.Gravity, gUse = workspace.Gravity,
		fitT = 0, moved = 0, arcs = 0,
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
			if n >= 6 and span >= 0.15 then s.g = s.g + (gf - s.g) * 0.25 end
		else
			a = nil
		end
	end
	if not a then
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
		if (p - pred).Magnitude > 1.5 then
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

---------------------------------------------------------------- Squares
local function zoneAt(zones, p)
	for _, z in ipairs(zones or {}) do
		if z.Parent then
			local l = z.CFrame:PointToObjectSpace(p)
			local mx, mz = z.Size.X / 2 - math.abs(l.X), z.Size.Z / 2 - math.abs(l.Z)
			if mx >= 0 and mz >= 0 then return z, math.min(mx, mz) end
		end
	end
end

local function nearZone(z, p, pad)
	if not (z and z.Parent) then return false end
	local l = z.CFrame:PointToObjectSpace(p)
	return math.abs(l.X) <= z.Size.X / 2 + pad and math.abs(l.Z) <= z.Size.Z / 2 + pad
end

local function contains(list, x)
	for _, v in ipairs(list or {}) do
		if v == x then return true end
	end
	return false
end

-- Everyone who can receive the ball: players and the game's bots.
local function bodies()
	local list = {}
	for _, m in ipairs(workspace:GetChildren()) do
		if m:IsA("Model") and m ~= lp.Character then
			local h = m:FindFirstChildOfClass("Humanoid")
			local r = m:FindFirstChild("HumanoidRootPart")
			if h and r and h.Health > 0 then list[#list + 1] = r end
		end
	end
	return list
end

---------------------------------------------------------------- Game remotes
local Net = ReplicatedStorage:FindFirstChild("Packages")
Net = Net and Net:FindFirstChild("Net")
local function remote(name) return Net and Net:FindFirstChild(name) end
local HitBall, BallState = remote("RE/HitBall"), remote("RE/BallState")

local states = {}      -- arena -> latest flight from the server
local learned = {}     -- hit type -> { h = flat speed, vy = up speed, g = gravity Y, n = samples }
local arena = { zones = nil, myZone = nil, ground = nil }
local lastSent, lastActKind, lastActT = nil, nil, 0
local stateCount, stateLog = 0, {}

local function learn(kind, st)
	local h, vy, g = flat(st.Velocity).Magnitude, st.Velocity.Y, st.Gravity.Y
	local L = learned[kind]
	if not L then
		learned[kind] = { h = h, vy = vy, g = g, n = 1 }
	else
		L.h, L.vy, L.g, L.n = L.h + (h - L.h) * 0.3, L.vy + (vy - L.vy) * 0.3, L.g + (g - L.g) * 0.3, L.n + 1
	end
end

if BallState then
	table.insert(conns, BallState.OnClientEvent:Connect(function(st)
		stateCount = stateCount + 1
		table.insert(stateLog, 1, st)
		stateLog[3] = nil
		if type(st) ~= "table" or typeof(st.Origin) ~= "Vector3" or typeof(st.Velocity) ~= "Vector3"
			or typeof(st.Gravity) ~= "Vector3" or type(st.Time) ~= "number" then return end
		local zones = {}
		if type(st.Zones) == "table" then
			for _, z in pairs(st.Zones) do
				if typeof(z) == "Instance" and z:IsA("BasePart") then zones[#zones + 1] = z end
			end
		end
		local rec = {
			Origin = st.Origin, Velocity = st.Velocity, Gravity = st.Gravity, Time = st.Time,
			EndTime = type(st.EndTime) == "number" and st.EndTime or st.Time + 3,
			Hits = st.Hits, Hitter = st.Hitter, Skin = st.Skin, Arena = st.Arena,
			HitZone = st.HitZone, zones = zones, id = st.Time,
		}
		rec.ground = ballAt(rec, rec.EndTime).Y
		states[tostring(st.Arena or st.Skin or "ball")] = rec
		if st.Hitter == lp then -- learn what your own hit types do
			local kind = (lastSent and os.clock() - lastSent.t < 1.5) and lastSent.kind or lastActKind
			if kind then learn(kind, rec) end
		end
	end))
end

-- The flight in your arena: the newest one whose squares include the one you're in.
local function myArena(T, root)
	local best, bestZone
	for key, rec in pairs(states) do
		if rec.EndTime < T - 1.5 then
			states[key] = nil
		else
			local z = zoneAt(rec.zones, root.Position)
			-- just over your own line while chasing still counts; the lobby does not
			if not z and contains(rec.zones, arena.myZone) and nearZone(arena.myZone, root.Position, 8) then
				z = arena.myZone
			end
			if z and (not best or rec.Time > best.Time) then best, bestZone = rec, z end
		end
	end
	return best, bestZone
end

---------------------------------------------------------------- Aim choice
-- Where a shot of this type lands if sent along dir from `from`, using what your hits did before.
local function landingFor(L, from, dir, ground)
	local a, b, c = 0.5 * L.g, L.vy, from.Y - ground
	if a > -1e-3 then return nil end
	local disc = b * b - 4 * a * c
	if disc < 0 then return nil end
	local t = (-b - math.sqrt(disc)) / (2 * a)
	if t <= 0 then return nil end
	return Vector3.new(from.X + dir.X * L.h * t, ground, from.Z + dir.Z * L.h * t)
end

-- Best flat direction for a hit of `kind` from `from`, or nil to leave the game's own.
-- Scores 48 directions: lands in an occupied enemy square, far from that player, off the lines.
local function bestDir(kind, from, jitter)
	local zones, mine = arena.zones, arena.myZone
	local list = bodies()
	if not zones or #zones == 0 then
		local best, bd
		for _, r in ipairs(list) do
			local d = flat(r.Position - from).Magnitude
			if d >= 20 and d <= 140 and (not bd or d > bd) then best, bd = r, d end
		end
		return best and flat(best.Position - from).Unit or nil
	end

	local occ = {}
	for _, r in ipairs(list) do
		local z = zoneAt(zones, r.Position)
		if z and z ~= mine and not occ[z] then occ[z] = r.Position end
	end

	local L = learned[kind] or learned.Bump
	if not L or not arena.ground then -- nothing learned yet: the nearest occupied square's middle
		local best, bd
		for z in pairs(occ) do
			local d = flat(z.Position - from).Magnitude
			if not bd or d < bd then best, bd = z, d end
		end
		local v = best and flat(best.Position - from)
		return v and v.Magnitude > 0.1 and v.Unit or nil
	end

	local best, bestScore
	for i = 0, 47 do
		local ang = i * math.pi / 24
		local dir = Vector3.new(math.cos(ang), 0, math.sin(ang))
		local land = landingFor(L, from, dir, arena.ground)
		if land then
			local z, margin = zoneAt(zones, land)
			local score
			if not z then
				score = -100
			elseif z == mine then
				score = -50
			elseif occ[z] then
				score = 100 + math.min(flat(land - occ[z]).Magnitude, 30) * 2 + math.min(margin, 5) * 3
			else
				score = 10 + math.min(margin, 5)
			end
			if jitter then score = score + math.random() * 6 end
			if not bestScore or score > bestScore then best, bestScore = dir, score end
		end
	end
	if bestScore and bestScore > 0 then return best end
end

---------------------------------------------------------------- Hook
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
		local cap = depth == 0 and 30 or 12
		local parts = {}
		for k, x in pairs(v) do
			if #parts >= cap then parts[#parts + 1] = "..." break end
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

local on = false

-- HitBall:FireServer(type, direction, ballPosition, serverTime, ...). The AI swaps the direction.
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
					local kind = type(args[1]) == "string" and args[1] or "?"
					lastSent = { kind = kind, t = os.clock() }
					local entry = { orig = serArgs(args), by = (os.clock() - lastActT < 0.6) and ("AI " .. tostring(lastActKind)) or "you" }
					if (on or CFG.assist) and typeof(args[2]) == "Vector3" then
						local root = myRoot()
						local from = typeof(args[3]) == "Vector3" and args[3] or (root and root.Position)
						local dir = from and bestDir(kind, from, true)
						if dir then
							args[2] = dir
							hook.aimed = hook.aimed + 1
							entry.sent = ser(dir)
						end
					end
					table.insert(hook.log, 1, entry)
					hook.log[9] = nil
				end)
				return old(self, table.unpack(args, 1, args.n))
			end
			return old(self, ...)
		end))
	end)
	hook.ok = old ~= nil
end

---------------------------------------------------------------- Facing (camera left alone)
local aimPoint, aimUntil, camSaved = nil, 0, nil
local function aimActive() return aimPoint ~= nil and os.clock() < aimUntil end
local function aimAt(pos, secs) aimPoint, aimUntil = pos, os.clock() + secs end

local function face(root, pos)
	local look = Vector3.new(pos.X, root.Position.Y, pos.Z)
	if (look - root.Position).Magnitude > 0.1 then root.CFrame = CFrame.lookAt(root.Position, look) end
end

-- After the camera script, so shift lock can't turn you back before the hit goes out.
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
		cam.CFrame = CFrame.new(cam.CFrame.Position) * camSaved
		camSaved = nil
	end
end)

---------------------------------------------------------------- Input
-- With the hook on, three presses in a row that never reach HitBall switch to the next way.
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
	lastActKind, lastActT = kind, os.clock()
	if kind ~= "Dive" then pending = os.clock() end
	task.spawn(function()
		local m = METHODS[method]
		local b = hudButton(kind == "Dive" and "AbilityButton" or "BumpSpikeButton")
		if m == "tap" and b then
			vimClick(guiCenter(b))
		elseif m == "signal" and fireButton(b) then
			return
		elseif m == "exec" and kind ~= "Dive" and mouse1click then
			mouse1click()
		elseif kind == "Dive" then
			pressKey(Enum.KeyCode.E)
		else
			vimClick(screenCenter())
		end
	end)
end

---------------------------------------------------------------- AI
local lastAct, lastTouch, lastText = 0, 0, 0
local fallbackHome, arcId, arcDir, spikeRoll = nil, nil, nil, false
local stats = { bumps = 0, spikes = 0, dives = 0, cameBack = 0, confirmed = 0 }
local lastErr, cur = nil, nil

local function setOn(v)
	on = v
	local r = myRoot()
	fallbackHome = r and r.Position
	arcId = nil
	btn.Text = on and "AI ON" or "AI OFF"
	btn.BackgroundColor3 = on and GREEN or RED
end

local function setStatus(text)
	if os.clock() - lastText > 0.25 then
		lastText = os.clock()
		status.Text = text
	end
end

-- Fallback flight built from the tracked ball when the game sends none.
local function trackedFlight(root, T, now)
	local ball, best
	for part, s in pairs(tracked) do
		if now - s.moved < 0.25 and s.vel.Magnitude > 1 then
			local d = (s.pos - root.Position).Magnitude
			if not best or d < best then ball, best = part, d end
		end
	end
	if not ball then return nil end
	local s = tracked[ball]
	local shadow = workspace:FindFirstChild("BallShadow")
	local ground = arena.ground or (shadow and shadow.Position.Y + 1.5) or root.Position.Y - 1.5
	local rec = {
		Origin = s.pos, Velocity = s.vel, Gravity = Vector3.new(0, -math.clamp(s.gUse, 10, 800), 0),
		Time = T, Skin = ball.Name, id = tostring(ball) .. s.arcs, zones = {},
	}
	rec.EndTime = timeAtHeight(rec, ground) or T
	return rec
end

local function step()
	local now = os.clock()
	for part, s in pairs(tracked) do
		if not part.Parent then tracked[part] = nil else updateBall(part, s, now) end
	end

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
	if not root then
		setStatus("waiting for character")
		return
	end

	local T = workspace:GetServerTimeNow()
	local st, zone = myArena(T, root)
	if st then
		arena.zones, arena.myZone, arena.ground = st.zones, zone, st.ground
	end

	if not (on and hum and hum.Health > 0) then
		cur = nil
		setStatus(arena.myZone and "idle | square found" or "idle | no square yet")
		return
	end
	if aimActive() then face(root, aimPoint) end

	local home = arena.myZone and Vector3.new(arena.myZone.Position.X, root.Position.Y, arena.myZone.Position.Z)
		or fallbackHome or root.Position
	if not st and stateCount == 0 then st = trackedFlight(root, T, now) end
	cur = st

	if not st or T > st.EndTime then
		-- back to the middle of your square between rallies; out of the arena, leave you alone
		local inSquare = arena.myZone and nearZone(arena.myZone, root.Position, 8)
			or (stateCount == 0 and flat(root.Position - home).Magnitude < CFG.zone * 2)
		if inSquare and flat(root.Position - home).Magnitude > 2 then hum:MoveTo(home) end
		setStatus(stateCount > 0 and "waiting for a rally" or "no ball | no BallState yet")
		return
	end

	local bpos, bvel = ballAt(st, T), velAt(st, T)
	local landing = ballAt(st, st.EndTime)
	local mine
	if arena.myZone and #st.zones > 0 then
		mine = zoneAt({ arena.myZone }, landing) ~= nil
	else
		mine = flat(landing - home).Magnitude <= CFG.zone
	end

	local ours = st.Hitter == lp or (stateCount == 0 and now - lastTouch < 3)
	if st.id ~= arcId then -- a new flight: decide once how to play it
		arcId = st.id
		spikeRoll = math.random() < CFG.spikeChance
		arcDir = nil
		if mine then
			if ours then stats.cameBack = stats.cameBack + 1 end
			local hitT = timeAtHeight(st, root.Position.Y + CFG.hitHeight)
			local from = hitT and hitT <= st.EndTime and ballAt(st, hitT) or landing
			arcDir = bestDir((CFG.spike and (ours or spikeRoll)) and "Spike" or "Bump", from, false)
		end
	end
	local wantSpike = CFG.spike and (ours or spikeRoll)

	-- Where to meet it: the point it comes down through your hitting height, if you can get there.
	local tHit = timeAtHeight(st, root.Position.Y + CFG.hitHeight)
	if tHit and (tHit < T or tHit > st.EndTime) then tHit = nil end
	local hitPoint = tHit and ballAt(st, tHit) or landing
	local timeLeft = (tHit or st.EndTime) - T
	local canReach = flat(hitPoint - root.Position).Magnitude
		<= math.max(hum.WalkSpeed, 1) * timeLeft + CFG.hitRange * 0.5

	local moveTo = home
	if mine then
		if canReach then
			local back = arcDir or -flat(bvel)
			moveTo = back.Magnitude > 0.1 and (hitPoint - back.Unit * CFG.standOff) or hitPoint
		else
			moveTo = landing -- too far to get under it: run for the dive
		end
	end
	if flat(moveTo - root.Position).Magnitude > 0.5 then hum:MoveTo(moveTo) end

	local rel = bpos - root.Position
	local approaching = rel:Dot(bvel) < 0
	local ownRising = ours and bvel.Y > 0 -- your own touch is still going up: leave it
	if mine and now - lastAct >= CFG.cooldown and not ownRising then
		local soon = ballAt(st, math.min(T + CFG.spikeDelay, st.EndTime)) - root.Position
		if approaching and wantSpike and flat(soon).Magnitude <= 6 and soon.Y >= 2 and soon.Y <= 10 then
			stats.spikes, lastTouch, lastAct = stats.spikes + 1, now, now
			if arcDir then aimAt(root.Position + arcDir * 30, CFG.spikeDelay + 0.35) end
			task.spawn(pressKey, Enum.KeyCode.Space)
			hum.Jump = true
			task.delay(CFG.spikeDelay, act, "Spike")
		elseif approaching and rel.Magnitude <= CFG.hitRange and not (wantSpike and rel.Y > 4) then
			stats.bumps, lastTouch, lastAct = stats.bumps + 1, now, now
			if arcDir then
				aimAt(root.Position + arcDir * 30, 0.35)
				task.delay(0.05, act, "Bump") -- let the turn reach the server first
			else
				act("Bump")
			end
		elseif st.EndTime - T <= CFG.diveLead and rel.Magnitude > CFG.hitRange
			and flat(landing - root.Position).Magnitude <= CFG.diveRange then
			stats.dives, lastTouch, lastAct = stats.dives + 1, now, now + 0.2
			aimAt(landing, 0.4)
			face(root, landing)
			act("Dive")
		end
	end

	setStatus(string.format("%s %.0f | %s%s", tostring(st.Skin or "ball"), rel.Magnitude,
		type(st.Hits) == "number" and ("h" .. st.Hits) or "", mine and " | yours" or ""))
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
	add("Volley AI v4 report " .. os.date("%Y-%m-%d %H:%M:%S"))
	add("place " .. game.PlaceId .. " | executor " .. (okE and tostring(exec) or "?") .. " | AI " .. (on and "on" or "off"))
	add(string.format("bumps %d spikes %d dives %d came-back %d confirmed %d",
		stats.bumps, stats.spikes, stats.dives, stats.cameBack, stats.confirmed))
	add(string.format("hook %s | HitBall fired %d, aimed %d | input %s | BallState %d",
		hook.ok and "on" or "unavailable", hook.fired, hook.aimed, METHODS[method], stateCount))
	add("last error: " .. tostring(lastErr or "none"))

	add("-- arena --")
	local z = arena.myZone
	add("my square: " .. (z and string.format("%s size %.1f,%.1f,%.1f at %.1f,%.1f,%.1f",
		z:GetFullName(), z.Size.X, z.Size.Y, z.Size.Z, z.Position.X, z.Position.Y, z.Position.Z) or "not found"))
	add(string.format("squares %d | ground %s", arena.zones and #arena.zones or 0, tostring(arena.ground)))
	local occupied = 0
	for _, r in ipairs(bodies()) do
		local oz = zoneAt(arena.zones, r.Position)
		if oz then
			occupied = occupied + 1
			add("  " .. r.Parent.Name .. " in " .. (oz == z and "your square" or ("square at " .. string.format("%.0f,%.0f", oz.Position.X, oz.Position.Z))))
		end
	end
	add("bodies in squares: " .. occupied)
	for kind, Ls in pairs(learned) do
		add(string.format("learned %s: flat speed %.1f, up %.1f, gravity %.1f (%d hits)", kind, Ls.h, Ls.vy, Ls.g, Ls.n))
	end

	add("-- current flight --")
	if cur then
		local landing = ballAt(cur, cur.EndTime)
		local lz = zoneAt(cur.zones, landing)
		add(string.format("%s | lands %.1f,%.1f,%.1f in %.2fs | landing square %s | HitZone is landing square: %s | Hits %s by %s",
			tostring(cur.Skin), landing.X, landing.Y, landing.Z, cur.EndTime - workspace:GetServerTimeNow(),
			lz and (lz == z and "yours" or "someone else's") or "none", tostring(cur.HitZone ~= nil and cur.HitZone == lz),
			tostring(cur.Hits), cur.Hitter and tostring(cur.Hitter) or "?"))
	else
		add("none")
	end

	add("-- HitBall calls (who pressed: what the game sent => direction the AI put in) --")
	for _, e in ipairs(hook.log) do add(e.by .. ": " .. e.orig .. (e.sent and ("  =>  " .. e.sent) or "")) end
	add("-- BallState (latest first) --")
	for _, st in ipairs(stateLog) do add(ser(st)) end

	if stateCount == 0 then
		add("-- fallback ball candidates --")
		local n = 0
		for part, s in pairs(tracked) do
			n = n + 1
			if n > 10 then add("...") break end
			add(string.format("%s [%s] size %.1f speed %.1f {%s}", part:GetFullName(), part.ClassName,
				part.Size.X, s.vel.Magnitude, attrs(part)))
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

notify("v4 " .. (gui.Parent and "loaded. tap AI or press Z" or "loaded, GUI could not be placed. Z still toggles")
	.. (hook.ok and "" or " (no hook: aiming by turning only)"))
