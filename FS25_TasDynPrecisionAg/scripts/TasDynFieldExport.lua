-- Tasman Dynamics | Field Boundary Export
--
-- Exports real field boundary polygons to modSettings/TasmanDynamics/fields.json
-- once per session, so the web terminal can draw actual field outlines instead
-- of an abstract grid. Field geometry is static per map (only ownership
-- changes at runtime), so this runs once at mission start rather than per-tick.
--
-- Reads g_fieldManager.fields[i].densityMapPolygon.pointsX/pointsZ -- the same
-- field-boundary access pattern used by FS25_VG_Livemap's own field export.

local function tasDynExportFields()
    if g_fieldManager == nil or g_fieldManager.fields == nil then return end

    local folderPath = getUserProfileAppPath() .. "modSettings/TasmanDynamics/"
    createFolder(folderPath)

    local fieldEntries = {}

    for fieldId, field in pairs(g_fieldManager.fields) do
        if field.densityMapPolygon ~= nil and field.densityMapPolygon.pointsX ~= nil then
            local points = {}
            for i, z in ipairs(field.densityMapPolygon.pointsZ) do
                local x = field.densityMapPolygon.pointsX[i]
                table.insert(points, string.format("[%.1f,%.1f]", x, z))
            end
            if #points > 0 then
                table.insert(fieldEntries, string.format('{"id":%d,"points":[%s]}', fieldId, table.concat(points, ",")))
            end
        end
    end

    local file = io.open(folderPath .. "fields.json", "w")
    if file ~= nil then
        file:write("[" .. table.concat(fieldEntries, ",") .. "]")
        file:close()
    end
end

FSBaseMission.onStartMission = Utils.appendedFunction(FSBaseMission.onStartMission, tasDynExportFields)
