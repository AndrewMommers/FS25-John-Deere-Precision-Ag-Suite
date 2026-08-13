-- Registers tasDynPrecisionAg and attaches it to every compatible vehicle
-- type at startup, vanilla or modded, rather than a single custom vehicle type.
--
-- extraSourceFiles run before this mod's own <specializations> block would be
-- processed, so the specialization class has to be registered programmatically
-- here instead -- the same pattern FS25_DashboardLive uses for its own spec.

if g_specializationManager:getSpecializationByName("tasDynPrecisionAg") == nil then
    g_specializationManager:addSpecialization("tasDynPrecisionAg", "TasDynPrecisionAg", g_currentModDirectory .. "scripts/TasDynPrecisionAg.lua", nil)
end

local specName = g_currentModName .. ".tasDynPrecisionAg"

for typeName, typeEntry in pairs(g_vehicleTypeManager.types) do
    if SpecializationUtil.hasSpecialization(Drivable, typeEntry.specializations)
        and SpecializationUtil.hasSpecialization(Motorized, typeEntry.specializations)
    then
        g_vehicleTypeManager:addSpecialization(typeName, specName)
    end
end
