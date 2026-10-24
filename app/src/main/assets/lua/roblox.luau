-- Offline AI's Roblox test place: enough of Roblox's engine for game scripts to run on the phone
-- and show what they do. Scripts get game, workspace, script, Instance.new, the datatypes
-- (Vector3, CFrame, Color3, UDim2...), Enum, task, signals, RemoteEvents, DataStores (in
-- memory, for one run), TweenService and the rest of the services games use most, and a test
-- player, Player1, who joins, spawns and tries out what the scripts set up (touches parts,
-- clicks buttons and prompts, presses the keys they listen for). Everything runs in game time:
-- task.wait(60) takes no real time, and a run ends after a set number of game seconds.
--
-- Not here: physics (nothing falls, collides or moves by itself), rendering, sound, other
-- players and the internet. lua_tools.cpp runs this before the scripts and explains the oa
-- table; the hooks at the end (env, run) place each script and run them all together.
local oa = ...
local settings = oa.settings
local GAME_SECONDS = settings.game_seconds or 60
local AUTOPLAY = (settings.autoplay or 1) ~= 0

local LOCKED = "The metatable is locked"
local rawtypeof = typeof
local fmt = string.format
local insert, remove, concat, clone = table.insert, table.remove, table.concat, table.clone
local floor, abs, sqrt, sin, cos, atan2, asin, pi, huge = math.floor, math.abs, math.sqrt, math.sin, math.cos, math.atan2, math.asin, math.pi, math.huge
local V = vector.create
local START_UNIX = os.time()

local function errorf(level, f, ...)
	error(fmt(f, ...), level + 1)
end

-- Roblox's typeof, with Luau's vector named as Roblox names it
local function typeOf(v)
	local t = rawtypeof(v)
	if t == "vector" then
		return "Vector3"
	end
	return t
end

----------------------------------------------------------------------------------- game time

local now = 0 -- game seconds since the test place started
local FRAME = 1 / 60

local Sched = {}
do
	local heap, seq = {}, 0
	local function before(a, b)
		return a.t < b.t or (a.t == b.t and a.seq < b.seq)
	end
	function Sched.push(item)
		seq += 1
		item.seq = seq
		local i = #heap + 1
		heap[i] = item
		while i > 1 do
			local p = i // 2
			if before(heap[i], heap[p]) then
				heap[i], heap[p] = heap[p], heap[i]
				i = p
			else
				break
			end
		end
	end
	function Sched.pop()
		local n = #heap
		if n == 0 then
			return nil
		end
		local top = heap[1]
		heap[1] = heap[n]
		heap[n] = nil
		n -= 1
		local i = 1
		while true do
			local l, r, m = i * 2, i * 2 + 1, i
			if l <= n and before(heap[l], heap[m]) then
				m = l
			end
			if r <= n and before(heap[r], heap[m]) then
				m = r
			end
			if m == i then
				break
			end
			heap[i], heap[m] = heap[m], heap[i]
			i = m
		end
		return top
	end
	function Sched.peek()
		return heap[1]
	end
end

------------------------------------------------------------------------------------- output

local userChunks = {} -- the scripts' names in errors and tracebacks
local notes = {} -- said once at the end of the run
local noted = {}

local LogMessage -- LogService.MessageOut, once it exists
local inLog = false
local function emit(kind, text)
	oa.emit(kind, text, now)
	if LogMessage and not inLog then
		inLog = true
		local types = { out = "MessageOutput", warn = "MessageWarning", err = "MessageError", info = "MessageInfo" }
		pcall(LogMessage, text, types[kind] or "MessageOutput")
		inLog = false
	end
end

local function info(text)
	emit("info", text)
end

local function noteOnce(key, text)
	if not noted[key] then
		noted[key] = true
		insert(notes, text)
	end
end

--- The lines of a traceback that are about the scripts themselves.
local function scriptLines(trace)
	local out = {}
	for line in string.gmatch(trace or "", "[^\n]+") do
		local name = string.match(line, "^(.-):%d+")
		if name and userChunks[name] then
			insert(out, "  " .. line)
		end
	end
	return out
end

local ScriptError -- ScriptContext.Error, once it exists
local function reportError(co, err)
	local msg = if type(err) == "string" then err else fmt("(error object is a %s value)", typeOf(err))
	local lines = scriptLines(debug.traceback(co))
	local text = msg
	if #lines > 0 then
		text ..= "\n" .. concat(lines, "\n")
	end
	emit("err", text)
	if string.find(msg, "is not a valid member of", 1, true) or string.find(msg, "Unable to create an Instance", 1, true) then
		noteOnce("api", "The test place has the parts of Roblox's API that games use most, not all of it: if that is a real member or class, it may only be missing here.")
	end
	if ScriptError then
		pcall(ScriptError, msg, concat(lines, "\n"))
	end
end

---------------------------------------------------------------------------------- threads

-- which script the running code belongs to: Players.LocalPlayer, the client/server checks and
-- RunService:IsClient() go by it. A script's threads, and the handlers it connects, keep it.
local SYSTEM = { kind = "system" }
local ctx = SYSTEM
local threadCtx = setmetatable({}, { __mode = "k" })

local function isClient()
	return ctx.kind == "LocalScript"
end

local rawcreate, rawresume, rawstatus, rawyield, rawrunning = coroutine.create, coroutine.resume, coroutine.status, coroutine.yield, coroutine.running

local function resume(co, ...)
	if rawstatus(co) ~= "suspended" then
		return
	end
	local prev = ctx
	ctx = threadCtx[co] or prev
	local ok, err = rawresume(co, ...)
	ctx = prev
	if not ok then
		reportError(co, err)
	end
end

local function newThread(fn, c)
	local co = rawcreate(fn)
	threadCtx[co] = c or ctx
	return co
end

local function spawnNow(fn, ...)
	local co = newThread(fn)
	resume(co, ...)
	return co
end

--- Resumes [co] at game time [t] with the given values.
local function at(t, co, ...)
	Sched.push({ t = t, co = co, args = table.pack(...) })
end

--- Runs [fn] (test place code) at game time [t], in a thread of its own.
local function later(t, fn)
	Sched.push({ t = t, fn = fn })
end

local function sleep(seconds)
	local co = rawrunning()
	at(now + math.max(seconds, 0), co)
	rawyield()
end

-- user coroutines keep the script they were made in
coroutine.create = function(f)
	local co = rawcreate(f)
	threadCtx[co] = ctx
	return co
end
coroutine.wrap = function(f)
	local co = coroutine.create(f)
	return function(...)
		local r = table.pack(rawresume(co, ...))
		if not r[1] then
			error(r[2], 0)
		end
		return table.unpack(r, 2, r.n)
	end
end

-------------------------------------------------------------------------------- datatypes

local DT = setmetatable({}, { __mode = "k" }) -- datatype value -> its fields

local function datatype(name, spec)
	local mt = { __type = name, __metatable = LOCKED }
	local get, methods, fields = spec.get or {}, spec.methods or {}, spec.fields
	mt.__index = function(u, k)
		local f = DT[u]
		local v = f[k]
		if v ~= nil then
			return v
		end
		local g = get[k]
		if g then
			return g(f, u)
		end
		local m = methods[k]
		if m then
			return m
		end
		if fields and fields[k] then
			return nil
		end
		errorf(2, "%s is not a valid member of %s", tostring(k), name)
	end
	if spec.mutable then
		mt.__newindex = function(u, k, v)
			if fields[k] then
				DT[u][k] = v
			else
				errorf(2, "%s is not a valid member of %s", tostring(k), name)
			end
		end
	else
		mt.__newindex = function(_, k)
			errorf(2, "%s cannot be assigned to", tostring(k))
		end
	end
	if spec.tostring then
		mt.__tostring = function(u)
			return spec.tostring(DT[u])
		end
	end
	if spec.eq then
		mt.__eq = function(a, b)
			return spec.eq(DT[a], DT[b])
		end
	end
	for op, f in spec.ops or {} do
		mt[op] = f
	end
	return function(f)
		local u = oa.newobject(mt)
		DT[u] = f
		return u
	end
end

local function num(x)
	return tostring(x)
end

-- Vector3 is Luau's own vector type, as in Roblox
local Vector3 = {}
do
	local vm = {}
	function vm.Dot(a, b)
		return vector.dot(a, b)
	end
	function vm.Cross(a, b)
		return vector.cross(a, b)
	end
	function vm.Lerp(a, b, t)
		return a + (b - a) * t
	end
	function vm.FuzzyEq(a, b, eps)
		return vector.magnitude(a - b) <= (eps or 1e-5)
	end
	function vm.Angle(a, b, axis)
		return vector.angle(a, b, axis)
	end
	function vm.Abs(a)
		return vector.abs(a)
	end
	function vm.Ceil(a)
		return vector.ceil(a)
	end
	function vm.Floor(a)
		return vector.floor(a)
	end
	function vm.Sign(a)
		return vector.sign(a)
	end
	function vm.Min(a, ...)
		for _, b in { ... } do
			a = vector.min(a, b)
		end
		return a
	end
	function vm.Max(a, ...)
		for _, b in { ... } do
			a = vector.max(a, b)
		end
		return a
	end
	local meta = {}
	meta.__index = function(v, k)
		if k == "Magnitude" then
			return vector.magnitude(v)
		elseif k == "Unit" then
			local m = vector.magnitude(v)
			return if m > 0 then v / m else V(0 / 0, 0 / 0, 0 / 0)
		end
		local m = vm[k]
		if m then
			return m
		end
		errorf(2, "%s is not a valid member of Vector3", tostring(k))
	end
	oa.setvectormetatable(meta)

	function Vector3.new(x, y, z)
		return V(tonumber(x) or 0, tonumber(y) or 0, tonumber(z) or 0)
	end
	Vector3.zero = V(0, 0, 0)
	Vector3.one = V(1, 1, 1)
	Vector3.xAxis = V(1, 0, 0)
	Vector3.yAxis = V(0, 1, 0)
	Vector3.zAxis = V(0, 0, 1)
end

local Vector2 = {}
do
	local new
	local function v2(x, y)
		return new({ X = x, Y = y })
	end
	local function parts(a, b)
		local fa, fb = DT[a], DT[b]
		return fa, fb
	end
	new = datatype("Vector2", {
		get = {
			Magnitude = function(f)
				return sqrt(f.X * f.X + f.Y * f.Y)
			end,
			Unit = function(f)
				local m = sqrt(f.X * f.X + f.Y * f.Y)
				return v2(f.X / m, f.Y / m)
			end,
		},
		methods = {
			Dot = function(a, b)
				local fa, fb = parts(a, b)
				return fa.X * fb.X + fa.Y * fb.Y
			end,
			Cross = function(a, b)
				local fa, fb = parts(a, b)
				return fa.X * fb.Y - fa.Y * fb.X
			end,
			Lerp = function(a, b, t)
				local fa, fb = parts(a, b)
				return v2(fa.X + (fb.X - fa.X) * t, fa.Y + (fb.Y - fa.Y) * t)
			end,
			Abs = function(a)
				local f = DT[a]
				return v2(abs(f.X), abs(f.Y))
			end,
			Floor = function(a)
				local f = DT[a]
				return v2(floor(f.X), floor(f.Y))
			end,
			Ceil = function(a)
				local f = DT[a]
				return v2(math.ceil(f.X), math.ceil(f.Y))
			end,
			Min = function(a, b)
				local fa, fb = parts(a, b)
				return v2(math.min(fa.X, fb.X), math.min(fa.Y, fb.Y))
			end,
			Max = function(a, b)
				local fa, fb = parts(a, b)
				return v2(math.max(fa.X, fb.X), math.max(fa.Y, fb.Y))
			end,
			FuzzyEq = function(a, b, eps)
				local fa, fb = parts(a, b)
				eps = eps or 1e-5
				return abs(fa.X - fb.X) <= eps and abs(fa.Y - fb.Y) <= eps
			end,
		},
		tostring = function(f)
			return num(f.X) .. ", " .. num(f.Y)
		end,
		eq = function(a, b)
			return a.X == b.X and a.Y == b.Y
		end,
		ops = {
			__add = function(a, b)
				return v2(DT[a].X + DT[b].X, DT[a].Y + DT[b].Y)
			end,
			__sub = function(a, b)
				return v2(DT[a].X - DT[b].X, DT[a].Y - DT[b].Y)
			end,
			__mul = function(a, b)
				if type(a) == "number" then
					return v2(a * DT[b].X, a * DT[b].Y)
				elseif type(b) == "number" then
					return v2(DT[a].X * b, DT[a].Y * b)
				end
				return v2(DT[a].X * DT[b].X, DT[a].Y * DT[b].Y)
			end,
			__div = function(a, b)
				if type(b) == "number" then
					return v2(DT[a].X / b, DT[a].Y / b)
				end
				return v2(DT[a].X / DT[b].X, DT[a].Y / DT[b].Y)
			end,
			__unm = function(a)
				return v2(-DT[a].X, -DT[a].Y)
			end,
		},
	})
	function Vector2.new(x, y)
		return v2(tonumber(x) or 0, tonumber(y) or 0)
	end
	Vector2.zero = v2(0, 0)
	Vector2.one = v2(1, 1)
	Vector2.xAxis = v2(1, 0)
	Vector2.yAxis = v2(0, 1)
end

local Color3 = {}
do
	local new
	local function c3(r, g, b)
		return new({ R = r, G = g, B = b })
	end
	local function toHSV(f)
		local r, g, b = f.R, f.G, f.B
		local mx, mn = math.max(r, g, b), math.min(r, g, b)
		local d = mx - mn
		local h = 0
		if d > 0 then
			if mx == r then
				h = ((g - b) / d) % 6
			elseif mx == g then
				h = (b - r) / d + 2
			else
				h = (r - g) / d + 4
			end
			h /= 6
		end
		return h, if mx > 0 then d / mx else 0, mx
	end
	local function hex(f)
		local function byte(x)
			return math.clamp(floor(x * 255 + 0.5), 0, 255)
		end
		return fmt("%02X%02X%02X", byte(f.R), byte(f.G), byte(f.B))
	end
	new = datatype("Color3", {
		methods = {
			Lerp = function(a, b, t)
				local fa, fb = DT[a], DT[b]
				return c3(fa.R + (fb.R - fa.R) * t, fa.G + (fb.G - fa.G) * t, fa.B + (fb.B - fa.B) * t)
			end,
			ToHSV = function(a)
				return toHSV(DT[a])
			end,
			ToHex = function(a)
				return hex(DT[a])
			end,
		},
		tostring = function(f)
			return num(f.R) .. ", " .. num(f.G) .. ", " .. num(f.B)
		end,
		eq = function(a, b)
			return a.R == b.R and a.G == b.G and a.B == b.B
		end,
	})
	function Color3.new(r, g, b)
		return c3(tonumber(r) or 0, tonumber(g) or 0, tonumber(b) or 0)
	end
	function Color3.fromRGB(r, g, b)
		return c3((tonumber(r) or 0) / 255, (tonumber(g) or 0) / 255, (tonumber(b) or 0) / 255)
	end
	function Color3.fromHSV(h, s, v)
		h = (h % 1) * 6
		local i = floor(h)
		local f = h - i
		local p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
		local r, g, b
		if i == 0 then
			r, g, b = v, t, p
		elseif i == 1 then
			r, g, b = q, v, p
		elseif i == 2 then
			r, g, b = p, v, t
		elseif i == 3 then
			r, g, b = p, q, v
		elseif i == 4 then
			r, g, b = t, p, v
		else
			r, g, b = v, p, q
		end
		return c3(r, g, b)
	end
	function Color3.fromHex(s)
		s = string.gsub(tostring(s), "^#", "")
		if #s == 3 then
			s = string.gsub(s, ".", "%0%0")
		end
		local r, g, b = tonumber(s:sub(1, 2), 16), tonumber(s:sub(3, 4), 16), tonumber(s:sub(5, 6), 16)
		if not (r and g and b) or #s ~= 6 then
			errorf(2, "Unable to convert characters to hex value")
		end
		return c3(r / 255, g / 255, b / 255)
	end
	function Color3.toHSV(c)
		return toHSV(DT[c])
	end
end

local BrickColor = {}
do
	local palette = {
		{ 1, "White", 242, 243, 243 }, { 194, "Medium stone grey", 163, 162, 165 }, { 199, "Dark stone grey", 99, 95, 98 },
		{ 26, "Black", 27, 42, 53 }, { 1003, "Really black", 17, 17, 17 }, { 1001, "Institutional white", 248, 248, 248 },
		{ 21, "Bright red", 196, 40, 28 }, { 1004, "Really red", 255, 0, 0 }, { 24, "Bright yellow", 245, 205, 48 },
		{ 1009, "New Yeller", 255, 255, 0 }, { 23, "Bright blue", 13, 105, 172 }, { 1010, "Really blue", 0, 0, 255 },
		{ 37, "Bright green", 75, 151, 75 }, { 1020, "Lime green", 0, 255, 0 }, { 28, "Dark green", 40, 127, 71 },
		{ 141, "Earth green", 39, 70, 45 }, { 151, "Sand green", 120, 144, 130 }, { 106, "Bright orange", 218, 133, 65 },
		{ 1005, "Deep orange", 255, 176, 0 }, { 133, "Neon orange", 213, 115, 61 }, { 1032, "Hot pink", 255, 0, 191 },
		{ 1015, "Magenta", 170, 0, 170 }, { 104, "Bright violet", 107, 50, 124 }, { 1031, "Royal purple", 98, 37, 209 },
		{ 1019, "Toothpaste", 0, 255, 255 }, { 1013, "Cyan", 4, 175, 236 }, { 1024, "Pastel light blue", 175, 221, 255 },
		{ 45, "Light blue", 180, 210, 228 }, { 192, "Reddish brown", 105, 64, 40 }, { 217, "Brown", 124, 92, 70 },
		{ 5, "Brick yellow", 215, 197, 154 }, { 226, "Cool yellow", 253, 234, 141 }, { 1002, "Mid gray", 205, 205, 205 },
		{ 1, "Ghost grey", 202, 203, 209 }, { 18, "Nougat", 204, 142, 105 }, { 125, "Light orange", 234, 184, 146 },
		{ 1025, "Pastel orange", 255, 201, 201 }, { 1016, "Pink", 255, 102, 204 }, { 38, "Dark orange", 160, 95, 53 },
		{ 1012, "Deep blue", 33, 84, 185 }, { 1006, "Alder", 180, 128, 255 }, { 1018, "Teal", 18, 238, 212 },
	}
	local byName, byNumber = {}, {}
	local new
	new = datatype("BrickColor", {
		get = {
			r = function(f)
				return DT[f.Color].R
			end,
			g = function(f)
				return DT[f.Color].G
			end,
			b = function(f)
				return DT[f.Color].B
			end,
		},
		tostring = function(f)
			return f.Name
		end,
		eq = function(a, b)
			return a.Name == b.Name
		end,
	})
	for _, p in palette do
		local bc = new({ Number = p[1], Name = p[2], Color = Color3.fromRGB(p[3], p[4], p[5]) })
		byName[p[2]] = byName[p[2]] or bc
		byNumber[p[1]] = byNumber[p[1]] or bc
	end
	local grey = byName["Medium stone grey"]
	local function nearest(c)
		local f = DT[c]
		local best, bd = grey, huge
		for _, p in palette do
			local d = (f.R * 255 - p[3]) ^ 2 + (f.G * 255 - p[4]) ^ 2 + (f.B * 255 - p[5]) ^ 2
			if d < bd then
				best, bd = byName[p[2]], d
			end
		end
		return best
	end
	BrickColor.fromColor3 = nearest
	function BrickColor.new(a, g, b)
		if type(a) == "string" then
			return byName[a] or grey
		elseif type(a) == "number" and g == nil then
			return byNumber[a] or grey
		elseif type(a) == "number" then
			return nearest(Color3.new(a, g, b))
		elseif typeOf(a) == "Color3" then
			return nearest(a)
		end
		return grey
	end
	BrickColor.palette = function(i)
		return byName[palette[(i % #palette) + 1][2]]
	end
	BrickColor.random = function()
		return byName[palette[math.random(#palette)][2]]
	end
	BrickColor.Random = BrickColor.random
	for fn, name in { White = "White", Black = "Black", Red = "Bright red", Yellow = "Bright yellow", Green = "Dark green", Blue = "Bright blue", Gray = "Medium stone grey", DarkGray = "Dark stone grey" } do
		BrickColor[fn] = function()
			return byName[name]
		end
	end
end

local UDim, UDim2 = {}, {}
do
	local newU, newU2
	local function u(s, o)
		return newU({ Scale = s, Offset = o })
	end
	newU = datatype("UDim", {
		tostring = function(f)
			return num(f.Scale) .. ", " .. num(f.Offset)
		end,
		eq = function(a, b)
			return a.Scale == b.Scale and a.Offset == b.Offset
		end,
		ops = {
			__add = function(a, b)
				return u(DT[a].Scale + DT[b].Scale, DT[a].Offset + DT[b].Offset)
			end,
			__sub = function(a, b)
				return u(DT[a].Scale - DT[b].Scale, DT[a].Offset - DT[b].Offset)
			end,
			__unm = function(a)
				return u(-DT[a].Scale, -DT[a].Offset)
			end,
		},
	})
	local function u2(xs, xo, ys, yo)
		return newU2({ X = u(xs, xo), Y = u(ys, yo) })
	end
	local function comps(v)
		local f = DT[v]
		local x, y = DT[f.X], DT[f.Y]
		return x.Scale, x.Offset, y.Scale, y.Offset
	end
	newU2 = datatype("UDim2", {
		get = {
			Width = function(f)
				return f.X
			end,
			Height = function(f)
				return f.Y
			end,
		},
		methods = {
			Lerp = function(a, b, t)
				local a1, a2, a3, a4 = comps(a)
				local b1, b2, b3, b4 = comps(b)
				return u2(a1 + (b1 - a1) * t, a2 + (b2 - a2) * t, a3 + (b3 - a3) * t, a4 + (b4 - a4) * t)
			end,
		},
		tostring = function(f)
			return "{" .. tostring(f.X) .. "}, {" .. tostring(f.Y) .. "}"
		end,
		eq = function(a, b)
			return a.X == b.X and a.Y == b.Y
		end,
		ops = {
			__add = function(a, b)
				local a1, a2, a3, a4 = comps(a)
				local b1, b2, b3, b4 = comps(b)
				return u2(a1 + b1, a2 + b2, a3 + b3, a4 + b4)
			end,
			__sub = function(a, b)
				local a1, a2, a3, a4 = comps(a)
				local b1, b2, b3, b4 = comps(b)
				return u2(a1 - b1, a2 - b2, a3 - b3, a4 - b4)
			end,
			__unm = function(a)
				local a1, a2, a3, a4 = comps(a)
				return u2(-a1, -a2, -a3, -a4)
			end,
		},
	})
	function UDim.new(s, o)
		return u(tonumber(s) or 0, tonumber(o) or 0)
	end
	function UDim2.new(xs, xo, ys, yo)
		if typeOf(xs) == "UDim" then
			return newU2({ X = xs, Y = xo })
		end
		return u2(tonumber(xs) or 0, tonumber(xo) or 0, tonumber(ys) or 0, tonumber(yo) or 0)
	end
	function UDim2.fromScale(x, y)
		return u2(x or 0, 0, y or 0, 0)
	end
	function UDim2.fromOffset(x, y)
		return u2(0, x or 0, 0, y or 0)
	end
end

-- CFrame: a position and a 3x3 rotation, kept as {x, y, z, R00, R01, R02, R10, R11, R12, R20, R21, R22}
local CFrame = {}
local CF = {} -- the math, for the parts that move things
do
	local new
	local function cf(t)
		return new(t)
	end
	local function m(a)
		return DT[a]
	end
	local function mul(a, b)
		local x, y, z, a00, a01, a02, a10, a11, a12, a20, a21, a22 = table.unpack(a)
		local u, v, w, b00, b01, b02, b10, b11, b12, b20, b21, b22 = table.unpack(b)
		return {
			x + a00 * u + a01 * v + a02 * w, y + a10 * u + a11 * v + a12 * w, z + a20 * u + a21 * v + a22 * w,
			a00 * b00 + a01 * b10 + a02 * b20, a00 * b01 + a01 * b11 + a02 * b21, a00 * b02 + a01 * b12 + a02 * b22,
			a10 * b00 + a11 * b10 + a12 * b20, a10 * b01 + a11 * b11 + a12 * b21, a10 * b02 + a11 * b12 + a12 * b22,
			a20 * b00 + a21 * b10 + a22 * b20, a20 * b01 + a21 * b11 + a22 * b21, a20 * b02 + a21 * b12 + a22 * b22,
		}
	end
	local function inverse(a)
		local x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22 = table.unpack(a)
		return {
			-(r00 * x + r10 * y + r20 * z), -(r01 * x + r11 * y + r21 * z), -(r02 * x + r12 * y + r22 * z),
			r00, r10, r20, r01, r11, r21, r02, r12, r22,
		}
	end
	local function point(a, p)
		return V(a[1] + a[4] * p.x + a[5] * p.y + a[6] * p.z, a[2] + a[7] * p.x + a[8] * p.y + a[9] * p.z, a[3] + a[10] * p.x + a[11] * p.y + a[12] * p.z)
	end
	local function dir(a, p)
		return V(a[4] * p.x + a[5] * p.y + a[6] * p.z, a[7] * p.x + a[8] * p.y + a[9] * p.z, a[10] * p.x + a[11] * p.y + a[12] * p.z)
	end
	local function rot(r00, r01, r02, r10, r11, r12, r20, r21, r22)
		return { 0, 0, 0, r00, r01, r02, r10, r11, r12, r20, r21, r22 }
	end
	local function rx(a)
		local c, s = cos(a), sin(a)
		return rot(1, 0, 0, 0, c, -s, 0, s, c)
	end
	local function ry(a)
		local c, s = cos(a), sin(a)
		return rot(c, 0, s, 0, 1, 0, -s, 0, c)
	end
	local function rz(a)
		local c, s = cos(a), sin(a)
		return rot(c, -s, 0, s, c, 0, 0, 0, 1)
	end
	local function toQuat(a)
		local r00, r01, r02, r10, r11, r12, r20, r21, r22 = a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12]
		local tr = r00 + r11 + r22
		local w, x, y, z
		if tr > 0 then
			local s = sqrt(tr + 1) * 2
			w, x, y, z = s / 4, (r21 - r12) / s, (r02 - r20) / s, (r10 - r01) / s
		elseif r00 > r11 and r00 > r22 then
			local s = sqrt(1 + r00 - r11 - r22) * 2
			w, x, y, z = (r21 - r12) / s, s / 4, (r01 + r10) / s, (r02 + r20) / s
		elseif r11 > r22 then
			local s = sqrt(1 + r11 - r00 - r22) * 2
			w, x, y, z = (r02 - r20) / s, (r01 + r10) / s, s / 4, (r12 + r21) / s
		else
			local s = sqrt(1 + r22 - r00 - r11) * 2
			w, x, y, z = (r10 - r01) / s, (r02 + r20) / s, (r12 + r21) / s, s / 4
		end
		return x, y, z, w
	end
	local function fromQuat(px, py, pz, x, y, z, w)
		local n = sqrt(x * x + y * y + z * z + w * w)
		if n == 0 then
			return { px, py, pz, 1, 0, 0, 0, 1, 0, 0, 0, 1 }
		end
		x, y, z, w = x / n, y / n, z / n, w / n
		return {
			px, py, pz,
			1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
			2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
			2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
		}
	end
	local function lookAt(eye, target, up)
		up = up or V(0, 1, 0)
		local look = target - eye
		if vector.magnitude(look) == 0 then
			return { eye.x, eye.y, eye.z, 1, 0, 0, 0, 1, 0, 0, 0, 1 }
		end
		look = vector.normalize(look)
		local right = vector.cross(look, up)
		if vector.magnitude(right) < 1e-6 then
			right = vector.cross(look, V(0, 0, if look.y > 0 then 1 else -1))
		end
		right = vector.normalize(right)
		local up2 = vector.cross(right, look)
		return { eye.x, eye.y, eye.z, right.x, up2.x, -look.x, right.y, up2.y, -look.y, right.z, up2.z, -look.z }
	end
	local function withPos(a, p)
		local t = clone(a)
		t[1], t[2], t[3] = p.x, p.y, p.z
		return t
	end
	local function fmtc(f)
		local parts = {}
		for i = 1, 12 do
			parts[i] = num(f[i])
		end
		return concat(parts, ", ")
	end
	local function eulerXYZ(a)
		local y = asin(math.clamp(a[6], -1, 1))
		local x, z
		if abs(a[6]) < 0.99999 then
			x = atan2(-a[9], a[12])
			z = atan2(-a[5], a[4])
		else
			x = atan2(a[11], a[8])
			z = 0
		end
		return x, y, z
	end
	local function eulerYXZ(a)
		local x = asin(-math.clamp(a[9], -1, 1))
		local y, z
		if abs(a[9]) < 0.99999 then
			y = atan2(a[6], a[12])
			z = atan2(a[7], a[8])
		else
			y = atan2(-a[10], a[4])
			z = 0
		end
		return x, y, z
	end
	new = datatype("CFrame", {
		get = {
			Position = function(f)
				return V(f[1], f[2], f[3])
			end,
			p = function(f)
				return V(f[1], f[2], f[3])
			end,
			X = function(f)
				return f[1]
			end,
			Y = function(f)
				return f[2]
			end,
			Z = function(f)
				return f[3]
			end,
			LookVector = function(f)
				return V(-f[6], -f[9], -f[12])
			end,
			RightVector = function(f)
				return V(f[4], f[7], f[10])
			end,
			UpVector = function(f)
				return V(f[5], f[8], f[11])
			end,
			XVector = function(f)
				return V(f[4], f[7], f[10])
			end,
			YVector = function(f)
				return V(f[5], f[8], f[11])
			end,
			ZVector = function(f)
				return V(f[6], f[9], f[12])
			end,
			Rotation = function(f)
				return cf(withPos(f, V(0, 0, 0)))
			end,
		},
		methods = {
			Inverse = function(a)
				return cf(inverse(m(a)))
			end,
			Lerp = function(a, b, t)
				local fa, fb = m(a), m(b)
				local ax, ay, az, aw = toQuat(fa)
				local bx, by, bz, bw = toQuat(fb)
				if ax * bx + ay * by + az * bz + aw * bw < 0 then
					bx, by, bz, bw = -bx, -by, -bz, -bw
				end
				return cf(fromQuat(
					fa[1] + (fb[1] - fa[1]) * t, fa[2] + (fb[2] - fa[2]) * t, fa[3] + (fb[3] - fa[3]) * t,
					ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, aw + (bw - aw) * t
				))
			end,
			ToWorldSpace = function(a, b)
				return cf(mul(m(a), m(b)))
			end,
			ToObjectSpace = function(a, b)
				return cf(mul(inverse(m(a)), m(b)))
			end,
			PointToWorldSpace = function(a, p)
				return point(m(a), p)
			end,
			PointToObjectSpace = function(a, p)
				return point(inverse(m(a)), p)
			end,
			VectorToWorldSpace = function(a, p)
				return dir(m(a), p)
			end,
			VectorToObjectSpace = function(a, p)
				return dir(inverse(m(a)), p)
			end,
			GetComponents = function(a)
				return table.unpack(m(a))
			end,
			components = function(a)
				return table.unpack(m(a))
			end,
			ToEulerAnglesXYZ = function(a)
				return eulerXYZ(m(a))
			end,
			ToEulerAnglesYXZ = function(a)
				return eulerYXZ(m(a))
			end,
			ToOrientation = function(a)
				return eulerYXZ(m(a))
			end,
			ToAxisAngle = function(a)
				local x, y, z, w = toQuat(m(a))
				local angle = 2 * math.acos(math.clamp(w, -1, 1))
				local s = sqrt(math.max(1 - w * w, 0))
				if s < 1e-6 then
					return V(1, 0, 0), 0
				end
				return V(x / s, y / s, z / s), angle
			end,
			Orthonormalize = function(a)
				local f = m(a)
				local x, y, z, w = toQuat(f)
				return cf(fromQuat(f[1], f[2], f[3], x, y, z, w))
			end,
			FuzzyEq = function(a, b, eps)
				local fa, fb = m(a), m(b)
				eps = eps or 1e-5
				for i = 1, 12 do
					if abs(fa[i] - fb[i]) > eps then
						return false
					end
				end
				return true
			end,
		},
		tostring = fmtc,
		eq = function(a, b)
			for i = 1, 12 do
				if a[i] ~= b[i] then
					return false
				end
			end
			return true
		end,
		ops = {
			__mul = function(a, b)
				if rawtypeof(b) == "vector" then
					return point(m(a), b)
				end
				if typeOf(b) ~= "CFrame" then
					errorf(2, "invalid argument #2 (CFrame or Vector3 expected, got %s)", typeOf(b))
				end
				return cf(mul(m(a), m(b)))
			end,
			__add = function(a, v)
				if rawtypeof(v) ~= "vector" then
					errorf(2, "invalid argument #2 (Vector3 expected, got %s)", typeOf(v))
				end
				local f = m(a)
				return cf(withPos(f, V(f[1], f[2], f[3]) + v))
			end,
			__sub = function(a, v)
				if rawtypeof(v) ~= "vector" then
					errorf(2, "invalid argument #2 (Vector3 expected, got %s)", typeOf(v))
				end
				local f = m(a)
				return cf(withPos(f, V(f[1], f[2], f[3]) - v))
			end,
		},
	})

	CF.make = cf
	CF.raw = m
	CF.withPos = function(a, p)
		return cf(withPos(m(a), p))
	end
	CF.lookAt = lookAt

	function CFrame.new(...)
		local n = select("#", ...)
		local a = { ... }
		if n == 0 then
			return cf({ 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1 })
		elseif n == 1 then
			local p = a[1]
			if rawtypeof(p) ~= "vector" then
				errorf(2, "invalid argument #1 to 'new' (Vector3 expected, got %s)", typeOf(p))
			end
			return cf({ p.x, p.y, p.z, 1, 0, 0, 0, 1, 0, 0, 0, 1 })
		elseif n == 2 and rawtypeof(a[1]) == "vector" then
			return cf(lookAt(a[1], a[2]))
		elseif n == 3 then
			return cf({ tonumber(a[1]) or 0, tonumber(a[2]) or 0, tonumber(a[3]) or 0, 1, 0, 0, 0, 1, 0, 0, 0, 1 })
		elseif n == 7 then
			return cf(fromQuat(a[1], a[2], a[3], a[4], a[5], a[6], a[7]))
		elseif n == 12 then
			return cf(a)
		end
		errorf(2, "Invalid number of arguments: %d", n)
	end
	CFrame.identity = CFrame.new()
	function CFrame.lookAt(eye, target, up)
		return cf(lookAt(eye, target, up))
	end
	function CFrame.Angles(x, y, z)
		return cf(mul(mul(rx(x or 0), ry(y or 0)), rz(z or 0)))
	end
	CFrame.fromEulerAnglesXYZ = CFrame.Angles
	function CFrame.fromEulerAnglesYXZ(x, y, z)
		return cf(mul(mul(ry(y or 0), rx(x or 0)), rz(z or 0)))
	end
	CFrame.fromOrientation = CFrame.fromEulerAnglesYXZ
	function CFrame.fromEulerAngles(x, y, z, order)
		return CFrame.Angles(x, y, z)
	end
	function CFrame.fromAxisAngle(axis, angle)
		local u = vector.normalize(axis)
		local s = sin(angle / 2)
		return cf(fromQuat(0, 0, 0, u.x * s, u.y * s, u.z * s, cos(angle / 2)))
	end
	function CFrame.fromMatrix(p, vx, vy, vz)
		vz = vz or vector.cross(vx, vy)
		return cf({ p.x, p.y, p.z, vx.x, vy.x, vz.x, vx.y, vy.y, vz.y, vx.z, vy.z, vz.z })
	end
end

local TweenInfo, Enum
local NumberRange, NumberSequence, NumberSequenceKeypoint, ColorSequence, ColorSequenceKeypoint = {}, {}, {}, {}, {}
local Rect, Ray, Region3, PhysicalProperties, Font, Random, DateTime, RaycastParams, OverlapParams, PathWaypoint =
	{}, {}, {}, {}, {}, {}, {}, {}, {}, {}
local makeRaycastResult

-- Enum: every enum and item asked for exists (the test place cannot list Roblox's thousands);
-- the ones listed here also answer GetEnumItems with their real items.
do
	local ItemMT = { __type = "EnumItem", __metatable = LOCKED }
	local EnumMT = { __type = "Enum", __metatable = LOCKED }
	local EnumsMT = { __type = "Enums", __metatable = LOCKED }
	local types = {}
	local known = {
		Material = "Plastic SmoothPlastic Neon Wood WoodPlanks Marble Slate Concrete Granite Brick Pebble Cobblestone CorrodedMetal DiamondPlate Foil Metal Grass LeafyGrass Sand Fabric Ice Glass ForceField Air Water Rock Glacier Snow Sandstone Mud Basalt Ground CrackedLava Asphalt Salt Limestone Pavement Cardboard Carpet CeramicTiles ClayRoofTiles RoofShingles Leather Plaster Rubber",
		PartType = "Ball Block Cylinder Wedge CornerWedge",
		HumanoidStateType = "FallingDown Ragdoll GettingUp Jumping Swimming Freefall Flying Landed Running RunningNoPhysics StrafingNoPhysics Climbing Seated PlatformStanding Dead Physics None",
		EasingStyle = "Linear Sine Back Quad Quart Quint Bounce Elastic Exponential Circular Cubic",
		EasingDirection = "In Out InOut",
		UserInputState = "Begin Change End Cancel None",
		UserInputType = "MouseButton1 MouseButton2 MouseButton3 MouseWheel MouseMovement Touch Keyboard Focus Accelerometer Gyro Gamepad1 TextInput None",
		RaycastFilterType = "Exclude Include Blacklist Whitelist",
		PlaybackState = "Begin Delayed Playing Paused Completed Cancelled",
		NormalId = "Right Top Back Left Bottom Front",
		SortOrder = "Name Custom LayoutOrder",
		FillDirection = "Horizontal Vertical",
		CameraType = "Fixed Attach Watch Track Follow Custom Scriptable Orbital",
		ProductPurchaseDecision = "NotProcessedYet PurchaseGranted",
		PathStatus = "Success ClosestNoPath ClosestOutOfRange FailStartNotEmpty FailFinishNotEmpty NoPath",
		PathWaypointAction = "Walk Jump Custom",
		HumanoidRigType = "R6 R15",
		CoreGuiType = "PlayerList Health Backpack Chat All EmotesMenu SelfView Captures",
		KeyCode = "Unknown Backspace Tab Return Escape Space Zero One Two Three Four Five Six Seven Eight Nine A B C D E F G H I J K L M N O P Q R S T U V W X Y Z Up Down Left Right LeftShift RightShift LeftControl RightControl LeftAlt RightAlt F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 ButtonA ButtonB ButtonX ButtonY ButtonR1 ButtonL1 ButtonR2 ButtonL2 DPadUp DPadDown DPadLeft DPadRight Thumbstick1 Thumbstick2",
	}
	local function item(t, name)
		local it = t.items[name]
		if not it then
			t.count += 1
			it = oa.newobject(ItemMT)
			DT[it] = { Name = name, Value = t.count - 1, EnumType = t.u, full = "Enum." .. t.name .. "." .. name }
			t.items[name] = it
			insert(t.list, it)
		end
		return it
	end
	local enumMethods = {
		GetEnumItems = function(u)
			return clone(DT[u].list)
		end,
		FromName = function(u, name)
			return DT[u].items[name]
		end,
		FromValue = function(u, v)
			for _, it in DT[u].list do
				if DT[it].Value == v then
					return it
				end
			end
			return nil
		end,
	}
	EnumMT.__index = function(u, k)
		local m = enumMethods[k]
		if m then
			return m
		end
		if type(k) ~= "string" then
			errorf(2, "%s is not a valid member of Enum", tostring(k))
		end
		return item(DT[u], k)
	end
	EnumMT.__newindex = function(_, k)
		errorf(2, "%s cannot be assigned to", tostring(k))
	end
	EnumMT.__tostring = function(u)
		return DT[u].name
	end
	local function enum(name)
		local t = types[name]
		if not t then
			local u = oa.newobject(EnumMT)
			t = { name = name, u = u, items = {}, list = {}, count = 0 }
			DT[u] = t
			types[name] = t
			if known[name] then
				for w in string.gmatch(known[name], "%S+") do
					item(t, w)
				end
			end
		end
		return t.u
	end
	ItemMT.__index = function(u, k)
		local f = DT[u]
		if k == "Name" or k == "Value" or k == "EnumType" then
			return f[k]
		elseif k == "IsA" then
			return function(self, name)
				return DT[DT[self].EnumType].name == name
			end
		end
		errorf(2, "%s is not a valid member of \"%s\"", tostring(k), f.full)
	end
	ItemMT.__newindex = function(_, k)
		errorf(2, "%s cannot be assigned to", tostring(k))
	end
	ItemMT.__tostring = function(u)
		return DT[u].full
	end
	EnumsMT.__index = function(_, k)
		if k == "GetEnums" then
			return function()
				local out = {}
				for _, t in types do
					insert(out, t.u)
				end
				return out
			end
		end
		return enum(k)
	end
	EnumsMT.__newindex = function(_, k)
		errorf(2, "%s cannot be assigned to", tostring(k))
	end
	EnumsMT.__tostring = function()
		return "Enums"
	end
	Enum = oa.newobject(EnumsMT)
	DT[Enum] = {}
	for name in known do
		enum(name)
	end
end

--- [v] as an item of enum [enumName]: an item, its name or its number; nil if it is none of those.
local function enumItem(enumName, v)
	local e = Enum[enumName]
	local t = typeOf(v)
	if t == "EnumItem" then
		if DT[DT[v].EnumType].name == enumName then
			return v
		end
		return nil
	elseif t == "string" then
		return e[v]
	elseif t == "number" then
		return e:FromValue(v)
	end
	return nil
end

do
	local newInfo = datatype("TweenInfo", {
		tostring = function(f)
			return fmt("Time:%s DelayTime:%s RepeatCount:%s Reverses:%s EasingDirection:%s EasingStyle:%s", num(f.Time),
				num(f.DelayTime), num(f.RepeatCount), tostring(f.Reverses), f.EasingDirection.Name, f.EasingStyle.Name)
		end,
	})
	TweenInfo = {
		new = function(time, style, direction, repeatCount, reverses, delayTime)
			return newInfo({
				Time = tonumber(time) or 1,
				EasingStyle = style or Enum.EasingStyle.Quad,
				EasingDirection = direction or Enum.EasingDirection.Out,
				RepeatCount = repeatCount or 0,
				Reverses = reverses or false,
				DelayTime = delayTime or 0,
			})
		end,
	}

	local newRange = datatype("NumberRange", {
		tostring = function(f)
			return num(f.Min) .. " " .. num(f.Max)
		end,
		eq = function(a, b)
			return a.Min == b.Min and a.Max == b.Max
		end,
	})
	NumberRange.new = function(a, b)
		return newRange({ Min = a or 0, Max = b or a or 0 })
	end
	local newNKey = datatype("NumberSequenceKeypoint", {})
	NumberSequenceKeypoint.new = function(t, v, e)
		return newNKey({ Time = t, Value = v, Envelope = e or 0 })
	end
	local newNSeq = datatype("NumberSequence", {})
	NumberSequence.new = function(a, b)
		if type(a) == "table" then
			return newNSeq({ Keypoints = a })
		end
		return newNSeq({ Keypoints = { NumberSequenceKeypoint.new(0, a or 0), NumberSequenceKeypoint.new(1, b or a or 0) } })
	end
	local newCKey = datatype("ColorSequenceKeypoint", {})
	ColorSequenceKeypoint.new = function(t, c)
		return newCKey({ Time = t, Value = c })
	end
	local newCSeq = datatype("ColorSequence", {})
	ColorSequence.new = function(a, b)
		if type(a) == "table" then
			return newCSeq({ Keypoints = a })
		end
		return newCSeq({ Keypoints = { ColorSequenceKeypoint.new(0, a), ColorSequenceKeypoint.new(1, b or a) } })
	end

	local newRect = datatype("Rect", {
		get = {
			Width = function(f)
				return DT[f.Max].X - DT[f.Min].X
			end,
			Height = function(f)
				return DT[f.Max].Y - DT[f.Min].Y
			end,
		},
	})
	Rect.new = function(a, b, c, d)
		if typeOf(a) == "Vector2" then
			return newRect({ Min = a, Max = b })
		end
		return newRect({ Min = Vector2.new(a, b), Max = Vector2.new(c, d) })
	end

	local newRay
	newRay = datatype("Ray", {
		get = {
			Unit = function(f)
				return newRay({ Origin = f.Origin, Direction = vector.normalize(f.Direction) })
			end,
		},
		methods = {
			ClosestPoint = function(r, p)
				local f = DT[r]
				local d = vector.normalize(f.Direction)
				return f.Origin + d * math.max(0, vector.dot(p - f.Origin, d))
			end,
			Distance = function(r, p)
				return vector.magnitude(r:ClosestPoint(p) - p)
			end,
		},
		tostring = function(f)
			return "{" .. tostring(f.Origin) .. "}, {" .. tostring(f.Direction) .. "}"
		end,
	})
	Ray.new = function(o, d)
		return newRay({ Origin = o or V(0, 0, 0), Direction = d or V(0, 0, 0) })
	end

	local newRegion = datatype("Region3", {})
	Region3.new = function(a, b)
		return newRegion({ CFrame = CFrame.new((a + b) / 2), Size = vector.abs(b - a) })
	end

	local newPhys = datatype("PhysicalProperties", {})
	PhysicalProperties.new = function(density, friction, elasticity, fw, ew)
		if typeOf(density) == "EnumItem" then
			return newPhys({ Density = 0.7, Friction = 0.3, Elasticity = 0.5, FrictionWeight = 1, ElasticityWeight = 1 })
		end
		return newPhys({ Density = density or 0.7, Friction = friction or 0.3, Elasticity = elasticity or 0.5, FrictionWeight = fw or 1, ElasticityWeight = ew or 1 })
	end

	local newFont = datatype("Font", {
		fields = { Family = true, Weight = true, Style = true, Bold = true },
		mutable = true,
	})
	Font.new = function(family, weight, style)
		return newFont({ Family = family or "rbxasset://fonts/families/SourceSansPro.json", Weight = weight or Enum.FontWeight.Regular, Style = style or Enum.FontStyle.Normal, Bold = false })
	end
	Font.fromEnum = function(e)
		return Font.new("rbxasset://fonts/families/" .. tostring(e and e.Name or "SourceSans") .. ".json")
	end
	Font.fromName = function(name, weight, style)
		return Font.new("rbxasset://fonts/families/" .. tostring(name) .. ".json", weight, style)
	end
	Font.fromId = function(id, weight, style)
		return Font.new("rbxassetid://" .. tostring(id), weight, style)
	end

	-- Random: Park-Miller, exact in doubles
	local newRandom
	local function step(f)
		f.s = (f.s * 48271) % 2147483647
		return f.s / 2147483647
	end
	newRandom = datatype("Random", {
		methods = {
			NextNumber = function(r, lo, hi)
				local x = step(DT[r])
				if lo == nil then
					return x
				end
				return lo + (hi - lo) * x
			end,
			NextInteger = function(r, lo, hi)
				return lo + floor(step(DT[r]) * (hi - lo + 1))
			end,
			NextUnitVector = function(r)
				local f = DT[r]
				local z = step(f) * 2 - 1
				local a = step(f) * 2 * pi
				local s = sqrt(1 - z * z)
				return V(s * cos(a), s * sin(a), z)
			end,
			Shuffle = function(r, t)
				local f = DT[r]
				for i = #t, 2, -1 do
					local j = 1 + floor(step(f) * i)
					t[i], t[j] = t[j], t[i]
				end
			end,
			Clone = function(r)
				return newRandom({ s = DT[r].s })
			end,
		},
	})
	Random.new = function(seed)
		seed = floor(abs(tonumber(seed) or (os.clock() * 1e6 + math.random(1, 1e6)))) % 2147483646 + 1
		return newRandom({ s = seed })
	end

	local newDate
	newDate = datatype("DateTime", {
		methods = {
			ToIsoDate = function(d)
				return os.date("!%Y-%m-%dT%H:%M:%SZ", floor(DT[d].UnixTimestamp))
			end,
			ToUniversalTime = function(d)
				local ms = DT[d].UnixTimestampMillis
				local t = os.date("!*t", floor(ms / 1000))
				return { Year = t.year, Month = t.month, Day = t.day, Hour = t.hour, Minute = t.min, Second = t.sec, Millisecond = ms % 1000 }
			end,
			ToLocalTime = function(d)
				local ms = DT[d].UnixTimestampMillis
				local t = os.date("*t", floor(ms / 1000))
				return { Year = t.year, Month = t.month, Day = t.day, Hour = t.hour, Minute = t.min, Second = t.sec, Millisecond = ms % 1000 }
			end,
			FormatUniversalTime = function(d, format)
				return os.date("!%Y-%m-%d %H:%M:%S", floor(DT[d].UnixTimestamp))
			end,
			FormatLocalTime = function(d, format)
				return os.date("%Y-%m-%d %H:%M:%S", floor(DT[d].UnixTimestamp))
			end,
		},
		tostring = function(f)
			return os.date("!%Y-%m-%dT%H:%M:%SZ", floor(f.UnixTimestamp))
		end,
	})
	local function fromMillis(ms)
		ms = floor(ms)
		return newDate({ UnixTimestampMillis = ms, UnixTimestamp = floor(ms / 1000) })
	end
	DateTime.now = function()
		return fromMillis((START_UNIX + now) * 1000)
	end
	DateTime.fromUnixTimestamp = function(s)
		return fromMillis(s * 1000)
	end
	DateTime.fromUnixTimestampMillis = fromMillis

	local newParams = datatype("RaycastParams", {
		fields = { FilterDescendantsInstances = true, FilterType = true, IgnoreWater = true, CollisionGroup = true, RespectCanCollide = true, BruteForceAllSlow = true },
		mutable = true,
		methods = {
			AddToFilter = function(p, x)
				local list = DT[p].FilterDescendantsInstances
				if type(x) == "table" then
					for _, v in x do
						insert(list, v)
					end
				else
					insert(list, x)
				end
			end,
		},
	})
	RaycastParams.new = function()
		return newParams({ FilterDescendantsInstances = {}, FilterType = Enum.RaycastFilterType.Exclude, IgnoreWater = false, CollisionGroup = "Default", RespectCanCollide = false, BruteForceAllSlow = false })
	end
	local newOverlap = datatype("OverlapParams", {
		fields = { FilterDescendantsInstances = true, FilterType = true, MaxParts = true, CollisionGroup = true, RespectCanCollide = true, BruteForceAllSlow = true },
		mutable = true,
		methods = {
			AddToFilter = function(p, x)
				local list = DT[p].FilterDescendantsInstances
				if type(x) == "table" then
					for _, v in x do
						insert(list, v)
					end
				else
					insert(list, x)
				end
			end,
		},
	})
	OverlapParams.new = function()
		return newOverlap({ FilterDescendantsInstances = {}, FilterType = Enum.RaycastFilterType.Exclude, MaxParts = 0, CollisionGroup = "Default", RespectCanCollide = false, BruteForceAllSlow = false })
	end
	makeRaycastResult = datatype("RaycastResult", {
		tostring = function()
			return "RaycastResult"
		end,
	})
	local newWaypoint = datatype("PathWaypoint", {})
	PathWaypoint.new = function(p, action, label)
		return newWaypoint({ Position = p, Action = action or Enum.PathWaypointAction.Walk, Label = label or "" })
	end
end

------------------------------------------------------------------------------------ signals

local Signal = {}
do
	local SD = setmetatable({}, { __mode = "k" }) -- signal -> {name, conns, waiting, guard, onConnect}
	local CD = setmetatable({}, { __mode = "k" }) -- connection -> {fn, sig, connected, once, ctx}
	local SignalMT = { __type = "RBXScriptSignal", __metatable = LOCKED }
	local ConnMT = { __type = "RBXScriptConnection", __metatable = LOCKED }

	local function disconnect(cd)
		if not cd.connected then
			return
		end
		cd.connected = false
		local list = cd.sig.conns
		for i, c in list do
			if c == cd then
				remove(list, i)
				break
			end
		end
	end

	local function connect(s, fn, once, level)
		local d = SD[s]
		if d == nil then
			errorf(level, "Expected ':' not '.' calling member function Connect")
		end
		if type(fn) ~= "function" then
			errorf(level, "Attempt to connect failed: Passed value is not a function")
		end
		if d.guard then
			d.guard(level + 1)
		end
		local c = oa.newobject(ConnMT)
		local cd = { fn = fn, sig = d, connected = true, once = once, ctx = ctx }
		CD[c] = cd
		insert(d.conns, cd)
		if d.onConnect then
			d.onConnect(d)
		end
		return c
	end

	local methods = {
		Connect = function(s, fn)
			return connect(s, fn, false, 3)
		end,
		ConnectParallel = function(s, fn)
			return connect(s, fn, false, 3)
		end,
		Once = function(s, fn)
			return connect(s, fn, true, 3)
		end,
		Wait = function(s)
			local d = SD[s]
			if d == nil then
				errorf(2, "Expected ':' not '.' calling member function Wait")
			end
			if d.guard then
				d.guard(3)
			end
			insert(d.waiting, rawrunning())
			if d.onConnect then
				d.onConnect(d)
			end
			return rawyield()
		end,
	}
	-- older names still in a lot of game code
	methods.connect = methods.Connect
	methods.wait = methods.Wait

	SignalMT.__index = function(s, k)
		local m = methods[k]
		if m then
			return m
		end
		errorf(2, "%s is not a valid member of RBXScriptSignal", tostring(k))
	end
	SignalMT.__newindex = function(_, k)
		errorf(2, "%s cannot be assigned to", tostring(k))
	end
	SignalMT.__tostring = function(s)
		return "Signal " .. SD[s].name
	end
	ConnMT.__index = function(c, k)
		if k == "Connected" then
			return CD[c].connected
		elseif k == "Disconnect" or k == "disconnect" then
			return function(self)
				local cd = CD[self]
				if cd then
					disconnect(cd)
				end
			end
		end
		errorf(2, "%s is not a valid member of RBXScriptConnection", tostring(k))
	end
	ConnMT.__newindex = function(_, k)
		errorf(2, "%s cannot be assigned to", tostring(k))
	end
	ConnMT.__tostring = function()
		return "Connection"
	end

	--- A new signal; returns it and its data (what fire takes).
	function Signal.new(name)
		local s = oa.newobject(SignalMT)
		local d = { name = name, conns = {}, waiting = {}, s = s }
		SD[s] = d
		return s, d
	end

	function Signal.data(s)
		return SD[s]
	end

	--- Calls every handler, each in a thread of its own (so it may wait), and wakes Wait()ers.
	function Signal.fire(d, ...)
		local conns = d.conns
		if #conns > 0 then
			for _, cd in clone(conns) do
				if cd.connected then
					if cd.once then
						disconnect(cd)
					end
					if cd.internal then
						cd.fn(...)
					else
						local co = newThread(cd.fn, cd.ctx)
						resume(co, ...)
					end
				end
			end
		end
		if #d.waiting > 0 then
			local w = d.waiting
			d.waiting = {}
			for _, co in w do
				at(now, co, ...)
			end
		end
	end

	--- A handler for the test place's own use: called directly, never waits.
	function Signal.listen(d, fn)
		local cd = { fn = fn, sig = d, connected = true, internal = true, ctx = SYSTEM }
		insert(d.conns, cd)
		return cd
	end
	Signal.unlisten = disconnect

	function Signal.count(d)
		local n = #d.waiting
		for _, cd in d.conns do
			if not cd.internal then
				n += 1
			end
		end
		return n
	end

	function Signal.disconnectAll(d)
		for _, cd in clone(d.conns) do
			disconnect(cd)
		end
		d.waiting = {}
	end
end

---------------------------------------------------------------------------------- instances

local I = setmetatable({}, { __mode = "k" }) -- instance -> its data
local Classes = {}
local InstanceMT = { __type = "Instance", __metatable = LOCKED }
local game, workspace, Players, StarterGui, StarterPack, StarterPlayer, ReplicatedStorage, ServerStorage, ServerScriptService, Lighting
local services = {}
local testPlayer -- Player1

local function isInstance(v)
	return I[v] ~= nil
end

local function nameOf(inst)
	return I[inst].props.Name
end

local function fullName(inst)
	local parts = {}
	local cur = inst
	while cur and cur ~= game do
		insert(parts, 1, I[cur].props.Name)
		cur = I[cur].parent
	end
	return concat(parts, ".")
end

local function describe(v)
	local t = typeOf(v)
	if t == "Instance" then
		return "Instance"
	end
	return t
end

local function signalOf(d, name)
	local sigs = d.signals
	if not sigs then
		sigs = {}
		d.signals = sigs
	end
	local s = sigs[name]
	if not s then
		local _
		s, _ = Signal.new(name)
		sigs[name] = s
		local hook = d.cls.signalHooks[name]
		if hook then
			hook(d.self, d, Signal.data(s))
		end
	end
	return s
end

--- Fires [name] on [d] if anything ever asked for that signal.
local function fire(d, name, ...)
	local sigs = d.signals
	local s = sigs and sigs[name]
	if s then
		Signal.fire(Signal.data(s), ...)
	end
end

local function listeners(d, name)
	local sigs = d.signals
	local s = sigs and sigs[name]
	return if s then Signal.count(Signal.data(s)) else 0
end

local function propSignal(d, name)
	local ps = d.propSignals
	if not ps then
		ps = {}
		d.propSignals = ps
	end
	local s = ps[name]
	if not s then
		local _
		s, _ = Signal.new(name)
		ps[name] = s
	end
	return s
end

local function changed(d, name, value)
	if d.cls.valueBase then
		if name == "Value" then
			fire(d, "Changed", value)
		end
	else
		fire(d, "Changed", name)
	end
	local ps = d.propSignals
	if ps and ps[name] then
		Signal.fire(Signal.data(ps[name]))
	end
	local hook = d.cls.onChange[name]
	if hook then
		hook(d.self, d, value)
	end
end

local function getProp(d, name)
	local v = d.props[name]
	if v == nil then
		local spec = d.cls.props[name]
		return spec and spec.default
	end
	return v
end

local function setProp(d, name, value)
	local old = d.props[name]
	if old == nil then
		old = d.cls.props[name] and d.cls.props[name].default
	end
	d.props[name] = value
	if old ~= value then
		changed(d, name, value)
	end
end

local typeLabel = { boolean = "bool", Instance = "Object" }

--- [v] as a value for property [spec], or a Roblox-worded error at [level].
local function coerce(spec, v, name, level)
	local t = spec.type
	if t == "any" then
		return v
	end
	if v == nil then
		if spec.nullable then
			return nil
		end
		errorf(level + 1, "Unable to assign property %s. %s expected, got nil", name, typeLabel[t] or t)
	end
	if t == "number" then
		local n = tonumber(v)
		if n then
			return n
		end
	elseif t == "string" then
		local vt = type(v)
		if vt == "string" then
			return v
		elseif vt == "number" then
			return tostring(v)
		end
	elseif t == "EnumItem" then
		local it = enumItem(spec.enum, v)
		if it then
			return it
		end
		errorf(level + 1, "Unable to assign property %s. EnumItem of type %s expected, got %s", name, spec.enum,
			if typeOf(v) == "EnumItem" then "an EnumItem of type " .. DT[DT[v].EnumType].name else describe(v))
	elseif t == "function" then
		if type(v) == "function" then
			return v
		end
	elseif I[v] ~= nil then
		if t == "Instance" or I[v].cls.isa[t] then
			return v
		end
	elseif typeOf(v) == t then
		return v
	end
	errorf(level + 1, "Unable to assign property %s. %s expected, got %s", name, typeLabel[t] or t, describe(v))
end

local function childNamed(d, name)
	for _, c in d.children do
		if I[c].props.Name == name then
			return c
		end
	end
	return nil
end

local function descendants(inst, out)
	out = out or {}
	for _, c in I[inst].children do
		insert(out, c)
		descendants(c, out)
	end
	return out
end

local function inGame(inst)
	local cur = inst
	while cur do
		if cur == game then
			return true
		end
		cur = I[cur].parent
	end
	return false
end

local Tags -- CollectionService's side of tags

local function setParent(self, d, p, level)
	if p ~= nil and I[p] == nil then
		errorf(level + 1, "Unable to assign property Parent. Object expected, got %s", describe(p))
	end
	if p == d.parent then
		return
	end
	if d.parentLocked then
		errorf(level + 1, "The Parent property of %s is locked, current parent: %s, new parent %s", d.props.Name,
			if d.parent then nameOf(d.parent) else "NULL", if p then nameOf(p) else "NULL")
	end
	local a = p
	while a do
		if a == self then
			errorf(level + 1, "Attempt to set parent of %s to %s would result in circular reference", fullName(self), fullName(p))
		end
		a = I[a].parent
	end
	local old = d.parent
	local subtree = descendants(self)
	insert(subtree, 1, self)
	if old then
		local cur = old
		while cur do
			for _, x in subtree do
				fire(I[cur], "DescendantRemoving", x)
			end
			cur = I[cur].parent
		end
		local list = I[old].children
		for i, c in list do
			if c == self then
				remove(list, i)
				break
			end
		end
	end
	local wasIn = old ~= nil and inGame(old)
	d.parent = p
	if p then
		insert(I[p].children, self)
	end
	for _, x in subtree do
		fire(I[x], "AncestryChanged", self, p)
	end
	changed(d, "Parent", p)
	if old then
		fire(I[old], "ChildRemoved", self)
	end
	if p then
		fire(I[p], "ChildAdded", self)
		local cur = p
		while cur do
			for _, x in subtree do
				fire(I[cur], "DescendantAdded", x)
			end
			cur = I[cur].parent
		end
	end
	local isIn = p ~= nil and inGame(p)
	if wasIn ~= isIn and Tags then
		Tags.moved(subtree, isIn)
	end
	for _, x in subtree do
		local xd = I[x]
		local hook = xd.cls.onParent
		if hook then
			-- what was moved gets where from and where to; what moved with it, nothing
			hook(x, xd, if x == self then old else nil, if x == self then p else nil)
		end
	end
end

InstanceMT.__index = function(self, key)
	local d = I[self]
	local cls = d.cls
	local spec = cls.props[key]
	if spec then
		if spec.get then
			return spec.get(self, d)
		end
		local v = d.props[key]
		if v == nil then
			return spec.default
		end
		return v
	end
	local m = cls.methods[key]
	if m ~= nil then
		return m
	end
	if cls.events[key] then
		return signalOf(d, key)
	end
	if type(key) == "string" then
		local c = childNamed(d, key)
		if c then
			return c
		end
	end
	errorf(2, "%s is not a valid member of %s \"%s\"", tostring(key), cls.name, fullName(self))
end

InstanceMT.__newindex = function(self, key, value)
	local d = I[self]
	local cls = d.cls
	local spec = cls.props[key]
	if not spec then
		if cls.methods[key] or cls.events[key] then
			errorf(2, "%s cannot be assigned to", tostring(key))
		end
		errorf(2, "%s is not a valid member of %s \"%s\"", tostring(key), cls.name, fullName(self))
	end
	if spec.readonly then
		errorf(2, "Unable to assign property %s. Property is read only", key)
	end
	if spec.set then
		spec.set(self, d, coerce(spec, value, key, 2), 3)
	else
		setProp(d, key, coerce(spec, value, key, 2))
	end
end

InstanceMT.__tostring = function(self)
	return I[self].props.Name
end

local function newInstance(cls)
	local inst = oa.newobject(InstanceMT)
	local d = { cls = cls, props = { Name = cls.name }, children = {}, self = inst }
	I[inst] = d
	for _, init in cls.inits do
		init(inst, d)
	end
	return inst, d
end

-- property specs: a default value (its type is the property's), or one of these
local function ref(t)
	return { ref = t }
end
local function E(enumName, itemName)
	return { enum = enumName, item = itemName }
end
local function RO(v) -- read-only
	return { ro = v }
end

local function normalize(v)
	if type(v) == "table" and v.ro ~= nil then
		local s = normalize(v.ro)
		s.readonly = true
		return s
	end
	if type(v) == "table" and v.ref then
		return { type = v.ref, nullable = true }
	end
	if type(v) == "table" and v.enum then
		return { type = "EnumItem", enum = v.enum, default = Enum[v.enum][v.item] }
	end
	return { type = typeOf(v), default = v }
end

local function wrapMethod(name, f)
	return function(self, ...)
		local d = I[self]
		if d == nil then
			errorf(2, "Expected ':' not '.' calling member function %s", name)
		end
		return f(self, d, ...)
	end
end

--[[
	def: props = {Name = default}, get/set = {Name = function(self, d[, value, level])},
	methods = {Name = function(self, d, ...)} (errors aimed at the script use level 3),
	events = {"Touched", ...}, init = function(self, d), onParent(self, d, old, new),
	onChange = {Prop = function(self, d, value)}, signalHooks = {Event = function(self, d, sig)},
	abstract / service / internal (not made by Instance.new), valueBase
]]
local function defclass(name, superName, def)
	local super = superName and Classes[superName]
	local cls = {
		name = name,
		props = {},
		methods = {},
		events = {},
		isa = { [name] = true },
		inits = {},
		onChange = {},
		signalHooks = {},
		abstract = def.abstract,
		service = def.service,
		internal = def.internal,
	}
	if super then
		for k, v in super.props do
			cls.props[k] = v
		end
		for k, v in super.methods do
			cls.methods[k] = v
		end
		for k, v in super.events do
			cls.events[k] = v
		end
		for k in super.isa do
			cls.isa[k] = true
		end
		for _, f in super.inits do
			insert(cls.inits, f)
		end
		for k, v in super.onChange do
			cls.onChange[k] = v
		end
		for k, v in super.signalHooks do
			cls.signalHooks[k] = v
		end
		cls.onParent = super.onParent
		cls.valueBase = super.valueBase
	end
	for k, v in def.props or {} do
		cls.props[k] = normalize(v)
	end
	for k, f in def.get or {} do
		local s = clone(cls.props[k] or { type = "any" })
		s.get = f
		if not (def.set and def.set[k]) and not s.set then
			s.readonly = true
		end
		cls.props[k] = s
	end
	for k, f in def.set or {} do
		local s = clone(cls.props[k] or { type = "any" })
		s.set = f
		s.readonly = nil
		cls.props[k] = s
	end
	for k, f in def.methods or {} do
		cls.methods[k] = wrapMethod(k, f)
	end
	for _, e in def.events or {} do
		cls.events[e] = true
	end
	if def.init then
		insert(cls.inits, def.init)
	end
	for k, f in def.onChange or {} do
		cls.onChange[k] = f
	end
	for k, f in def.signalHooks or {} do
		cls.signalHooks[k] = f
	end
	if def.onParent then
		local prev = cls.onParent
		cls.onParent = if prev
			then function(...)
				prev(...)
				def.onParent(...)
			end
			else def.onParent
	end
	if def.valueBase then
		cls.valueBase = true
	end
	Classes[name] = cls
	return cls
end

local function create(className, props, parent)
	local inst, d = newInstance(Classes[className])
	for k, v in props or {} do
		if k == "Name" then
			d.props.Name = v
		else
			d.props[k] = v
		end
	end
	if parent then
		setParent(inst, d, parent, 1)
	end
	return inst, d
end

local function cloneInstance(src)
	local map = {}
	local function copy(x)
		local xd = I[x]
		if not getProp(xd, "Archivable") then
			return nil
		end
		local c, cd = newInstance(xd.cls)
		cd.props = clone(xd.props)
		cd.attrs = xd.attrs and clone(xd.attrs)
		cd.tags = xd.tags and clone(xd.tags)
		map[x] = c
		for _, ch in xd.children do
			local cc = copy(ch)
			if cc then
				I[cc].parent = c
				insert(cd.children, cc)
			end
		end
		if xd.cls.onClone then
			xd.cls.onClone(x, xd, c, cd)
		end
		return c
	end
	local root = copy(src)
	-- references inside the copy point at the copy, as in Roblox
	for _, c in map do
		local cd = I[c]
		for k, v in cd.props do
			if type(v) == "userdata" and map[v] then
				cd.props[k] = map[v]
			end
		end
	end
	return root
end

local function destroy(inst)
	local d = I[inst]
	if d.destroyed then
		return
	end
	fire(d, "Destroying")
	for _, c in clone(d.children) do
		destroy(c)
	end
	if d.parent then
		setParent(inst, d, nil, 1)
	end
	d.parentLocked = true
	d.destroyed = true
	if d.cls.onDestroy then
		d.cls.onDestroy(inst, d)
	end
	for _, s in d.signals or {} do
		Signal.disconnectAll(Signal.data(s))
	end
	for _, s in d.propSignals or {} do
		Signal.disconnectAll(Signal.data(s))
	end
end

--- Where the thread [co] is in the scripts, for warnings: " (ServerScriptService.Main:12)".
local function whereIn(co)
	local lines = scriptLines(debug.traceback(co))
	if #lines > 0 then
		return " (" .. string.gsub(lines[1], "^%s+", "") .. ")"
	end
	return ""
end

local function isA(d, className)
	return d.cls.isa[className] == true
end

local attributeTypes = {
	string = true, number = true, boolean = true, Vector3 = true, Vector2 = true, Color3 = true, CFrame = true,
	UDim = true, UDim2 = true, BrickColor = true, NumberRange = true, NumberSequence = true, ColorSequence = true,
	Rect = true, EnumItem = true, Font = true,
}

defclass("Instance", nil, {
	abstract = true,
	props = { Name = "Instance", Archivable = true, ClassName = RO("Instance") },
	get = {
		ClassName = function(self, d)
			return d.cls.name
		end,
		Parent = function(self, d)
			return d.parent
		end,
	},
	set = {
		Parent = function(self, d, p, level)
			setParent(self, d, p, level)
		end,
		Name = function(self, d, v)
			setProp(d, "Name", v)
		end,
	},
	methods = {
		GetChildren = function(self, d)
			return clone(d.children)
		end,
		GetDescendants = function(self, d)
			return descendants(self)
		end,
		FindFirstChild = function(self, d, name, recursive)
			if recursive then
				for _, x in descendants(self) do
					if I[x].props.Name == name then
						return x
					end
				end
				return nil
			end
			return childNamed(d, name)
		end,
		FindFirstChildOfClass = function(self, d, className)
			for _, c in d.children do
				if I[c].cls.name == className then
					return c
				end
			end
			return nil
		end,
		FindFirstChildWhichIsA = function(self, d, className, recursive)
			for _, c in (if recursive then descendants(self) else d.children) do
				if isA(I[c], className) then
					return c
				end
			end
			return nil
		end,
		FindFirstDescendant = function(self, d, name)
			for _, x in descendants(self) do
				if I[x].props.Name == name then
					return x
				end
			end
			return nil
		end,
		FindFirstAncestor = function(self, d, name)
			local cur = d.parent
			while cur do
				if I[cur].props.Name == name then
					return cur
				end
				cur = I[cur].parent
			end
			return nil
		end,
		FindFirstAncestorOfClass = function(self, d, className)
			local cur = d.parent
			while cur do
				if I[cur].cls.name == className then
					return cur
				end
				cur = I[cur].parent
			end
			return nil
		end,
		FindFirstAncestorWhichIsA = function(self, d, className)
			local cur = d.parent
			while cur do
				if isA(I[cur], className) then
					return cur
				end
				cur = I[cur].parent
			end
			return nil
		end,
		WaitForChild = function(self, d, name, timeout)
			if type(name) ~= "string" then
				errorf(3, "Argument 1 missing or nil")
			end
			local c = childNamed(d, name)
			if c then
				return c
			end
			local co = rawrunning()
			local done = false
			local listener
			local function finish(v)
				if done then
					return
				end
				done = true
				Signal.unlisten(listener)
				at(now, co, v)
			end
			listener = Signal.listen(Signal.data(signalOf(d, "ChildAdded")), function(child)
				if I[child].props.Name == name then
					finish(child)
				end
			end)
			if timeout then
				later(now + timeout, function()
					finish(nil)
				end)
			else
				later(now + 5, function()
					if not done then
						emit("warn", fmt("Infinite yield possible on '%s:WaitForChild(\"%s\")'%s", fullName(self), name, whereIn(co)))
					end
				end)
			end
			return rawyield()
		end,
		IsA = function(self, d, className)
			return isA(d, className)
		end,
		IsDescendantOf = function(self, d, other)
			local cur = d.parent
			while cur do
				if cur == other then
					return true
				end
				cur = I[cur].parent
			end
			return false
		end,
		IsAncestorOf = function(self, d, other)
			return isInstance(other) and other:IsDescendantOf(self)
		end,
		GetFullName = function(self, d)
			return fullName(self)
		end,
		Clone = function(self, d)
			return cloneInstance(self)
		end,
		Destroy = function(self, d)
			destroy(self)
		end,
		Remove = function(self, d)
			setParent(self, d, nil, 3)
		end,
		ClearAllChildren = function(self, d)
			for _, c in clone(d.children) do
				destroy(c)
			end
		end,
		GetAttribute = function(self, d, name)
			return d.attrs and d.attrs[name]
		end,
		GetAttributes = function(self, d)
			return if d.attrs then clone(d.attrs) else {}
		end,
		SetAttribute = function(self, d, name, value)
			if type(name) ~= "string" then
				errorf(3, "Argument 1 missing or nil")
			end
			if value ~= nil and not attributeTypes[typeOf(value)] then
				errorf(3, "%s is not a supported attribute type", typeOf(value))
			end
			d.attrs = d.attrs or {}
			local old = d.attrs[name]
			d.attrs[name] = value
			if old ~= value then
				fire(d, "AttributeChanged", name)
				local as = d.attrSignals and d.attrSignals[name]
				if as then
					Signal.fire(Signal.data(as))
				end
			end
		end,
		GetAttributeChangedSignal = function(self, d, name)
			d.attrSignals = d.attrSignals or {}
			local s = d.attrSignals[name]
			if not s then
				local _
				s, _ = Signal.new(name)
				d.attrSignals[name] = s
			end
			return s
		end,
		GetPropertyChangedSignal = function(self, d, name)
			if not d.cls.props[name] then
				errorf(3, "%s is not a valid property name.", tostring(name))
			end
			return propSignal(d, name)
		end,
		AddTag = function(self, d, tag)
			Tags.add(self, d, tag)
		end,
		RemoveTag = function(self, d, tag)
			Tags.remove(self, d, tag)
		end,
		HasTag = function(self, d, tag)
			return d.tags ~= nil and d.tags[tag] == true
		end,
		GetTags = function(self, d)
			local out = {}
			for t in d.tags or {} do
				insert(out, t)
			end
			return out
		end,
		GetDebugId = function(self, d)
			return tostring(self)
		end,
		GetActor = function()
			return nil
		end,
		IsPropertyModified = function(self, d, name)
			return d.props[name] ~= nil
		end,
		ResetPropertyToDefault = function(self, d, name)
			setProp(d, name, d.cls.props[name] and d.cls.props[name].default)
		end,
	},
	events = { "Changed", "ChildAdded", "ChildRemoved", "DescendantAdded", "DescendantRemoving", "AncestryChanged", "AttributeChanged", "Destroying" },
})
do -- the lower-case names old tutorials still use
	local m = Classes.Instance.methods
	m.findFirstChild, m.FindFirstChildOfClass = m.FindFirstChild, m.FindFirstChildOfClass
	m.getChildren, m.children, m.GetChildren = m.GetChildren, m.GetChildren, m.GetChildren
	m.clone, m.destroy, m.remove, m.isA, m.IsDescendantOf = m.Clone, m.Destroy, m.Remove, m.IsA, m.IsDescendantOf
	m.isDescendantOf, m.waitForChild = m.IsDescendantOf, m.WaitForChild
end

local function abstract(name, super, def)
	def.abstract = true
	return defclass(name, super, def)
end

------------------------------------------------------------------------------ parts and models

local IDENTITY = CFrame.new()

--- A part's box in world space (rotation included), as its eight corners' bounds.
local function partBounds(d)
	local cf = getProp(d, "CFrame")
	local size = getProp(d, "Size") / 2
	local lo, hi = V(huge, huge, huge), V(-huge, -huge, -huge)
	for _, sx in { -1, 1 } do
		for _, sy in { -1, 1 } do
			for _, sz in { -1, 1 } do
				local p = cf * (size * V(sx, sy, sz))
				lo, hi = vector.min(lo, p), vector.max(hi, p)
			end
		end
	end
	return lo, hi
end

local function boxesTouch(alo, ahi, blo, bhi, margin)
	margin = margin or 0
	return alo.x <= bhi.x + margin and blo.x <= ahi.x + margin and alo.y <= bhi.y + margin and blo.y <= ahi.y + margin
		and alo.z <= bhi.z + margin and blo.z <= ahi.z + margin
end

local function partsUnder(root)
	local out = {}
	for _, x in descendants(root) do
		if isA(I[x], "BasePart") then
			insert(out, x)
		end
	end
	return out
end

local function filtered(list, filterType)
	local set = {}
	for _, x in list or {} do
		if isInstance(x) then
			set[x] = true
			for _, y in descendants(x) do
				set[y] = true
			end
		end
	end
	local include = filterType == Enum.RaycastFilterType.Include or filterType == Enum.RaycastFilterType.Whitelist
	return function(p)
		if include then
			return set[p] == true
		end
		return not set[p]
	end
end

--- The nearest part a ray hits (each part as its box; balls and cylinders too).
local function raycast(origin, direction, params)
	local keep = params and filtered(DT[params].FilterDescendantsInstances, DT[params].FilterType) or function()
		return true
	end
	local len = vector.magnitude(direction)
	if len == 0 then
		return nil
	end
	local best, bestT, bestN
	for _, p in partsUnder(workspace) do
		local pd = I[p]
		if getProp(pd, "CanQuery") and keep(p) and not (params and DT[params].RespectCanCollide and not getProp(pd, "CanCollide")) then
			local cf = getProp(pd, "CFrame")
			local o = cf:PointToObjectSpace(origin)
			local dv = cf:VectorToObjectSpace(direction)
			local h = getProp(pd, "Size") / 2
			local tmin, tmax, axis, sign = 0, 1, nil, 0
			local ok = true
			for _, ax in { "x", "y", "z" } do
				local oo, dd, hh = o[ax], dv[ax], h[ax]
				if abs(dd) < 1e-12 then
					if oo < -hh or oo > hh then
						ok = false
						break
					end
				else
					local t1, t2 = (-hh - oo) / dd, (hh - oo) / dd
					local s = -1
					if t1 > t2 then
						t1, t2 = t2, t1
						s = 1
					end
					if t1 > tmin then
						tmin, axis, sign = t1, ax, s
					end
					tmax = math.min(tmax, t2)
					if tmin > tmax then
						ok = false
						break
					end
				end
			end
			if ok and axis and (not bestT or tmin < bestT) then
				local nl = V(if axis == "x" then sign else 0, if axis == "y" then sign else 0, if axis == "z" then sign else 0)
				best, bestT, bestN = p, tmin, cf:VectorToWorldSpace(nl)
			end
		end
	end
	if not best then
		return nil
	end
	return makeRaycastResult({
		Instance = best,
		Position = origin + direction * bestT,
		Normal = bestN,
		Distance = len * bestT,
		Material = getProp(I[best], "Material"),
	})
end

local function partsInBox(lo, hi, params)
	local keep = params and filtered(DT[params].FilterDescendantsInstances, DT[params].FilterType) or function()
		return true
	end
	local out = {}
	for _, p in partsUnder(workspace) do
		local pd = I[p]
		if getProp(pd, "CanQuery") and keep(p) then
			local a, b = partBounds(pd)
			if boxesTouch(lo, hi, a, b) then
				insert(out, p)
				if params and (DT[params].MaxParts or 0) > 0 and #out >= DT[params].MaxParts then
					break
				end
			end
		end
	end
	return out
end

local function pivotOf(model, d)
	local pp = getProp(d, "PrimaryPart")
	if pp then
		return getProp(I[pp], "CFrame")
	end
	if d.pivot then
		return d.pivot
	end
	local parts = partsUnder(model)
	if #parts > 0 then
		local lo, hi = V(huge, huge, huge), V(-huge, -huge, -huge)
		for _, p in parts do
			local a, b = partBounds(I[p])
			lo, hi = vector.min(lo, a), vector.max(hi, b)
		end
		return CFrame.new((lo + hi) / 2)
	end
	return IDENTITY
end

local function setPartCFrame(p, cf)
	local d = I[p]
	setProp(d, "CFrame", cf)
	changed(d, "Position", cf.Position)
	changed(d, "Orientation", nil)
end

local function pivotTo(model, d, cf)
	local delta = cf * pivotOf(model, d):Inverse()
	for _, p in partsUnder(model) do
		setPartCFrame(p, delta * getProp(I[p], "CFrame"))
	end
	if not getProp(d, "PrimaryPart") then
		d.pivot = cf
	end
end

abstract("PVInstance", "Instance", {
	methods = {
		GetPivot = function(self, d)
			if isA(d, "BasePart") then
				return getProp(d, "CFrame")
			end
			return pivotOf(self, d)
		end,
		PivotTo = function(self, d, cf)
			if typeOf(cf) ~= "CFrame" then
				errorf(3, "Unable to cast %s to CoordinateFrame", describe(cf))
			end
			if isA(d, "BasePart") then
				local delta = cf * getProp(d, "CFrame"):Inverse()
				setPartCFrame(self, cf)
				for _, p in partsUnder(self) do
					setPartCFrame(p, delta * getProp(I[p], "CFrame"))
				end
			else
				pivotTo(self, d, cf)
			end
		end,
	},
})

local function degrees(cf)
	local x, y, z = cf:ToOrientation()
	return V(math.deg(x), math.deg(y), math.deg(z))
end

local touchers = {} -- parts with Touched handlers, for the test player

abstract("BasePart", "PVInstance", {
	props = {
		CFrame = IDENTITY,
		Size = V(4, 1, 2),
		Anchored = false,
		CanCollide = true,
		CanTouch = true,
		CanQuery = true,
		Transparency = 0,
		Reflectance = 0,
		Color = Color3.fromRGB(163, 162, 165),
		Material = E("Material", "Plastic"),
		MaterialVariant = "",
		Massless = false,
		Locked = false,
		CastShadow = true,
		CollisionGroup = "Default",
		CollisionGroupId = 0,
		AssemblyLinearVelocity = V(0, 0, 0),
		AssemblyAngularVelocity = V(0, 0, 0),
		CustomPhysicalProperties = ref("PhysicalProperties"),
		TopSurface = E("SurfaceType", "Smooth"),
		BottomSurface = E("SurfaceType", "Smooth"),
		FrontSurface = E("SurfaceType", "Smooth"),
		BackSurface = E("SurfaceType", "Smooth"),
		LeftSurface = E("SurfaceType", "Smooth"),
		RightSurface = E("SurfaceType", "Smooth"),
		LocalTransparencyModifier = 0,
		RootPriority = 0,
		-- these come from CFrame and Color; the entries give them their types
		Position = V(0, 0, 0),
		Orientation = V(0, 0, 0),
		Rotation = V(0, 0, 0),
		BrickColor = BrickColor.new("Medium stone grey"),
		Velocity = V(0, 0, 0),
		RotVelocity = V(0, 0, 0),
		EnableFluidForces = true,
		AudioCanCollide = true,
	},
	get = {
		Position = function(self, d)
			return getProp(d, "CFrame").Position
		end,
		Orientation = function(self, d)
			return degrees(getProp(d, "CFrame"))
		end,
		Rotation = function(self, d)
			local x, y, z = getProp(d, "CFrame"):ToEulerAnglesXYZ()
			return V(math.deg(x), math.deg(y), math.deg(z))
		end,
		BrickColor = function(self, d)
			return BrickColor.fromColor3(getProp(d, "Color"))
		end,
		Velocity = function(self, d)
			return getProp(d, "AssemblyLinearVelocity")
		end,
		RotVelocity = function(self, d)
			return getProp(d, "AssemblyAngularVelocity")
		end,
		Mass = function(self, d)
			local s = getProp(d, "Size")
			return s.x * s.y * s.z * 0.7
		end,
		AssemblyMass = function(self, d)
			local s = getProp(d, "Size")
			return s.x * s.y * s.z * 0.7
		end,
		AssemblyCenterOfMass = function(self, d)
			return getProp(d, "CFrame").Position
		end,
		AssemblyRootPart = function(self)
			return self
		end,
		ExtentsCFrame = function(self, d)
			return getProp(d, "CFrame")
		end,
		ExtentsSize = function(self, d)
			return getProp(d, "Size")
		end,
		ReceiveAge = function()
			return 0
		end,
		PivotOffset = function()
			return IDENTITY
		end,
	},
	set = {
		CFrame = function(self, d, cf)
			setPartCFrame(self, cf)
		end,
		Position = function(self, d, v)
			setPartCFrame(self, CF.withPos(getProp(d, "CFrame"), v))
		end,
		Orientation = function(self, d, v)
			local p = getProp(d, "CFrame").Position
			setPartCFrame(self, CFrame.new(p) * CFrame.fromOrientation(math.rad(v.x), math.rad(v.y), math.rad(v.z)))
		end,
		Rotation = function(self, d, v)
			local p = getProp(d, "CFrame").Position
			setPartCFrame(self, CFrame.new(p) * CFrame.Angles(math.rad(v.x), math.rad(v.y), math.rad(v.z)))
		end,
		Size = function(self, d, v)
			setProp(d, "Size", vector.max(v, V(0.001, 0.001, 0.001)))
		end,
		BrickColor = function(self, d, bc)
			setProp(d, "Color", bc.Color)
			changed(d, "BrickColor", bc)
		end,
		Velocity = function(self, d, v)
			setProp(d, "AssemblyLinearVelocity", v)
		end,
		RotVelocity = function(self, d, v)
			setProp(d, "AssemblyAngularVelocity", v)
		end,
		PivotOffset = function() end,
	},
	methods = {
		GetMass = function(self, d)
			local s = getProp(d, "Size")
			return s.x * s.y * s.z * 0.7
		end,
		ApplyImpulse = function() end,
		ApplyAngularImpulse = function() end,
		ApplyImpulseAtPosition = function() end,
		SetNetworkOwner = function() end,
		SetNetworkOwnershipAuto = function() end,
		GetNetworkOwner = function()
			return nil
		end,
		GetNetworkOwnershipAuto = function()
			return true
		end,
		CanSetNetworkOwner = function()
			return true, nil
		end,
		GetTouchingParts = function(self, d)
			local lo, hi = partBounds(d)
			local out = {}
			for _, p in partsUnder(workspace) do
				if p ~= self then
					local a, b = partBounds(I[p])
					if boxesTouch(lo, hi, a, b, 0.01) then
						insert(out, p)
					end
				end
			end
			return out
		end,
		GetConnectedParts = function(self)
			return { self }
		end,
		GetJoints = function()
			return {}
		end,
		GetRootPart = function(self)
			return self
		end,
		IsGrounded = function(self, d)
			return getProp(d, "Anchored")
		end,
		GetVelocityAtPosition = function(self, d)
			return getProp(d, "AssemblyLinearVelocity")
		end,
		BreakJoints = function() end,
		MakeJoints = function() end,
		Resize = function()
			return true
		end,
		GetClosestPointOnSurface = function(self, d, p)
			local cf = getProp(d, "CFrame")
			local h = getProp(d, "Size") / 2
			local l = cf:PointToObjectSpace(p)
			return cf * vector.clamp(l, -h, h)
		end,
		SubtractAsync = function()
			errorf(3, "SubtractAsync is not available in the test place")
		end,
		UnionAsync = function()
			errorf(3, "UnionAsync is not available in the test place")
		end,
	},
	events = { "Touched", "TouchEnded", "LocalSimulationTouched", "OutfitChanged" },
	signalHooks = {
		Touched = function(self)
			touchers[self] = true
		end,
	},
})
defclass("FormFactorPart", "BasePart", { abstract = true })
defclass("Part", "FormFactorPart", { props = { Shape = E("PartType", "Block") } })
defclass("WedgePart", "FormFactorPart", {})
defclass("CornerWedgePart", "BasePart", {})
defclass("TrussPart", "BasePart", { props = { Style = E("Style", "AlternatingSupports") } })
defclass("MeshPart", "BasePart", { props = { MeshId = "", TextureID = "", DoubleSided = false, RenderFidelity = E("RenderFidelity", "Automatic"), CollisionFidelity = E("CollisionFidelity", "Default") } })
defclass("UnionOperation", "BasePart", { props = { UsePartColor = false } })
defclass("SpawnLocation", "Part", { props = { Neutral = true, TeamColor = BrickColor.new("Medium stone grey"), AllowTeamChangeOnTouch = false, Duration = 10, Enabled = true } })
defclass("Seat", "Part", {
	props = { Disabled = false, Occupant = RO(ref("Humanoid")) },
	methods = {
		Sit = function(self, d, humanoid)
			if humanoid and isInstance(humanoid) then
				d.props.Occupant = humanoid
				changed(d, "Occupant", humanoid)
				humanoid.Sit = true
				fire(I[humanoid], "Seated", true, self)
			end
		end,
	},
})
defclass("VehicleSeat", "BasePart", {
	props = { Disabled = false, Occupant = RO(ref("Humanoid")), MaxSpeed = 25, Torque = 10, TurnSpeed = 1, Throttle = 0, Steer = 0, ThrottleFloat = 0, SteerFloat = 0, HeadsUpDisplay = true },
})
do
	local warned = false
	local function terrainNote()
		if not warned then
			warned = true
			info("(terrain is not drawn or simulated in the test place; the Fill calls do nothing)")
		end
	end
	local fill = function()
		terrainNote()
	end
	defclass("Terrain", "BasePart", {
		internal = true,
		props = { WaterColor = Color3.fromRGB(12, 84, 92), WaterReflectance = 1, WaterTransparency = 0.3, WaterWaveSize = 0.15, WaterWaveSpeed = 10, Decoration = false },
		methods = {
			FillBlock = fill, FillBall = fill, FillCylinder = fill, FillWedge = fill, FillRegion = fill, Clear = fill,
			ReplaceMaterial = fill, WriteVoxels = fill, FillRegion3 = fill,
			ReadVoxels = function()
				return {}, {}
			end,
			CellCenterToWorld = function(self, d, x, y, z)
				return V(x * 4 + 2, y * 4 + 2, z * 4 + 2)
			end,
			WorldToCell = function(self, d, p)
				return vector.floor(p / 4)
			end,
		},
	})
end

defclass("Model", "PVInstance", {
	props = { WorldPivot = IDENTITY, PrimaryPart = ref("BasePart"), LevelOfDetail = E("ModelLevelOfDetail", "Automatic"), ModelStreamingMode = E("ModelStreamingMode", "Default") },
	get = {
		WorldPivot = function(self, d)
			return pivotOf(self, d)
		end,
	},
	set = {
		WorldPivot = function(self, d, cf)
			d.pivot = cf
		end,
	},
	methods = {
		MoveTo = function(self, d, p)
			local pivot = pivotOf(self, d)
			pivotTo(self, d, CF.withPos(pivot, p))
		end,
		SetPrimaryPartCFrame = function(self, d, cf)
			if not getProp(d, "PrimaryPart") then
				errorf(3, "Model:SetPrimaryPartCFrame() failed because no PrimaryPart has been set, or the PrimaryPart no longer exists. Please set Model.PrimaryPart before using this.")
			end
			pivotTo(self, d, cf)
		end,
		GetPrimaryPartCFrame = function(self, d)
			local pp = getProp(d, "PrimaryPart")
			return if pp then getProp(I[pp], "CFrame") else IDENTITY
		end,
		TranslateBy = function(self, d, v)
			pivotTo(self, d, pivotOf(self, d) + v)
		end,
		GetBoundingBox = function(self, d)
			local lo, hi = V(huge, huge, huge), V(-huge, -huge, -huge)
			for _, p in partsUnder(self) do
				local a, b = partBounds(I[p])
				lo, hi = vector.min(lo, a), vector.max(hi, b)
			end
			if lo.x == huge then
				return IDENTITY, V(0, 0, 0)
			end
			return CFrame.new((lo + hi) / 2), hi - lo
		end,
		GetExtentsSize = function(self, d)
			local _, size = self:GetBoundingBox()
			return size
		end,
		GetScale = function()
			return 1
		end,
		ScaleTo = function() end,
		BreakJoints = function() end,
		MakeJoints = function() end,
		GetModelCFrame = function(self, d)
			return pivotOf(self, d)
		end,
	},
})
defclass("Actor", "Model", {})
defclass("Folder", "Instance", {})
defclass("Configuration", "Instance", {})
defclass("WorldModel", "Model", {})

-- values
local leaderstatsNote -- set further down (it needs the players)
do
local function valueClass(name, default, extra)
	defclass(name, "Instance", {
		valueBase = true,
		props = { Value = default },
		set = extra and extra.set or nil,
		onChange = {
			Value = function(self, d, v)
				if leaderstatsNote then
					leaderstatsNote(self, d)
				end
			end,
		},
		onParent = function(self, d, old, new)
			if leaderstatsNote and new then
				leaderstatsNote(self, d, true)
			end
		end,
	})
end
valueClass("IntValue", 0, {
	set = {
		Value = function(self, d, v)
			v = if v >= 0 then floor(v) else -floor(-v)
			setProp(d, "Value", v)
		end,
	},
})
valueClass("NumberValue", 0)
valueClass("StringValue", "")
valueClass("BoolValue", false)
valueClass("ObjectValue", ref("Instance"))
valueClass("Vector3Value", V(0, 0, 0))
valueClass("CFrameValue", IDENTITY)
valueClass("Color3Value", Color3.new(0, 0, 0))
valueClass("BrickColorValue", BrickColor.new("Medium stone grey"))
valueClass("RayValue", Ray.new())
end

------------------------------------------------------------------------------ attachments etc.

do
local function worldOf(d)
	local p = d.parent
	if p and isA(I[p], "BasePart") then
		return getProp(I[p], "CFrame") * getProp(d, "CFrame")
	end
	return getProp(d, "CFrame")
end
defclass("Attachment", "Instance", {
	props = { CFrame = IDENTITY, Visible = false, Axis = V(1, 0, 0), SecondaryAxis = V(0, 1, 0), Position = V(0, 0, 0), Orientation = V(0, 0, 0), WorldPosition = V(0, 0, 0), WorldOrientation = V(0, 0, 0), WorldCFrame = IDENTITY },
	get = {
		Position = function(self, d)
			return getProp(d, "CFrame").Position
		end,
		Orientation = function(self, d)
			return degrees(getProp(d, "CFrame"))
		end,
		WorldCFrame = function(self, d)
			return worldOf(d)
		end,
		WorldPosition = function(self, d)
			return worldOf(d).Position
		end,
		WorldOrientation = function(self, d)
			return degrees(worldOf(d))
		end,
		WorldAxis = function(self, d)
			return worldOf(d).RightVector
		end,
	},
	set = {
		Position = function(self, d, v)
			setProp(d, "CFrame", CF.withPos(getProp(d, "CFrame"), v))
		end,
		Orientation = function(self, d, v)
			setProp(d, "CFrame", CFrame.new(getProp(d, "CFrame").Position) * CFrame.fromOrientation(math.rad(v.x), math.rad(v.y), math.rad(v.z)))
		end,
		WorldPosition = function(self, d, v)
			local p = d.parent
			local base = if p and isA(I[p], "BasePart") then getProp(I[p], "CFrame") else IDENTITY
			setProp(d, "CFrame", CF.withPos(getProp(d, "CFrame"), base:PointToObjectSpace(v)))
		end,
		WorldCFrame = function(self, d, cf)
			local p = d.parent
			local base = if p and isA(I[p], "BasePart") then getProp(I[p], "CFrame") else IDENTITY
			setProp(d, "CFrame", base:ToObjectSpace(cf))
		end,
	},
})
defclass("Bone", "Attachment", { props = { Transform = IDENTITY } })
end

-- joints and constraints hold their settings; nothing moves without physics
abstract("JointInstance", "Instance", { props = { Part0 = ref("BasePart"), Part1 = ref("BasePart"), C0 = IDENTITY, C1 = IDENTITY, Enabled = true, Active = RO(true) } })
defclass("Weld", "JointInstance", {})
defclass("ManualWeld", "JointInstance", {})
defclass("Snap", "JointInstance", {})
defclass("Glue", "JointInstance", {})
defclass("Motor", "JointInstance", { props = { CurrentAngle = 0, DesiredAngle = 0, MaxVelocity = 0 } })
defclass("Motor6D", "Motor", { props = { Transform = IDENTITY } })
defclass("WeldConstraint", "Instance", { props = { Part0 = ref("BasePart"), Part1 = ref("BasePart"), Enabled = true, Active = RO(true) } })
defclass("NoCollisionConstraint", "Instance", { props = { Part0 = ref("BasePart"), Part1 = ref("BasePart"), Enabled = true } })
abstract("Constraint", "Instance", { props = { Attachment0 = ref("Attachment"), Attachment1 = ref("Attachment"), Enabled = true, Visible = false, Color = BrickColor.new("Bright blue"), Active = RO(true) } })
for name, props in {
	HingeConstraint = { ActuatorType = E("ActuatorType", "None"), AngularSpeed = 0, AngularVelocity = 0, MotorMaxTorque = 0, ServoMaxTorque = 0, TargetAngle = 0, LimitsEnabled = false, LowerAngle = -45, UpperAngle = 45, CurrentAngle = RO(0) },
	RopeConstraint = { Length = 5, Restitution = 0, Thickness = 0.1, WinchEnabled = false, WinchTarget = 0, WinchSpeed = 2, CurrentDistance = RO(0) },
	RodConstraint = { Length = 5, Thickness = 0.1, CurrentDistance = RO(0) },
	SpringConstraint = { Stiffness = 0, Damping = 0, FreeLength = 1, LimitsEnabled = false, MaxLength = 5, MinLength = 0, Coils = 3, Radius = 0.4, Thickness = 0.1 },
	BallSocketConstraint = { LimitsEnabled = false, TwistLimitsEnabled = false, UpperAngle = 45, Radius = 0.15 },
	PrismaticConstraint = { ActuatorType = E("ActuatorType", "None"), Speed = 0, Velocity = 0, TargetPosition = 0, LimitsEnabled = false, LowerLimit = 0, UpperLimit = 5, ServoMaxForce = 0, MotorMaxForce = 0 },
	CylindricalConstraint = { ActuatorType = E("ActuatorType", "None"), AngularActuatorType = E("ActuatorType", "None") },
	AlignPosition = { Mode = E("PositionAlignmentMode", "TwoAttachment"), Position = V(0, 0, 0), MaxForce = 10000, MaxVelocity = huge, Responsiveness = 10, RigidityEnabled = false, ApplyAtCenterOfMass = false, ReactionForceEnabled = false },
	AlignOrientation = { Mode = E("OrientationAlignmentMode", "TwoAttachment"), CFrame = IDENTITY, MaxTorque = 10000, MaxAngularVelocity = huge, Responsiveness = 10, RigidityEnabled = false, PrimaryAxisOnly = false },
	LinearVelocity = { VectorVelocity = V(0, 0, 0), MaxForce = 1000, VelocityConstraintMode = E("VelocityConstraintMode", "Vector"), RelativeTo = E("ActuatorRelativeTo", "World"), LineVelocity = 0, PlaneVelocity = Vector2.new(0, 0), ForceLimitsEnabled = true },
	AngularVelocity = { AngularVelocity = V(0, 0, 0), MaxTorque = 0, RelativeTo = E("ActuatorRelativeTo", "World"), ReactionTorqueEnabled = false },
	VectorForce = { Force = V(0, 0, 0), RelativeTo = E("ActuatorRelativeTo", "Attachment0"), ApplyAtCenterOfMass = false },
	Torque = { Torque = V(0, 0, 0), RelativeTo = E("ActuatorRelativeTo", "Attachment0") },
	LineForce = { Magnitude = 1000, MaxForce = huge, ApplyAtCenterOfMass = false, InverseSquareLaw = false, ReactionForceEnabled = false },
	Plane = {},
} do
	defclass(name, "Constraint", { props = props })
end
for name, props in {
	BodyVelocity = { Velocity = V(0, 2, 0), MaxForce = V(4000, 4000, 4000), P = 1250 },
	BodyGyro = { CFrame = IDENTITY, MaxTorque = V(400000, 0, 400000), P = 3000, D = 500 },
	BodyPosition = { Position = V(0, 50, 0), MaxForce = V(4000, 4000, 4000), P = 10000, D = 1250 },
	BodyForce = { Force = V(0, 0, 0) },
	BodyAngularVelocity = { AngularVelocity = V(0, 2, 0), MaxTorque = V(4000, 4000, 4000), P = 1250 },
	BodyThrust = { Force = V(0, 0, 0), Location = V(0, 0, 0) },
} do
	defclass(name, "Instance", { props = props })
end

-- what things look like: kept as set, not drawn
do
local looks = {
	PointLight = { Brightness = 1, Color = Color3.new(1, 1, 1), Enabled = true, Range = 8, Shadows = false },
	SpotLight = { Brightness = 1, Color = Color3.new(1, 1, 1), Enabled = true, Range = 16, Shadows = false, Angle = 90, Face = E("NormalId", "Front") },
	SurfaceLight = { Brightness = 1, Color = Color3.new(1, 1, 1), Enabled = true, Range = 16, Shadows = false, Angle = 90, Face = E("NormalId", "Front") },
	Fire = { Size = 5, Heat = 9, Color = Color3.fromRGB(236, 139, 70), SecondaryColor = Color3.fromRGB(139, 80, 55), Enabled = true, TimeScale = 1 },
	Smoke = { Color = Color3.new(1, 1, 1), Opacity = 0.5, RiseVelocity = 1, Size = 1, Enabled = true, TimeScale = 1 },
	Sparkles = { SparkleColor = Color3.fromRGB(144, 25, 255), Enabled = true, TimeScale = 1 },
	Beam = { Attachment0 = ref("Attachment"), Attachment1 = ref("Attachment"), Color = ColorSequence.new(Color3.new(1, 1, 1)), Enabled = true, FaceCamera = false, LightEmission = 0, LightInfluence = 0, Segments = 10, Texture = "", TextureLength = 1, TextureSpeed = 1, Transparency = NumberSequence.new(0.5), Width0 = 1, Width1 = 1, CurveSize0 = 0, CurveSize1 = 0, ZOffset = 0 },
	Trail = { Attachment0 = ref("Attachment"), Attachment1 = ref("Attachment"), Color = ColorSequence.new(Color3.new(1, 1, 1)), Enabled = true, FaceCamera = false, Lifetime = 2, LightEmission = 0, MinLength = 0.1, MaxLength = 0, Texture = "", Transparency = NumberSequence.new(0.5), WidthScale = NumberSequence.new(1) },
	Highlight = { Adornee = ref("Instance"), DepthMode = E("HighlightDepthMode", "AlwaysOnTop"), Enabled = true, FillColor = Color3.fromRGB(255, 0, 0), FillTransparency = 0.5, OutlineColor = Color3.new(1, 1, 1), OutlineTransparency = 0 },
	SelectionBox = { Adornee = ref("Instance"), Color3 = Color3.fromRGB(13, 105, 172), LineThickness = 0.15, SurfaceColor3 = Color3.fromRGB(13, 105, 172), SurfaceTransparency = 1, Transparency = 0, Visible = true },
	Decal = { Texture = "", Color3 = Color3.new(1, 1, 1), Transparency = 0, Face = E("NormalId", "Front"), ZIndex = 1 },
	Texture = { Texture = "", Color3 = Color3.new(1, 1, 1), Transparency = 0, Face = E("NormalId", "Front"), ZIndex = 1, StudsPerTileU = 2, StudsPerTileV = 2, OffsetStudsU = 0, OffsetStudsV = 0 },
	SpecialMesh = { MeshType = E("MeshType", "Head"), MeshId = "", TextureId = "", Scale = V(1, 1, 1), Offset = V(0, 0, 0), VertexColor = V(1, 1, 1) },
	BlockMesh = { Scale = V(1, 1, 1), Offset = V(0, 0, 0) },
	CylinderMesh = { Scale = V(1, 1, 1), Offset = V(0, 0, 0) },
	Sky = { SkyboxBk = "", SkyboxDn = "", SkyboxFt = "", SkyboxLf = "", SkyboxRt = "", SkyboxUp = "", CelestialBodiesShown = true, StarCount = 3000, SunAngularSize = 21, MoonAngularSize = 11, SunTextureId = "", MoonTextureId = "" },
	Atmosphere = { Density = 0.3, Offset = 0.25, Color = Color3.fromRGB(199, 170, 107), Decay = Color3.fromRGB(92, 60, 13), Glare = 0, Haze = 0 },
	Clouds = { Cover = 0.5, Density = 0.7, Color = Color3.new(1, 1, 1), Enabled = true },
	BloomEffect = { Enabled = true, Intensity = 1, Size = 24, Threshold = 2 },
	BlurEffect = { Enabled = true, Size = 24 },
	ColorCorrectionEffect = { Enabled = true, Brightness = 0, Contrast = 0, Saturation = 0, TintColor = Color3.new(1, 1, 1) },
	SunRaysEffect = { Enabled = true, Intensity = 0.25, Spread = 1 },
	DepthOfFieldEffect = { Enabled = true, FarIntensity = 0.75, FocusDistance = 0.05, InFocusRadius = 10, NearIntensity = 0.75 },
	Shirt = { ShirtTemplate = "", Color3 = Color3.new(1, 1, 1) },
	Pants = { PantsTemplate = "", Color3 = Color3.new(1, 1, 1) },
	ShirtGraphic = { Graphic = "", Color3 = Color3.new(1, 1, 1) },
	BodyColors = { HeadColor3 = Color3.fromRGB(253, 234, 141), TorsoColor3 = Color3.fromRGB(13, 105, 172), LeftArmColor3 = Color3.fromRGB(253, 234, 141), RightArmColor3 = Color3.fromRGB(253, 234, 141), LeftLegColor3 = Color3.fromRGB(13, 105, 172), RightLegColor3 = Color3.fromRGB(13, 105, 172) },
	Animation = { AnimationId = "" },
	ForceField = { Visible = true },
	SoundGroup = { Volume = 0.5 },
	Team = { TeamColor = BrickColor.new("White"), AutoAssignable = true },
	Accessory = { AttachmentPoint = IDENTITY, AccessoryType = E("AccessoryType", "Unknown") },
	Hat = { AttachmentPoint = IDENTITY },
	HumanoidDescription = { BodyTypeScale = 0.3, DepthScale = 1, HeadScale = 1, HeightScale = 1, ProportionScale = 1, WidthScale = 1, Face = 0, Head = 0, Shirt = 0, Pants = 0, GraphicTShirt = 0, HatAccessory = "", HairAccessory = "", FaceAccessory = "", BackAccessory = "", ClimbAnimation = 0, IdleAnimation = 0, JumpAnimation = 0, RunAnimation = 0, WalkAnimation = 0, HeadColor = Color3.new(1, 1, 1), TorsoColor = Color3.new(1, 1, 1) },
	Dialog = { InitialPrompt = "", Purpose = E("DialogPurpose", "Help"), Tone = E("DialogTone", "Neutral"), ConversationDistance = 25, InUse = false },
	DialogChoice = { UserDialog = "", ResponseDialog = "", GoodbyeDialog = "" },
	PathfindingModifier = { Label = "", PassThrough = false },
	Message = { Text = "" },
	Hint = { Text = "" },
	ReverbSoundEffect = { Enabled = true, Priority = 0, DecayTime = 1.5, Density = 1, Diffusion = 1, DryLevel = -6, WetLevel = 0 },
	EqualizerSoundEffect = { Enabled = true, Priority = 0, HighGain = 0, LowGain = -20, MidGain = -10 },
	EchoSoundEffect = { Enabled = true, Priority = 0, Delay = 1, DryLevel = 0, Feedback = 0.5, WetLevel = 0 },
	DistortionSoundEffect = { Enabled = true, Priority = 0, Level = 0.75 },
	PitchShiftSoundEffect = { Enabled = true, Priority = 0, Octave = 1.25 },
	ChorusSoundEffect = { Enabled = true, Priority = 0, Depth = 0.15, Mix = 0.5, Rate = 0.5 },
	CompressorSoundEffect = { Enabled = true, Priority = 0, Attack = 0.1, GainMakeup = 0, Ratio = 40, Release = 0.1, Threshold = -40 },
	TremoloSoundEffect = { Enabled = true, Priority = 0, Depth = 1, Duty = 0.5, Frequency = 5 },
	FlangeSoundEffect = { Enabled = true, Priority = 0, Depth = 0.45, Mix = 0.85, Rate = 5 },
}
for name, props in looks do
	defclass(name, "Instance", { props = props })
end
Classes.Team.methods.GetPlayers = wrapMethod("GetPlayers", function(self)
	local out = {}
	for _, p in Players:GetPlayers() do
		if getProp(I[p], "Team") == self then
			insert(out, p)
		end
	end
	return out
end)
Classes.Team.events.PlayerAdded = true
Classes.Team.events.PlayerRemoved = true
end

defclass("ParticleEmitter", "Instance", {
	props = {
		Rate = 20, Enabled = true, Lifetime = NumberRange.new(5, 10), Speed = NumberRange.new(5), Color = ColorSequence.new(Color3.new(1, 1, 1)),
		Size = NumberSequence.new(1), Transparency = NumberSequence.new(0), Texture = "rbxasset://textures/particles/sparkles_main.dds",
		LightEmission = 0, LightInfluence = 0, SpreadAngle = Vector2.new(0, 0), Acceleration = V(0, 0, 0), Drag = 0,
		EmissionDirection = E("NormalId", "Top"), LockedToPart = false, Rotation = NumberRange.new(0), RotSpeed = NumberRange.new(0),
		ZOffset = 0, Shape = E("ParticleEmitterShape", "Box"), Brightness = 1, Orientation = E("ParticleOrientation", "FacingCamera"),
		TimeScale = 1, Squash = NumberSequence.new(0), VelocityInheritance = 0,
	},
	methods = {
		Emit = function() end,
		Clear = function() end,
	},
})

defclass("Explosion", "Instance", {
	props = { Position = V(0, 0, 0), BlastRadius = 4, BlastPressure = 500000, DestroyJointRadiusPercent = 1, ExplosionType = E("ExplosionType", "Craters"), Visible = true, TimeScale = 1 },
	events = { "Hit" },
	onParent = function(self, d, old, new)
		if not (new and inGame(self)) or d.exploded then
			return
		end
		d.exploded = true
		-- what an explosion does to what is near it: Hit for each part, and characters in the
		-- blast die (Roblox breaks their joints)
		later(now, function()
			local pos, r = getProp(d, "Position"), getProp(d, "BlastRadius")
			local killed = {}
			for _, p in partsUnder(workspace) do
				local dist = vector.magnitude(getProp(I[p], "CFrame").Position - pos)
				if dist <= r then
					fire(d, "Hit", p, dist)
					local model = I[p].parent
					local hum = model and model:FindFirstChildOfClass("Humanoid")
					if hum and not killed[hum] and getProp(d, "DestroyJointRadiusPercent") > 0 then
						killed[hum] = true
						hum.Health = 0
					end
				end
			end
			sleep(1)
			if not I[self].destroyed then
				destroy(self)
			end
		end)
	end,
})

defclass("ClickDetector", "Instance", {
	props = { MaxActivationDistance = 32, CursorIcon = "" },
	events = { "MouseClick", "RightMouseClick", "MouseHoverEnter", "MouseHoverLeave" },
})
defclass("ProximityPrompt", "Instance", {
	props = {
		ActionText = "Interact", ObjectText = "", HoldDuration = 0, KeyboardKeyCode = E("KeyCode", "E"), GamepadKeyCode = E("KeyCode", "ButtonX"),
		MaxActivationDistance = 10, RequiresLineOfSight = true, Enabled = true, ClickablePrompt = true, Style = E("ProximityPromptStyle", "Default"),
		UIOffset = Vector2.new(0, 0), Exclusivity = E("ProximityPromptExclusivity", "OnePerButton"), AutoLocalize = true,
	},
	methods = {
		InputHoldBegin = function() end,
		InputHoldEnd = function() end,
	},
	events = { "Triggered", "TriggerEnded", "PromptButtonHoldBegan", "PromptButtonHoldEnded", "PromptShown", "PromptHidden" },
})

-- sounds: a sound plays for two game seconds (there are no sound files to measure here)
do
local SOUND_SECONDS = 2
defclass("Sound", "Instance", {
	props = {
		SoundId = "", Volume = 0.5, Looped = false, PlaybackSpeed = 1, TimePosition = 0, RollOffMaxDistance = 10000, RollOffMinDistance = 10,
		RollOffMode = E("RollOffMode", "Inverse"), SoundGroup = ref("SoundGroup"), PlayOnRemove = false, Pitch = 1, Playing = false,
		IsPaused = RO(false), IsLoaded = RO(true), PlaybackRegionsEnabled = false,
	},
	get = {
		IsPlaying = function(self, d)
			return getProp(d, "Playing")
		end,
		TimeLength = function()
			return SOUND_SECONDS
		end,
	},
	methods = {
		Play = function(self, d)
			d.playId = (d.playId or 0) + 1
			local id = d.playId
			setProp(d, "Playing", true)
			fire(d, "Played", getProp(d, "SoundId"))
			local function finish()
				if d.playId ~= id or not getProp(d, "Playing") then
					return
				end
				if getProp(d, "Looped") then
					fire(d, "DidLoop", getProp(d, "SoundId"), 1)
					later(now + SOUND_SECONDS, finish)
				else
					setProp(d, "Playing", false)
					fire(d, "Ended", getProp(d, "SoundId"))
				end
			end
			later(now + SOUND_SECONDS / math.max(getProp(d, "PlaybackSpeed"), 0.01), finish)
		end,
		Stop = function(self, d)
			d.playId = (d.playId or 0) + 1
			setProp(d, "Playing", false)
			setProp(d, "TimePosition", 0)
			fire(d, "Stopped", getProp(d, "SoundId"))
		end,
		Pause = function(self, d)
			d.playId = (d.playId or 0) + 1
			setProp(d, "Playing", false)
			fire(d, "Paused", getProp(d, "SoundId"))
		end,
		Resume = function(self, d)
			self:Play()
			fire(d, "Resumed", getProp(d, "SoundId"))
		end,
	},
	events = { "Played", "Ended", "Stopped", "Paused", "Resumed", "Loaded", "DidLoop" },
})

end
-- remote and bindable events. The client and the server are the same place here; the script
-- doing the calling decides which side it is on, so calls from the wrong side fail as in Roblox.
local undelivered = {}
local function copyArg(v, seen)
	if type(v) == "function" then
		return nil
	elseif type(v) == "table" then
		seen = seen or {}
		if seen[v] then
			return seen[v]
		end
		local t = {}
		seen[v] = t
		for k, x in v do
			if type(k) ~= "function" and type(k) ~= "table" then
				t[k] = copyArg(x, seen)
			end
		end
		return t
	end
	return v
end
local SERVER = { kind = "Script" }
do
local function copyArgs(...)
	local n = select("#", ...)
	local t = { ... }
	for i = 1, n do
		t[i] = copyArg(t[i])
	end
	return t, n
end
local function serverOnly(what, level)
	if isClient() then
		errorf(level + 1, "%s can only be called from the server", what)
	end
end
local function clientOnly(what, level)
	if not isClient() then
		errorf(level + 1, "%s can only be called from the client", what)
	end
end
local function deliver(d, event, args, n, first)
	local sig = Signal.data(signalOf(d, event))
	local function go()
		if first then
			Signal.fire(sig, first, table.unpack(args, 1, n))
		else
			Signal.fire(sig, table.unpack(args, 1, n))
		end
	end
	if Signal.count(sig) == 0 then
		-- Roblox keeps remote events until something listens
		d.queued = d.queued or {}
		insert(d.queued, go)
		return
	end
	later(now + 0.02, go)
end
local function remoteHooks(event, guardSide)
	return function(self, d, sig)
		sig.guard = function(level)
			if guardSide == "server" and isClient() then
				errorf(level, "%s can only be used on the server", event)
			elseif guardSide == "client" and not isClient() then
				errorf(level, "%s can only be used on the client", event)
			end
		end
		sig.onConnect = function()
			if d.queued then
				local q = d.queued
				d.queued = nil
				for _, go in q do
					later(now + 0.02, go)
				end
			end
		end
	end
end
local remoteDef = {
	methods = {
		FireServer = function(self, d, ...)
			clientOnly("FireServer", 3)
			local args, n = copyArgs(...)
			deliver(d, "OnServerEvent", args, n, testPlayer)
			undelivered[self] = true
		end,
		FireClient = function(self, d, player, ...)
			serverOnly("FireClient", 3)
			if not (isInstance(player) and isA(I[player], "Player")) then
				errorf(3, "FireClient: player argument must be a Player object")
			end
			local args, n = copyArgs(...)
			deliver(d, "OnClientEvent", args, n)
			undelivered[self] = true
		end,
		FireAllClients = function(self, d, ...)
			serverOnly("FireAllClients", 3)
			local args, n = copyArgs(...)
			deliver(d, "OnClientEvent", args, n)
			undelivered[self] = true
		end,
		FireClientsInRange = function(self, d, pos, range, ...)
			serverOnly("FireAllClients", 3)
			local args, n = copyArgs(...)
			deliver(d, "OnClientEvent", args, n)
		end,
	},
	events = { "OnServerEvent", "OnClientEvent" },
	signalHooks = { OnServerEvent = remoteHooks("OnServerEvent", "server"), OnClientEvent = remoteHooks("OnClientEvent", "client") },
}
defclass("RemoteEvent", "Instance", remoteDef)
defclass("UnreliableRemoteEvent", "Instance", remoteDef)

--- Waits for the callback property [prop] of [d] to be set (Roblox's invokes wait for it too).
local function callbackOf(d, prop)
	while not getProp(d, prop) do
		propSignal(d, prop):Wait()
	end
	return getProp(d, prop)
end
local function invoke(d, prop, side, first, ...)
	local cb = callbackOf(d, prop)
	sleep(0.02)
	local args, n = copyArgs(...)
	local prev = ctx
	ctx = side
	local r = table.pack(pcall(cb, first, table.unpack(args, 1, n)))
	ctx = prev
	if not r[1] then
		error(r[2], 0)
	end
	local out = {}
	for i = 2, r.n do
		out[i - 1] = copyArg(r[i])
	end
	return table.unpack(out, 1, r.n - 1)
end
local CLIENT = { kind = "LocalScript" }
defclass("RemoteFunction", "Instance", {
	props = { OnServerInvoke = ref("function"), OnClientInvoke = ref("function") },
	methods = {
		InvokeServer = function(self, d, ...)
			clientOnly("InvokeServer", 3)
			return invoke(d, "OnServerInvoke", SERVER, testPlayer, ...)
		end,
		InvokeClient = function(self, d, player, ...)
			serverOnly("InvokeClient", 3)
			local cb = callbackOf(d, "OnClientInvoke")
			sleep(0.02)
			local prev = ctx
			ctx = CLIENT
			local r = table.pack(pcall(cb, ...))
			ctx = prev
			if not r[1] then
				error(r[2], 0)
			end
			return table.unpack(r, 2, r.n)
		end,
	},
})
defclass("BindableEvent", "Instance", {
	methods = {
		Fire = function(self, d, ...)
			local args, n = copyArgs(...)
			fire(d, "Event", table.unpack(args, 1, n))
		end,
	},
	events = { "Event" },
})
defclass("BindableFunction", "Instance", {
	props = { OnInvoke = ref("function") },
	methods = {
		Invoke = function(self, d, ...)
			local cb = callbackOf(d, "OnInvoke")
			return cb(...)
		end,
	},
})

end
-- scripts: the ones being run are made by the env hook; others are just objects here
abstract("LuaSourceContainer", "Instance", { props = { Source = "" } })
abstract("BaseScript", "LuaSourceContainer", { props = { Disabled = false, Enabled = true, RunContext = E("RunContext", "Legacy"), LinkedSource = "" } })
defclass("Script", "BaseScript", {})
defclass("LocalScript", "Script", {})
defclass("ModuleScript", "LuaSourceContainer", {})

-- tools
defclass("Tool", "Model", {
	props = { RequiresHandle = true, CanBeDropped = true, Enabled = true, ManualActivationOnly = false, ToolTip = "", TextureId = "", Grip = IDENTITY },
	get = {
		GripPos = function(self, d)
			return getProp(d, "Grip").Position
		end,
	},
	methods = {
		Activate = function(self, d)
			fire(d, "Activated")
		end,
		Deactivate = function(self, d)
			fire(d, "Deactivated")
		end,
	},
	events = { "Activated", "Deactivated", "Equipped", "Unequipped" },
	onParent = function(self, d, old, new)
		local function isCharacter(x)
			return x ~= nil and x:FindFirstChildOfClass("Humanoid") ~= nil
		end
		if new and isCharacter(new) then
			fire(d, "Equipped", testPlayer and testPlayer:GetMouse())
		elseif old and isCharacter(old) then
			fire(d, "Unequipped")
		end
	end,
})
defclass("HopperBin", "Instance", { props = { Active = false } })

------------------------------------------------------------------------------------------ GUI

local SCREEN = Vector2.new(1280, 720)
abstract("GuiBase", "Instance", {})
abstract("GuiBase2d", "GuiBase", {
	props = { AutoLocalize = true, RootLocalizationTable = ref("Instance"), SelectionGroup = false },
	get = {
		AbsoluteSize = function(self, d)
			return SCREEN
		end,
		AbsolutePosition = function()
			return Vector2.new(0, 0)
		end,
		AbsoluteRotation = function()
			return 0
		end,
	},
})
abstract("LayerCollector", "GuiBase2d", { props = { Enabled = true, ResetOnSpawn = true, ZIndexBehavior = E("ZIndexBehavior", "Sibling") } })
defclass("ScreenGui", "LayerCollector", {
	props = { DisplayOrder = 0, IgnoreGuiInset = false, ScreenInsets = E("ScreenInsets", "CoreUISafeInsets"), ClipToDeviceSafeArea = true, SafeAreaCompatibility = E("SafeAreaCompatibility", "FullscreenExtension") },
})
defclass("SurfaceGui", "LayerCollector", {
	props = { Adornee = ref("Instance"), Face = E("NormalId", "Front"), CanvasSize = Vector2.new(800, 600), AlwaysOnTop = false, LightInfluence = 1, Brightness = 1, PixelsPerStud = 50, SizingMode = E("SurfaceGuiSizingMode", "FixedSize"), ClipsDescendants = true, ZOffset = 0, MaxDistance = 1000 },
})
defclass("BillboardGui", "LayerCollector", {
	props = { Adornee = ref("Instance"), Size = UDim2.new(0, 200, 0, 50), SizeOffset = Vector2.new(0, 0), StudsOffset = V(0, 0, 0), StudsOffsetWorldSpace = V(0, 0, 0), ExtentsOffset = V(0, 0, 0), ExtentsOffsetWorldSpace = V(0, 0, 0), AlwaysOnTop = false, LightInfluence = 0, MaxDistance = huge, ClipsDescendants = false, Active = false, Brightness = 1, DistanceLowerLimit = 0, DistanceUpperLimit = -1, DistanceStep = 0, PlayerToHideFrom = ref("Instance") },
})

do
local function guiTween(self, d, endPos, endSize, time, callback)
	later(now + (time or 1), function()
		if endPos then
			setProp(d, "Position", endPos)
		end
		if endSize then
			setProp(d, "Size", endSize)
		end
		if type(callback) == "function" then
			spawnNow(callback, Enum.TweenStatus.Completed)
		end
	end)
	return true
end
abstract("GuiObject", "GuiBase2d", {
	props = {
		Active = false, AnchorPoint = Vector2.new(0, 0), AutomaticSize = E("AutomaticSize", "None"), BackgroundColor3 = Color3.fromRGB(255, 255, 255),
		BackgroundTransparency = 0, BorderColor3 = Color3.fromRGB(27, 42, 53), BorderMode = E("BorderMode", "Outline"), BorderSizePixel = 1,
		ClipsDescendants = false, LayoutOrder = 0, Position = UDim2.new(0, 0, 0, 0), Rotation = 0, Selectable = false,
		Size = UDim2.new(0, 100, 0, 100), SizeConstraint = E("SizeConstraint", "RelativeXY"), Visible = true, ZIndex = 1,
		Interactable = true, SelectionOrder = 0, NextSelectionUp = ref("GuiObject"), NextSelectionDown = ref("GuiObject"),
		NextSelectionLeft = ref("GuiObject"), NextSelectionRight = ref("GuiObject"), GuiState = RO(E("GuiState", "Idle")),
		BackgroundColor = BrickColor.new("Medium stone grey"), Transparency = 0,
	},
	methods = {
		TweenPosition = function(self, d, pos, dir, style, time, override, cb)
			return guiTween(self, d, pos, nil, time, cb)
		end,
		TweenSize = function(self, d, size, dir, style, time, override, cb)
			return guiTween(self, d, nil, size, time, cb)
		end,
		TweenSizeAndPosition = function(self, d, size, pos, dir, style, time, override, cb)
			return guiTween(self, d, pos, size, time, cb)
		end,
	},
	events = { "InputBegan", "InputEnded", "InputChanged", "MouseEnter", "MouseLeave", "MouseMoved", "MouseWheelForward", "MouseWheelBackward", "SelectionGained", "SelectionLost", "TouchTap", "TouchLongPress", "TouchPan", "TouchPinch", "TouchRotate", "TouchSwipe" },
})
defclass("Frame", "GuiObject", { props = { Style = E("FrameStyle", "Custom") } })
defclass("ScrollingFrame", "GuiObject", {
	props = {
		CanvasSize = UDim2.new(0, 0, 2, 0), CanvasPosition = Vector2.new(0, 0), ScrollBarThickness = 12, ScrollingDirection = E("ScrollingDirection", "XY"),
		ScrollingEnabled = true, AutomaticCanvasSize = E("AutomaticSize", "None"), ElasticBehavior = E("ElasticBehavior", "WhenScrollable"),
		ScrollBarImageColor3 = Color3.new(0, 0, 0), ScrollBarImageTransparency = 0, VerticalScrollBarInset = E("ScrollBarInset", "None"),
		HorizontalScrollBarInset = E("ScrollBarInset", "None"), TopImage = "", MidImage = "", BottomImage = "",
		VerticalScrollBarPosition = E("VerticalScrollBarPosition", "Right"),
	},
	get = {
		AbsoluteCanvasSize = function()
			return SCREEN
		end,
		AbsoluteWindowSize = function()
			return SCREEN
		end,
	},
})
defclass("CanvasGroup", "GuiObject", { props = { GroupTransparency = 0, GroupColor3 = Color3.new(1, 1, 1) } })
defclass("ViewportFrame", "GuiObject", { props = { CurrentCamera = ref("Camera"), Ambient = Color3.fromRGB(200, 200, 200), LightColor = Color3.fromRGB(140, 140, 140), LightDirection = V(-1, -1, -1), ImageColor3 = Color3.new(1, 1, 1), ImageTransparency = 0 } })
local textProps = {
	TextColor3 = Color3.new(0, 0, 0), TextSize = 14, TextScaled = false, TextWrapped = false, Font = E("Font", "Legacy"), FontFace = Font.new(),
	TextXAlignment = E("TextXAlignment", "Center"), TextYAlignment = E("TextYAlignment", "Center"), TextTransparency = 0,
	TextStrokeColor3 = Color3.new(0, 0, 0), TextStrokeTransparency = 1, RichText = false, LineHeight = 1, MaxVisibleGraphemes = -1,
	TextTruncate = E("TextTruncate", "None"), TextDirection = E("TextDirection", "Auto"), OpenTypeFeatures = "",
}
local textGet = {
	TextBounds = function(self, d)
		local t = getProp(d, "Text")
		return Vector2.new(#t * getProp(d, "TextSize") * 0.5, getProp(d, "TextSize"))
	end,
	TextFits = function()
		return true
	end,
	ContentText = function(self, d)
		return (string.gsub(getProp(d, "Text"), "<[^>]*>", ""))
	end,
}
local function withText(extra, text)
	local p = clone(textProps)
	p.Text = text
	for k, v in extra or {} do
		p[k] = v
	end
	return p
end
defclass("TextLabel", "GuiObject", { props = withText(nil, "Label"), get = textGet })
abstract("GuiButton", "GuiObject", {
	props = { AutoButtonColor = true, Modal = false, Selected = false, Style = E("ButtonStyle", "Custom") },
	events = { "Activated", "MouseButton1Click", "MouseButton1Down", "MouseButton1Up", "MouseButton2Click", "MouseButton2Down", "MouseButton2Up" },
})
Classes.GuiObject.props.Active = normalize(false)
defclass("TextButton", "GuiButton", { props = withText(nil, "Button"), get = textGet })
defclass("TextBox", "GuiObject", {
	props = withText({ PlaceholderText = "", PlaceholderColor3 = Color3.fromRGB(178, 178, 178), ClearTextOnFocus = true, MultiLine = false, TextEditable = true, CursorPosition = 1, SelectionStart = -1, ShowNativeInput = true }, ""),
	get = textGet,
	methods = {
		CaptureFocus = function(self, d)
			d.focused = true
			fire(d, "Focused")
		end,
		ReleaseFocus = function(self, d, submitted)
			d.focused = false
			fire(d, "FocusLost", submitted == true, nil)
		end,
		IsFocused = function(self, d)
			return d.focused == true
		end,
	},
	events = { "FocusLost", "Focused", "ReturnPressedFromOnScreenKeyboard" },
})
local imageProps = { Image = "", ImageColor3 = Color3.new(1, 1, 1), ImageTransparency = 0, ScaleType = E("ScaleType", "Stretch"), SliceCenter = Rect.new(0, 0, 0, 0), SliceScale = 1, TileSize = UDim2.new(1, 0, 1, 0), ImageRectOffset = Vector2.new(0, 0), ImageRectSize = Vector2.new(0, 0), ResampleMode = E("ResamplerMode", "Default") }
defclass("ImageLabel", "GuiObject", { props = imageProps, get = { IsLoaded = function()
	return true
end } })
do
	local p = clone(imageProps)
	p.HoverImage = ""
	p.PressedImage = ""
	defclass("ImageButton", "GuiButton", { props = p, get = { IsLoaded = function()
		return true
	end } })
end
for name, props in {
	UIListLayout = { FillDirection = E("FillDirection", "Vertical"), HorizontalAlignment = E("HorizontalAlignment", "Left"), VerticalAlignment = E("VerticalAlignment", "Top"), SortOrder = E("SortOrder", "LayoutOrder"), Padding = UDim.new(0, 0), Wraps = false, ItemLineAlignment = E("ItemLineAlignment", "Automatic"), HorizontalFlex = E("UIFlexAlignment", "None"), VerticalFlex = E("UIFlexAlignment", "None") },
	UIGridLayout = { CellSize = UDim2.new(0, 100, 0, 100), CellPadding = UDim2.new(0, 5, 0, 5), FillDirection = E("FillDirection", "Horizontal"), FillDirectionMaxCells = 0, StartCorner = E("StartCorner", "TopLeft"), SortOrder = E("SortOrder", "LayoutOrder"), HorizontalAlignment = E("HorizontalAlignment", "Left"), VerticalAlignment = E("VerticalAlignment", "Top") },
	UIPageLayout = { Animated = true, Circular = false, EasingStyle = E("EasingStyle", "Back"), EasingDirection = E("EasingDirection", "Out"), Padding = UDim.new(0, 0), TweenTime = 1, FillDirection = E("FillDirection", "Horizontal"), SortOrder = E("SortOrder", "LayoutOrder"), CurrentPage = RO(ref("GuiObject")) },
	UITableLayout = { FillEmptySpaceColumns = false, FillEmptySpaceRows = false, MajorAxis = E("TableMajorAxis", "RowMajor"), Padding = UDim2.new(0, 0, 0, 0), SortOrder = E("SortOrder", "LayoutOrder") },
	UICorner = { CornerRadius = UDim.new(0, 8) },
	UIStroke = { Color = Color3.new(0, 0, 0), Thickness = 1, Transparency = 0, ApplyStrokeMode = E("ApplyStrokeMode", "Contextual"), LineJoinMode = E("LineJoinMode", "Round"), Enabled = true },
	UIPadding = { PaddingTop = UDim.new(0, 0), PaddingBottom = UDim.new(0, 0), PaddingLeft = UDim.new(0, 0), PaddingRight = UDim.new(0, 0) },
	UIGradient = { Color = ColorSequence.new(Color3.new(1, 1, 1)), Rotation = 0, Transparency = NumberSequence.new(0), Offset = Vector2.new(0, 0), Enabled = true },
	UIScale = { Scale = 1 },
	UIAspectRatioConstraint = { AspectRatio = 1, AspectType = E("AspectType", "FitWithinMaxSize"), DominantAxis = E("DominantAxis", "Width") },
	UISizeConstraint = { MinSize = Vector2.new(0, 0), MaxSize = Vector2.new(huge, huge) },
	UITextSizeConstraint = { MaxTextSize = 100, MinTextSize = 1 },
	UIFlexItem = { FlexMode = E("UIFlexMode", "None"), GrowRatio = 0, ShrinkRatio = 0, ItemLineAlignment = E("ItemLineAlignment", "Automatic") },
} do
	defclass(name, "Instance", {
		props = props,
		get = if string.find(name, "Layout") then {
			AbsoluteContentSize = function()
				return Vector2.new(0, 0)
			end,
		} else nil,
	})
end

end
------------------------------------------------------------------------ characters and players

local SPAWN = V(0, 3, 0)

defclass("Animator", "Instance", {
	methods = {
		LoadAnimation = function(self, d, anim)
			if not (isInstance(anim) and isA(I[anim], "Animation")) then
				errorf(3, "Unable to cast value to Object")
			end
			local track = create("AnimationTrack", { Animation = anim, Name = nameOf(anim) })
			return track
		end,
		GetPlayingAnimationTracks = function()
			return {}
		end,
		StepAnimations = function() end,
	},
	events = { "AnimationPlayed" },
})
defclass("AnimationController", "Instance", {
	methods = {
		LoadAnimation = function(self, d, anim)
			return create("AnimationTrack", { Animation = anim, Name = nameOf(anim) })
		end,
	},
})
defclass("AnimationTrack", "Instance", {
	internal = true,
	props = { Animation = RO(ref("Animation")), IsPlaying = RO(false), Length = RO(1), Looped = false, Priority = E("AnimationPriority", "Core"), Speed = RO(1), TimePosition = 0, WeightCurrent = RO(1), WeightTarget = RO(1) },
	methods = {
		Play = function(self, d, fade, weight, speed)
			d.playId = (d.playId or 0) + 1
			local id = d.playId
			d.props.Speed = speed or getProp(d, "Speed")
			setProp(d, "IsPlaying", true)
			if not getProp(d, "Looped") then
				later(now + 1 / math.max(getProp(d, "Speed"), 0.01), function()
					if d.playId == id then
						setProp(d, "IsPlaying", false)
						fire(d, "Stopped")
						fire(d, "Ended")
					end
				end)
			end
		end,
		Stop = function(self, d)
			d.playId = (d.playId or 0) + 1
			if getProp(d, "IsPlaying") then
				setProp(d, "IsPlaying", false)
				fire(d, "Stopped")
				fire(d, "Ended")
			end
		end,
		AdjustSpeed = function(self, d, s)
			d.props.Speed = s or 1
		end,
		AdjustWeight = function() end,
		GetMarkerReachedSignal = function(self, d, name)
			return propSignal(d, "marker:" .. tostring(name))
		end,
		GetTimeOfKeyframe = function()
			return 0
		end,
	},
	events = { "Stopped", "Ended", "DidLoop", "KeyframeReached" },
})

local respawn -- set with the players
defclass("Humanoid", "Instance", {
	props = {
		Health = 100, MaxHealth = 100, WalkSpeed = 16, JumpPower = 50, JumpHeight = 7.2, UseJumpPower = false, HipHeight = 2,
		AutoRotate = true, AutoJumpEnabled = true, Sit = false, Jump = false, PlatformStand = false, DisplayName = "",
		DisplayDistanceType = E("HumanoidDisplayDistanceType", "Viewer"), HealthDisplayType = E("HumanoidHealthDisplayType", "DisplayWhenDamaged"),
		NameDisplayDistance = 100, HealthDisplayDistance = 100, RigType = E("HumanoidRigType", "R15"), RequiresNeck = true,
		BreakJointsOnDeath = true, MoveDirection = RO(V(0, 0, 0)), FloorMaterial = RO(E("Material", "Plastic")),
		SeatPart = RO(ref("BasePart")), WalkToPoint = V(0, 0, 0), WalkToPart = ref("BasePart"), TargetPoint = V(0, 0, 0),
		CameraOffset = V(0, 0, 0), EvaluateStateMachine = true, MaxSlopeAngle = 89, NameOcclusion = E("NameOcclusion", "OccludeAll"),
	},
	get = {
		RootPart = function(self, d)
			local m = d.parent
			return m and childNamed(I[m], "HumanoidRootPart")
		end,
	},
	set = {
		Health = function(self, d, v)
			v = math.clamp(v, 0, getProp(d, "MaxHealth"))
			setProp(d, "Health", v)
			fire(d, "HealthChanged", v)
			if v <= 0 and not d.dead then
				d.dead = true
				d.state = Enum.HumanoidStateType.Dead
				fire(d, "StateChanged", Enum.HumanoidStateType.Running, d.state)
				fire(d, "Died")
				local model = d.parent
				if model and respawn then
					respawn(model)
				end
			end
		end,
		MaxHealth = function(self, d, v)
			setProp(d, "MaxHealth", v)
			if getProp(d, "Health") > v then
				self.Health = v
			end
		end,
	},
	methods = {
		TakeDamage = function(self, d, amount)
			local m = d.parent
			if m and m:FindFirstChildOfClass("ForceField") then
				return
			end
			self.Health = getProp(d, "Health") - (tonumber(amount) or 0)
		end,
		MoveTo = function(self, d, pos, part)
			local root = self.RootPart
			if not root then
				return
			end
			d.moveId = (d.moveId or 0) + 1
			local id = d.moveId
			setProp(d, "WalkToPoint", pos)
			local from = getProp(I[root], "CFrame").Position
			local dist = vector.magnitude(V(pos.x, from.y, pos.z) - from)
			local speed = math.max(getProp(d, "WalkSpeed"), 0.01)
			later(now + math.min(dist / speed, 8), function()
				if d.moveId ~= id or d.dead then
					return
				end
				local reached = dist / speed <= 8
				if reached then
					local model = d.parent
					if model then
						model:PivotTo(CF.withPos(model:GetPivot(), V(pos.x, from.y, pos.z)))
					end
				end
				fire(d, "MoveToFinished", reached)
			end)
		end,
		Move = function(self, d, dir)
			setProp(d, "MoveDirection", dir)
		end,
		ChangeState = function(self, d, s)
			local old = d.state or Enum.HumanoidStateType.Running
			d.state = s
			fire(d, "StateChanged", old, s)
			if s == Enum.HumanoidStateType.Dead then
				self.Health = 0
			elseif s == Enum.HumanoidStateType.Jumping then
				fire(d, "Jumping", true)
			end
		end,
		GetState = function(self, d)
			return d.state or (if d.dead then Enum.HumanoidStateType.Dead else Enum.HumanoidStateType.Running)
		end,
		SetStateEnabled = function() end,
		GetStateEnabled = function()
			return true
		end,
		LoadAnimation = function(self, d, anim)
			return create("AnimationTrack", { Animation = anim, Name = nameOf(anim) })
		end,
		GetPlayingAnimationTracks = function()
			return {}
		end,
		EquipTool = function(self, d, tool)
			local model = d.parent
			if model and isInstance(tool) and isA(I[tool], "Tool") then
				for _, c in I[model].children do
					if c ~= tool and isA(I[c], "Tool") then
						c.Parent = testPlayer and testPlayer:FindFirstChild("Backpack")
					end
				end
				tool.Parent = model
			end
		end,
		UnequipTools = function(self, d)
			local model = d.parent
			if model then
				for _, c in clone(I[model].children) do
					if isA(I[c], "Tool") then
						c.Parent = testPlayer and testPlayer:FindFirstChild("Backpack")
					end
				end
			end
		end,
		ApplyDescription = function() end,
		ApplyDescriptionReset = function() end,
		GetAppliedDescription = function()
			return create("HumanoidDescription")
		end,
		GetAccessories = function(self, d)
			local out = {}
			local m = d.parent
			for _, c in m and I[m].children or {} do
				if isA(I[c], "Accessory") then
					insert(out, c)
				end
			end
			return out
		end,
		AddAccessory = function(self, d, acc)
			acc.Parent = d.parent
		end,
		RemoveAccessories = function(self, d)
			for _, a in self:GetAccessories() do
				destroy(a)
			end
		end,
		BuildRigFromAttachments = function() end,
		ReplaceBodyPartR15 = function()
			return true
		end,
		GetLimb = function()
			return Enum.Limb.Unknown
		end,
		GetMoveVelocity = function()
			return V(0, 0, 0)
		end,
	},
	events = { "Died", "HealthChanged", "Running", "Jumping", "StateChanged", "MoveToFinished", "Seated", "Touched", "FreeFalling", "Climbing", "GettingUp", "Strafing", "Swimming", "AnimationPlayed", "FallingDown", "PlatformStanding", "Ragdoll", "StateEnabledChanged", "ApplyDescriptionFinished" },
	init = function(self, d)
		create("Animator", nil, self)
	end,
})
defclass("Backpack", "Instance", {})
defclass("PlayerGui", "Instance", {
	props = { ScreenOrientation = E("ScreenOrientation", "LandscapeSensor"), SelectionImageObject = ref("GuiObject") },
	methods = {
		GetTopbarTransparency = function()
			return 0
		end,
		SetTopbarTransparency = function() end,
	},
	events = { "TopbarTransparencyChangedSignal" },
})
defclass("PlayerScripts", "Instance", {})
defclass("StarterGear", "Instance", {})
defclass("StarterPlayerScripts", "Instance", {})
defclass("StarterCharacterScripts", "StarterPlayerScripts", {})

defclass("PlayerMouse", "Instance", {
	internal = true,
	props = { Icon = "", TargetFilter = ref("Instance"), X = RO(640), Y = RO(360), ViewSizeX = RO(1280), ViewSizeY = RO(720) },
	get = {
		Hit = function()
			return CFrame.new(0, 0, -20)
		end,
		Origin = function()
			return CFrame.new(0, 10, 20)
		end,
		Target = function()
			return nil
		end,
		TargetSurface = function()
			return Enum.NormalId.Top
		end,
		UnitRay = function()
			return Ray.new(V(0, 10, 20), V(0, -0.45, -0.89))
		end,
	},
	events = { "Button1Down", "Button1Up", "Button2Down", "Button2Up", "Move", "Idle", "WheelForward", "WheelBackward", "KeyDown", "KeyUp" },
})
Classes.Mouse = Classes.PlayerMouse

local function makeCharacter(player)
	local name = nameOf(player)
	local model = create("Model", { Name = name })
	local function part(pname, size, offset)
		return create("Part", { Name = pname, Size = size, CFrame = CFrame.new(SPAWN + offset), Color = Color3.fromRGB(253, 234, 141), CanCollide = pname ~= "HumanoidRootPart", Transparency = if pname == "HumanoidRootPart" then 1 else 0 }, model)
	end
	local root = part("HumanoidRootPart", V(2, 2, 1), V(0, 0, 0))
	part("Head", V(2, 1, 1), V(0, 2.5, 0))
	part("UpperTorso", V(2, 1.6, 1), V(0, 0.4, 0))
	part("LowerTorso", V(2, 0.4, 1), V(0, -0.6, 0))
	for _, side in { "Left", "Right" } do
		local x = if side == "Left" then -1.5 else 1.5
		part(side .. "UpperArm", V(1, 1.2, 1), V(x, 0.6, 0))
		part(side .. "LowerArm", V(1, 1, 1), V(x, -0.4, 0))
		part(side .. "Hand", V(1, 0.3, 1), V(x, -1.05, 0))
		part(side .. "UpperLeg", V(1, 1.2, 1), V(x / 3, -1.4, 0))
		part(side .. "LowerLeg", V(1, 1.1, 1), V(x / 3, -2.55, 0))
		part(side .. "Foot", V(1, 0.4, 1), V(x / 3, -3.3, 0))
	end
	I[model].props.PrimaryPart = root
	local hum = create("Humanoid", { DisplayName = name }, model)
	local sp = I[StarterPlayer]
	I[hum].props.WalkSpeed = getProp(sp, "CharacterWalkSpeed")
	I[hum].props.JumpPower = getProp(sp, "CharacterJumpPower")
	I[hum].props.JumpHeight = getProp(sp, "CharacterJumpHeight")
	create("BodyColors", nil, model)
	return model
end

local playerStarts = {} -- functions run when the test player's character first spawns
local characterNote = false

local function loadCharacter(player)
	local pd = I[player]
	local old = getProp(pd, "Character")
	if old then
		fire(pd, "CharacterRemoving", old)
		destroy(old)
	end
	local model = makeCharacter(player)
	pd.props.Character = model
	-- the starter items, as Roblox copies them at every spawn
	-- what came from StarterPack last time goes; tools the scripts being run sit in stay
	local backpack = childNamed(pd, "Backpack")
	for _, c in clone(I[backpack].children) do
		if I[c].fromStarter then
			destroy(c)
		end
	end
	for _, c in I[StarterPack].children do
		local copy = cloneInstance(c)
		if copy then
			I[copy].fromStarter = true
			copy.Parent = backpack
		end
	end
	local gui = childNamed(pd, "PlayerGui")
	for _, c in clone(I[gui].children) do
		if isA(I[c], "ScreenGui") and getProp(I[c], "ResetOnSpawn") and I[c].fromStarter then
			destroy(c)
		end
	end
	for _, c in I[StarterGui].children do
		if not I[gui].copied or (isA(I[c], "LayerCollector") and getProp(I[c], "ResetOnSpawn")) then
			local copy = cloneInstance(c)
			if copy then
				I[copy].fromStarter = true
				copy.Parent = gui
			end
		end
	end
	I[gui].copied = true
	model.Parent = workspace
	changed(pd, "Character", model)
	if not characterNote then
		characterNote = true
		info(fmt("▸ %s's character spawns", nameOf(player)))
	else
		info(fmt("▸ %s respawns", nameOf(player)))
	end
	fire(pd, "CharacterAdded", model)
	fire(pd, "CharacterAppearanceLoaded", model)
	local starts = playerStarts
	playerStarts = {}
	for _, f in starts do
		f(model)
	end
end

respawn = function(model)
	for _, p in Players:GetPlayers() do
		if getProp(I[p], "Character") == model then
			info(fmt("▸ %s dies", nameOf(p)))
			if getProp(I[Players], "CharacterAutoLoads") then
				later(now + getProp(I[Players], "RespawnTime"), function()
					if getProp(I[p], "Character") == model and I[p].parent == Players then
						loadCharacter(p)
					end
				end)
			end
		end
	end
end

defclass("Player", "Instance", {
	internal = true,
	props = {
		DisplayName = "", UserId = 0, Character = ref("Model"), Team = ref("Team"), TeamColor = BrickColor.new("White"), Neutral = true,
		AccountAge = 365, MembershipType = E("MembershipType", "None"), CameraMode = E("CameraMode", "Classic"), CameraMaxZoomDistance = 128,
		CameraMinZoomDistance = 0.5, RespawnLocation = ref("SpawnLocation"), AutoJumpEnabled = true, CanLoadCharacterAppearance = true,
		CharacterAppearanceId = 0, DevComputerMovementMode = E("DevComputerMovementMode", "UserChoice"), DevTouchMovementMode = E("DevTouchMovementMode", "UserChoice"),
		DevEnableMouseLock = true, HealthDisplayDistance = 100, NameDisplayDistance = 100, LocaleId = "en-us", FollowUserId = 0,
		GameplayPaused = false, ReplicationFocus = ref("Instance"), HasVerifiedBadge = false, PartyId = "",
	},
	set = {
		Team = function(self, d, team)
			local old = getProp(d, "Team")
			setProp(d, "Team", team)
			if team then
				d.props.TeamColor = getProp(I[team], "TeamColor")
				d.props.Neutral = false
				fire(I[team], "PlayerAdded", self)
			end
			if old then
				fire(I[old], "PlayerRemoved", self)
			end
		end,
		TeamColor = function(self, d, bc)
			setProp(d, "TeamColor", bc)
			local teams = services.Teams
			for _, t in teams and I[teams].children or {} do
				if getProp(I[t], "TeamColor") == bc then
					d.props.Team = t
					changed(d, "Team", t)
				end
			end
		end,
	},
	methods = {
		Kick = function(self, d, message)
			info(fmt("▸ %s is kicked%s", nameOf(self), if message then ": " .. tostring(message) else ""))
			later(now, function()
				if I[self].parent == Players then
					fire(I[Players], "PlayerRemoving", self)
					local char = getProp(d, "Character")
					if char then
						destroy(char)
					end
					setParent(self, d, nil, 1)
				end
			end)
		end,
		LoadCharacter = function(self, d)
			loadCharacter(self)
		end,
		RemoveCharacter = function(self, d)
			local char = getProp(d, "Character")
			if char then
				destroy(char)
				setProp(d, "Character", nil)
			end
		end,
		GetMouse = function(self, d)
			if not d.mouse then
				d.mouse = create("PlayerMouse", { Name = "Instance" })
			end
			return d.mouse
		end,
		IsInGroup = function()
			return false
		end,
		IsInGroupAsync = function()
			return false
		end,
		GetRankInGroup = function()
			return 0
		end,
		GetRankInGroupAsync = function()
			return 0
		end,
		GetRoleInGroup = function()
			return "Guest"
		end,
		GetRoleInGroupAsync = function()
			return "Guest"
		end,
		GetFriendsOnline = function()
			return {}
		end,
		IsFriendsWith = function()
			return false
		end,
		IsFriendsWithAsync = function()
			return false
		end,
		GetNetworkPing = function()
			return 0.05
		end,
		HasAppearanceLoaded = function()
			return true
		end,
		ClearCharacterAppearance = function() end,
		LoadCharacterAppearance = function() end,
		DistanceFromCharacter = function(self, d, pos)
			local char = getProp(d, "Character")
			local root = char and childNamed(I[char], "HumanoidRootPart")
			if not root then
				return 0
			end
			return vector.magnitude(getProp(I[root], "CFrame").Position - pos)
		end,
		GetJoinData = function()
			return { LaunchData = "", Members = {}, TeleportData = nil }
		end,
		Move = function() end,
		RequestStreamAroundAsync = function() end,
		SetSuperSafeChat = function() end,
	},
	events = { "CharacterAdded", "CharacterRemoving", "CharacterAppearanceLoaded", "Chatted", "Idled", "OnTeleport" },
})

defclass("Camera", "Instance", {
	props = { CFrame = CFrame.new(0, 20, 30) * CFrame.Angles(-0.5, 0, 0), Focus = IDENTITY, FieldOfView = 70, CameraType = E("CameraType", "Custom"), CameraSubject = ref("Instance"), HeadLocked = true, HeadScale = 1, DiagonalFieldOfView = 88, MaxAxisFieldOfView = 70, FieldOfViewMode = E("FieldOfViewMode", "Vertical"), VRTiltAndRollEnabled = false },
	get = {
		ViewportSize = function()
			return SCREEN
		end,
		NearPlaneZ = function()
			return -0.1
		end,
	},
	methods = {
		WorldToScreenPoint = function(self, d, p)
			local cf = getProp(d, "CFrame")
			local l = cf:PointToObjectSpace(p)
			local f = 360 / math.tan(math.rad(getProp(d, "FieldOfView")) / 2)
			if l.z >= 0 then
				return V(640, 360, l.z), false
			end
			local x, y = 640 + l.x / -l.z * f, 360 - l.y / -l.z * f
			return V(x, y, -l.z), x >= 0 and x <= 1280 and y >= 0 and y <= 720
		end,
		ScreenPointToRay = function(self, d, x, y, depth)
			local cf = getProp(d, "CFrame")
			local f = 360 / math.tan(math.rad(getProp(d, "FieldOfView")) / 2)
			local dir = vector.normalize(cf:VectorToWorldSpace(V((x - 640) / f, (360 - y) / f, -1)))
			return Ray.new(cf.Position + dir * (depth or 0), dir)
		end,
		GetPartsObscuringTarget = function()
			return {}
		end,
		GetRenderCFrame = function(self, d)
			return getProp(d, "CFrame")
		end,
		Interpolate = function(self, d, cf, focus, time)
			later(now + (time or 0), function()
				setProp(d, "CFrame", cf)
				setProp(d, "Focus", focus)
				fire(d, "InterpolationFinished")
			end)
		end,
		ZoomToExtents = function() end,
		GetRoll = function()
			return 0
		end,
		SetRoll = function() end,
	},
	events = { "InterpolationFinished" },
})
do
	local m = Classes.Camera.methods
	m.WorldToViewportPoint = m.WorldToScreenPoint
	m.ViewportPointToRay = m.ScreenPointToRay
end

defclass("InputObject", "Instance", {
	internal = true,
	props = { KeyCode = E("KeyCode", "Unknown"), UserInputType = E("UserInputType", "None"), UserInputState = E("UserInputState", "Begin"), Position = V(0, 0, 0), Delta = V(0, 0, 0) },
	methods = {
		IsModifierKeyDown = function()
			return false
		end,
	},
})

----------------------------------------------------------------------------------- services

local serviceDefs = {}
local function service(name, def, super)
	def.service = true
	defclass(name, super or "Instance", def)
	serviceDefs[name] = true
end

-- the DataModel itself
local bindToClose = {}
defclass("DataModel", "Instance", {
	internal = true,
	props = { PlaceId = RO(0), GameId = RO(0), JobId = RO("test-place"), CreatorId = RO(0), CreatorType = RO(E("CreatorType", "User")), PlaceVersion = RO(1), PrivateServerId = RO(""), PrivateServerOwnerId = RO(0), Genre = RO(E("Genre", "All")) },
	get = {
		Workspace = function()
			return workspace
		end,
		workspace = function()
			return workspace
		end,
		lighting = function()
			return Lighting
		end,
	},
	methods = {
		GetService = function(self, d, name)
			return services[name] or (serviceDefs[name] and create(name, nil, game)) or errorf(3, "'%s' is not a valid Service name", tostring(name))
		end,
		FindService = function(self, d, name)
			return services[name]
		end,
		BindToClose = function(self, d, fn)
			if type(fn) ~= "function" then
				errorf(3, "Argument 1 missing or nil")
			end
			insert(bindToClose, { fn = fn, ctx = ctx })
		end,
		IsLoaded = function()
			return true
		end,
		GetJobsInfo = function()
			return {}
		end,
		Shutdown = function()
			info("▸ game:Shutdown() (the test place keeps running)")
		end,
	},
	events = { "Loaded", "Close", "GraphicsQualityChangeRequest", "ItemChanged" },
})
Classes.DataModel.methods.service = Classes.DataModel.methods.GetService
Classes.DataModel.methods.getService = Classes.DataModel.methods.GetService

-- services register themselves when made
local function serviceInit(self, d)
	services[d.cls.name] = self
	d.parentLocked = false
end

service("Workspace", {
	init = serviceInit,
	props = {
		Gravity = 196.2, CurrentCamera = ref("Camera"), FallenPartsDestroyHeight = -500, StreamingEnabled = false, AirDensity = 0.0012,
		GlobalWind = V(0, 0, 0), AllowThirdPartySales = false, ClientAnimatorThrottling = E("ClientAnimatorThrottlingMode", "Default"),
		Retargeting = E("AnimatorRetargetingMode", "Default"), TouchesUseCollisionGroups = false, SignalBehavior = E("SignalBehavior", "Default"),
	},
	get = {
		DistributedGameTime = function()
			return now
		end,
		Terrain = function(self, d)
			return childNamed(d, "Terrain")
		end,
	},
	methods = {
		Raycast = function(self, d, origin, direction, params)
			if rawtypeof(origin) ~= "vector" or rawtypeof(direction) ~= "vector" then
				errorf(3, "Unable to cast value to Vector3")
			end
			return raycast(origin, direction, params)
		end,
		Blockcast = function(self, d, cf, size, direction, params)
			return raycast(cf.Position, direction, params)
		end,
		Spherecast = function(self, d, pos, radius, direction, params)
			return raycast(pos, direction, params)
		end,
		Shapecast = function(self, d, part, direction, params)
			return raycast(part.Position, direction, params)
		end,
		FindPartOnRay = function(self, d, ray, ignore)
			local params = RaycastParams.new()
			params.FilterDescendantsInstances = { ignore }
			local r = raycast(ray.Origin, ray.Direction, params)
			if r then
				return r.Instance, r.Position, r.Normal, r.Material
			end
			return nil, ray.Origin + ray.Direction, V(0, 0, 0), Enum.Material.Air
		end,
		FindPartOnRayWithIgnoreList = function(self, d, ray, list)
			local params = RaycastParams.new()
			params.FilterDescendantsInstances = list or {}
			local r = raycast(ray.Origin, ray.Direction, params)
			if r then
				return r.Instance, r.Position, r.Normal, r.Material
			end
			return nil, ray.Origin + ray.Direction, V(0, 0, 0), Enum.Material.Air
		end,
		FindPartOnRayWithWhitelist = function(self, d, ray, list)
			local params = RaycastParams.new()
			params.FilterDescendantsInstances = list or {}
			params.FilterType = Enum.RaycastFilterType.Include
			local r = raycast(ray.Origin, ray.Direction, params)
			if r then
				return r.Instance, r.Position, r.Normal, r.Material
			end
			return nil, ray.Origin + ray.Direction, V(0, 0, 0), Enum.Material.Air
		end,
		GetPartBoundsInBox = function(self, d, cf, size, params)
			local h = vector.abs(size) / 2
			local p = cf.Position
			return partsInBox(p - h, p + h, params)
		end,
		GetPartBoundsInRadius = function(self, d, pos, r, params)
			local out = {}
			for _, p in partsInBox(pos - V(r, r, r), pos + V(r, r, r), params) do
				local lo, hi = partBounds(I[p])
				local closest = vector.clamp(pos, lo, hi)
				if vector.magnitude(closest - pos) <= r then
					insert(out, p)
				end
			end
			return out
		end,
		GetPartsInPart = function(self, d, part, params)
			local lo, hi = partBounds(I[part])
			local out = {}
			for _, p in partsInBox(lo, hi, params) do
				if p ~= part then
					insert(out, p)
				end
			end
			return out
		end,
		FindPartsInRegion3 = function(self, d, region, ignore, max)
			local c, s = region.CFrame.Position, region.Size / 2
			return partsInBox(c - s, c + s)
		end,
		ArePartsTouchingOthers = function(self, d, parts)
			for _, p in parts do
				if #p:GetTouchingParts() > 0 then
					return true
				end
			end
			return false
		end,
		GetServerTimeNow = function()
			return START_UNIX + now
		end,
		GetRealPhysicsFPS = function()
			return 60
		end,
		GetNumAwakeParts = function()
			return 0
		end,
		BulkMoveTo = function(self, d, parts, cframes)
			for i, p in parts do
				setPartCFrame(p, cframes[i])
			end
		end,
		PGSIsEnabled = function()
			return true
		end,
		JoinToOutsiders = function() end,
		UnjoinFromOutsiders = function() end,
	},
	events = { "PersistentLoaded" },
}, "Model")

for _, name in { "ReplicatedStorage", "ReplicatedFirst", "ServerStorage", "StarterPack", "Teams", "Chat", "LocalizationService", "SoundService", "Debris", "MaterialService", "TextService", "GroupService", "PolicyService", "AnalyticsService", "BadgeService", "TeleportService", "MessagingService", "SocialService", "VRService", "HapticService", "GuiService", "ProximityPromptService", "PathfindingService", "PhysicsService", "TextChatService", "AssetService", "InsertService", "LogService", "ScriptContext", "Stats", "VoiceChatService", "AvatarEditorService", "ContentProvider", "KeyframeSequenceProvider", "NetworkClient", "NetworkServer", "TestService", "Selection", "ChangeHistoryService", "StudioService" } do
	serviceDefs[name] = true
end

service("Players", {
	init = serviceInit,
	props = { MaxPlayers = 10, PreferredPlayers = 10, RespawnTime = 5, CharacterAutoLoads = true, BubbleChat = true, ClassicChat = false, BanningEnabled = true },
	get = {
		LocalPlayer = function()
			-- only the client knows who it is
			if isClient() then
				return testPlayer
			end
			return nil
		end,
		NumPlayers = function()
			return #Players:GetPlayers()
		end,
	},
	methods = {
		GetPlayers = function(self, d)
			local out = {}
			for _, c in d.children do
				if isA(I[c], "Player") then
					insert(out, c)
				end
			end
			return out
		end,
		GetPlayerFromCharacter = function(self, d, model)
			for _, p in self:GetPlayers() do
				if getProp(I[p], "Character") == model then
					return p
				end
			end
			return nil
		end,
		GetPlayerByUserId = function(self, d, id)
			for _, p in self:GetPlayers() do
				if getProp(I[p], "UserId") == id then
					return p
				end
			end
			return nil
		end,
		GetUserIdFromNameAsync = function(self, d, name)
			sleep(0.05)
			if name == "Player1" then
				return 1
			end
			errorf(3, "Players:GetUserIdFromNameAsync() failed: Unknown user (the test place knows only Player1)")
		end,
		GetNameFromUserIdAsync = function(self, d, id)
			sleep(0.05)
			if id == 1 then
				return "Player1"
			end
			return "User" .. tostring(id)
		end,
		GetUserThumbnailAsync = function(self, d, id)
			return "rbxthumb://type=AvatarHeadShot&id=" .. tostring(id) .. "&w=150&h=150", true
		end,
		GetHumanoidDescriptionFromUserId = function()
			return create("HumanoidDescription")
		end,
		GetHumanoidDescriptionFromOutfitId = function()
			return create("HumanoidDescription")
		end,
		CreateHumanoidModelFromDescription = function(self, d, desc, rig)
			return makeCharacter(testPlayer)
		end,
		CreateHumanoidModelFromUserId = function()
			return makeCharacter(testPlayer)
		end,
		GetFriendsAsync = function()
			return { GetCurrentPage = function()
				return {}
			end, IsFinished = true }
		end,
		BanAsync = function(self, d, config)
			info("▸ Players:BanAsync (nobody is banned in the test place)")
		end,
		UnbanAsync = function() end,
		Chat = function() end,
	},
	events = { "PlayerAdded", "PlayerRemoving", "PlayerMembershipChanged", "UserSubscriptionStatusChanged" },
})
Classes.Players.methods.getPlayers = Classes.Players.methods.GetPlayers
Classes.Players.methods.playerFromCharacter = Classes.Players.methods.GetPlayerFromCharacter

service("Lighting", {
	init = serviceInit,
	props = {
		ClockTime = 14, Brightness = 2, Ambient = Color3.fromRGB(70, 70, 70), OutdoorAmbient = Color3.fromRGB(70, 70, 70), FogEnd = 100000,
		FogStart = 0, FogColor = Color3.fromRGB(192, 192, 192), GlobalShadows = true, ExposureCompensation = 0, GeographicLatitude = 0,
		ColorShift_Bottom = Color3.new(0, 0, 0), ColorShift_Top = Color3.new(0, 0, 0), EnvironmentDiffuseScale = 1,
		EnvironmentSpecularScale = 1, ShadowSoftness = 0.2, Technology = E("Technology", "ShadowMap"),
	},
	get = {
		TimeOfDay = function(self, d)
			local t = getProp(d, "ClockTime")
			local h = floor(t)
			local m = floor((t - h) * 60)
			local s = floor(((t - h) * 60 - m) * 60)
			return fmt("%02d:%02d:%02d", h, m, s)
		end,
	},
	set = {
		TimeOfDay = function(self, d, v)
			local h, m, s = string.match(tostring(v), "(%d+):?(%d*):?(%d*)")
			setProp(d, "ClockTime", ((tonumber(h) or 0) + (tonumber(m) or 0) / 60 + (tonumber(s) or 0) / 3600) % 24)
		end,
	},
	methods = {
		GetMinutesAfterMidnight = function(self, d)
			return getProp(d, "ClockTime") * 60
		end,
		SetMinutesAfterMidnight = function(self, d, m)
			setProp(d, "ClockTime", (m / 60) % 24)
		end,
		GetSunDirection = function()
			return V(0.5, 0.8, 0.3)
		end,
		GetMoonDirection = function()
			return V(-0.5, -0.8, -0.3)
		end,
		GetMoonPhase = function()
			return 0.75
		end,
	},
	events = { "LightingChanged" },
})
Classes.Lighting.props.TimeOfDay.type = "string"

service("StarterGui", {
	init = serviceInit,
	props = { ScreenOrientation = E("ScreenOrientation", "LandscapeSensor"), ShowDevelopmentGui = true, ResetPlayerGuiOnSpawn = true },
	methods = {
		SetCoreGuiEnabled = function() end,
		GetCoreGuiEnabled = function()
			return true
		end,
		SetCore = function(self, d, name, value)
			if name == "SendNotification" and type(value) == "table" then
				info(fmt("▸ notification: %s %s", tostring(value.Title or ""), tostring(value.Text or "")))
			end
		end,
		GetCore = function()
			return nil
		end,
	},
})
service("StarterPlayer", {
	init = serviceInit,
	props = {
		CharacterWalkSpeed = 16, CharacterJumpPower = 50, CharacterJumpHeight = 7.2, CharacterUseJumpPower = false, AutoJumpEnabled = true,
		CameraMaxZoomDistance = 128, CameraMinZoomDistance = 0.5, CameraMode = E("CameraMode", "Classic"), LoadCharacterAppearance = true,
		CharacterMaxSlopeAngle = 89, HealthDisplayDistance = 100, NameDisplayDistance = 100, EnableMouseLockOption = true,
		DevComputerMovementMode = E("DevComputerMovementMode", "UserChoice"), DevTouchMovementMode = E("DevTouchMovementMode", "UserChoice"),
		DevComputerCameraMovementMode = E("DevComputerCameraMovementMode", "UserChoice"), UserEmotesEnabled = true,
	},
})
service("ServerScriptService", { init = serviceInit, props = { LoadStringEnabled = false } })

local DataStores -- defined with the data stores below
service("DataStoreService", {
	init = serviceInit,
	props = { AutomaticRetry = true },
	methods = {
		GetDataStore = function(self, d, name, scope)
			return DataStores.get(name, scope, "DataStore", 3)
		end,
		GetGlobalDataStore = function(self, d)
			return DataStores.get("global", "global", "GlobalDataStore", 3)
		end,
		GetOrderedDataStore = function(self, d, name, scope)
			return DataStores.get(name, scope, "OrderedDataStore", 3)
		end,
		GetRequestBudgetForRequestType = function()
			return 100
		end,
		ListDataStoresAsync = function()
			return DataStores.pages({}, true)
		end,
	},
})

-- RunService: frames at 60 per second of game time, while something listens for them
local frames = { scheduled = false, renderSteps = {} }
service("RunService", {
	init = serviceInit,
	methods = {
		IsServer = function()
			return not isClient()
		end,
		IsClient = function()
			return isClient()
		end,
		IsStudio = function()
			return true
		end,
		IsRunning = function()
			return true
		end,
		IsRunMode = function()
			return false
		end,
		IsEdit = function()
			return false
		end,
		BindToRenderStep = function(self, d, name, priority, fn)
			frames.renderSteps[name] = { fn = fn, priority = priority or 0, ctx = ctx }
			frames.ensure()
		end,
		UnbindFromRenderStep = function(self, d, name)
			frames.renderSteps[name] = nil
		end,
		Pause = function() end,
		Run = function() end,
		Stop = function() end,
	},
	events = { "Heartbeat", "Stepped", "RenderStepped", "PreRender", "PreAnimation", "PreSimulation", "PostSimulation" },
	signalHooks = (function()
		local hooks = {}
		for _, e in { "Heartbeat", "Stepped", "RenderStepped", "PreRender", "PreAnimation", "PreSimulation", "PostSimulation" } do
			hooks[e] = function(self, d, sig)
				sig.onConnect = function()
					frames.ensure()
				end
			end
		end
		return hooks
	end)(),
})
do
	local frameEvents = { "PreAnimation", "PreSimulation", "Stepped", "PostSimulation", "Heartbeat", "PreRender", "RenderStepped" }
	local function wanted()
		local rs = services.RunService
		if not rs then
			return false
		end
		if next(frames.renderSteps) then
			return true
		end
		local d = I[rs]
		for _, e in frameEvents do
			if listeners(d, e) > 0 then
				return true
			end
		end
		return false
	end
	local function frame()
		frames.scheduled = false
		if not wanted() then
			return
		end
		local d = I[services.RunService]
		local steps = {}
		for name, s in frames.renderSteps do
			insert(steps, s)
		end
		table.sort(steps, function(a, b)
			return a.priority < b.priority
		end)
		for _, s in steps do
			resume(newThread(s.fn, s.ctx), FRAME)
		end
		fire(d, "PreRender", FRAME)
		fire(d, "RenderStepped", FRAME)
		fire(d, "PreAnimation", FRAME)
		fire(d, "PreSimulation", FRAME)
		fire(d, "Stepped", now, FRAME)
		fire(d, "PostSimulation", FRAME)
		fire(d, "Heartbeat", FRAME)
		frames.ensure()
	end
	function frames.ensure()
		if not frames.scheduled and wanted() then
			frames.scheduled = true
			later(now + FRAME, frame)
		end
	end
	frames.wanted = wanted
end

-- TweenService: a tween sets its goals when it finishes (nothing is drawn in between)
do
local easing = {}
do
	local function bounce(t)
		if t < 1 / 2.75 then
			return 7.5625 * t * t
		elseif t < 2 / 2.75 then
			t -= 1.5 / 2.75
			return 7.5625 * t * t + 0.75
		elseif t < 2.5 / 2.75 then
			t -= 2.25 / 2.75
			return 7.5625 * t * t + 0.9375
		end
		t -= 2.625 / 2.75
		return 7.5625 * t * t + 0.984375
	end
	local ins = {
		Linear = function(t)
			return t
		end,
		Sine = function(t)
			return 1 - cos(t * pi / 2)
		end,
		Quad = function(t)
			return t * t
		end,
		Cubic = function(t)
			return t * t * t
		end,
		Quart = function(t)
			return t ^ 4
		end,
		Quint = function(t)
			return t ^ 5
		end,
		Exponential = function(t)
			return if t == 0 then 0 else 2 ^ (10 * t - 10)
		end,
		Circular = function(t)
			return 1 - sqrt(1 - t * t)
		end,
		Back = function(t)
			return 2.70158 * t * t * t - 1.70158 * t * t
		end,
		Elastic = function(t)
			if t == 0 or t == 1 then
				return t
			end
			return -(2 ^ (10 * t - 10)) * sin((t * 10 - 10.75) * (2 * pi / 3))
		end,
		Bounce = function(t)
			return 1 - bounce(1 - t)
		end,
	}
	function easing.value(alpha, style, direction)
		local f = ins[style and style.Name or "Quad"] or ins.Quad
		local dir = direction and direction.Name or "Out"
		alpha = math.clamp(alpha, 0, 1)
		if dir == "In" then
			return f(alpha)
		elseif dir == "Out" then
			return 1 - f(1 - alpha)
		end
		if alpha < 0.5 then
			return f(alpha * 2) / 2
		end
		return 1 - f((1 - alpha) * 2) / 2
	end
end
local tweenable = { number = true, Vector3 = true, Vector2 = true, CFrame = true, Color3 = true, UDim2 = true, UDim = true, boolean = true, EnumItem = true }
service("TweenService", {
	init = serviceInit,
	methods = {
		Create = function(self, d, inst, tweenInfo, goals)
			if not isInstance(inst) then
				errorf(3, "Unable to cast value to Object")
			end
			if typeOf(tweenInfo) ~= "TweenInfo" then
				errorf(3, "Unable to cast value to TweenInfo")
			end
			if type(goals) ~= "table" then
				errorf(3, "Unable to cast to Dictionary")
			end
			local id = I[inst]
			for k, v in goals do
				local spec = id.cls.props[k]
				if not spec then
					errorf(3, "TweenService:Create no property named '%s' for object '%s'", tostring(k), nameOf(inst))
				end
				local want = spec.type
				if not tweenable[want] then
					errorf(3, "TweenService:Create property named '%s' on object '%s' is not a data type that can be tweened", k, nameOf(inst))
				end
				if typeOf(v) ~= want and not (want == "number" and type(v) == "number") then
					errorf(3, "TweenService:Create property named '%s' cannot be tweened due to type mismatch (property is a '%s', but given type is '%s')",
						k, if want == "number" then "float" else want, typeOf(v))
				end
			end
			return create("Tween", { TweenInfo = tweenInfo, Instance = inst, goals = clone(goals) })
		end,
		GetValue = function(self, d, alpha, style, direction)
			return easing.value(alpha, style, direction)
		end,
		SmoothDamp = function(self, d, current, target, velocity, smoothTime)
			return target, velocity
		end,
	},
})
defclass("Tween", "Instance", {
	internal = true,
	props = { Instance = RO(ref("Instance")), TweenInfo = RO(ref("TweenInfo")), PlaybackState = RO(E("PlaybackState", "Begin")) },
	methods = {
		Play = function(self, d)
			d.playId = (d.playId or 0) + 1
			local id = d.playId
			local ti = DT[getProp(d, "TweenInfo")]
			setProp(d, "PlaybackState", Enum.PlaybackState.Playing)
			local cycles = if ti.RepeatCount < 0 then 1 else ti.RepeatCount + 1
			local length = ti.DelayTime + ti.Time * cycles * (if ti.Reverses then 2 else 1)
			local target = getProp(d, "Instance")
			later(now + length, function()
				if d.playId ~= id then
					return
				end
				if not ti.Reverses then
					for k, v in d.props.goals do
						pcall(function()
							target[k] = v
						end)
					end
				end
				if ti.RepeatCount >= 0 then
					setProp(d, "PlaybackState", Enum.PlaybackState.Completed)
					fire(d, "Completed", Enum.PlaybackState.Completed)
				end
			end)
		end,
		Pause = function(self, d)
			d.playId = (d.playId or 0) + 1
			setProp(d, "PlaybackState", Enum.PlaybackState.Paused)
		end,
		Cancel = function(self, d)
			d.playId = (d.playId or 0) + 1
			setProp(d, "PlaybackState", Enum.PlaybackState.Cancelled)
			fire(d, "Completed", Enum.PlaybackState.Cancelled)
		end,
	},
	events = { "Completed" },
})
Classes.Tween.props.goals = { type = "any", readonly = true }
end

-- HttpService: JSON and GUIDs work; requests do not (no internet here)
local JSON = {}
do
	local escapes = { ['"'] = '\\"', ["\\"] = "\\\\", ["\b"] = "\\b", ["\f"] = "\\f", ["\n"] = "\\n", ["\r"] = "\\r", ["\t"] = "\\t" }
	local function encode(v, seen, level)
		local t = type(v)
		if v == nil then
			return "null"
		elseif t == "boolean" then
			return tostring(v)
		elseif t == "number" then
			if v ~= v or v == huge or v == -huge then
				return "null"
			end
			if v == floor(v) and abs(v) < 1e15 then
				return fmt("%d", v)
			end
			return fmt("%.14g", v)
		elseif t == "string" then
			return '"' .. string.gsub(v, '[%c"\\]', function(c)
				return escapes[c] or fmt("\\u%04x", string.byte(c))
			end) .. '"'
		elseif t == "table" then
			if seen[v] then
				errorf(level, "tables cannot be cyclic")
			end
			seen[v] = true
			local n = #v
			local count = 0
			for _ in v do
				count += 1
			end
			local out = {}
			if count == 0 then
				seen[v] = nil
				return "[]"
			elseif n == count then
				for i = 1, n do
					out[i] = encode(v[i], seen, level + 1)
				end
				seen[v] = nil
				return "[" .. concat(out, ",") .. "]"
			end
			for k, x in v do
				insert(out, encode(tostring(k), seen, level + 1) .. ":" .. encode(x, seen, level + 1))
			end
			seen[v] = nil
			return "{" .. concat(out, ",") .. "}"
		end
		return "null"
	end
	function JSON.encode(v, level)
		return encode(v, {}, level + 1)
	end
	function JSON.decode(s, level)
		local pos = 1
		local function fail()
			errorf(level + 3, "Can't parse JSON")
		end
		local function ws()
			pos = string.find(s, "[^ \t\r\n]", pos) or #s + 1
		end
		local value
		local function str()
			local out = {}
			pos += 1
			while true do
				local c = s:sub(pos, pos)
				if c == "" then
					fail()
				elseif c == '"' then
					pos += 1
					return concat(out)
				elseif c == "\\" then
					local e = s:sub(pos + 1, pos + 1)
					local map = { b = "\b", f = "\f", n = "\n", r = "\r", t = "\t", ['"'] = '"', ["\\"] = "\\", ["/"] = "/" }
					if e == "u" then
						local code = tonumber(s:sub(pos + 2, pos + 5), 16) or fail()
						insert(out, utf8.char(code))
						pos += 6
					elseif map[e] then
						insert(out, map[e])
						pos += 2
					else
						fail()
					end
				else
					insert(out, c)
					pos += 1
				end
			end
		end
		value = function()
			ws()
			local c = s:sub(pos, pos)
			if c == "{" then
				local t = {}
				pos += 1
				ws()
				if s:sub(pos, pos) == "}" then
					pos += 1
					return t
				end
				while true do
					ws()
					if s:sub(pos, pos) ~= '"' then
						fail()
					end
					local k = str()
					ws()
					if s:sub(pos, pos) ~= ":" then
						fail()
					end
					pos += 1
					t[k] = value()
					ws()
					local sep = s:sub(pos, pos)
					pos += 1
					if sep == "}" then
						return t
					elseif sep ~= "," then
						fail()
					end
				end
			elseif c == "[" then
				local t = {}
				pos += 1
				ws()
				if s:sub(pos, pos) == "]" then
					pos += 1
					return t
				end
				while true do
					insert(t, value())
					ws()
					local sep = s:sub(pos, pos)
					pos += 1
					if sep == "]" then
						return t
					elseif sep ~= "," then
						fail()
					end
				end
			elseif c == '"' then
				return str()
			elseif s:sub(pos, pos + 3) == "true" then
				pos += 4
				return true
			elseif s:sub(pos, pos + 4) == "false" then
				pos += 5
				return false
			elseif s:sub(pos, pos + 3) == "null" then
				pos += 4
				return nil
			end
			local numText = string.match(s, "^-?%d+%.?%d*[eE]?[-+]?%d*", pos)
			if not numText or numText == "" then
				fail()
			end
			pos += #numText
			return tonumber(numText) or fail()
		end
		if type(s) ~= "string" then
			errorf(level + 1, "Argument 1 missing or nil")
		end
		local v = value()
		ws()
		if pos <= #s then
			fail()
		end
		return v
	end
end
do
local function noInternet(what)
	return function()
		errorf(3, "HttpService:%s: the test place has no internet (in a real game, also turn on Allow HTTP Requests in Game Settings)", what)
	end
end
service("HttpService", {
	init = serviceInit,
	props = { HttpEnabled = false },
	methods = {
		JSONEncode = function(self, d, v)
			return JSON.encode(v, 3)
		end,
		JSONDecode = function(self, d, s)
			return JSON.decode(s, 3)
		end,
		GenerateGUID = function(self, d, braces)
			local g = string.gsub("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx", "[xy]", function(c)
				local v = if c == "x" then math.random(0, 15) else math.random(8, 11)
				return fmt("%X", v)
			end)
			if braces == false then
				return g
			end
			return "{" .. g .. "}"
		end,
		UrlEncode = function(self, d, s)
			return (string.gsub(tostring(s), "[^%w%-_%.~]", function(c)
				return fmt("%%%02X", string.byte(c))
			end))
		end,
		GetAsync = noInternet("GetAsync"),
		PostAsync = noInternet("PostAsync"),
		RequestAsync = noInternet("RequestAsync"),
		GetSecret = function()
			errorf(3, "HttpService:GetSecret: there are no secrets in the test place")
		end,
	},
})

end
-- data stores: in memory, empty at the start of every run
DataStores = {}
do
	local stores = {}
	local said = false
	local function preview(v)
		local ok, s = pcall(JSON.encode, v, 1)
		s = if ok then s else tostring(v)
		if #s > 120 then
			s = s:sub(1, 117) .. "..."
		end
		return s
	end
	local function storable(v, depth)
		local t = typeOf(v)
		if t == "nil" or t == "boolean" or t == "string" then
			return true
		elseif t == "number" then
			return v == v and v ~= huge and v ~= -huge
		elseif t == "table" then
			if depth > 50 then
				return false, "table"
			end
			local n = #v
			local count = 0
			for k, x in v do
				count += 1
				if type(k) ~= "string" and type(k) ~= "number" then
					return false, "table"
				end
				local ok, what = storable(x, depth + 1)
				if not ok then
					return false, what
				end
			end
			if n > 0 and n ~= count then
				return false, "a table with both array and dictionary keys"
			end
			return true
		end
		return false, t
	end
	local function check(v, level)
		local ok, what = storable(v, 0)
		if not ok then
			errorf(level + 1, "104: Cannot store %s in data store. Data stores can only accept valid UTF-8 characters.", what or typeOf(v))
		end
	end
	local function keyOf(key, level)
		if type(key) == "number" then
			key = tostring(key)
		end
		if type(key) ~= "string" or #key == 0 then
			errorf(level + 1, "103: Key name can't be empty or nil")
		elseif #key > 50 then
			errorf(level + 1, "103: Key name exceeds the 50 character limit.")
		end
		return key
	end
	local function deep(v)
		if type(v) ~= "table" then
			return v
		end
		local t = {}
		for k, x in v do
			t[k] = deep(x)
		end
		return t
	end
	local function hello()
		if not said then
			said = true
			info("(data stores start empty in each test run and keep what is saved only until it ends)")
		end
	end
	local function async()
		sleep(0.05)
	end
	local function keyInfo(e)
		return create("DataStoreKeyInfo", { CreatedTime = e.created, UpdatedTime = e.updated, Version = tostring(e.version) })
	end
	local function storeOf(d)
		return stores[d.storeKey]
	end
	local function put(d, key, value, how)
		local s = storeOf(d)
		local e = s.data[key]
		local t = floor((START_UNIX + now) * 1000)
		if value == nil then
			s.data[key] = nil
		else
			s.data[key] = { value = deep(value), created = e and e.created or t, updated = t, version = (e and e.version or 0) + 1 }
		end
		info(fmt("DataStore %q: %s(%q, %s)", s.name, how, key, preview(value)))
		return s.data[key]
	end
	local storeMethods = {
		GetAsync = function(self, d, key)
			key = keyOf(key, 3)
			hello()
			async()
			local e = storeOf(d).data[key]
			if not e then
				return nil, nil
			end
			return deep(e.value), keyInfo(e)
		end,
		SetAsync = function(self, d, key, value)
			key = keyOf(key, 3)
			check(value, 3)
			hello()
			async()
			local e = put(d, key, value, "SetAsync")
			return e and tostring(e.version)
		end,
		UpdateAsync = function(self, d, key, fn)
			key = keyOf(key, 3)
			if type(fn) ~= "function" then
				errorf(3, "Argument 2 missing or nil")
			end
			hello()
			async()
			local e = storeOf(d).data[key]
			local new = fn(e and deep(e.value), e and keyInfo(e))
			if new == nil then
				return nil
			end
			check(new, 3)
			put(d, key, new, "UpdateAsync")
			return deep(new)
		end,
		IncrementAsync = function(self, d, key, delta)
			key = keyOf(key, 3)
			hello()
			async()
			local e = storeOf(d).data[key]
			local old = e and e.value or 0
			if type(old) ~= "number" then
				errorf(3, "105: Cannot increment a value that is not a number")
			end
			local new = old + (tonumber(delta) or 1)
			put(d, key, new, "IncrementAsync")
			return new
		end,
		RemoveAsync = function(self, d, key)
			key = keyOf(key, 3)
			hello()
			async()
			local e = storeOf(d).data[key]
			if e then
				put(d, key, nil, "RemoveAsync")
				return deep(e.value), keyInfo(e)
			end
			return nil
		end,
		ListKeysAsync = function(self, d)
			local out = {}
			for k in storeOf(d).data do
				insert(out, create("DataStoreKey", { KeyName = k }))
			end
			return DataStores.pages(out, true)
		end,
		GetVersionAsync = function(self, d, key)
			return self:GetAsync(key)
		end,
		ListVersionsAsync = function()
			return DataStores.pages({}, true)
		end,
		GetSortedAsync = function(self, d, ascending, pageSize, min, max)
			hello()
			async()
			local items = {}
			for k, e in storeOf(d).data do
				local v = e.value
				if (not min or v >= min) and (not max or v <= max) then
					insert(items, { key = k, value = v })
				end
			end
			table.sort(items, function(a, b)
				if ascending then
					return a.value < b.value
				end
				return a.value > b.value
			end)
			pageSize = math.max(1, tonumber(pageSize) or 50)
			local pages = {}
			for i = 1, #items, pageSize do
				insert(pages, { table.unpack(items, i, math.min(i + pageSize - 1, #items)) })
			end
			return DataStores.pages(pages, false)
		end,
	}
	defclass("GlobalDataStore", "Instance", { internal = true, methods = storeMethods })
	defclass("DataStore", "GlobalDataStore", { internal = true })
	defclass("OrderedDataStore", "GlobalDataStore", {
		internal = true,
		methods = {
			SetAsync = function(self, d, key, value)
				if type(value) ~= "number" or value ~= floor(value) then
					errorf(3, "Ordered data stores can only store integers")
				end
				return storeMethods.SetAsync(self, d, key, value)
			end,
		},
	})
	defclass("DataStoreKeyInfo", "Instance", {
		internal = true,
		props = { CreatedTime = 0, UpdatedTime = 0, Version = "" },
		methods = {
			GetUserIds = function()
				return {}
			end,
			GetMetadata = function()
				return {}
			end,
		},
	})
	defclass("DataStoreKey", "Instance", { internal = true, props = { KeyName = "" } })
	defclass("DataStorePages", "Instance", {
		internal = true,
		props = { IsFinished = RO(true) },
		methods = {
			GetCurrentPage = function(self, d)
				if d.flat then
					return d.list
				end
				return d.list[d.page] or {}
			end,
			AdvanceToNextPageAsync = function(self, d)
				sleep(0.05)
				d.page += 1
				d.props.IsFinished = d.page >= #d.list
			end,
		},
	})
	function DataStores.pages(list, flat)
		local p, pd = create("DataStorePages")
		pd.list, pd.flat, pd.page = list, flat, 1
		pd.props.IsFinished = flat or #list <= 1
		return p
	end
	function DataStores.get(name, scope, className, level)
		if isClient() then
			errorf(level + 1, "DataStore can't be accessed from client")
		end
		if type(name) ~= "string" then
			errorf(level + 1, "Argument 1 missing or nil")
		end
		scope = scope or "global"
		local key = className .. "/" .. name .. "/" .. tostring(scope)
		if not stores[key] then
			stores[key] = { name = name, data = {} }
		end
		local inst, d = create(className, { Name = name })
		d.storeKey = key
		return inst
	end
	DataStores.preview = preview
end

-- MarketplaceService: the test player says yes to every purchase prompt, so the code that
-- hands out what was bought runs too
do
local ownedPasses = {}
local function receipt(productId)
	local ms = services.MarketplaceService
	local cb = ms and getProp(I[ms], "ProcessReceipt")
	if not cb then
		info("▸ (nothing handles the purchase: MarketplaceService.ProcessReceipt is not set)")
		return
	end
	local info_ = { PlayerId = getProp(I[testPlayer], "UserId"), ProductId = productId, PurchaseId = game:GetService("HttpService"):GenerateGUID(false), CurrencySpent = 0, CurrencyType = Enum.CurrencyType.Robux, PlaceIdWherePurchased = 0 }
	local co = newThread(function()
		local decision = cb(info_)
		info(fmt("▸ ProcessReceipt for product %s returned %s", tostring(productId), tostring(decision)))
	end, SERVER)
	resume(co)
end
service("MarketplaceService", {
	init = serviceInit,
	props = { ProcessReceipt = ref("function") },
	methods = {
		PromptGamePassPurchase = function(self, d, player, passId)
			info(fmt("▸ %s is asked to buy game pass %s and buys it", nameOf(player), tostring(passId)))
			later(now + 1, function()
				ownedPasses[passId] = true
				fire(d, "PromptGamePassPurchaseFinished", player, passId, true)
			end)
		end,
		PromptProductPurchase = function(self, d, player, productId)
			info(fmt("▸ %s is asked to buy developer product %s and buys it", nameOf(player), tostring(productId)))
			later(now + 1, function()
				fire(d, "PromptProductPurchaseFinished", getProp(I[player], "UserId"), productId, true)
				receipt(productId)
			end)
		end,
		PromptPurchase = function(self, d, player, assetId)
			info(fmt("▸ %s is asked to buy item %s and buys it", nameOf(player), tostring(assetId)))
			later(now + 1, function()
				fire(d, "PromptPurchaseFinished", player, assetId, true)
			end)
		end,
		PromptPremiumPurchase = function(self, d, player)
			info(fmt("▸ %s is asked to get Premium", nameOf(player)))
		end,
		PromptSubscriptionPurchase = function() end,
		UserOwnsGamePassAsync = function(self, d, userId, passId)
			sleep(0.05)
			return ownedPasses[passId] == true
		end,
		PlayerOwnsAsset = function()
			return false
		end,
		PlayerOwnsAssetAsync = function()
			return false
		end,
		GetProductInfo = function(self, d, id, infoType)
			sleep(0.05)
			return { Name = "Item " .. tostring(id), Description = "", PriceInRobux = 0, AssetId = id, ProductId = id, IsForSale = true, Creator = { Name = "Roblox", Id = 1 } }
		end,
		GetDeveloperProductsAsync = function()
			return DataStores.pages({}, true)
		end,
	},
	events = { "PromptGamePassPurchaseFinished", "PromptProductPurchaseFinished", "PromptPurchaseFinished", "PromptPremiumPurchaseFinished", "PromptBundlePurchaseFinished", "PromptSubscriptionPurchaseFinished" },
})

end
-- CollectionService and the tags it shares with every instance
Tags = {}
do
	local tagged = {} -- tag -> set of instances
	local function sig(name, tag)
		local cs = services.CollectionService
		if not cs then
			return nil
		end
		local d = I[cs]
		d.tagSignals = d.tagSignals or {}
		local key = name .. "\0" .. tag
		if not d.tagSignals[key] then
			local s = Signal.new(tag)
			d.tagSignals[key] = s
		end
		return Signal.data(d.tagSignals[key])
	end
	Tags.signal = function(name, tag)
		sig(name, tag)
		return I[services.CollectionService].tagSignals[name .. "\0" .. tag]
	end
	function Tags.add(inst, d, tag)
		if type(tag) ~= "string" then
			errorf(4, "Argument 2 missing or nil")
		end
		d.tags = d.tags or {}
		if d.tags[tag] then
			return
		end
		d.tags[tag] = true
		tagged[tag] = tagged[tag] or setmetatable({}, { __mode = "k" })
		tagged[tag][inst] = true
		if inGame(inst) then
			local s = sig("added", tag)
			if s then
				Signal.fire(s, inst)
			end
		end
	end
	function Tags.remove(inst, d, tag)
		if not (d.tags and d.tags[tag]) then
			return
		end
		d.tags[tag] = nil
		if tagged[tag] then
			tagged[tag][inst] = nil
		end
		if inGame(inst) then
			local s = sig("removed", tag)
			if s then
				Signal.fire(s, inst)
			end
		end
	end
	function Tags.moved(list, into)
		for _, x in list do
			for tag in I[x].tags or {} do
				tagged[tag] = tagged[tag] or setmetatable({}, { __mode = "k" })
				tagged[tag][x] = true
				local s = sig(if into then "added" else "removed", tag)
				if s then
					Signal.fire(s, x)
				end
			end
		end
	end
	function Tags.get(tag)
		local out = {}
		for x in tagged[tag] or {} do
			if inGame(x) and I[x].tags and I[x].tags[tag] then
				insert(out, x)
			end
		end
		return out
	end
end
service("CollectionService", {
	init = serviceInit,
	methods = {
		AddTag = function(self, d, inst, tag)
			Tags.add(inst, I[inst], tag)
		end,
		RemoveTag = function(self, d, inst, tag)
			Tags.remove(inst, I[inst], tag)
		end,
		HasTag = function(self, d, inst, tag)
			return I[inst].tags ~= nil and I[inst].tags[tag] == true
		end,
		GetTags = function(self, d, inst)
			return inst:GetTags()
		end,
		GetTagged = function(self, d, tag)
			return Tags.get(tag)
		end,
		GetAllTags = function(self, d)
			return {}
		end,
		GetInstanceAddedSignal = function(self, d, tag)
			return Tags.signal("added", tag)
		end,
		GetInstanceRemovedSignal = function(self, d, tag)
			return Tags.signal("removed", tag)
		end,
	},
	events = { "TagAdded", "TagRemoved" },
})

service("Debris", {
	init = serviceInit,
	props = { MaxItems = 1000 },
	methods = {
		AddItem = function(self, d, item, lifetime)
			if not isInstance(item) then
				errorf(3, "Unable to cast value to Object")
			end
			later(now + (tonumber(lifetime) or 10), function()
				if not I[item].destroyed then
					destroy(item)
				end
			end)
		end,
	},
})
Classes.Debris.methods.addItem = Classes.Debris.methods.AddItem

-- input: the test player has a keyboard and a mouse; the keys pressed are the test player's
local keysDown = {}
service("UserInputService", {
	init = serviceInit,
	props = {
		MouseBehavior = E("MouseBehavior", "Default"), MouseIconEnabled = true, MouseDeltaSensitivity = 1, ModalEnabled = false,
		MouseIcon = "", OverrideMouseIconBehavior = E("OverrideMouseIconBehavior", "None"),
		KeyboardEnabled = RO(true), MouseEnabled = RO(true), TouchEnabled = RO(false), GamepadEnabled = RO(false),
		AccelerometerEnabled = RO(false), GyroscopeEnabled = RO(false), VREnabled = RO(false),
		PreferredInput = RO(E("PreferredInput", "KeyboardAndMouse")),
	},
	methods = {
		IsKeyDown = function(self, d, key)
			return keysDown[key] == true
		end,
		IsMouseButtonPressed = function()
			return false
		end,
		GetMouseLocation = function()
			return Vector2.new(640, 360)
		end,
		GetMouseDelta = function()
			return Vector2.new(0, 0)
		end,
		GetKeysPressed = function()
			local out = {}
			for k in keysDown do
				insert(out, create("InputObject", { KeyCode = k, UserInputType = Enum.UserInputType.Keyboard }))
			end
			return out
		end,
		GetFocusedTextBox = function()
			return nil
		end,
		GetLastInputType = function()
			return Enum.UserInputType.Keyboard
		end,
		GetConnectedGamepads = function()
			return {}
		end,
		GetGamepadConnected = function()
			return false
		end,
		GetNavigationGamepads = function()
			return {}
		end,
		GetSupportedGamepadKeyCodes = function()
			return {}
		end,
		GetGamepadState = function()
			return {}
		end,
		GetStringForKeyCode = function(self, d, key)
			return key and key.Name or ""
		end,
		GetImageForKeyCode = function()
			return ""
		end,
		GetDeviceAcceleration = function()
			return create("InputObject")
		end,
		GetDeviceGravity = function()
			return create("InputObject")
		end,
	},
	events = { "InputBegan", "InputEnded", "InputChanged", "JumpRequest", "TouchTap", "TouchStarted", "TouchEnded", "TouchMoved", "TouchLongPress", "TouchPan", "TouchPinch", "TouchRotate", "TouchSwipe", "TouchTapInWorld", "TextBoxFocused", "TextBoxFocusReleased", "WindowFocused", "WindowFocusReleased", "GamepadConnected", "GamepadDisconnected", "LastInputTypeChanged", "PointerAction" },
})
local boundActions = {}
service("ContextActionService", {
	init = serviceInit,
	methods = {
		BindAction = function(self, d, name, fn, touchButton, ...)
			if type(fn) ~= "function" then
				errorf(3, "Argument 2 missing or nil")
			end
			boundActions[name] = { fn = fn, inputs = { ... }, ctx = ctx, order = #boundActions + 1 }
		end,
		BindActionAtPriority = function(self, d, name, fn, touchButton, priority, ...)
			if type(fn) ~= "function" then
				errorf(3, "Argument 2 missing or nil")
			end
			boundActions[name] = { fn = fn, inputs = { ... }, ctx = ctx }
		end,
		UnbindAction = function(self, d, name)
			boundActions[name] = nil
		end,
		UnbindAllActions = function()
			table.clear(boundActions)
		end,
		GetButton = function()
			return nil
		end,
		SetTitle = function() end,
		SetDescription = function() end,
		SetImage = function() end,
		SetPosition = function() end,
		GetAllBoundActionInfo = function()
			return {}
		end,
		GetBoundActionInfo = function()
			return {}
		end,
		BindActivate = function() end,
		UnbindActivate = function() end,
	},
	events = { "LocalToolEquipped", "LocalToolUnequipped" },
})

service("PathfindingService", {
	init = serviceInit,
	methods = {
		CreatePath = function(self, d, params)
			return create("Path")
		end,
		ComputeRawPathAsync = function(self, d, a, b)
			local p = create("Path")
			p:ComputeAsync(a, b)
			return p
		end,
	},
})
defclass("Path", "Instance", {
	internal = true,
	props = { Status = RO(E("PathStatus", "NoPath")) },
	methods = {
		ComputeAsync = function(self, d, a, b)
			sleep(0.05)
			d.waypoints = { PathWaypoint.new(a), PathWaypoint.new(b) }
			setProp(d, "Status", Enum.PathStatus.Success)
		end,
		GetWaypoints = function(self, d)
			return clone(d.waypoints or {})
		end,
		CheckOcclusionAsync = function()
			return -1
		end,
	},
	events = { "Blocked", "Unblocked" },
})
service("PhysicsService", {
	init = serviceInit,
	methods = {
		RegisterCollisionGroup = function() end,
		UnregisterCollisionGroup = function() end,
		CreateCollisionGroup = function()
			return 1
		end,
		CollisionGroupSetCollidable = function() end,
		CollisionGroupsAreCollidable = function()
			return true
		end,
		SetPartCollisionGroup = function(self, d, part, group)
			part.CollisionGroup = group
		end,
		IsCollisionGroupRegistered = function()
			return true
		end,
		GetRegisteredCollisionGroups = function()
			return {}
		end,
		GetMaxCollisionGroups = function()
			return 32
		end,
		RenameCollisionGroup = function() end,
	},
})
service("BadgeService", {
	init = serviceInit,
	methods = {
		AwardBadge = function(self, d, userId, badgeId)
			sleep(0.05)
			info(fmt("▸ badge %s awarded to user %s", tostring(badgeId), tostring(userId)))
			return true
		end,
		UserHasBadgeAsync = function()
			sleep(0.05)
			return false
		end,
		CheckUserBadgesAsync = function()
			return {}
		end,
		GetBadgeInfoAsync = function(self, d, id)
			return { Name = "Badge " .. tostring(id), Description = "", IconImageId = 0, IsEnabled = true }
		end,
	},
})
service("TeleportService", {
	init = serviceInit,
	methods = {
		Teleport = function(self, d, placeId, player)
			info(fmt("▸ teleport to place %s (there is only this place in the test)", tostring(placeId)))
		end,
		TeleportAsync = function(self, d, placeId, players)
			info(fmt("▸ teleport to place %s (there is only this place in the test)", tostring(placeId)))
			return create("Folder", { Name = "TeleportAsyncResult" })
		end,
		TeleportToPlaceInstance = function(self, d, placeId)
			info(fmt("▸ teleport to place %s (there is only this place in the test)", tostring(placeId)))
		end,
		TeleportToPrivateServer = function(self, d, placeId)
			info(fmt("▸ teleport to place %s (there is only this place in the test)", tostring(placeId)))
		end,
		ReserveServer = function()
			return "test-reserved", "test"
		end,
		GetLocalPlayerTeleportData = function()
			return nil
		end,
		SetTeleportGui = function() end,
	},
	events = { "TeleportInitFailed", "LocalPlayerArrivedFromTeleport" },
})
do
	local topics = {}
	service("MessagingService", {
		init = serviceInit,
		methods = {
			PublishAsync = function(self, d, topic, message)
				sleep(0.05)
				for _, s in topics[topic] or {} do
					if s.connected then
						resume(newThread(s.fn, s.ctx), { Data = copyArg(message), Sent = START_UNIX + now })
					end
				end
			end,
			SubscribeAsync = function(self, d, topic, fn)
				topics[topic] = topics[topic] or {}
				local s = { fn = fn, ctx = ctx, connected = true }
				insert(topics[topic], s)
				local sig, sd = Signal.new("Subscription")
				local c = sig:Connect(function() end)
				Signal.listen(sd, function() end)
				return {
					Disconnect = function()
						s.connected = false
						c:Disconnect()
					end,
				}
			end,
		},
	})
end
service("TextService", {
	init = serviceInit,
	methods = {
		GetTextSize = function(self, d, text, size)
			return Vector2.new(#tostring(text) * (size or 14) * 0.5, size or 14)
		end,
		FilterStringAsync = function(self, d, text)
			sleep(0.05)
			return create("TextFilterResult", { text = tostring(text) })
		end,
		GetTextBoundsAsync = function(self, d, params)
			return Vector2.new(100, 14)
		end,
	},
})
defclass("TextFilterResult", "Instance", {
	internal = true,
	methods = {
		GetNonChatStringForBroadcastAsync = function(self, d)
			return d.props.text
		end,
		GetNonChatStringForUserAsync = function(self, d)
			return d.props.text
		end,
		GetChatForUserAsync = function(self, d)
			return d.props.text
		end,
	},
})
Classes.TextFilterResult.props.text = { type = "string", default = "" }
service("Chat", {
	init = serviceInit,
	props = { BubbleChatEnabled = true, LoadDefaultChat = true },
	methods = {
		Chat = function(self, d, part, message)
			info(fmt("▸ %s says: %s", isInstance(part) and nameOf(part) or "?", tostring(message)))
		end,
		FilterStringForBroadcast = function(self, d, s)
			return s
		end,
		FilterStringAsync = function(self, d, s)
			return s
		end,
		CanUserChatAsync = function()
			return true
		end,
		SetBubbleChatSettings = function() end,
	},
	events = { "Chatted" },
})
service("TextChatService", {
	init = serviceInit,
	props = { ChatVersion = E("ChatVersion", "TextChatService"), CreateDefaultCommands = true, CreateDefaultTextChannels = true },
	methods = {
		CanUserChatAsync = function()
			return true
		end,
		DisplayBubble = function() end,
	},
	events = { "MessageReceived", "SendingMessage" },
})
defclass("TextChannel", "Instance", {
	methods = {
		SendAsync = function(self, d, text)
			info(fmt("▸ %s says: %s", nameOf(testPlayer), tostring(text)))
		end,
		DisplaySystemMessage = function(self, d, text)
			info(fmt("▸ system message: %s", tostring(text)))
		end,
		AddUserAsync = function() end,
	},
	events = { "MessageReceived" },
})
defclass("TextChatCommand", "Instance", { props = { PrimaryAlias = "", SecondaryAlias = "", Enabled = true }, events = { "Triggered" } })
service("GuiService", {
	init = serviceInit,
	props = { SelectedObject = ref("GuiObject"), AutoSelectGuiEnabled = true, GuiNavigationEnabled = true, MenuIsOpen = RO(false), TouchControlsEnabled = true },
	methods = {
		GetGuiInset = function()
			return Vector2.new(0, 58), Vector2.new(0, 0)
		end,
		IsTenFootInterface = function()
			return false
		end,
		OpenBrowserWindow = function() end,
		AddSelectionParent = function() end,
		RemoveSelectionGroup = function() end,
		Select = function() end,
	},
	events = { "MenuOpened", "MenuClosed" },
})
service("ProximityPromptService", {
	init = serviceInit,
	props = { Enabled = true, MaxPromptsVisible = 16 },
	events = { "PromptTriggered", "PromptTriggerEnded", "PromptShown", "PromptHidden", "PromptButtonHoldBegan", "PromptButtonHoldEnded" },
})
service("LogService", {
	init = function(self, d)
		serviceInit(self, d)
		LogMessage = function(message, kind)
			fire(d, "MessageOut", message, Enum.MessageType[kind])
		end
	end,
	methods = {
		GetLogHistory = function()
			return {}
		end,
	},
	events = { "MessageOut", "HttpResultOut" },
})
service("ScriptContext", {
	init = function(self, d)
		serviceInit(self, d)
		ScriptError = function(message, trace)
			fire(d, "Error", message, trace, nil)
		end
	end,
	events = { "Error" },
})
service("LocalizationService", { init = serviceInit, props = { RobloxLocaleId = RO("en-us"), SystemLocaleId = RO("en-us") }, methods = {
	GetCountryRegionForPlayerAsync = function()
		return "US"
	end,
	GetTranslatorForPlayerAsync = function()
		return create("Folder", { Name = "Translator" })
	end,
} })
service("PolicyService", { init = serviceInit, methods = {
	GetPolicyInfoForPlayerAsync = function()
		return { AreAdsAllowed = false, ArePaidRandomItemsRestricted = false, AllowedExternalLinkReferences = {}, IsSubjectToChinaPolicies = false, IsPaidItemTradingAllowed = true, IsContentSharingAllowed = true }
	end,
} })
service("GroupService", { init = serviceInit, methods = {
	GetGroupInfoAsync = function(self, d, id)
		return { Name = "Group " .. tostring(id), Id = id, Owner = { Name = "Roblox", Id = 1 }, Roles = {} }
	end,
	GetGroupsAsync = function()
		return {}
	end,
} })
service("SocialService", { init = serviceInit, methods = {
	PromptGameInvite = function()
		info("▸ game invite prompt (nobody else is in the test place)")
	end,
	CanSendGameInviteAsync = function()
		return false
	end,
} })
for _, name in { "ReplicatedStorage", "ReplicatedFirst", "ServerStorage", "StarterPack", "SoundService", "MaterialService", "AnalyticsService", "VRService", "HapticService", "AssetService", "Stats", "VoiceChatService", "AvatarEditorService", "ContentProvider", "KeyframeSequenceProvider", "TestService", "Selection", "ChangeHistoryService" } do
	if not Classes[name] then
		service(name, { init = serviceInit })
	end
end
Classes.ReplicatedFirst.methods.RemoveDefaultLoadingScreen = wrapMethod("RemoveDefaultLoadingScreen", function() end)
Classes.ReplicatedFirst.events.FinishedReplicating = true
Classes.ContentProvider.methods.PreloadAsync = wrapMethod("PreloadAsync", function(self, d, list, cb)
	sleep(0.05)
	if type(cb) == "function" then
		for _, x in list or {} do
			cb(if isInstance(x) then "rbxassetid://0" else tostring(x), Enum.AssetFetchStatus.Success)
		end
	end
end)
Classes.SoundService.props.AmbientReverb = normalize(E("ReverbType", "NoReverb"))
Classes.SoundService.props.RespectFilteringEnabled = normalize(true)
Classes.SoundService.methods.PlayLocalSound = wrapMethod("PlayLocalSound", function(self, d, s)
	s:Play()
end)
Classes.VRService.props.VREnabled = normalize(RO(false))
Classes.AnalyticsService.methods.LogEconomyEvent = wrapMethod("LogEconomyEvent", function() end)
Classes.AnalyticsService.methods.LogCustomEvent = wrapMethod("LogCustomEvent", function() end)
Classes.AnalyticsService.methods.LogFunnelStepEvent = wrapMethod("LogFunnelStepEvent", function() end)
Classes.AnalyticsService.methods.LogOnboardingFunnelStepEvent = wrapMethod("LogOnboardingFunnelStepEvent", function() end)
Classes.AnalyticsService.methods.LogProgressionEvent = wrapMethod("LogProgressionEvent", function() end)
service("InsertService", { init = serviceInit, methods = {
	LoadAsset = function(self, d, id)
		errorf(3, "InsertService:LoadAsset(%s): the test place has no internet to load assets from", tostring(id))
	end,
} })
service("Teams", { init = serviceInit, methods = {
	GetTeams = function(self, d)
		return clone(d.children)
	end,
} })

---------------------------------------------------------------------------------- the place

game = newInstance(Classes.DataModel)
I[game].props.Name = "Test place"
do
local function serviceUnder(name)
	local s = create(name, nil, game)
	return s
end
workspace = serviceUnder("Workspace")
Players = serviceUnder("Players")
Lighting = serviceUnder("Lighting")
ReplicatedStorage = serviceUnder("ReplicatedStorage")
serviceUnder("ReplicatedFirst")
ServerScriptService = serviceUnder("ServerScriptService")
ServerStorage = serviceUnder("ServerStorage")
StarterGui = serviceUnder("StarterGui")
StarterPack = serviceUnder("StarterPack")
StarterPlayer = serviceUnder("StarterPlayer")
serviceUnder("Teams")
serviceUnder("SoundService")
serviceUnder("Chat")
serviceUnder("LocalizationService")
serviceUnder("TextChatService")
serviceUnder("LogService")
serviceUnder("ScriptContext")
for _, s in services do
	I[s].parentLocked = true
end
create("StarterPlayerScripts", nil, StarterPlayer)
create("StarterCharacterScripts", nil, StarterPlayer)
end
do
	local channels = create("Folder", { Name = "TextChannels" }, services.TextChatService)
	create("TextChannel", { Name = "RBXGeneral" }, channels)
	create("TextChannel", { Name = "RBXSystem" }, channels)
end

do -- what a new Roblox place has
	local cam = create("Camera", { Name = "Camera" }, workspace)
	I[workspace].props.CurrentCamera = cam
	local terrain = create("Terrain", { Name = "Terrain", Anchored = true, Locked = true }, workspace)
	I[terrain].parentLocked = true
	create("Part", { Name = "Baseplate", Size = V(2048, 16, 2048), CFrame = CFrame.new(0, -8, 0), Anchored = true, Locked = true, Color = Color3.fromRGB(91, 93, 105) }, workspace)
	create("SpawnLocation", { Name = "SpawnLocation", Size = V(12, 1, 12), CFrame = CFrame.new(0, 0.5, 0), Anchored = true }, workspace)
	create("Sky", nil, Lighting)
	create("Atmosphere", nil, Lighting)
end

testPlayer = newInstance(Classes.Player)
do
	local pd = I[testPlayer]
	pd.props.Name = "Player1"
	pd.props.DisplayName = "Player1"
	pd.props.UserId = 1
	create("Backpack", nil, testPlayer)
	create("StarterGear", nil, testPlayer)
	create("PlayerGui", nil, testPlayer)
	create("PlayerScripts", nil, testPlayer)
end

-- the leaderboard, as the player list would show it
leaderstatsNote = function(value, d, added)
	local folder = d.parent
	if not folder or I[folder].props.Name ~= "leaderstats" then
		return
	end
	local player = I[folder].parent
	if not player or not isA(I[player], "Player") then
		return
	end
	if not added and d.noted == getProp(d, "Value") then
		return
	end
	d.noted = getProp(d, "Value")
	info(fmt("leaderboard · %s · %s = %s", nameOf(player), d.props.Name, tostring(getProp(d, "Value"))))
end
local function leaderstatsFolderAdded(folder)
	for _, c in I[folder].children do
		if I[c].cls.valueBase then
			leaderstatsNote(c, I[c], true)
		end
	end
end
Signal.listen(Signal.data(signalOf(I[testPlayer], "ChildAdded")), function(child)
	if I[child].props.Name == "leaderstats" then
		leaderstatsFolderAdded(child)
	end
end)

------------------------------------------------------------------------- globals for scripts

local requireModule
local scriptMains = {} -- script instance -> its main function
local moduleResults = {} -- ModuleScript -> what it returned

local function rbxPrint(...)
	local n = select("#", ...)
	local parts = table.create(n)
	for i = 1, n do
		parts[i] = tostring((select(i, ...)))
	end
	emit("out", concat(parts, " "))
end
local function rbxWarn(...)
	local n = select("#", ...)
	local parts = table.create(n)
	for i = 1, n do
		parts[i] = tostring((select(i, ...)))
	end
	emit("warn", concat(parts, " "))
end

local function taskTarget(f)
	if type(f) == "thread" then
		threadCtx[f] = threadCtx[f] or ctx
		return f
	elseif type(f) == "function" then
		return newThread(f)
	end
	errorf(3, "invalid argument #1 (function or thread expected, got %s)", typeOf(f))
end

local task = {
	wait = function(seconds)
		local start = now
		local co = rawrunning()
		at(now + math.max(tonumber(seconds) or 0, FRAME), co)
		rawyield()
		return now - start
	end,
	spawn = function(f, ...)
		local co = taskTarget(f)
		resume(co, ...)
		return co
	end,
	defer = function(f, ...)
		local co = taskTarget(f)
		at(now, co, ...)
		return co
	end,
	delay = function(seconds, f, ...)
		local co = taskTarget(f)
		at(now + math.max(tonumber(seconds) or 0, 0), co, ...)
		return co
	end,
	cancel = function(co)
		if type(co) ~= "thread" then
			errorf(2, "invalid argument #1 (thread expected, got %s)", typeOf(co))
		end
		if rawstatus(co) == "suspended" then
			coroutine.close(co)
		end
	end,
	synchronize = function() end,
	desynchronize = function() end,
}

local env = {
	game = game,
	Game = game,
	workspace = workspace,
	Workspace = workspace,
	Instance = {
		new = function(className, parent)
			local cls = Classes[className]
			if not cls or cls.abstract or cls.service or cls.internal then
				errorf(2, 'Unable to create an Instance of type "%s"', tostring(className))
			end
			local inst = newInstance(cls)
			if parent ~= nil then
				if not isInstance(parent) then
					errorf(2, "invalid argument #2 to 'new' (Instance expected, got %s)", typeOf(parent))
				end
				setParent(inst, I[inst], parent, 1)
			end
			return inst
		end,
		fromExisting = function(inst)
			local c, cd = newInstance(I[inst].cls)
			cd.props = clone(I[inst].props)
			return c
		end,
	},
	Vector3 = Vector3,
	Vector2 = Vector2,
	CFrame = CFrame,
	Color3 = Color3,
	BrickColor = BrickColor,
	UDim = UDim,
	UDim2 = UDim2,
	TweenInfo = TweenInfo,
	Enum = Enum,
	NumberRange = NumberRange,
	NumberSequence = NumberSequence,
	NumberSequenceKeypoint = NumberSequenceKeypoint,
	ColorSequence = ColorSequence,
	ColorSequenceKeypoint = ColorSequenceKeypoint,
	Rect = Rect,
	Ray = Ray,
	Region3 = Region3,
	PhysicalProperties = PhysicalProperties,
	Font = Font,
	Random = Random,
	DateTime = DateTime,
	RaycastParams = RaycastParams,
	OverlapParams = OverlapParams,
	PathWaypoint = PathWaypoint,
	task = task,
	print = rbxPrint,
	warn = rbxWarn,
	typeof = typeOf,
	tick = function()
		return START_UNIX + now
	end,
	time = function()
		return now
	end,
	elapsedTime = function()
		return now
	end,
	wait = function(seconds)
		local start = now
		local co = rawrunning()
		at(now + math.max(tonumber(seconds) or 0, 0.03), co)
		rawyield()
		return now - start, now
	end,
	spawn = function(f)
		local co = newThread(f)
		at(now + 0.03, co)
	end,
	delay = function(seconds, f)
		local co = newThread(f)
		at(now + math.max(tonumber(seconds) or 0, 0.03), co)
	end,
	collectgarbage = function(opt)
		if opt == "count" then
			return gcinfo()
		end
		errorf(2, "collectgarbage must be called with 'count'; use gcinfo() instead")
	end,
	version = function()
		return "0.742 (Offline AI test place)"
	end,
	printidentity = function(prefix)
		rbxPrint((prefix or "Current identity is") .. " 2")
	end,
	settings = function()
		return game
	end,
	UserSettings = function()
		return create("Folder", { Name = "UserSettings" })
	end,
	stats = function()
		return game:GetService("Stats")
	end,
	shared = {},
	require = function(target)
		return requireModule(target)
	end,
}
env.Wait, env.Spawn, env.Delay = env.wait, env.spawn, env.delay
env.ypcall = pcall
for k, v in env do
	_G[k] = v
end
-- Roblox's own debug extras
debug.profilebegin = function() end
debug.profileend = function() end
debug.setmemorycategory = function() end
debug.resetmemorycategory = function() end
debug.dumpcodesize = function() end
os.exit = nil
io = nil

---------------------------------------------------------------------------------- the scripts

local scriptsRun = {} -- in the order given: {inst, kind, chunk, source, start}
local G = {} -- the _G every script shares, as in Roblox

local THING_NAMES, GUI_CLASS -- below

local SERVICE_NAMES = {
	"ServerScriptService", "StarterPlayerScripts", "StarterCharacterScripts", "StarterGui", "StarterPack", "ReplicatedStorage",
	"ReplicatedFirst", "ServerStorage", "Workspace", "workspace", "StarterPlayer", "Players", "Lighting", "SoundService",
}

--- What kind of script [source] is and where it goes, from its first comments ("-- LocalScript
--- in StarterPlayerScripts", "-- ServerScriptService/DataManager.server.lua") or else from
--- what it does.
local function placement(source, index)
	local head = {}
	for line in string.gmatch(source, "[^\n]+") do
		local c = string.match(line, "^%s*%-%-+%[?=*%[?%s*(.-)%s*$")
		if c then
			insert(head, c)
		elseif string.match(line, "%S") then
			break
		end
		if #head >= 4 then
			break
		end
	end
	local headText = concat(head, " ")
	local lower = string.lower(headText)
	local kind
	if string.find(lower, "modulescript", 1, true) or string.find(lower, "module script", 1, true) then
		kind = "ModuleScript"
	elseif string.find(lower, "localscript", 1, true) or string.find(lower, "local script", 1, true) or string.find(lower, "%.client%.lua") then
		kind = "LocalScript"
	elseif string.find(lower, "%.server%.lua") or string.find(headText, "Script") then
		kind = if string.find(headText, "LocalScript") then "LocalScript" else "Script"
	end

	-- the path: a service name and what follows it
	local path, name
	-- "ServerScriptService > Main", "ServerScriptService / Main" and "ServerScriptService.Main" alike
	local pathText = string.gsub(headText, "%s*[>/]%s*", "/")
	for _, svc in SERVICE_NAMES do
		local at = string.find(pathText, svc, 1, true)
		if at then
			local rest = string.match(pathText:sub(at), "^[%w_%./]*")
			local parts = {}
			for seg in string.gmatch(rest, "[^%./]+") do
				insert(parts, seg)
			end
			-- "Foo.server.lua" / "Foo.lua" endings name the script
			while #parts > 1 and (parts[#parts] == "lua" or parts[#parts] == "luau" or parts[#parts] == "server" or parts[#parts] == "client") do
				remove(parts)
			end
			if svc == "workspace" then
				parts[1] = "Workspace"
			end
			-- what comes after the service and is not a word like "in" names the folders and script
			path = parts
			break
		end
	end
	if path and #path > 1 then
		local last = path[#path]
		-- the last name is the script's, unless the script works on its parent and the name
		-- sounds like a thing (KillBrick, BuyButton): then it is what the script sits in
		local usesParent = string.find(source, "script.Parent", 1, true) ~= nil
		local thing = THING_NAMES(last)
		if string.match(last, "^%u") and not table.find({ "Script", "LocalScript", "ModuleScript", "Folder" }, last) and not (usesParent and thing) then
			name = last
			remove(path)
		end
	end
	if not name then
		name = string.match(headText, "[Nn]ame[d]?:?%s+\"?([%w_]+)") or string.match(headText, "^([%u][%w_]+)%.lua")
	end

	local headKind = kind
	if not kind then
		local code = string.gsub(source, "%-%-[^\n]*", "")
		local lastLine = ""
		for line in string.gmatch(code, "[^\n]+") do
			if string.match(line, "%S") then
				lastLine = line
			end
		end
		if string.match(lastLine, "^%s*return%s+[%w_{]") then
			kind = "ModuleScript"
		elseif string.find(code, "LocalPlayer", 1, true) or string.find(code, "UserInputService", 1, true) or string.find(code, "PlayerGui", 1, true)
			or string.find(code, ":FireServer(", 1, true) or string.find(code, "OnClientEvent", 1, true) or string.find(code, "RenderStepped", 1, true)
			or string.find(code, "CurrentCamera", 1, true) or string.find(code, ":GetMouse(", 1, true) or string.find(code, "ContextActionService", 1, true)
			or string.find(code, ":InvokeServer(", 1, true) then
			kind = "LocalScript"
		else
			kind = "Script"
		end
	end

	-- where it goes when the comments do not say: by what script.Parent is used for
	local parentKind
	local code = source
	local usesParent = string.find(code, "script.Parent", 1, true) ~= nil
	if usesParent then
		local after = {}
		for member in string.gmatch(code, "script%.Parent[%.:]([%w_]+)") do
			after[member] = true
		end
		-- and through a name for it: local part = script.Parent
		for alias in string.gmatch(code, "local%s+([%w_]+)%s*=%s*script%.Parent%f[^%w_%.:]") do
			for member in string.gmatch(code, "%f[%w_]" .. alias .. "[%.:]([%w_]+)") do
				after[member] = true
			end
		end
		if after.Touched or after.TouchEnded or after.Anchored or after.CanCollide or after.Transparency or after.BrickColor or after.Material or after.Size or after.Position or after.Color or after.ClickDetector or after.ProximityPrompt or after.CFrame then
			parentKind = "Part"
		end
		if after.MouseButton1Click or after.Activated and not after.Handle or after.Text or after.MouseButton1Down or after.MouseEnter or after.Visible or after.TextColor3 then
			parentKind = if after.Activated and not after.MouseButton1Click and (string.find(code, "Equipped", 1, true) or string.find(code, "Tool", 1, true)) then "Tool" else "TextButton"
		end
		if after.Equipped or after.Unequipped or after.Handle or (after.Activated and string.find(code, "Tool", 1, true)) then
			parentKind = "Tool"
		end
		if after.Triggered or after.ActionText or after.HoldDuration then
			parentKind = "ProximityPrompt"
		end
		if after.MouseClick then
			parentKind = "ClickDetector"
		end
		if after.Humanoid or after.HumanoidRootPart then
			parentKind = "Character"
		end
	end
	-- a script that sits in a button or a tool and was not said to be a server Script runs on the client
	-- "-- Script inside a Part" and the like
	if not parentKind then
		local inside = string.match(lower, "inside%s+an?%s+(%a+)") or string.match(lower, "inside%s+the%s+(%a+)") or string.match(lower, "in%s+an?%s+(%a+)")
		local kinds = { part = "Part", brick = "Part", block = "Part", textbutton = "TextButton", button = "TextButton", imagebutton = "TextButton", tool = "Tool", proximityprompt = "ProximityPrompt", prompt = "ProximityPrompt", clickdetector = "ClickDetector" }
		parentKind = inside and kinds[inside]
	end
	if (parentKind == "TextButton" or parentKind == "Tool") and not headKind then
		kind = "LocalScript"
	end
	return kind, path, name, parentKind
end

--- Makes the chain of [segs] under [root]: a part for a name like "KillBrick" at the end of a
--- chain in the world, folders for the rest.
local function folderPath(root, segs, lastClass)
	local cur = root
	for i, seg in segs do
		local nextOne = childNamed(I[cur], seg)
		if not nextOne then
			local cls = "Folder"
			if i == #segs and lastClass then
				cls = lastClass
			end
			nextOne = create(cls, { Name = seg }, cur)
			if isA(I[nextOne], "BasePart") then
				I[nextOne].props.Anchored = true
				I[nextOne].props.CFrame = CFrame.new(0, 2, -12)
			end
		end
		cur = nextOne
	end
	return cur
end

--- What a name like "KillBrick" or "BuyButton" sounds like: "Part", "Gui" or nil.
THING_NAMES = function(n)
	local l = string.lower(n)
	for _, w in { "button", "label", "frame", "gui", "box", "menu", "screen", "hud", "bar" } do
		if string.find(l, w .. "$") then
			return "Gui"
		end
	end
	for _, w in { "part", "brick", "block", "pad", "door", "platform", "plate", "zone", "area", "sign", "wall", "floor", "lava", "spike", "coin", "button", "trap", "checkpoint", "portal", "teleporter" } do
		if string.find(l, w .. "$") or string.find(l, "^" .. w) then
			return "Part"
		end
	end
	if string.find(l, "prompt$") then
		return "ProximityPrompt"
	end
	if string.find(l, "tool$") or string.find(l, "sword$") or string.find(l, "gun$") then
		return "Tool"
	end
	return nil
end

--- A GUI object's class from its name: BuyButton is a TextButton, CoinsLabel a TextLabel...
GUI_CLASS = function(n, parentKind)
	local l = string.lower(n)
	if string.find(l, "imagebutton$") or (string.find(l, "image") and string.find(l, "button$")) then
		return "ImageButton"
	elseif string.find(l, "button$") or parentKind == "TextButton" then
		return "TextButton"
	elseif string.find(l, "label$") or string.find(l, "text$") or string.find(l, "title$") then
		return "TextLabel"
	elseif string.find(l, "box$") or string.find(l, "input$") then
		return "TextBox"
	elseif string.find(l, "image$") or string.find(l, "icon$") then
		return "ImageLabel"
	elseif string.find(l, "scroll") or string.find(l, "list$") then
		return "ScrollingFrame"
	end
	return "Frame"
end

local usedNames = {}
local function uniqueName(parent, name)
	local key = fullName(parent) .. "." .. name
	if not usedNames[key] then
		usedNames[key] = true
		return name
	end
	local i = 2
	while usedNames[key .. i] do
		i += 1
	end
	usedNames[key .. i] = true
	return name .. i
end

local function placeScript(source, index)
	local kind, path, name, parentKind = placement(source, index)
	local root, start = nil, "now"
	local svc = path and path[1]
	local rest = path and { table.unpack(path, 2) } or {}
	if svc == "StarterPlayerScripts" then
		root = folderPath(childNamed(I[testPlayer], "PlayerScripts"), rest)
		start = "join"
	elseif svc == "StarterCharacterScripts" then
		root = folderPath(childNamed(I[StarterPlayer], "StarterCharacterScripts"), rest)
		start = "character"
	elseif svc == "StarterGui" then
		local gui = childNamed(I[testPlayer], "PlayerGui")
		if #rest == 0 then
			root = gui
		else
			-- the first name is the ScreenGui, the rest are frames and buttons in it
			local sg = childNamed(I[gui], rest[1]) or create("ScreenGui", { Name = rest[1] }, gui)
			root = sg
			for i = 2, #rest do
				root = childNamed(I[root], rest[i]) or create(GUI_CLASS(rest[i], i == #rest and parentKind), { Name = rest[i] }, root)
			end
		end
		start = "character"
	elseif svc == "StarterPack" then
		local bp = childNamed(I[testPlayer], "Backpack")
		root = if #rest > 0 then (childNamed(I[bp], rest[1]) or create("Tool", { Name = rest[1] }, bp)) else bp
		if #rest > 0 and not childNamed(I[root], "Handle") then
			create("Part", { Name = "Handle", Size = V(1, 4, 1) }, root)
		end
		start = "character"
	elseif svc == "StarterPlayer" then
		root = folderPath(StarterPlayer, rest)
	elseif svc and services[svc == "workspace" and "Workspace" or svc] then
		local world = svc == "Workspace" or svc == "workspace"
		local lastClass = if world and (parentKind == "Part" or (#rest > 0 and THING_NAMES(rest[#rest]) == "Part")) then "Part" else nil
		root = folderPath(services[svc == "workspace" and "Workspace" or svc], rest, lastClass)
		if world and parentKind and parentKind ~= "Part" and isA(I[root], "BasePart") then
			-- a prompt or click detector the script expects to sit in, inside the part
			if parentKind == "ProximityPrompt" or parentKind == "ClickDetector" then
				root = create(parentKind, nil, root)
			end
		end
	end

	-- a script that works on the thing it sits in gets one to sit in
	if parentKind and (not root or root == workspace or (kind == "LocalScript" and root == ServerScriptService)) then
		if parentKind == "Part" then
			root = create("Part", { Name = "Part", Anchored = true, CFrame = CFrame.new(0, 2, -12) }, workspace)
		elseif parentKind == "ClickDetector" then
			local p = create("Part", { Name = "Part", Anchored = true, CFrame = CFrame.new(0, 2, -12) }, workspace)
			root = create("ClickDetector", nil, p)
		elseif parentKind == "ProximityPrompt" then
			local p = create("Part", { Name = "Part", Anchored = true, CFrame = CFrame.new(0, 2, -12) }, workspace)
			root = create("ProximityPrompt", nil, p)
		elseif parentKind == "TextButton" then
			local sg = create("ScreenGui", nil, childNamed(I[testPlayer], "PlayerGui"))
			root = create("TextButton", nil, sg)
			start = "character"
		elseif parentKind == "Tool" then
			root = create("Tool", { Name = "Tool" }, childNamed(I[testPlayer], "Backpack"))
			create("Part", { Name = "Handle", Size = V(1, 4, 1) }, root)
			start = "character"
		elseif parentKind == "Character" then
			root = childNamed(I[StarterPlayer], "StarterCharacterScripts")
			start = "character"
		end
	end
	if not root then
		if kind == "LocalScript" then
			root = childNamed(I[testPlayer], "PlayerScripts")
		elseif kind == "ModuleScript" then
			root = ReplicatedStorage
		else
			root = ServerScriptService
		end
	end
	if kind == "LocalScript" and start == "now" then
		start = "join"
	end
	if root == childNamed(I[StarterPlayer], "StarterCharacterScripts") then
		start = "character"
	end
	local inst = create(kind, { Name = uniqueName(root, name or kind) }, root)
	return inst, kind, start
end

requireModule = function(target)
	if type(target) == "number" then
		errorf(3, "require(%d): modules from the Creator Store need the internet; paste the module's code into a ModuleScript block instead", target)
	end
	if type(target) == "string" then
		-- require by path, relative to the requiring script
		local caller = ctx.inst
		local cur = if string.sub(target, 1, 5) == "@self" then caller else (caller and I[caller].parent)
		local p = string.gsub(target, "^@self/?", "")
		p = string.gsub(p, "^@game/", function()
			cur = game
			return ""
		end)
		for seg in string.gmatch(p, "[^/]+") do
			if seg == ".." then
				cur = cur and I[cur].parent
			elseif seg ~= "." then
				seg = string.gsub(seg, "%.luau?$", "")
				cur = cur and childNamed(I[cur], seg)
			end
		end
		if not cur then
			errorf(3, "require(%q): no ModuleScript there", target)
		end
		target = cur
	end
	if not (isInstance(target) and isA(I[target], "ModuleScript")) then
		errorf(3, "Attempted to call require with invalid argument(s).")
	end
	local done = moduleResults[target]
	if done then
		if done.loading then
			errorf(3, "Requested module was required recursively")
		end
		if not done.ok then
			errorf(3, "Requested module experienced an error while loading")
		end
		return done.value
	end
	local main = scriptMains[target]
	if not main then
		errorf(3, "%s has no code in this run: include that ModuleScript's block when you run", fullName(target))
	end
	local record = { loading = true }
	moduleResults[target] = record
	local prevInst = ctx.inst
	local r = table.pack(pcall(main))
	record.loading = false
	if not r[1] then
		record.ok = false
		error(r[2], 0)
	end
	if r.n ~= 2 then
		record.ok = false
		errorf(3, "Module code did not return exactly one value")
	end
	record.ok = true
	record.value = r[2]
	return r[2]
end

---------------------------------------------------------------------------- the test player

local KEY_PATTERN = "Enum%.KeyCode%.([%w_]+)"
local allSources = {}

local function anyListening(d, events)
	for _, e in events do
		if listeners(d, e) > 0 then
			return true
		end
	end
	return false
end

local function visibleGui(x)
	local cur = x
	while cur and cur ~= game do
		local d = I[cur]
		if isA(d, "GuiObject") and not getProp(d, "Visible") then
			return false
		end
		if isA(d, "LayerCollector") and not getProp(d, "Enabled") then
			return false
		end
		cur = d.parent
	end
	return true
end

local function input(keyCode, inputType, state)
	return create("InputObject", { KeyCode = keyCode or Enum.KeyCode.Unknown, UserInputType = inputType or Enum.UserInputType.Keyboard, UserInputState = state or Enum.UserInputState.Begin })
end

--- The test player tries what the scripts set up, one thing every half second.
local function play()
	local pd = I[testPlayer]
	local function character()
		return getProp(pd, "Character")
	end
	local function foot()
		local c = character()
		return c and (childNamed(I[c], "LeftFoot") or childNamed(I[c], "HumanoidRootPart"))
	end
	local function step()
		sleep(0.5)
	end

	-- parts with Touched handlers: the character walks into each
	for _, part in descendants(workspace) do
		local d = I[part]
		if touchers[part] and not d.destroyed and listeners(d, "Touched") > 0 then
			local c = character()
			if c and not part:IsDescendantOf(c) then
				info(fmt("▸ %s touches %s", nameOf(testPlayer), fullName(part)))
				local f = foot()
				fire(d, "Touched", f)
				local hum = c:FindFirstChildOfClass("Humanoid")
				if hum then
					fire(I[hum], "Touched", part, f)
				end
				sleep(0.25)
				if not d.destroyed then
					fire(d, "TouchEnded", f)
				end
				step()
			end
		end
	end
	-- click detectors and prompts in the world
	local pps = services.ProximityPromptService
	for _, x in descendants(workspace) do
		local d = I[x]
		if isA(d, "ClickDetector") and anyListening(d, { "MouseClick", "MouseHoverEnter" }) then
			info(fmt("▸ %s clicks %s", nameOf(testPlayer), fullName(d.parent or x)))
			fire(d, "MouseHoverEnter", testPlayer)
			fire(d, "MouseClick", testPlayer)
			step()
		elseif isA(d, "ProximityPrompt") and getProp(d, "Enabled") and (anyListening(d, { "Triggered", "PromptButtonHoldBegan", "TriggerEnded" }) or (pps and anyListening(I[pps], { "PromptTriggered" }))) then
			info(fmt("▸ %s uses the prompt \"%s\" on %s", nameOf(testPlayer), getProp(d, "ActionText"), fullName(d.parent or x)))
			fire(d, "PromptShown", Enum.ProximityPromptInputType.Keyboard)
			local hold = getProp(d, "HoldDuration")
			if hold > 0 then
				fire(d, "PromptButtonHoldBegan", testPlayer)
				sleep(hold)
				fire(d, "PromptButtonHoldEnded", testPlayer)
			end
			fire(d, "Triggered", testPlayer)
			if pps then
				fire(I[pps], "PromptTriggered", x, testPlayer)
			end
			sleep(0.1)
			fire(d, "TriggerEnded", testPlayer)
			step()
		end
	end
	-- buttons and text boxes on screen
	local gui = childNamed(pd, "PlayerGui")
	for _, x in descendants(gui) do
		local d = I[x]
		if isA(d, "GuiButton") and visibleGui(x) and anyListening(d, { "Activated", "MouseButton1Click", "MouseButton1Down", "MouseButton1Up" }) then
			local label = if d.cls.props.Text then " \"" .. getProp(d, "Text") .. "\"" else ""
			info(fmt("▸ %s clicks the button%s (%s)", nameOf(testPlayer), label, fullName(x)))
			local mi = input(nil, Enum.UserInputType.MouseButton1)
			fire(d, "MouseEnter", 640, 360)
			fire(d, "MouseButton1Down", 640, 360)
			fire(d, "MouseButton1Up", 640, 360)
			fire(d, "MouseButton1Click")
			fire(d, "Activated", mi, 1)
			step()
		elseif isA(d, "TextBox") and visibleGui(x) and anyListening(d, { "FocusLost" }) then
			info(fmt("▸ %s types \"hello\" into %s", nameOf(testPlayer), fullName(x)))
			fire(d, "Focused")
			setProp(d, "Text", "hello")
			fire(d, "FocusLost", true, input(Enum.KeyCode.Return))
			step()
		end
	end
	-- tools: equip, use, put away
	local backpack = childNamed(pd, "Backpack")
	for _, tool in clone(I[backpack].children) do
		local c = character()
		if isA(I[tool], "Tool") and c then
			info(fmt("▸ %s equips %s and uses it", nameOf(testPlayer), nameOf(tool)))
			tool.Parent = c
			sleep(0.25)
			if getProp(I[tool], "Enabled") then
				fire(I[tool], "Activated")
				sleep(0.25)
				fire(I[tool], "Deactivated")
			end
			step()
			if I[tool].parent == c then
				tool.Parent = backpack
			end
		end
	end
	-- keys: the ones the scripts mention, through UserInputService and ContextActionService
	local uis = services.UserInputService
	local listening = uis and anyListening(I[uis], { "InputBegan", "InputEnded" })
	local keys, seenKey = {}, {}
	for _, src in allSources do
		for k in string.gmatch(src, KEY_PATTERN) do
			if not seenKey[k] then
				seenKey[k] = true
				insert(keys, k)
			end
		end
	end
	for _, a in boundActions do
		for _, inp in a.inputs do
			if typeOf(inp) == "EnumItem" and DT[DT[inp].EnumType].name == "KeyCode" and not seenKey[inp.Name] then
				seenKey[inp.Name] = true
				insert(keys, inp.Name)
			end
		end
	end
	if listening and #keys == 0 then
		keys = { "E" }
	end
	if listening or next(boundActions) then
		for i = 1, math.min(#keys, 8) do
			local kc = Enum.KeyCode[keys[i]]
			info(fmt("▸ %s presses %s", nameOf(testPlayer), keys[i]))
			keysDown[kc] = true
			local down = input(kc, Enum.UserInputType.Keyboard, Enum.UserInputState.Begin)
			if uis then
				fire(I[uis], "InputBegan", down, false)
			end
			for name, a in boundActions do
				for _, inp in a.inputs do
					if inp == kc then
						resume(newThread(a.fn, a.ctx), name, Enum.UserInputState.Begin, down)
					end
				end
			end
			sleep(0.2)
			keysDown[kc] = nil
			local up = input(kc, Enum.UserInputType.Keyboard, Enum.UserInputState.End)
			if uis then
				fire(I[uis], "InputEnded", up, false)
			end
			for name, a in boundActions do
				for _, inp in a.inputs do
					if inp == kc then
						resume(newThread(a.fn, a.ctx), name, Enum.UserInputState.End, up)
					end
				end
			end
			step()
		end
		if uis and listening then
			info(fmt("▸ %s clicks the mouse", nameOf(testPlayer)))
			fire(I[uis], "InputBegan", input(nil, Enum.UserInputType.MouseButton1), false)
			sleep(0.1)
			fire(I[uis], "InputEnded", input(nil, Enum.UserInputType.MouseButton1, Enum.UserInputState.End), false)
			step()
		end
	end
	if uis and listeners(I[uis], "JumpRequest") > 0 then
		info(fmt("▸ %s jumps", nameOf(testPlayer)))
		fire(I[uis], "JumpRequest")
		step()
	end
	-- chat: the commands the scripts look for, else a hello
	if listeners(pd, "Chatted") > 0 then
		local said = {}
		for _, src in allSources do
			if string.find(src, "Chatted", 1, true) then
				for lit in string.gmatch(src, "==%s*\"([^\"]+)\"") do
					if #said < 3 and not table.find(said, lit) then
						insert(said, lit)
					end
				end
				for lit in string.gmatch(src, "\"([/!;:][%w_]+)") do
					if #said < 3 and not table.find(said, lit) then
						insert(said, lit)
					end
				end
			end
		end
		if #said == 0 then
			said = { "hello" }
		end
		for _, msg in said do
			info(fmt("▸ %s chats: %s", nameOf(testPlayer), msg))
			fire(pd, "Chatted", msg, nil)
			step()
		end
	end
end

------------------------------------------------------------------------------------- hooks

local hooks = {}

function hooks.env(source, index, defaultName)
	insert(allSources, source)
	local inst, kind, start = placeScript(source, index)
	local chunk = fullName(inst)
	if inst:IsDescendantOf(testPlayer) then
		chunk = "Players." .. chunk -- where it will be once Player1 joins
	end
	userChunks[chunk] = true
	insert(scriptsRun, { inst = inst, kind = kind, chunk = chunk, start = start })
	return { script = inst, _G = G, shared = env.shared }, chunk
end

function hooks.run(mains)
	local starts = { now = {}, join = {}, character = {} }
	for i, s in scriptsRun do
		local main = mains[i]
		if main then
			scriptMains[s.inst] = main
			if s.kind ~= "ModuleScript" then
				insert(starts[s.start], s)
			end
		end
	end
	local function start(s)
		local c = { kind = s.kind, inst = s.inst }
		local co = newThread(scriptMains[s.inst], c)
		resume(co)
	end
	-- server scripts at once; the player joins at 1 s; client scripts start when it does, or
	-- when its character spawns for the ones that live in the GUI, the character or a tool
	for _, s in starts.now do
		later(0, function()
			start(s)
		end)
	end
	later(1, function()
		info(fmt("▸ %s joins", nameOf(testPlayer)))
		setParent(testPlayer, I[testPlayer], Players, 1)
		fire(I[Players], "PlayerAdded", testPlayer)
		for _, s in starts.join do
			start(s)
		end
		for _, s in starts.character do
			insert(playerStarts, function(model)
				if s.inst:IsDescendantOf(childNamed(I[StarterPlayer], "StarterCharacterScripts")) then
					s.inst.Parent = model
				end
				start(s)
			end)
		end
		if getProp(I[Players], "CharacterAutoLoads") then
			later(now + 0.1, function()
				loadCharacter(testPlayer)
			end)
		end
		if AUTOPLAY then
			later(now + 2, play)
		end
	end)

	local reason = "idle"
	local function runUntil(limit)
		while true do
			local item = Sched.peek()
			if not item then
				return "idle"
			end
			if item.t > limit then
				return "game_time"
			end
			Sched.pop()
			now = math.max(now, item.t)
			if item.co then
				resume(item.co, table.unpack(item.args, 1, item.args.n))
			else
				resume(newThread(item.fn, SYSTEM))
			end
		end
	end
	reason = runUntil(GAME_SECONDS)
	if reason == "game_time" then
		now = GAME_SECONDS
		info(fmt("(the test stops after %d seconds of game time)", GAME_SECONDS))
	end
	-- the end: the player leaves (scripts that save on leaving get to), then the server closes
	local endAt = now
	local function quiet(limit)
		-- frames do not keep the end going
		frames.renderSteps = {}
		runUntil(limit)
	end
	if I[testPlayer].parent == Players then
		info(fmt("▸ %s leaves", nameOf(testPlayer)))
		fire(I[Players], "PlayerRemoving", testPlayer)
		local char = getProp(I[testPlayer], "Character")
		if char and not I[char].destroyed then
			destroy(char)
		end
		setParent(testPlayer, I[testPlayer], nil, 1)
		quiet(now + 3)
	end
	if #bindToClose > 0 then
		info("▸ the server shuts down (BindToClose)")
		for _, b in bindToClose do
			resume(newThread(b.fn, b.ctx))
		end
		quiet(now + 5)
	end
	for remote in undelivered do
		local d = I[remote]
		if d.queued and #d.queued > 0 then
			noteOnce("remote" .. fullName(remote), fmt("%d message(s) to %s were never received: nothing in this run listened (run the script on the other side together with this one)", #d.queued, fullName(remote)))
		end
	end
	for _, n in notes do
		info(n)
	end
	return now, if reason == "game_time" then "game_time" else "idle"
end

return hooks
