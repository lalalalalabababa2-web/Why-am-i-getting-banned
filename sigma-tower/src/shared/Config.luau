-- Every tuning number and display name in the game. Change things here, not in the services.

local Config = {}

-- Display names. Real streamers, Skibidi Toilet, Smurfs and McDonald's are all owned by someone,
-- and DMCA takedowns tend to land right when a game starts getting traffic. Swap these freely.
Config.Names = {
	Game = "Brainrot Battleground: Sigma Tower",
	Coins = "Gyatt Coins",
	Rizz = "Rizz",
	Mew = "Mew Streak",
	Boss = "The Big Back",
	InvasionBoss = "Big Back Prime",
	Stalker = "Shleep Cat",
	Shake = "Purple Shake",
	Grunt = "Toilet Grunt",
	Streamer = "NPC Streamer",
	Throne = "Streamer Chair",
}

-- Only these four floors exist; the elevator skips the ones in between.
Config.FloorOrder = { 1, 4, 7, 10 }
Config.Floors = {
	[1] = { Name = "Ground Zero: TikTok Subway", BaseY = 0, PvP = true },
	[4] = { Name = "The Kitchen", BaseY = 400, PvP = false },
	[7] = { Name = "The Ohio Backrooms", BaseY = 800, PvP = false },
	[10] = { Name = "The Apex: Penthouse", BaseY = 1200, PvP = true },
}

Config.Movement = {
	WalkSpeed = 16,
	JumpHeight = 7.2,
	SprintMult = 1.45,
	BlockMult = 0.5,
	Dash = { Cooldown = 2.5, Speed = 75, Time = 0.18, IFrames = 0.3 },
}

-- Kind decides how the server resolves a hit:
--   Melee   short box in front of you        Lob     projectile with splash
--   Beam    short hitscan, fires while held  Hitscan long single-target ray
--   Shield  hold to block frontal damage
Config.Weapons = {
	Slap = {
		Name = "NPC Slap", Order = 1, Price = 0, Kind = "Melee", Color = Color3.fromRGB(255, 205, 160),
		Damage = 15, Range = 9, Cooldown = 0.6, Knockback = 35,
		Blurb = "Everyone starts here. Bussin' but basic.",
	},
	ShakeBlaster = {
		Name = "Purple Shake Blaster", Order = 2, Price = 500, Kind = "Lob", Color = Color3.fromRGB(150, 70, 220),
		Damage = 35, SplashRadius = 10, Range = 90, ProjectileSpeed = 120, Cooldown = 1.1,
		Special = { Name = "Purple Puddle", Cooldown = 12, Radius = 12, Duration = 6, SlowMult = 0.5, SlowTime = 5 },
		Blurb = "35 splash. E drops a puddle that slows enemies 50% for 5s.",
	},
	FanumVacuum = {
		Name = "Fanum Tax Vacuum", Order = 3, Price = 1500, Kind = "Beam", Color = Color3.fromRGB(200, 200, 210),
		Damage = 6, Range = 28, Cooldown = 0.25, StealPct = 0.02, StealMin = 1,
		Special = { Name = "Tax Evasion", Cooldown = 25, StealthTime = 3, CloneRun = 45 },
		Blurb = "Hold to drain coins out of people. E leaves a decoy and turns you invisible for 3s.",
	},
	GigaStare = {
		Name = "GigaChad Stare", Order = 4, Price = 3000, Kind = "Hitscan", Color = Color3.fromRGB(255, 255, 255),
		Damage = 80, Range = 140, Cooldown = 2.5,
		Special = { Name = "Jawline Blind", Cooldown = 15, Damage = 10, Range = 90, BlindTime = 2.5 },
		Blurb = "80 damage, one target. E flashes their screen white.",
	},
	MewShield = {
		Name = "Mewing Shield", Order = 5, Price = 5000, Kind = "Shield", Color = Color3.fromRGB(90, 200, 255),
		ReflectPct = 0.5, BlockArc = 0.1,
		Special = { Name = "Mog Stare", Cooldown = 20, Range = 60, StunTime = 2, DamageTakenMult = 2 },
		Blurb = "Hold to block everything in front. Blocked hits fire 50% back. E stuns and doubles their damage taken.",
	},
}

Config.FanumTax = { Cooldown = 60, PassCooldown = 15, Radius = 16, StealPct = 0.05 }

Config.Mewing = {
	IntervalMin = 25, IntervalMax = 50,
	HoldTime = 1.5, Window = 4,
	SpeedPerStreak = 0.6, MaxSpeedBonus = 8,
	RizzPerStreak = 5,
}

Config.Economy = {
	PassiveCoins = 2, PassiveRizz = 1, -- per second
	NpcKill = { Coins = 25, Rizz = 15 },
	PlayerKill = { Coins = 60, Rizz = 40 },
	BossKill = { Coins = 2000, Rizz = 1500 },
	InvasionKill = { Coins = 4000, Rizz = 3000 },
	ShakeRizz = 100, BackroomsClearRizz = 750,
	ThroneRizzPerSecond = 50,
	StreakMoments = { 10, 25, 50 },
	FriendBonusPer = 0.25, FriendBonusCap = 1.0,
	RebirthBaseCost = 25000, RebirthMultStep = 0.5, RebirthScaleStep = 0.08, MaxScale = 1.8,
	CreditWindow = 10, -- seconds a hit counts toward a kill
}

-- Day N of a 7-day streak. Missing a day resets to day 1.
Config.Daily = {
	{ Coins = 1000 },
	{ Coins = 1500 },
	{ Skin = "GoldVacuum", Label = "Gold Fanum Tax Vacuum skin" },
	{ Coins = 2500 },
	{ Rizz = 3000 },
	{ Coins = 4000 },
	{ Aura = true, BoostMinutes = 60, Label = "Permanent GigaChad Aura + 5x Rizz for 1 hour" },
}

Config.Subway = {
	TrainIntervalMin = 8, TrainIntervalMax = 14, TrainWarning = 3, TrainSpeed = 220,
	Grunts = 4, Streamers = 3, NpcRespawn = 8,
	NpcHealth = 60, NpcDamage = 8, NpcAttackCooldown = 1.2, NpcAggroRange = 55,
}

Config.Kitchen = {
	BaseHealth = 4000, HealthPerPlayer = 3000,
	SlamCooldown = 6, SlamTelegraph = 1.3, SlamRadius = 16, SlamDamage = 35, SlamKnockback = 70, SlamTargets = 3,
	EnrageAt = 0.3, PullCooldown = 14, PullTime = 5, PullSpeed = 11, EatRadius = 14,
	ContactDamage = 20, Respawn = 30,
}

Config.Backrooms = {
	Cells = 12, CellSize = 18, WallHeight = 18,
	Shakes = 5,
	StalkerWander = 10, StalkerChase = 17, ChaseCells = 8, CatchRadius = 4.5,
}

-- Every server derives events from the clock, so they fire everywhere at once with no messaging.
Config.Events = {
	CycleSeconds = 1800, DurationSeconds = 180,
	Order = { "GrimaceHour", "Invasion" },
	GrimaceHour = { Title = "GRIMACE HOUR", Blurb = "5x Gyatt Coins everywhere", CoinMult = 5 },
	Invasion = { Title = "BIG BACK INVASION", Blurb = "Low gravity. Kill the boss on Floor 1 before time runs out",
		Gravity = 70, Health = 15000, HealthPerPlayer = 2500 },
}

-- Create the passes on the Creator Dashboard and paste their IDs. 0 = not set up yet.
Config.GamePasses = {
	GigaChad = { Id = 0, Name = "GigaChad Pass", Price = 499 },
	InfiniteTax = { Id = 0, Name = "Infinite Fanum Tax", Price = 799 },
	Soundboard = { Id = 0, Name = "Brainrot Soundboard", Price = 250 },
	VIP = { Id = 0, Name = "VIP Sigma Title", Price = 199 },
}

-- Public audio on Roblox is mostly locked down, so upload your own sounds and paste the IDs.
-- Empty strings are skipped silently.
Config.Sounds = {
	Phonk = "", TaxSteal = "", TrainHorn = "", Scream = "", Throne = "", DeepFried = "", MewBreak = "", Slam = "",
	Soundboard = {
		{ Name = "Vine Boom", Id = "" },
		{ Name = "Bruh", Id = "" },
		{ Name = "Rizz", Id = "" },
		{ Name = "Phonk Drop", Id = "" },
	},
}

-- Studio-only conveniences. Ignored on live servers.
Config.Debug = {
	GrantAllPasses = true,
	FastEvents = true, -- 2 minute cycle, 45 second events
	StartRizz = 20000,
	StartCoins = 2000,
}

return Config
