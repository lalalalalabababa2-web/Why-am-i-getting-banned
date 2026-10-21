-- Server-wide events on a fixed clock. The schedule comes from os.time(), so every server
-- switches at the same moment without talking to each other.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage").Shared
local Config = require(Shared.Config)
local Boss = require(script.Parent.Boss)
local Build = require(script.Parent.Build)
local Comms = require(script.Parent.Comms)

local Events = {}

local E = Config.Events
local DEFAULT_GRAVITY = workspace.Gravity

local cycle = E.CycleSeconds
local duration = E.DurationSeconds
if RunService:IsStudio() and Config.Debug.FastEvents then
	cycle, duration = 120, 45
end

local active: string? = nil
local invasionBoss: Boss.Handle? = nil

local function eventFor(index: number): string
	return E.Order[index % #E.Order + 1]
end

local function begin(name: string, endsAt: number)
	active = name
	local info = E[name]
	workspace:SetAttribute("EventName", name)
	workspace:SetAttribute("EventTitle", info.Title)
	workspace:SetAttribute("EventBlurb", info.Blurb)
	workspace:SetAttribute("EventEndsAt", endsAt)
	Comms.notify(nil, info.Title .. ": " .. info.Blurb, Color3.fromRGB(255, 90, 255), true)

	if name == "GrimaceHour" then
		workspace:SetAttribute("CoinEventMult", info.CoinMult)
	elseif name == "Invasion" then
		workspace.Gravity = info.Gravity
		invasionBoss = Boss.spawn({
			Name = Config.Names.InvasionBoss,
			Ground = Vector3.new(0, Config.Floors[1].BaseY, 50),
			Floor = 1,
			MaxHealth = info.Health + info.HealthPerPlayer * #Players:GetPlayers(),
			Enrage = false,
			Reward = Config.Economy.InvasionKill,
			Parent = Build.Map,
			OnDefeated = function()
				invasionBoss = nil
				Comms.notify(nil, "INVASION REPELLED. W server.", Color3.fromRGB(120, 255, 120), true)
			end,
		})
	end
end

local function finish()
	if active == "Invasion" then
		workspace.Gravity = DEFAULT_GRAVITY
		if invasionBoss then
			invasionBoss.Destroy()
			invasionBoss = nil
			Comms.notify(nil, Config.Names.InvasionBoss .. " got away. L server.", Color3.fromRGB(255, 120, 120), true)
		end
	end
	active = nil
	workspace:SetAttribute("CoinEventMult", 1)
	workspace:SetAttribute("EventName", "")
end

function Events.start()
	workspace:SetAttribute("CoinEventMult", 1)
	workspace:SetAttribute("EventName", "")
	task.spawn(function()
		while true do
			local now = os.time()
			local index = now // cycle
			local phase = now % cycle
			local name = eventFor(index)
			if phase < duration then
				if active ~= name then
					if active then
						finish()
					end
					begin(name, index * cycle + duration)
				end
			elseif active then
				finish()
			end
			workspace:SetAttribute("NextEventTitle", E[eventFor(index + 1)].Title)
			workspace:SetAttribute("NextEventAt", (index + 1) * cycle)
			task.wait(1)
		end
	end)
end

return Events
