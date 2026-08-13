-- Tasman Dynamics | G5 Precision Ag Telemetry Extractor
--
-- File-based IPC with the local bridge server (see /server):
--   writes  modSettings/TasmanDynamics/telemetry.json  every EXPORT_INTERVAL_MS
--   reads   modSettings/TasmanDynamics/commands.xml     every COMMAND_POLL_INTERVAL_MS
--
-- FS25's Lua sandbox restricts io.open to write mode only ("only write mode
-- ('w') is allowed"), so telemetry export uses plain io.open, but reading
-- commands back in has to go through the engine's own XMLFile API instead --
-- the same pattern FS25_realGPS uses for its own external config files.

TasDynPrecisionAg = {}

local EXPORT_INTERVAL_MS = 100 -- 10Hz telemetry export
local COMMAND_POLL_INTERVAL_MS = 200

TasDynPrecisionAg.COMMANDS_XML_SCHEMA = XMLSchema.new("tasDynCommands")
TasDynPrecisionAg.COMMANDS_XML_SCHEMA:register(XMLValueType.INT, "commands#seq", "Monotonic command sequence number", 0)
TasDynPrecisionAg.COMMANDS_XML_SCHEMA:register(XMLValueType.STRING, "commands#type", "Command type")
TasDynPrecisionAg.COMMANDS_XML_SCHEMA:register(XMLValueType.BOOL, "commands#state", "Desired boolean state", false)

function TasDynPrecisionAg.prerequisitesPresent(specializations)
    return SpecializationUtil.hasSpecialization(Drivable, specializations)
        and SpecializationUtil.hasSpecialization(Motorized, specializations)
end

function TasDynPrecisionAg.registerEventListeners(vehicleType)
    SpecializationUtil.registerEventListener(vehicleType, "onLoad", TasDynPrecisionAg)
    SpecializationUtil.registerEventListener(vehicleType, "onUpdate", TasDynPrecisionAg)
end

function TasDynPrecisionAg:onLoad(savegame)
    local spec = self.spec_tasDynPrecisionAg
    if spec == nil then
        spec = {}
        self.spec_tasDynPrecisionAg = spec
    end

    spec.folderPath = getUserProfileAppPath() .. "modSettings/TasmanDynamics/"
    createFolder(spec.folderPath)

    spec.telemetryFilePath = spec.folderPath .. "telemetry.json"
    spec.commandsFilePath = spec.folderPath .. "commands.xml"

    spec.timeSinceLastExport = 0
    spec.timeSinceLastCommandPoll = 0
    spec.lastCommandSeq = 0
end

function TasDynPrecisionAg:onUpdate(dt, isActiveForInput, isActiveForInputIgnoreSelection, isSelected)
    local spec = self.spec_tasDynPrecisionAg

    -- isActiveForInput is true only for the vehicle the local player is currently
    -- operating, so this correctly excludes AI workers and other players' machines.
    if not isActiveForInput then
        return
    end

    spec.timeSinceLastExport = spec.timeSinceLastExport + dt
    if spec.timeSinceLastExport >= EXPORT_INTERVAL_MS then
        spec.timeSinceLastExport = 0
        TasDynPrecisionAg.tasDynExportTelemetry(self)
    end

    spec.timeSinceLastCommandPoll = spec.timeSinceLastCommandPoll + dt
    if spec.timeSinceLastCommandPoll >= COMMAND_POLL_INTERVAL_MS then
        spec.timeSinceLastCommandPoll = 0
        TasDynPrecisionAg.tasDynPollCommands(self)
    end
end

function TasDynPrecisionAg:tasDynExportTelemetry()
    local spec = self.spec_tasDynPrecisionAg

    local speedKph = self:getLastSpeed() or 0
    local engineRpm = self:getMotorRpmReal() or 0

    local dx, _, dz = localDirectionToWorld(self.rootNode, 0, 0, 1)
    local heading = math.deg(math.atan2(dx, dz))
    if heading < 0 then heading = heading + 360 end

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

    local json = string.format(
        '{"speed":%.2f,"rpm":%.1f,"heading":%.2f,"implementLowered":%s,"implementWidth":%.2f,"crossTrackError":%.3f}',
        speedKph,
        engineRpm,
        heading,
        tostring(implementLowered),
        implementWidth,
        0 -- AutoTrac cross-track error math lands here in Phase 2 (see docs/dev-technical.md 5.2)
    )

    -- FS25's Lua sandbox only allows write-mode io.open, so this overwrites
    -- directly instead of writing to a temp file and renaming.
    local file = io.open(spec.telemetryFilePath, "w")
    if file ~= nil then
        file:write(json)
        file:close()
    end
end

function TasDynPrecisionAg:tasDynPollCommands()
    local spec = self.spec_tasDynPrecisionAg

    local xmlFile = XMLFile.loadIfExists("tasDynCommandsXML", spec.commandsFilePath, TasDynPrecisionAg.COMMANDS_XML_SCHEMA)
    if xmlFile == nil then return end

    local seq = xmlFile:getValue("commands#seq", 0)
    if seq > spec.lastCommandSeq then
        spec.lastCommandSeq = seq

        local commandType = xmlFile:getValue("commands#type")
        local desiredState = xmlFile:getValue("commands#state", false)

        TasDynPrecisionAg.tasDynExecuteCommand(self, commandType, desiredState)
    end

    xmlFile:delete()
end

function TasDynPrecisionAg:tasDynExecuteCommand(commandType, desiredState)
    if commandType == "TOGGLE_AUTOTRAC" then
        print(string.format("[TasDyn PrecisionAg] AutoTrac toggle requested: %s", tostring(desiredState)))
        -- Hook into guidance/steering logic here once it exists (Phase 2)

    elseif commandType == "TOGGLE_SECTION_CTL" then
        print(string.format("[TasDyn PrecisionAg] Section control toggle requested: %s", tostring(desiredState)))
        if self.getAttachedImplements ~= nil then
            for _, implement in pairs(self:getAttachedImplements()) do
                local obj = implement.object
                if obj.setEnableWorkAreas ~= nil then
                    obj:setEnableWorkAreas(desiredState)
                end
            end
        end
    end
end
