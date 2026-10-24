-- Offline AI's Lua: what plain Lua 5.1 code and most game mods expect, on top of Luau.
-- Runs before every script (app/src/main/cpp/lua_tools.cpp explains the "oa" table).
local oa = ...

collectgarbage = function(opt)
	opt = opt or "collect"
	if opt == "count" then
		return gcinfo()
	end
	return 0
end

-- Lua 5.0/5.1 names that Luau dropped
math.pow = math.pow or function(x, y)
	return x ^ y
end
math.mod = math.mod or math.fmod
string.gfind = string.gfind or string.gmatch

-- LuaJIT's bit library (Garry's Mod, LÖVE, Defold): signed 32-bit results, as there
local function signed(x)
	if x >= 0x80000000 then
		return x - 0x100000000
	end
	return x
end
local function wrap(f)
	return function(...)
		return signed(f(...))
	end
end
bit = {
	band = wrap(bit32.band),
	bor = wrap(bit32.bor),
	bxor = wrap(bit32.bxor),
	bnot = wrap(bit32.bnot),
	lshift = wrap(bit32.lshift),
	rshift = wrap(bit32.rshift),
	arshift = wrap(bit32.arshift),
	rol = wrap(bit32.lrotate),
	ror = wrap(bit32.rrotate),
	bswap = wrap(bit32.byteswap),
	tobit = function(x)
		return signed(bit32.band(x, 0xFFFFFFFF))
	end,
	tohex = function(x, n)
		n = n or 8
		local upper = n < 0
		n = math.abs(n)
		local s = string.format("%08x", bit32.band(x, 0xFFFFFFFF)):sub(-n)
		return upper and s:upper() or s
	end,
}

-- no files, no programs and no input here: the usual "not available" answers instead of errors
io.read = function()
	return nil
end
io.lines = function()
	error("io.lines: there are no files here", 2)
end
io.open = function(name)
	return nil, tostring(name) .. ": files are not available here", 2
end
os.getenv = function()
	return nil
end
os.execute = function()
	return nil, "programs cannot be started here"
end
os.remove = function(name)
	return nil, tostring(name) .. ": files are not available here"
end
os.rename = os.remove
os.tmpname = function()
	error("os.tmpname: there are no files here", 2)
end

arg = {}

return nil
