-- Tasman Dynamics | G5 Precision Ag Telemetry Extractor
TasDynPrecisionAg = {}

function TasDynPrecisionAg.prerequisitesPresent(specializations)
    return  SpecializationUtil.hasSpecialization(Drivable, specializations) and
            SpecializationUtil.hasSpecialization(Motorized, specializations)
end

function TasDynPrecisionAg.registerEventListeners(vehicleType)
    SpecializationUtil.registerEventListener(vehicleType, "onLoad", TasDynPrecisionAg)
    SpecializationUtil.registerEventListener(vehicleType, "onUpdate", TasDynPrecisionAg)
end

function TasDynPrecisionAg:onLoad(savegame)
    self.spec_tasDynPrecisionAg = {}
    local spec = self.spec_tasDynPrecisionAg
    
    -- Config Index 1 = Standard, Config Index 2 = G5 Plus Web Terminal
    local configId = self:getConfigurationValue("precisionAg")
    spec.isInstalled = (configId == 2)
    
    spec.tickRate = 50 -- 20Hz update rate
    spec.timeSinceLastExport = 0
end

function TasDynPrecisionAg:onUpdate(dt, isActiveForInput, isActiveForInputIgnoreSelection, isSelected)
    local spec = self.spec_tasDynPrecisionAg
    
    -- Abort if hardware is not installed or the player is not actively in the vehicle
    if not spec.isInstalled or not self:getIsActive() then return end

    spec.timeSinceLastExport = spec.timeSinceLastExport + dt
    if spec.timeSinceLastExport < spec.tickRate then return end
    spec.timeSinceLastExport = 0

    -- Extract Engine Telemetry
    local speedKph = self:getLastSpeed()
    local engineRpm = self:getMotorRpmReal()
    
    -- Extract Heading
    local dx, dy, dz = localDirectionToWorld(self.rootNode, 0, 0, 1)
    local heading = math.deg(math.atan2(dx, dz))
    if heading < 0 then heading = heading + 360 end

    -- Extract Implement Data
    local implementLowered = false
    local implementWidth = 0
    
    if self.getAttachedImplements ~= nil then
        for _, implement in pairs(self:getAttachedImplements()) do
            local obj = implement.object
            if obj.getIsLowered ~= nil and obj:getIsLowered() then
                implementLowered = true
            end
            if obj.spec_workArea ~= nil and obj.spec_workArea.workAreas ~= nil then
                for _, area in pairs(obj.spec_workArea.workAreas) do
                    local width = math.abs(area.width)
                    if width > implementWidth then implementWidth = width end
                end
            end
        end
    end

    -- Construct Payload
    local payload = {
        speed = speedKph,
        rpm = engineRpm,
        heading = heading,
        implementLowered = implementLowered,
        implementWidth = implementWidth,
        crossTrackError = 0 -- AutoTrac PID math goes here later
    }

    TasDynPrecisionAg.sendToBridge(payload)
end

function TasDynPrecisionAg.sendToBridge(payload)
    -- Locate modSettings directory
    local folderPath = getUserProfileAppPath() .. "modSettings/TasmanDynamics/"
    createFolder(folderPath) 
    
    local filePath = folderPath .. "telemetry.json"
    
    -- Fast Lua I/O
    local file = io.open(filePath, "w")
    if file ~= nil then
        local json = string.format(
            '{"speed": %f, "rpm": %f, "heading": %f, "implementLowered": %s, "implementWidth": %f, "crossTrackError": %f}',
            payload.speed or 0,
            payload.rpm or 0,
            payload.heading or 0,
            tostring(payload.implementLowered or false),
            payload.implementWidth or 0,
            payload.crossTrackError or 0
        )
        
        file:write(json)
        file:close()
    end
end

-- add a command polling timer to onUpdate Function
function TasDynPrecisionAg:onUpdate(dt, isActiveForInput, isActiveForInputIgnoreSelection, isSelected)
    local spec = self.spec_tasDynPrecisionAg
    if not spec.isInstalled or not self:getIsActive() then return end

    -- Existing telemetry export ticker...
    spec.timeSinceLastExport = spec.timeSinceLastExport + dt
    if spec.timeSinceLastExport >= spec.tickRate then
        spec.timeSinceLastExport = 0
        self:exportTelemetry()
    end

    -- New command polling ticker (checks every 200ms for incoming web commands)
    spec.timeSinceLastCommandPoll = (spec.timeSinceLastCommandPoll or 0) + dt
    if spec.timeSinceLastCommandPoll >= 200 then
        spec.timeSinceLastCommandPoll = 0
        self:pollCommandsFromWeb()
    end
end

function TasDynPrecisionAg:pollCommandsFromWeb()
    local folderPath = getUserProfileAppPath() .. "modSettings/TasmanDynamics/"
    local filePath = folderPath .. "commands.json"
    
    -- Try to open the command file in read mode
    local file = io.open(filePath, "r")
    if file ~= nil then
        local content = file:read("*all")
        file:close()
        
        -- Delete the file immediately so the game doesn't repeat the command on the next tick
        os.remove(filePath)
        
        -- Simple string parsing to handle incoming actions from the web UI
        if content ~= nil and content ~= "" then
            self:executeWebCommand(content)
        end
    end
end

function TasDynPrecisionAg:executeWebCommand(jsonContent)
    -- Basic string matching to catch actions sent from the G5 UI frontend
    if string.find(jsonContent, "TOGGLE_AUTOTRAC") then
        -- Check if state is true or false in the JSON payload
        local desiredState = string.find(jsonContent, '"state":true') ~= nil
        
        print(string.format("[TasDyn PrecisionAg] Executing AutoTrac Toggle: %s", tostring(desiredState)))
        
        -- Hook into base game GPS / steering specialization if present
        if self.setAIVehicleEnabled ~= nil then
            -- Example execution hook for steering/AI systems
            -- You can map this to your specific steering mod's toggle function
        end
        
    elseif string.find(jsonContent, "TOGGLE_SECTION_CTL") then
        local desiredState = string.find(jsonContent, '"state":true') ~= nil
        print(string.format("[TasDyn PrecisionAg] Executing Section Control Toggle: %s", tostring(desiredState)))
        
        -- Hook into implement work area states
        if self.setEnableWorkAreas ~= nil then
            self:setEnableWorkAreas(desiredState)
        end
    end
end