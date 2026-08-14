const os = require("os");
const path = require("path");

// Override with FS25_PROFILE_PATH if the game profile lives somewhere non-default
const profileDir =
  process.env.FS25_PROFILE_PATH ||
  path.join(os.homedir(), "Documents", "My Games", "FarmingSimulator2025");

const bridgeDir = path.join(profileDir, "modSettings", "TasmanDynamics");

module.exports = {
  bridgeDir,
  telemetryFile: path.join(bridgeDir, "telemetry.json"),
  fieldsFile: path.join(bridgeDir, "fields.json"),
  commandsFile: path.join(bridgeDir, "commands.xml"),
  httpPort: Number(process.env.PORT) || 8787,
};
