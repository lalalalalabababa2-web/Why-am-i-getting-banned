-- Floor 7. A fresh maze every server. Grab five shakes before the stalker grabs you.
-- The maze is a grid, so the stalker paths with a BFS over cells instead of PathfindingService.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local server = script.Parent.Parent
local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Util = require(Shared.Util)
local Build = require(server.Build)
local Combat = require(server.Combat)
local Comms = require(server.Comms)
local Data = require(server.Data)
local Economy = require(server.Economy)

local Backrooms = {}

local B = Config.Backrooms
local Y = Config.Floors[7].BaseY
local N = B.Cells
local CELL = B.CellSize
local HALF = N * CELL / 2

local folder: Folder
-- open[i][j].E / .N: passage from (i, j) to (i + 1, j) / (i, j + 1)
local open: { { { E: boolean, N: boolean } } } = {}
local collected: { [Player]: { [number]: boolean } } = {}
local stalker: Model

local function center(i: number, j: number): Vector3
	return Vector3.new(-HALF + (i - 0.5) * CELL, Y, -HALF + (j - 0.5) * CELL)
end

local function cellAt(position: Vector3): (number, number)
	local i = math.clamp(math.floor((position.X + HALF) / CELL) + 1, 1, N)
	local j = math.clamp(math.floor((position.Z + HALF) / CELL) + 1, 1, N)
	return i, j
end

local function neighbors(i: number, j: number): { { number } }
	local list = {}
	if i < N and open[i][j].E then
		table.insert(list, { i + 1, j })
	end
	if i > 1 and open[i - 1][j].E then
		table.insert(list, { i - 1, j })
	end
	if j < N and open[i][j].N then
		table.insert(list, { i, j + 1 })
	end
	if j > 1 and open[i][j - 1].N then
		table.insert(list, { i, j - 1 })
	end
	return list
end

-- Recursive backtracker: a perfect maze, every cell reachable, exactly one route between any two.
local function generate(rng: Random)
	for i = 1, N do
		open[i] = {}
		for j = 1, N do
			open[i][j] = { E = false, N = false }
		end
	end
	local visited = {}
	local stack = { { 1, 1 } }
	visited[1 * 100 + 1] = true
	while #stack > 0 do
		local top = stack[#stack]
		local i, j = top[1], top[2]
		local options = {}
		for _, d in { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } } do
			local ni, nj = i + d[1], j + d[2]
			if ni >= 1 and ni <= N and nj >= 1 and nj <= N and not visited[ni * 100 + nj] then
				table.insert(options, { ni, nj })
			end
		end
		if #options == 0 then
			table.remove(stack)
		else
			local pick = options[rng:NextInteger(1, #options)]
			local ni, nj = pick[1], pick[2]
			if ni > i then
				open[i][j].E = true
			elseif ni < i then
				open[ni][nj].E = true
			elseif nj > j then
				open[i][j].N = true
			else
				open[ni][nj].N = true
			end
			visited[ni * 100 + nj] = true
			table.insert(stack, pick)
		end
	end
	-- Knock out a few extra walls so there are loops to juke the stalker around.
	for _ = 1, N * 2 do
		local i, j = rng:NextInteger(1, N - 1), rng:NextInteger(1, N - 1)
		if rng:NextNumber() < 0.5 then
			open[i][j].E = true
		else
			open[i][j].N = true
		end
	end
end

-- BFS from (si, sj). Returns distance and parent maps keyed by i * 100 + j.
local function bfs(si: number, sj: number): ({ [number]: number }, { [number]: number })
	local dist, parent = { [si * 100 + sj] = 0 }, {}
	local queue, head = { { si, sj } }, 1
	while head <= #queue do
		local cell = queue[head]
		head += 1
		local key = cell[1] * 100 + cell[2]
		for _, nb in neighbors(cell[1], cell[2]) do
			local nk = nb[1] * 100 + nb[2]
			if dist[nk] == nil then
				dist[nk] = dist[key] + 1
				parent[nk] = key
				table.insert(queue, nb)
			end
		end
	end
	return dist, parent
end

local function buildStalker(at: Vector3): Model
	local model = Instance.new("Model")
	model.Name = Config.Names.Stalker
	local body = Build.part({
		Name = "Body", Parent = model, Shape = Enum.PartType.Ball, Size = Vector3.one * 6, CFrame = CFrame.new(at + Vector3.new(0, 3.5, 0)),
		Color = Color3.fromRGB(60, 140, 255), CanCollide = false, CanTouch = false,
	})
	model.PrimaryPart = body
	local parts = {
		Build.part({
			Name = "Hat", Parent = model, Shape = Enum.PartType.Cylinder, Size = Vector3.new(4, 3.4, 3.4),
			CFrame = body.CFrame * CFrame.new(0, 3.8, 0) * CFrame.Angles(0, 0, math.rad(80)), Color = Color3.new(1, 1, 1),
			CanCollide = false, CanTouch = false,
		}),
	}
	for _, side in { -1, 1 } do
		table.insert(parts, Build.part({
			Name = "Eye", Parent = model, Shape = Enum.PartType.Ball, Size = Vector3.one * 1.6,
			CFrame = body.CFrame * CFrame.new(side * 1.2, 0.8, -2.5), Color = Color3.new(1, 1, 1), Material = Enum.Material.Neon,
			CanCollide = false, CanTouch = false,
		}))
	end
	for _, part in parts do
		part.Anchored = false
		local weld = Instance.new("WeldConstraint")
		weld.Part0 = body
		weld.Part1 = part
		weld.Parent = part
	end
	Build.light(body, Color3.fromRGB(80, 160, 255), 22, 3)
	model.Parent = folder
	return model
end

function Backrooms.build(): CFrame
	folder = Build.folder("Floor7_Backrooms")
	local rng = Random.new()
	generate(rng)
	local wallColor = Color3.fromRGB(205, 190, 110)
	Build.room(folder, Vector3.new(0, Y, 0), Vector3.new(N * CELL, B.WallHeight, N * CELL), {
		FloorColor = Color3.fromRGB(150, 135, 85), FloorMaterial = Enum.Material.Fabric,
		WallColor = wallColor, WallMaterial = Enum.Material.SmoothPlastic, CeilingColor = Color3.fromRGB(220, 215, 190),
	})
	for i = 1, N do
		for j = 1, N do
			local c = center(i, j)
			if i < N and not open[i][j].E then
				Build.part({
					Name = "MazeWall", Parent = folder, Size = Vector3.new(1, B.WallHeight, CELL + 1),
					CFrame = CFrame.new(c + Vector3.new(CELL / 2, B.WallHeight / 2, 0)), Color = wallColor,
				})
			end
			if j < N and not open[i][j].N then
				Build.part({
					Name = "MazeWall", Parent = folder, Size = Vector3.new(CELL + 1, B.WallHeight, 1),
					CFrame = CFrame.new(c + Vector3.new(0, B.WallHeight / 2, CELL / 2)), Color = wallColor,
				})
			end
			if (i + j) % 2 == 0 then
				local panel = Build.part({
					Name = "Fluorescent", Parent = folder, Size = Vector3.new(4, 0.3, 8),
					CFrame = CFrame.new(c + Vector3.new(0, B.WallHeight - 0.2, 0)), Color = Color3.fromRGB(255, 255, 230),
					Material = Enum.Material.Neon, CanCollide = false,
				})
				Build.light(panel, Color3.fromRGB(255, 250, 200), 16, 1.2)
				panel:AddTag("FlickerLight")
			end
		end
	end

	-- Shakes go in dead ends far from the start, never in the start or exit cell.
	local candidates = {}
	for i = 1, N do
		for j = 1, N do
			if not (i == 1 and j == 1) and not (i == N and j == N) and i + j > 6 then
				local deadEnd = #neighbors(i, j) == 1
				table.insert(candidates, { i, j, if deadEnd then 0 else 1 })
			end
		end
	end
	for k = #candidates, 2, -1 do
		local swap = rng:NextInteger(1, k)
		candidates[k], candidates[swap] = candidates[swap], candidates[k]
	end
	table.sort(candidates, function(a, b)
		return a[3] < b[3]
	end)
	for id = 1, B.Shakes do
		local cell = candidates[id]
		local cup = Build.part({
			Name = "Shake", Parent = folder, Shape = Enum.PartType.Cylinder, Size = Vector3.new(3, 1.8, 1.8),
			CFrame = CFrame.new(center(cell[1], cell[2]) + Vector3.new(0, 1.5, 0)) * CFrame.Angles(0, 0, math.rad(90)),
			Color = Color3.fromRGB(150, 70, 220), Material = Enum.Material.Neon, CanCollide = false, CanQuery = false,
		})
		cup:SetAttribute("ShakeId", id)
		cup:AddTag("Shake")
		Build.light(cup, Color3.fromRGB(170, 80, 255), 14, 2)
		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = "Grab"
		prompt.ObjectText = Config.Names.Shake
		prompt.KeyboardKeyCode = Enum.KeyCode.R
		prompt.HoldDuration = 0.4
		prompt.RequiresLineOfSight = false
		prompt.Parent = cup
		prompt.Triggered:Connect(function(player)
			Backrooms.collect(player, id)
		end)
	end

	local exit = center(N, N)
	local elevator = Build.elevator(folder, CFrame.new(exit + Vector3.new(0, 0.5, -1)))
	elevator:SetAttribute("Floor", 7)

	stalker = buildStalker(center(N // 2, N // 2))
	return CFrame.new(center(1, 1) + Vector3.new(0, 3, 0))
end

function Backrooms.collect(player: Player, id: number)
	local got = collected[player]
	if not got then
		got = {}
		collected[player] = got
	end
	if got[id] then
		return
	end
	got[id] = true
	local ids = {}
	for k in got do
		table.insert(ids, tostring(k))
	end
	player:SetAttribute("Shakes", table.concat(ids, ","))
	Economy.reward(player, 0, Config.Economy.ShakeRizz)
	Comms.notify(player, Config.Names.Shake .. " " .. #ids .. "/" .. B.Shakes, Color3.fromRGB(190, 110, 255), true)
	if #ids >= B.Shakes then
		Economy.reward(player, 0, Config.Economy.BackroomsClearRizz)
		Data.update(player, function(data)
			data.HighestFloor = math.max(data.HighestFloor, 10)
		end)
		Combat.moment(player, "BACKROOMS ESCAPED", "Floor 10 unlocked. Go take the chair.")
	end
end

local function runStalker()
	local body = stalker.PrimaryPart :: BasePart
	local position = body.Position - Vector3.new(0, 3.5, 0)
	local path: { Vector3 } = {}
	local chasing: Player? = nil
	local nextThink = 0

	RunService.Heartbeat:Connect(function(dt)
		local now = os.clock()
		if now >= nextThink then
			nextThink = now + 0.4
			local si, sj = cellAt(position)
			local dist, parent = bfs(si, sj)
			local best, bestCells, bestRoot = nil, math.huge, nil
			for _, player in Comms.playersOnFloor(7) do
				local character = player.Character :: Model
				if not character:GetAttribute("Stealth") then
					local root = character:FindFirstChild("HumanoidRootPart") :: BasePart
					local pi, pj = cellAt(root.Position)
					local d = dist[pi * 100 + pj]
					if d and d < bestCells then
						best, bestCells, bestRoot = player, d, root
					end
				end
			end
			if best and bestRoot and bestCells <= B.ChaseCells then
				if chasing ~= best then
					Comms.effect(best, "Scream", nil)
					Util.sound(Config.Sounds.Scream, body, 1)
				end
				chasing = best
				path = {}
				local pi, pj = cellAt(bestRoot.Position)
				local key = pi * 100 + pj
				while parent[key] do
					table.insert(path, 1, center(key // 100, key % 100))
					key = parent[key]
				end
				table.insert(path, Vector3.new(bestRoot.Position.X, Y, bestRoot.Position.Z))
			elseif chasing or #path == 0 then
				-- Lost them, or finished the last stroll: wander one cell over.
				chasing = nil
				local options = neighbors(si, sj)
				local pick = options[math.random(#options)]
				path = { center(si, sj), center(pick[1], pick[2]) }
			end
		end

		local speed = if chasing then B.StalkerChase else B.StalkerWander
		local budget = speed * dt
		while budget > 0 and #path > 0 do
			local offset = path[1] - position
			local d = offset.Magnitude
			if d <= budget then
				position = path[1]
				budget -= d
				table.remove(path, 1)
			else
				position += offset.Unit * budget
				budget = 0
			end
		end
		local look = if #path > 0 and (path[1] - position).Magnitude > 0.1 then path[1] else position + body.CFrame.LookVector
		local bob = math.sin(now * 12) * 0.4
		stalker:PivotTo(CFrame.lookAt(position + Vector3.new(0, 3.5 + bob, 0), Vector3.new(look.X, Y + 3.5, look.Z)))

		for _, player in Comms.playersOnFloor(7) do
			local character = player.Character :: Model
			local root = character:FindFirstChild("HumanoidRootPart") :: BasePart
			local flat = (root.Position - position) * Vector3.new(1, 0, 1)
			if flat.Magnitude < B.CatchRadius and math.abs(root.Position.Y - Y) < 10 then
				Combat.kill(character:FindFirstChildOfClass("Humanoid") :: Humanoid)
				Comms.effect(player, "Scream", nil)
				Comms.notify(nil, player.DisplayName .. " got caught by " .. Config.Names.Stalker, Color3.fromRGB(80, 160, 255))
			end
		end
	end)
end

function Backrooms.start()
	Players.PlayerRemoving:Connect(function(player)
		collected[player] = nil
	end)
	runStalker()
end

return Backrooms
