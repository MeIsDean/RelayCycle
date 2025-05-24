const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const WebSocket = require('ws');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// Create WebSocket server
const wss = new WebSocket.Server({ port: 4001 });

// Broadcast function for WebSocket
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const CAMERA_DIR = path.join(__dirname, "camera_uploads");
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(CAMERA_DIR)) fs.mkdirSync(CAMERA_DIR);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// File paths for configurations
const RELAYS_FILE = path.join(DATA_DIR, "relays.json");
const CYCLES_FILE = path.join(DATA_DIR, "cycles.json");
const STATES_FILE = path.join(DATA_DIR, "states.json");

// Load saved data
let relays = [];
let cycles = [];
let runningCycles = {};

function loadData() {
    try {
        if (fs.existsSync(RELAYS_FILE)) {
            relays = JSON.parse(fs.readFileSync(RELAYS_FILE, 'utf8'));
        }
        if (fs.existsSync(CYCLES_FILE)) {
            cycles = JSON.parse(fs.readFileSync(CYCLES_FILE, 'utf8'));
        }
        if (fs.existsSync(STATES_FILE)) {
            const states = JSON.parse(fs.readFileSync(STATES_FILE, 'utf8'));
            // Restore running cycles
            Object.entries(states).forEach(([cycleId, state]) => {
                const cycle = cycles.find(c => c.id == cycleId);
                if (cycle) {
                    runningCycles[cycleId] = {
                        ...state,
                        timer: null,
                        nextAction: null
                    };
                    startCycle(cycle, true);
                }
            });
        }
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

function saveData() {
    try {
        // Save relays
        fs.writeFileSync(RELAYS_FILE, JSON.stringify(relays, null, 2));
        
        // Save cycles
        fs.writeFileSync(CYCLES_FILE, JSON.stringify(cycles, null, 2));
        
        // Save states (without timer and nextAction)
        const states = Object.entries(runningCycles).reduce((acc, [cycleId, state]) => {
            acc[cycleId] = {
                startTime: state.startTime,
                paused: state.paused,
                disabled: state.disabled
            };
            return acc;
        }, {});
        fs.writeFileSync(STATES_FILE, JSON.stringify(states, null, 2));
    } catch (error) {
        console.error("Error saving data:", error);
    }
}

// Load data on startup
loadData();

// Save data periodically
setInterval(saveData, 5000);

// Add internal relay tracking
let relayCounter = 0;
let relayMap = new Map(); // Maps internal IDs to relay objects

// ---------- Kamera ----------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const cam = req.body.camera;
        if (!cam) {
            console.error('No camera name provided in upload request');
            return cb(new Error('Camera name is required'));
        }
        const camPath = path.join(CAMERA_DIR, cam);
        if (!fs.existsSync(camPath)) {
            console.log(`Creating camera directory: ${camPath}`);
            fs.mkdirSync(camPath, {recursive: true});
        }
        console.log(`Saving to camera directory: ${camPath}`);
        cb(null, camPath);
    },
    filename: (req, file, cb) => {
        // Ensure filename is a timestamp
        const timestamp = Date.now();
        console.log(`Generating filename with timestamp: ${timestamp}`);
        cb(null, `${timestamp}.jpg`);
    }
});

// Add file cleanup function
function cleanupInvalidFiles() {
    try {
        const cams = fs.readdirSync(CAMERA_DIR);
        cams.forEach(cam => {
            const camPath = path.join(CAMERA_DIR, cam);
            if (fs.statSync(camPath).isDirectory()) {
                const files = fs.readdirSync(camPath);
                files.forEach(file => {
                    // Check if filename is a valid timestamp
                    const timestamp = parseInt(file.replace(/[^0-9]/g, ''));
                    if (isNaN(timestamp)) {
                        const filePath = path.join(camPath, file);
                        console.log(`Removing invalid file: ${filePath}`);
                        fs.unlinkSync(filePath);
                    }
                });
            }
        });
    } catch (error) {
        console.error("Error cleaning up files:", error);
    }
}

// Run cleanup on startup
cleanupInvalidFiles();

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        // Only accept jpg files
        if (file.mimetype === 'image/jpeg') {
            cb(null, true);
        } else {
            cb(new Error('Only JPG files are allowed'));
        }
    }
});

app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({error: "No file uploaded"});
    }
    if (!req.body.camera) {
        return res.status(400).json({error: "Camera name is required"});
    }
    console.log(`File uploaded successfully: ${req.file.filename} to camera: ${req.body.camera}`);
    res.json({success: true, filename: req.file.filename});
});

app.get("/api/cameras", (req, res) => {
    const cams = fs.readdirSync(CAMERA_DIR);
    res.json(cams);
});

app.get("/api/camera/:cam", (req, res) => {
    const dir = path.join(CAMERA_DIR, req.params.cam);
    if (!fs.existsSync(dir)) return res.status(404).json({error: "Not found"});
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".jpg")).sort().reverse();
    res.json(files);
});

app.get("/api/camera/:cam/last", (req, res) => {
    const dir = path.join(CAMERA_DIR, req.params.cam);
    if (!fs.existsSync(dir)) return res.status(404).json({error: "Not found"});
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".jpg")).sort().reverse();
    if (files.length === 0) return res.status(404).json({error: "No image"});
    res.sendFile(path.join(dir, files[0]));
});

app.get("/api/camera/:cam/:file", (req, res) => {
    const file = path.join(CAMERA_DIR, req.params.cam, req.params.file);
    if (!fs.existsSync(file)) return res.status(404).json({error: "Not found"});
    res.sendFile(file);
});

// ---------- Relais ----------
app.get("/api/relays", (req, res) => res.json(relays));

app.post("/api/relay", (req, res) => {
    const {id, pin, inverted, name, color} = req.body;
    const relay = relays.find(r => r.id == id);
    if (relay) {
        Object.assign(relay, {pin, inverted, name, color});
    } else {
        const internalId = ++relayCounter;
        const newRelay = {
            internalId,
            id,
            pin,
            inverted,
            name,
            color,
            status: false
        };
        relays.push(newRelay);
        relayMap.set(internalId, newRelay);
    }
    saveData();
    res.json({success: true});
});

app.post("/api/relay/:id/toggle", (req, res) => {
    const relay = relays.find(r => r.id == req.params.id);
    if (!relay) return res.status(404).json({error: "Not found"});
    relay.status = !relay.status;
    saveData();
    res.json(relay);
});

app.post("/api/relay/:id/set", (req, res) => {
    const relay = relays.find(r => r.id == req.params.id);
    if (!relay) return res.status(404).json({error: "Not found"});
    relay.status = !!req.body.status;
    saveData();
    res.json(relay);
});

// ---------- Notfall ----------
app.post("/api/emergency-off", (req, res) => {
    relays.forEach(r => r.status = false);
    Object.values(runningCycles).forEach(state => {
        if (state.timer) clearTimeout(state.timer);
    });
    runningCycles = {};
    saveData();
    res.json({success: true});
});

// ---------- Zyklen ----------
function setRelayStatus(relayId, on) {
    const relay = relays.find(r => r.id == relayId);
    if (relay) relay.status = !!on;
}

function stopCycle(cycleId) {
    const state = runningCycles[cycleId];
    if (state) {
        if (state.timer) clearTimeout(state.timer);
        // Turn off all relays controlled by this cycle
        const cycle = cycles.find(c => c.id == cycleId);
        if (cycle) {
            cycle.points.forEach(p => {
                p.actions.filter(a => a.type === 'relay')
                    .forEach(a => setRelayStatus(a.relayId, false));
            });
        }
        delete runningCycles[cycleId];
    }
}

function executeAction(action) {
    console.log("Executing action:", action);
    if (action.type === 'relay') {
        const relay = relays.find(r => r.id == action.relayId);
        if (relay) {
            relay.status = !!action.on;
            console.log(`Set relay ${relay.id} to ${relay.status}`);
            // Broadcast relay status change
            broadcast({
                type: 'relay_update',
                relay: relay
            });
        }
    } else if (action.type === 'cycle') {
        const targetCycle = cycles.find(c => c.id === action.cycleId);
        if (targetCycle) {
            const state = runningCycles[action.cycleId];
            if (state) {
                if (action.action === 'pause') {
                    state.paused = true;
                    // Turn off all relays controlled by this cycle
                    targetCycle.points.forEach(p => {
                        p.actions.filter(a => a.type === 'relay')
                            .forEach(a => {
                                const relay = relays.find(r => r.id == a.relayId);
                                if (relay) {
                                    relay.status = false;
                                    // Broadcast relay status change
                                    broadcast({
                                        type: 'relay_update',
                                        relay: relay
                                    });
                                }
                            });
                    });
                } else if (action.action === 'disable') {
                    state.disabled = true;
                    // Turn off all relays controlled by this cycle
                    targetCycle.points.forEach(p => {
                        p.actions.filter(a => a.type === 'relay')
                            .forEach(a => {
                                const relay = relays.find(r => r.id == a.relayId);
                                if (relay) {
                                    relay.status = false;
                                    // Broadcast relay status change
                                    broadcast({
                                        type: 'relay_update',
                                        relay: relay
                                    });
                                }
                            });
                    });
                } else if (action.action === 'enable') {
                    state.disabled = false;
                }
            }
        }
    }
}

function startCycle(cycle, restart = false) {
    if (runningCycles[cycle.id] && !restart) return;
    if (runningCycles[cycle.id]) stopCycle(cycle.id);

    let state = {
        startTime: Date.now(),
        paused: false,
        disabled: false,
        timer: null,
        nextAction: null
    };
    runningCycles[cycle.id] = state;

    function scheduleNextAction() {
        if (!runningCycles[cycle.id]) return;
        if (state.paused || state.disabled) {
            state.timer = setTimeout(scheduleNextAction, 1000);
            return;
        }

        const now = Date.now();
        const cycleTime = (now - state.startTime) % cycle.durationMs;
                // Find next action, considering the start point
        const nextPoint = cycle.points.find(p => p.timeMs > (cycleTime + cycle.startPoint) % cycle.durationMs);
        if (nextPoint) {
            const nextActionTime = state.startTime + Math.floor((now - state.startTime) / cycle.durationMs) * cycle.durationMs + 
                                 ((nextPoint.timeMs - cycle.startPoint + cycle.durationMs) % cycle.durationMs);
            state.nextAction = {
                time: nextActionTime,
                point: nextPoint
            };
            const delay = nextActionTime - now;
            state.timer = setTimeout(() => {
                if (runningCycles[cycle.id] && !state.paused && !state.disabled) {
                    console.log(`Executing actions at time ${cycleTime}ms`); // Debug log
                    nextPoint.actions.forEach(executeAction);
                }
                scheduleNextAction();
            }, delay);
        } else {
            // Schedule first action of next cycle
            if (cycle.points.length > 0) {
                const nextActionTime = state.startTime + Math.floor((now - state.startTime) / cycle.durationMs + 1) * cycle.durationMs;
                state.nextAction = {
                    time: nextActionTime,
                    point: cycle.points[0]
                };
                const delay = nextActionTime - now;
                state.timer = setTimeout(() => {
                    if (runningCycles[cycle.id] && !state.paused && !state.disabled) {
                        console.log(`Executing actions at cycle end`); // Debug log
                        cycle.points[0].actions.forEach(executeAction);
                    }
                    scheduleNextAction();
                }, delay);
            }
        }
    }

    // Execute any actions that should happen at the start point
    if (cycle.points.length > 0) {
        const initialPoint = cycle.points.find(p => p.timeMs === cycle.startPoint);
        if (initialPoint) {
            console.log("Executing initial actions at start point"); // Debug log
            initialPoint.actions.forEach(executeAction);
        }
    }

    scheduleNextAction();
}

app.get("/api/cycles", (req, res) => {
    const now = Date.now();
    res.json(cycles.map(cycle => {
        const state = runningCycles[cycle.id];
        if (!state) return {
            ...cycle,
            running: false,
            paused: false,
            disabled: false,
            currentTime: 0,
            nextAction: null
        };

        const cycleTime = (now - state.startTime) % cycle.durationMs;
        const nextActionTime = state.nextAction ? state.nextAction.time : null;

        return {
            ...cycle,
            running: true,
            paused: state.paused,
            disabled: state.disabled,
            currentTime: cycleTime,
            nextAction: state.nextAction ? {
                ...state.nextAction,
                time: nextActionTime
            } : null
        };
    }));
});

app.post("/api/cycle", (req, res) => {
    const cycle = req.body;
    const existing = cycles.find(c => c.id == cycle.id);
    if (existing) Object.assign(existing, cycle);
    else cycles.push(cycle);
    startCycle(cycle, true);
    saveData();
    res.json({success: true});
});

// Add new endpoints for cycle control
app.post("/api/cycle/:id/start", (req, res) => {
    const cycle = cycles.find(c => c.id == req.params.id);
    if (!cycle) return res.status(404).json({error: "Not found"});
    startCycle(cycle, true);
    saveData();
    res.json({success: true});
});

app.post("/api/cycle/:id/stop", (req, res) => {
    stopCycle(req.params.id);
    saveData();
    res.json({success: true});
});

app.post("/api/cycle/:id/pause", (req, res) => {
    const state = runningCycles[req.params.id];
    if (!state) return res.status(404).json({error: "Not found"});
    state.paused = true;
    // Turn off all relays controlled by this cycle
    const cycle = cycles.find(c => c.id == req.params.id);
    if (cycle) {
        cycle.points.forEach(p => {
            p.actions.filter(a => a.type === 'relay')
                .forEach(a => setRelayStatus(a.relayId, false));
        });
    }
    saveData();
    res.json({success: true});
});

app.post("/api/cycle/:id/resume", (req, res) => {
    const state = runningCycles[req.params.id];
    if (!state) return res.status(404).json({error: "Not found"});
    state.paused = false;
    // Restart the cycle to reschedule actions
    const cycle = cycles.find(c => c.id == req.params.id);
    if (cycle) {
        startCycle(cycle, true);
    }
    saveData();
    res.json({success: true});
});

app.post("/api/cycle/:id/disable", (req, res) => {
    const state = runningCycles[req.params.id];
    if (!state) return res.status(404).json({error: "Not found"});
    state.disabled = true;
    // Turn off all relays controlled by this cycle
    const cycle = cycles.find(c => c.id == req.params.id);
    if (cycle) {
        cycle.points.forEach(p => {
            p.actions.filter(a => a.type === 'relay')
                .forEach(a => setRelayStatus(a.relayId, false));
        });
    }
    saveData();
    res.json({success: true});
});

app.post("/api/cycle/:id/enable", (req, res) => {
    const state = runningCycles[req.params.id];
    if (!state) return res.status(404).json({error: "Not found"});
    state.disabled = false;
    // Restart the cycle to reschedule actions
    const cycle = cycles.find(c => c.id == req.params.id);
    if (cycle) {
        startCycle(cycle, true);
    }
    saveData();
    res.json({success: true});
});

// Add new endpoint for cycle deletion
app.delete("/api/cycle/:id", (req, res) => {
    const cycleId = req.params.id;
    const index = cycles.findIndex(c => c.id == cycleId);
    if (index === -1) return res.status(404).json({error: "Not found"});
    
    // Stop the cycle if it's running
    stopCycle(cycleId);
    
    // Remove from cycles array
    cycles.splice(index, 1);
    saveData();
    res.json({success: true});
});

// ---------- Debug ----------
// --- Debug Tab ---
app.get("/api/debug", (req, res) => {
    // Zirkuläre Referenzen (wie timer) entfernen:
    const cleanRunningCycles = {};
    for (const [id, state] of Object.entries(runningCycles)) {
        // Entferne "timer" und alle nicht-JSON-Elemente
        const { timer, ...rest } = state;
        // nextAction evtl. auch bereinigen, falls dort später komplexe Objekte auftauchen!
        cleanRunningCycles[id] = { ...rest };
    }

    res.json({
        relays,
        cycles,
        runningCycles: cleanRunningCycles,
        timestamp: Date.now()
    });
});


app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
