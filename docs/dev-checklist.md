# FS25 Precision Ag Implementation Checklist

This checklist is the working execution plan for the FS25 John Deere-inspired precision agriculture suite. It is designed to turn the technical concept into an actionable build plan with concrete engineering tasks, acceptance criteria, and dependency tracking.

---

## 1. Project Setup

### 1.1 Repository structure
- [ ] Create the project root structure:
  - [ ] `/engine`
  - [ ] `/server`
  - [ ] `/web`
  - [ ] `/docs`
  - [ ] `/data`
- [ ] Add a README and technical design docs to `/docs`
- [ ] Define a naming convention for vehicles, fields, passes, and sessions
- [ ] Create a project board or task list for milestones

Acceptance criteria:
- The repository layout is clear and consistent.
- Each folder has a defined purpose.
- New contributors can understand the architecture from the layout alone.

---

## 2. FS25 Mod Foundation

### 2.1 Mod packaging
- [ ] Confirm the mod packaging format for FS25
- [ ] Create the required mod metadata files
- [ ] Add dependency declarations for Dashboard Live
- [ ] Verify the mod loads in the game without errors

Acceptance criteria:
- Mod installs cleanly in the FS25 mods folder.
- Game loads the mod without crashing.
- Missing dependencies are clearly identified.

### 2.2 Vehicle telemetry hook
- [ ] Identify the correct vehicle update loop in Lua
- [ ] Hook into per-frame vehicle state updates
- [ ] Expose position, orientation, velocity, and steering values
- [ ] Export implement state and tool information
- [ ] Log active operation mode and machine activity

Acceptance criteria:
- Telemetry updates at a consistent interval.
- Data values are stable and realistic.
- No major frame hitch or simulation slowdown is introduced.

### 2.3 Operation state tracking
- [ ] Define active states for idle, driving, turning, field work, and headland
- [ ] Track whether a machine is engaged in a guided task
- [ ] Track whether an implement is raised or lowered
- [ ] Log operation start and stop events

Acceptance criteria:
- Each machine has a valid state model.
- State transitions are deterministic and testable.
- State changes are visible in the bridge and frontend.

---

## 3. Dashboard Live Integration

### 3.1 In-cab display wiring
- [ ] Identify the Dashboard Live variable registration workflow
- [ ] Register required variables for vehicle state
- [ ] Build a basic telemetry dashboard screen
- [ ] Show speed, RPM, heading, and guidance mode
- [ ] Show implement state and active field operation

Acceptance criteria:
- The in-cab display updates live.
- UI is readable and does not overwhelm the operator.
- Values match the machine state being exported from Lua.

### 3.2 Display widgets
- [ ] Create a widget panel for machine status
- [ ] Create a widget panel for guidance state
- [ ] Create a widget panel for coverage / pass progress
- [ ] Create a widget panel for operational warnings

Acceptance criteria:
- Widgets are modular and re-orderable.
- Each widget has a clear purpose and label.
- Widgets update at a usable refresh rate.

---

## 4. Local Bridge / Server Infrastructure

### 4.1 Bridge setup
- [ ] Initialize a Node.js project in `/server`
- [ ] Install required packages for WebSockets and HTTP serving
- [ ] Create a minimal health endpoint
- [ ] Create a WebSocket endpoint for telemetry and command streams
- [ ] Add logging for message flow and errors

Acceptance criteria:
- The server starts reliably.
- The health endpoint responds successfully.
- WebSocket connections accept telemetry traffic from the game.

### 4.2 Message schema
- [ ] Define telemetry message type
- [ ] Define command message type
- [ ] Define sync message type
- [ ] Define status / heartbeat message type
- [ ] Define error and reconnect handling

Acceptance criteria:
- Each message follows a documented schema.
- Unknown messages are handled gracefully.
- Validation prevents malformed telemetry from breaking the system.

### 4.3 Message routing
- [ ] Route telemetry from game to backend and frontend
- [ ] Route UI commands back to the game
- [ ] Route sync updates for multi-machine coordination
- [ ] Separate internal state updates from UI rendering data

Acceptance criteria:
- Commands reach the target machine correctly.
- Telemetry is not lost between update cycles.
- The bridge remains stable under repeated updates.

---

## 5. Frontend Web Application

### 5.1 App shell
- [ ] Initialize React app in `/web`
- [ ] Set up project structure for components and state management
- [ ] Create app shell and dashboard layout grid
- [ ] Implement a map panel and telemetry panel
- [ ] Create a simple navigation model for different screens

Acceptance criteria:
- The frontend loads without runtime errors.
- Dashboard layout is responsive and readable.
- The app can connect to the bridge server.

### 5.2 Map and field view
- [ ] Add map library and base tile setup
- [ ] Render tractor position on a field map
- [ ] Render heading vector and machine state
- [ ] Render field boundary overlays
- [ ] Render pass coverage overlays

Acceptance criteria:
- Machine location is visible in real time.
- Field boundaries and pass coverage are correctly aligned to simulation coordinates.
- The map updates without visual jitter.

### 5.3 Guidance interface
- [ ] Display active guidance line
- [ ] Show cross-track error value
- [ ] Show steering correction status
- [ ] Toggle between manual and guided modes
- [ ] Indicate guidance loss or re-acquisition state

Acceptance criteria:
- Guidance mode can be switched from the UI.
- Cross-track error is visible and updates with movement.
- Guidance status is understandable to the operator.

---

## 6. Guidance and Path Control

### 6.1 Field path model
- [ ] Define path point structure for field operations
- [ ] Capture vehicle points during operation
- [ ] Save pass data to a field record
- [ ] Build a polyline from recorded points
- [ ] Handle path smoothing and simplification

Acceptance criteria:
- Recorded paths match real vehicle movement.
- Paths remain usable even when sampling intervals vary.
- Data can be reloaded for guidance use.

### 6.2 Guidance line generation
- [ ] Define guidance-line creation workflow
- [ ] Generate reference lines from primary operation passes
- [ ] Apply implement-width-based offsets
- [ ] Store generated guidance lines for subsequent passes
- [ ] Validate geometry for straight and curved fields

Acceptance criteria:
- Generated guidance lines are valid and usable.
- Offset logic is consistent with implement width and task type.
- Guidance lines can be reused across operations.

### 6.3 Steering controller
- [ ] Implement lateral offset calculation
- [ ] Implement heading difference logic
- [ ] Add proportional steering response
- [ ] Add integral correction for drift
- [ ] Add derivative damping for oscillation control
- [ ] Add steering limits based on vehicle type

Acceptance criteria:
- Guidance reduces lateral error over time.
- Steering response remains stable and believable.
- Manual override remains effective.

---

## 7. Pass Tracking and Coverage Logic

### 7.1 Path logging
- [ ] Log pass points at a defined interval
- [ ] Include operation type and machine metadata
- [ ] Store timestamp and location for each sample
- [ ] Persist pass records to disk when complete

Acceptance criteria:
- Each operation creates a valid pass history.
- Log sampling is consistent and not overly expensive.
- Pass history can be reloaded for analysis.

### 7.2 Coverage tracking
- [ ] Define coverage representation for pass geometry
- [ ] Calculate field area covered over time
- [ ] Estimate overlap and missed areas
- [ ] Highlight completed and incomplete zones

Acceptance criteria:
- Coverage visuals are aligned with actual machine movement.
- Overlap and gaps are visible to the user.
- Coverage metrics are consistent across passes.

### 7.3 Section control concept
- [ ] Define section count and implement segmentation
- [ ] Determine section states based on active coverage
- [ ] Prevent duplicate application to already-covered areas
- [ ] Expose section status in the UI

Acceptance criteria:
- Section toggle logic works for real field movement.
- Overlap is reduced when relevant passes are repeated.
- Section state is understandable in operator dashboards.

---

## 8. Data Persistence and Field Records

### 8.1 Storage layer
- [ ] Decide final persistence method: JSON, SQLite, or both
- [ ] Create field record schema
- [ ] Create pass record schema
- [ ] Create session record schema
- [ ] Add optional snapshot export for troubleshooting

Acceptance criteria:
- Data persists between sessions.
- Records can be reloaded and inspected.
- The schema is versioned and documented.

### 8.2 Field state management
- [ ] Create field registration workflow
- [ ] Assign operation records to fields
- [ ] Track pass sequence and operation history
- [ ] Maintain active field references for current jobs

Acceptance criteria:
- Each operation belongs to a known field.
- Field metadata can be reopened after restart.
- Recovery from reload is reliable.

---

## 9. Machine Sync and Coordination

### 9.1 Leader / follower concept
- [ ] Define leader and follower roles
- [ ] Create role assignment flow
- [ ] Broadcast status to connected machines
- [ ] Support follower commands and acceptance checks

Acceptance criteria:
- Machine roles are explicit and usable.
- State updates travel correctly between machines.
- Coordination remains stable under reconnect scenarios.

### 9.2 Live sync commands
- [ ] Add nudge forward command
- [ ] Add nudge backward command
- [ ] Add stop / resume controls
- [ ] Add task synchronization triggers

Acceptance criteria:
- Commands are applied in a predictable order.
- Machine movement reflects the sync command correctly.
- Latency is acceptable for preview and gameplay use.

---

## 10. Testing Strategy

### 10.1 Functional tests
- [ ] Test telemetry generation from the Lua layer
- [ ] Test message round-trip through the bridge
- [ ] Test command execution back to the game
- [ ] Test guidance line generation from field pass data
- [ ] Test path-following correction under varying vehicle speeds

Acceptance criteria:
- Core loops work end-to-end.
- Known failure modes are documented and reproducible.
- No critical breakages occur during normal operation.

### 10.2 UI validation
- [ ] Test the dashboard with live telemetry updates
- [ ] Test map overlay alignment
- [ ] Test multi-panel responsiveness
- [ ] Test browser reconnect handling

Acceptance criteria:
- UI remains stable during active telemetry flow.
- No broken states when reconnecting the frontend.
- Operators can read the interface without confusion.

### 10.3 Regression checks
- [ ] Re-test core mod load flow after each phase
- [ ] Validate no stale data is retained after session reset
- [ ] Validate path and coverage data remain consistent after reconnect

Acceptance criteria:
- Updated versions do not regress the previous working flow.
- Field data remains valid after reloads.

---

## 11. Release Readiness

### 11.1 Milestone gate review
- [ ] Telemetry pipeline works end-to-end
- [ ] Guidance logic is stable
- [ ] Pass recording works correctly
- [ ] Dashboard UI is functional and readable
- [ ] Data persists and reloads correctly
- [ ] Machine sync behavior is stable in basic test scenarios

Acceptance criteria:
- The project reaches a usable minimum viable precision-ag feature set.
- No blocking bug remains in the core system.

### 11.2 Final polish
- [ ] Add error handling and user feedback states
- [ ] Clean up stale values and edge cases
- [ ] Add documentation for setup, testing, and data flow
- [ ] Provide a release note summary of features and known limits

Acceptance criteria:
- The project is understandable to a new contributor.
- Setup steps are documented.
- Known limitations are transparently described.

---

## 12. Recommended Development Sequence

1. [ ] Build base mod and telemetry export
2. [ ] Validate bridge and WebSocket communication
3. [ ] Render first dashboard screen in frontend
4. [ ] Add guidance line model and steering logic
5. [ ] Add pass logging and coverage tracking
6. [ ] Add field data persistence
7. [ ] Add machine sync
8. [ ] Add section control and advanced precision features
9. [ ] Run end-to-end validation and tune system behaviour
10. [ ] Release milestone build

---

## 13. Success Definition

The project is considered successfully implemented when:

- the mod exports real-time machine data
- the dashboard and map view display live field state
- the operator can follow a guidance line with stable correction
- pass records are created, stored, and visualized
- coverage and field data support future precision-ag functionality
- the system can be expanded with machine sync and automation features without reworking the architecture

---

## 14. Notes for Future Expansion

Potential future additions after the core system is stable:

- dynamic field zoning
- prescription map support
- advanced turn automation
- variable-rate application profiles
- cloud or remote sync layer
- deeper Operations Center-inspired analytics

These features should only be added after the core guidance and telemetry pipeline is proven stable.
