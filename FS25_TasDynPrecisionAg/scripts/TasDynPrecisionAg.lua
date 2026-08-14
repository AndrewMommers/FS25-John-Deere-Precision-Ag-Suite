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

-- Straight-line (AB) guidance PID gains. Untuned placeholders -- see
-- docs/dev-technical.md 5.3, which calls for tuning separately per vehicle class.
local GUIDANCE_KP = 0.6
local GUIDANCE_KI = 0.0
local GUIDANCE_KD = 0.15

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

    -- Straight-line (AB) guidance state
    spec.guidanceActive = false
    spec.guidanceMode = "manual"
    spec.referenceX = 0
    spec.referenceZ = 0
    spec.referenceHeadingRad = 0
    spec.crossTrackError = 0
    spec.crossTrackErrorIntegral = 0
    spec.previousCrossTrackError = 0
    spec.steeringCorrection = 0
end

function TasDynPrecisionAg:onUpdate(dt, isActiveForInput, isActiveForInputIgnoreSelection, isSelected)
    local spec = self.spec_tasDynPrecisionAg

    -- isActiveForInput requires this exact vehicle part to hold UI selection
    -- focus, which doesn't reliably land on the seat the player is actually
    -- in (confirmed via debug logging: isControlled=true, isSelected=false).
    -- getIsControlled() is true whenever a local or remote operator has
    -- entered this vehicle, which is what we actually want to gate on.
    if self.getIsControlled == nil or not self:getIsControlled() then
        return
    end

    spec.timeSinceLastExport = spec.timeSinceLastExport + dt
    if spec.timeSinceLastExport >= EXPORT_INTERVAL_MS then
        spec.timeSinceLastExport = 0
        TasDynPrecisionAg.tasDynUpdateGuidance(self, EXPORT_INTERVAL_MS / 1000)
        TasDynPrecisionAg.tasDynExportTelemetry(self)
    end

    spec.timeSinceLastCommandPoll = spec.timeSinceLastCommandPoll + dt
    if spec.timeSinceLastCommandPoll >= COMMAND_POLL_INTERVAL_MS then
        spec.timeSinceLastCommandPoll = 0
        TasDynPrecisionAg.tasDynPollCommands(self)
    end
end

-- Marks the vehicle's current position and heading as the AB reference line.
-- This is straight-line guidance only (docs/dev-technical.md 5.1-5.3); curved
-- and recorded-pass guidance lines are later work.
function TasDynPrecisionAg:tasDynEngageGuidance()
    local spec = self.spec_tasDynPrecisionAg

    local x, _, z = getWorldTranslation(self.rootNode)
    local dx, _, dz = localDirectionToWorld(self.rootNode, 0, 0, 1)
    local headingRad = math.atan2(dx, dz)

    spec.referenceX = x
    spec.referenceZ = z
    spec.referenceHeadingRad = headingRad
    spec.crossTrackErrorIntegral = 0
    spec.previousCrossTrackError = 0
    spec.guidanceActive = true
    spec.guidanceMode = "straight"

    print(string.format(
        "[TasDyn PrecisionAg] Guidance engaged: reference (%.2f, %.2f) heading %.1f deg",
        x, z, math.deg(headingRad)
    ))
end

function TasDynPrecisionAg:tasDynDisengageGuidance()
    local spec = self.spec_tasDynPrecisionAg
    spec.guidanceActive = false
    spec.guidanceMode = "manual"
    spec.crossTrackError = 0
    spec.steeringCorrection = 0
    print("[TasDyn PrecisionAg] Guidance disengaged")
end

-- Cross-track error (docs/dev-technical.md 5.2) and a PID steering correction
-- (5.3) computed from it. Nothing currently consumes steeringCorrection to
-- actually turn the wheel -- that's a deliberately separate, riskier step.
function TasDynPrecisionAg:tasDynUpdateGuidance(dtSeconds)
    local spec = self.spec_tasDynPrecisionAg

    if not spec.guidanceActive then
        spec.crossTrackError = 0
        spec.steeringCorrection = 0
        return
    end

    local x, _, z = getWorldTranslation(self.rootNode)
    local sinRef = math.sin(spec.referenceHeadingRad)
    local cosRef = math.cos(spec.referenceHeadingRad)

    local crossTrackError = (x - spec.referenceX) * sinRef - (z - spec.referenceZ) * cosRef

    spec.crossTrackErrorIntegral = spec.crossTrackErrorIntegral + crossTrackError * dtSeconds

    local crossTrackErrorDerivative = 0
    if dtSeconds > 0 then
        crossTrackErrorDerivative = (crossTrackError - spec.previousCrossTrackError) / dtSeconds
    end
    spec.previousCrossTrackError = crossTrackError

    spec.crossTrackError = crossTrackError
    spec.steeringCorrection = GUIDANCE_KP * crossTrackError
        + GUIDANCE_KI * spec.crossTrackErrorIntegral
        + GUIDANCE_KD * crossTrackErrorDerivative
end

function TasDynPrecisionAg:tasDynExportTelemetry()
    local spec = self.spec_tasDynPrecisionAg

    local speedKph = self:getLastSpeed() or 0
    local engineRpm = self:getMotorRpmReal() or 0

    local worldX, _, worldZ = getWorldTranslation(self.rootNode)
    local terrainSize = g_currentMission.terrainSize or 2048

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
        '{"speed":%.2f,"rpm":%.1f,"heading":%.2f,"implementLowered":%s,"implementWidth":%.2f,"crossTrackError":%.3f,"guidanceActive":%s,"guidanceMode":"%s","steeringCorrection":%.3f,"x":%.2f,"z":%.2f,"terrainSize":%.1f}',
        speedKph,
        engineRpm,
        heading,
        tostring(implementLowered),
        implementWidth,
        spec.crossTrackError,
        tostring(spec.guidanceActive),
        spec.guidanceMode,
        spec.steeringCorrection,
        worldX or 0,
        worldZ or 0,
        terrainSize
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
        if desiredState then
            TasDynPrecisionAg.tasDynEngageGuidance(self)
        else
            TasDynPrecisionAg.tasDynDisengageGuidance(self)
        end

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
