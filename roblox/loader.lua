--[[
    SANDEVISTAN LOADER
    Run this instead of pasting the big script by hand. One line does it:

      loadstring(game:HttpGet("https://raw.githubusercontent.com/lalalalalabababa2-web/Why-am-i-getting-banned/ccr-ded89c5e-9zsgrj/roblox/loader.lua"))()

    It downloads sandevistan.lua from the same folder, compiles it and runs it.
    If any step fails, the reason is shown in a box on screen instead of being
    lost in the console.
]]

local URL = "https://raw.githubusercontent.com/lalalalalabababa2-web/Why-am-i-getting-banned/ccr-ded89c5e-9zsgrj/roblox/sandevistan.lua"

local function report(title, detail)
    warn("[Sandevistan loader] " .. title .. ": " .. detail)
    pcall(function()
        local parent
        local ok, hidden = pcall(function()
            return gethui()
        end)
        if ok and typeof(hidden) == "Instance" then
            parent = hidden
        else
            parent = game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui")
        end
        local old = parent:FindFirstChild("SandevistanError")
        if old then
            old:Destroy()
        end
        local gui = Instance.new("ScreenGui")
        gui.Name = "SandevistanError"
        gui.ResetOnSpawn = false
        gui.DisplayOrder = 9999
        local box = Instance.new("TextButton")
        box.AutoButtonColor = false
        box.BackgroundColor3 = Color3.fromRGB(27, 27, 30)
        box.BorderSizePixel = 0
        box.Position = UDim2.new(0.1, 0, 0.08, 0)
        box.Size = UDim2.new(0.8, 0, 0.5, 0)
        box.Font = Enum.Font.Code
        box.TextSize = 12
        box.TextWrapped = true
        box.TextXAlignment = Enum.TextXAlignment.Left
        box.TextYAlignment = Enum.TextYAlignment.Top
        box.TextColor3 = Color3.fromRGB(255, 96, 104)
        box.Text = "SANDEVISTAN: " .. title .. ". Screenshot this, then tap to close.\n\n" .. detail
        box.Parent = gui
        box.Activated:Connect(function()
            gui:Destroy()
        end)
        gui.Parent = parent
    end)
end

-- The time on the end stops a stale cached copy being served after an update.
local okGet, source = pcall(function()
    return game:HttpGet(URL .. "?t=" .. tostring(os.time()))
end)
if not okGet or type(source) ~= "string" then
    report("download failed", tostring(source))
    return
end
if #source < 20000 or not string.find(source, "SANDEVISTAN", 1, true) then
    report("download looks wrong", "got " .. #source .. " bytes, starting with: " .. string.sub(source, 1, 200))
    return
end

local chunk, compileError = loadstring(source, "sandevistan")
if not chunk then
    report("the script did not compile", tostring(compileError))
    return
end

local okRun, runError = xpcall(chunk, debug.traceback)
if not okRun then
    report("the script crashed while starting", tostring(runError))
end
