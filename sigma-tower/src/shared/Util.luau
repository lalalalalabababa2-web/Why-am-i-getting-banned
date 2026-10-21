local Config = require(script.Parent.Config)

local Util = {}

-- Which of the four floors a world height belongs to.
function Util.floorAt(y: number): number
	local found = Config.FloorOrder[1]
	for _, floor in Config.FloorOrder do
		if y >= Config.Floors[floor].BaseY - 50 then
			found = floor
		end
	end
	return found
end

function Util.floorIndex(floor: number): number
	return table.find(Config.FloorOrder, floor) or 1
end

function Util.formatNumber(n: number): string
	n = math.floor(n)
	if n >= 1e9 then
		return string.format("%.2fB", n / 1e9)
	elseif n >= 1e6 then
		return string.format("%.2fM", n / 1e6)
	elseif n >= 1e4 then
		return string.format("%.1fK", n / 1e3)
	end
	local s = tostring(n)
	return (s:reverse():gsub("(%d%d%d)", "%1,"):reverse():gsub("^,", ""))
end

-- Plays a sound if an id was configured. Returns the Sound so callers can stop loops.
function Util.sound(id: string, parent: Instance, volume: number?, looped: boolean?): Sound?
	if id == "" then
		return nil
	end
	local sound = Instance.new("Sound")
	sound.SoundId = "rbxassetid://" .. id
	sound.Volume = volume or 0.6
	sound.Looped = looped == true
	sound.RollOffMaxDistance = 120
	sound.Parent = parent
	sound:Play()
	if not sound.Looped then
		sound.Ended:Once(function()
			sound:Destroy()
		end)
	end
	return sound
end

return Util
