import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import JSZip from "jszip";

const API = "http://localhost:4000/api";

function App() {
  const [tab, setTab] = useState("cam");
  return (
    <div style={{ 
      fontFamily: "sans-serif", 
      margin: 0,
      padding: 0,
      backgroundColor: "#e0efe0",
      minHeight: "100vh",
      width: "100vw"
    }}>
      <div style={{
        padding: "30px",
        backgroundColor: "#e0efe0"
      }}>
        <h1 style={{ 
          color: "#2c5e2c",
          borderBottom: "2px solid #4a8a4a",
          paddingBottom: "10px"
        }}>ESP32 Kamera & Relais Control</h1>
        <nav style={{ 
          backgroundColor: "#d0e7d0",
          padding: "10px",
          borderRadius: "5px",
          marginBottom: "20px"
        }}>
        {["cam", "relays", "cycles", "playback", "debug", "emergency"].map(t =>
            <button 
              key={t} 
              onClick={() => setTab(t)} 
              style={{ 
                margin: 4,
                padding: "8px 16px",
                backgroundColor: tab === t ? "#4a8a4a" : "#7ab37a",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.3s"
              }}
            >
              {t.toUpperCase()}
            </button>
        )}
      </nav>
        <div style={{ 
          marginTop: 20,
          backgroundColor: "#f0f7f0",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
        {tab === "cam" && <CamTab />}
        {tab === "relays" && <RelaysTab />}
        {tab === "cycles" && <CyclesTab />}
        {tab === "playback" && <PlaybackTab />}
        {tab === "debug" && <DebugTab />}
        {tab === "emergency" && <EmergencyTab />}
        </div>
      </div>
    </div>
  );
}

// --- Cam Tab ---
function CamTab() {
  const [cams, setCams] = useState([]);
  const [selected, setSelected] = useState("");
  const [lastImg, setLastImg] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API}/cameras`).then(res => setCams(res.data));
  }, []);

  useEffect(() => {
    if (!selected) return;
    
    // Load camera history
    axios.get(`${API}/camera/${selected}`)
      .then(res => setHistory(res.data))
      .catch(err => setError("Fehler beim Laden der Historie: " + err.message));

    // Set last image URL with timestamp to prevent caching
    const timestamp = new Date().getTime();
    setLastImg(`${API}/camera/${selected}/last?t=${timestamp}`);
  }, [selected]);

  return (
    <div>
      <h2 style={{ color: "#2c5e2c" }}>Kameras</h2>
      <select 
        value={selected} 
        onChange={e => setSelected(e.target.value)}
        style={{
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ced4da",
          marginBottom: "20px",
          width: "200px"
        }}
      >
        <option value="">Kamera wählen</option>
        {cams.map(c => <option key={c}>{c}</option>)}
      </select>

      {error && (
        <div style={{ 
          color: "#dc3545", 
          padding: "10px", 
          marginBottom: "20px",
          backgroundColor: "#f8d7da",
          borderRadius: "4px"
        }}>
          {error}
        </div>
      )}

      {selected && (
        <div>
          <h3 style={{ color: "#2c5e2c" }}>Letztes Bild</h3>
          <div style={{ 
            border: "1px solid #ced4da", 
            padding: "10px",
            borderRadius: "4px",
            backgroundColor: "white",
            display: "inline-block"
          }}>
            <img 
              src={lastImg} 
              alt="Letztes Bild" 
              width={300} 
              style={{ 
                display: "block",
                maxWidth: "100%",
                height: "auto"
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${API}/camera/${selected}/last?t=${new Date().getTime()}`;
              }}
            />
          </div>

          <h3 style={{ color: "#2c5e2c", marginTop: "20px" }}>Aufnahme-Historie</h3>
          <div style={{ 
            display: "flex", 
            flexWrap: "wrap", 
            gap: "10px",
            marginTop: "10px"
          }}>
            {history.map(f => (
              <div key={f} style={{
                border: "1px solid #ced4da",
                padding: "5px",
                borderRadius: "4px",
                backgroundColor: "white"
              }}>
                <img 
                  src={`${API}/camera/${selected}/${f}`} 
                  alt={f} 
                  width={60} 
                  style={{ 
                    display: "block",
                    maxWidth: "100%",
                    height: "auto"
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `${API}/camera/${selected}/${f}?t=${new Date().getTime()}`;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Relays Tab ---
function RelaysTab() {
  const [relays, setRelays] = useState([]);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ 
    id: "", 
    pin: "", 
    inverted: false, 
    name: "", 
    color: "#cccccc" 
  });

  useEffect(() => { 
    reload();
    // Load relays for action selection
    axios.get(`${API}/relays`).then(res => setRelays(res.data));

    // Set up WebSocket connection
    const ws = new WebSocket('ws://localhost:4001');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'relay_update') {
        setRelays(currentRelays => 
          currentRelays.map(r => 
            r.id === data.relay.id ? data.relay : r
          )
        );
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  function reload() { 
    axios.get(`${API}/relays`).then(res => setRelays(res.data)); 
  }

  function handleSave() {
    axios.post(`${API}/relay`, form).then(reload);
    setEdit(null);
  }

  function handleToggle(id) {
    axios.post(`${API}/relay/${id}/toggle`).then(reload);
  }

  return (
    <div>
      <h2 style={{ color: "#2c5e2c" }}>Relais</h2>
      <table border="1" cellPadding={5} style={{ 
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: "white"
      }}>
        <thead>
          <tr style={{ backgroundColor: "#e0efe0" }}>
            <th>ID</th>
            <th>Name</th>
            <th>Pin</th>
            <th>Status</th>
            <th>Aktion</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
        {relays.map(r => (
            <tr key={r.internalId || r.id}>
            <td>{r.id}</td>
            <td>{r.name}</td>
            <td>{r.pin}</td>
              <td style={{ 
                background: r.status ? "#7ab37a" : "#8b0000",
                transition: "background-color 0.3s ease",
                color: "white",
                fontWeight: "bold"
              }}>
                {r.status ? "An" : "Aus"}
              </td>
              <td>
                <button 
                  onClick={() => handleToggle(r.id)}
                  style={{
                    backgroundColor: r.status ? "#dc3545" : "#28a745",
                    color: "white",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  {r.status ? "Ausschalten" : "Einschalten"}
                </button>
              </td>
              <td>
                <button 
                  onClick={() => { 
                    setEdit(r.internalId || r.id); 
                    setForm(r); 
                  }}
                  style={{
                    backgroundColor: "#4a8a4a",
                    color: "white",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Bearbeiten
                </button>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
      <button 
        onClick={() => { 
          setEdit("neu"); 
          setForm({ 
            id: "", 
            pin: "", 
            inverted: false, 
            name: "", 
            color: "#cccccc" 
          }); 
        }}
        style={{
          backgroundColor: "#4a8a4a",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "4px",
          marginTop: "20px",
          cursor: "pointer"
        }}
      >
        Neues Relais
      </button>
      {edit && (
        <div style={{ 
          margin: 8,
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #dee2e6"
        }}>
          <h3 style={{ color: "#2c5e2c" }}>Relais bearbeiten</h3>
          <input 
            placeholder="ID" 
            value={form.id} 
            onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
            style={{
              padding: "8px",
              margin: "5px 0",
              borderRadius: "4px",
              border: "1px solid #ced4da",
              width: "100%"
            }}
          /><br />
          <input 
            placeholder="Pin" 
            value={form.pin} 
            onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
            style={{
              padding: "8px",
              margin: "5px 0",
              borderRadius: "4px",
              border: "1px solid #ced4da",
              width: "100%"
            }}
          /><br />
          <input 
            placeholder="Name" 
            value={form.name} 
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{
              padding: "8px",
              margin: "5px 0",
              borderRadius: "4px",
              border: "1px solid #ced4da",
              width: "100%"
            }}
          /><br />
          <input 
            type="color" 
            value={form.color} 
            onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            style={{
              margin: "5px 0",
              width: "100%",
              height: "40px"
            }}
          /><br />
          <label style={{ display: "block", margin: "10px 0" }}>
            <input 
              type="checkbox" 
              checked={form.inverted} 
              onChange={e => setForm(f => ({ ...f, inverted: e.target.checked }))}
              style={{ marginRight: "10px" }}
            />
            Inverted
          </label>
          <div style={{ marginTop: "20px" }}>
            <button 
              onClick={handleSave}
              style={{
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                marginRight: "10px",
                cursor: "pointer"
              }}
            >
              Speichern
            </button>
            <button 
              onClick={() => setEdit(null)}
              style={{
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Cycles Tab ---
function CyclesTab() {
  const [cycles, setCycles] = useState([]);
  const [relays, setRelays] = useState([]);
  const [edit, setEdit] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [form, setForm] = useState({
    id: "",
    name: "",
    durationMs: 60000,
    startPoint: 0,
    points: []
  });
  const [newPoint, setNewPoint] = useState({
    timeMs: 0,
    actions: []
  });
  const [newAction, setNewAction] = useState({
    type: "relay",
    relayId: "",
    on: true
  });
  const [displayCycles, setDisplayCycles] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const clockRef = useRef(null);

  // Separate clock update
  useEffect(() => {
    clockRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  // Separate cycle updates
  useEffect(() => {
    // Initial load
    reload();
    axios.get(`${API}/relays`).then(res => setRelays(res.data));

    // Set up regular refresh for display only
    const interval = setInterval(() => {
      if (!isEditing) {
        axios.get(`${API}/cycles`).then(res => {
          setDisplayCycles(res.data);
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isEditing]);

  function reload() {
    axios.get(`${API}/cycles`).then(res => {
      setCycles(res.data);
      setDisplayCycles(res.data);
    });
  }

  function handleSave() {
    axios.post(`${API}/cycle`, form).then(reload);
    setEdit(null);
  }

  function handleAddPoint() {
    setForm(f => ({
      ...f,
      points: [...f.points, { ...newPoint }]
    }));
    setNewPoint({
      timeMs: 0,
      actions: []
    });
  }

  function handleRemovePoint(index) {
    setForm(f => ({
      ...f,
      points: f.points.filter((_, i) => i !== index)
    }));
  }

  function handleAddAction(pointIndex) {
    setForm(f => ({
      ...f,
      points: f.points.map((p, i) => 
        i === pointIndex 
          ? { ...p, actions: [...p.actions, { ...newAction }] }
          : p
      )
    }));
    setNewAction({
      type: "relay",
      relayId: "",
      on: true
    });
  }

  function handleRemoveAction(pointIndex, actionIndex) {
    setForm(f => ({
      ...f,
      points: f.points.map((p, i) => 
        i === pointIndex 
          ? { ...p, actions: p.actions.filter((_, j) => j !== actionIndex) }
          : p
      )
    }));
  }

  function handleCycleAction(id, action) {
    if (action === 'start') {
      axios.post(`${API}/cycle/${id}/start`).then(reload);
    } else if (action === 'stop') {
      axios.post(`${API}/cycle/${id}/stop`).then(reload);
    } else {
      axios.post(`${API}/cycle/${id}/${action}`).then(reload);
    }
  }

  function formatTime(ms) {
    if (ms === null || ms === undefined) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function formatDateTime(date) {
    if (!(date instanceof Date) || isNaN(date)) return "Ungültige Zeit";
    return date.toLocaleString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }

  function getNextActionTime(cycle) {
    if (!cycle.nextAction || !cycle.nextAction.time) return null;
    const nextTime = new Date(cycle.nextAction.time);
    return formatDateTime(nextTime);
  }

  function parseTimeInput(values) {
    const { hours, minutes, seconds, milliseconds } = values;
    return (hours * 60 * 60 * 1000) + 
           (minutes * 60 * 1000) + 
           (seconds * 1000) + 
           (parseInt(milliseconds) || 0);
  }

  function formatTimeInput(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    const milliseconds = ms % 1000;
    return { hours, minutes, seconds, milliseconds };
  }

  const TimeInput = useCallback(function TimeInput({ value, onChange, label }) {
    const timeValue = formatTimeInput(value);
    const [localValues, setLocalValues] = useState(timeValue);
    const [isFocused, setIsFocused] = useState(false);
    const activeInputRef = useRef(null);
    const prevValueRef = useRef(value);

    useEffect(() => {
      if (!isFocused && value !== prevValueRef.current) {
        setLocalValues(timeValue);
        prevValueRef.current = value;
      }
    }, [value, isFocused, timeValue]);

    const handleChange = useCallback((field, newValue) => {
      const newValues = { ...localValues, [field]: parseInt(newValue) || 0 };
      setLocalValues(newValues);
      onChange(parseTimeInput(newValues));
    }, [localValues, onChange]);

    const handleFocus = useCallback((field) => {
      setIsFocused(true);
      activeInputRef.current = field;
    }, []);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      activeInputRef.current = null;
    }, []);

    return (
      <div style={{ margin: "15px 0" }}>
        <label style={{ display: "block", marginBottom: "5px", color: "#2c5e2c" }}>
          {label}:
        </label>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(4, 1fr)", 
          gap: "10px",
          alignItems: "end"
        }}>
          <div>
            <label style={{ 
              display: "block", 
              fontSize: "0.9em", 
              color: "#666",
              marginBottom: "3px" 
            }}>
              Stunden
            </label>
            <input
              type="number"
              min="0"
              value={localValues.hours}
              onChange={e => handleChange('hours', e.target.value)}
              onFocus={() => handleFocus('hours')}
              onBlur={handleBlur}
              style={{
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ced4da",
                width: "100%"
              }}
            />
          </div>
          <div>
            <label style={{ 
              display: "block", 
              fontSize: "0.9em", 
              color: "#666",
              marginBottom: "3px" 
            }}>
              Minuten
            </label>
            <input
              type="number"
              min="0"
              max="59"
              value={localValues.minutes}
              onChange={e => handleChange('minutes', e.target.value)}
              onFocus={() => handleFocus('minutes')}
              onBlur={handleBlur}
              style={{
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ced4da",
                width: "100%"
              }}
            />
          </div>
          <div>
            <label style={{ 
              display: "block", 
              fontSize: "0.9em", 
              color: "#666",
              marginBottom: "3px" 
            }}>
              Sekunden
            </label>
            <input
              type="number"
              min="0"
              max="59"
              value={localValues.seconds}
              onChange={e => handleChange('seconds', e.target.value)}
              onFocus={() => handleFocus('seconds')}
              onBlur={handleBlur}
              style={{
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ced4da",
                width: "100%"
              }}
            />
          </div>
          <div>
            <label style={{ 
              display: "block", 
              fontSize: "0.9em", 
              color: "#666",
              marginBottom: "3px" 
            }}>
              Millisekunden
            </label>
            <input
              type="number"
              min="0"
              max="999"
              value={localValues.milliseconds}
              onChange={e => handleChange('milliseconds', e.target.value)}
              onFocus={() => handleFocus('milliseconds')}
              onBlur={handleBlur}
              style={{
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ced4da",
                width: "100%"
              }}
            />
          </div>
        </div>
      </div>
    );
  }, []);

  function handleDeleteCycle(id) {
    if (window.confirm('Möchten Sie diesen Zyklus wirklich löschen?')) {
      axios.delete(`${API}/cycle/${id}`).then(() => {
        reload();
      });
    }
  }

  return (
    <div>
      <h2 style={{ color: "#2c5e2c" }}>Zyklen</h2>
      <div style={{ 
        background: "#e0efe0", 
        padding: "15px", 
        marginBottom: "20px", 
        borderRadius: "8px",
        fontSize: "1.2em",
        color: "#2c5e2c",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        Aktuelle Zeit: {formatDateTime(currentTime)}
      </div>
      <button 
        onClick={() => {
          setEdit("neu");
          setForm({
            id: Date.now(),
            name: "",
            durationMs: 60000,
            startPoint: 0,
            points: []
          });
        }}
        style={{
          backgroundColor: "#4a8a4a",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "4px",
          cursor: "pointer",
          marginBottom: "20px"
        }}
      >
        Neuer Zyklus
      </button>

      <div style={{ marginTop: 20 }}>
        {displayCycles.map(c => (
          <div key={c.id} style={{ 
            border: "1px solid #4a8a4a", 
            padding: 20, 
            margin: 10,
            borderRadius: "8px",
            backgroundColor: "white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "15px"
            }}>
              <h3 style={{ color: "#2c5e2c", marginTop: 0 }}>{c.name} (ID: {c.id})</h3>
              <button 
                onClick={() => handleDeleteCycle(c.id)}
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginLeft: "10px"
                }}
              >
                Löschen
              </button>
            </div>
            <div style={{ 
              padding: "8px",
              backgroundColor: c.running ? "#e0efe0" : "#f8f9fa",
              borderRadius: "4px",
              marginBottom: "10px"
            }}>
              Status: {
                !c.running ? "Gestoppt" :
                c.paused ? "Pausiert" :
                c.disabled ? "Deaktiviert" :
                "Läuft"
              }
            </div>
            <div style={{ marginBottom: "15px" }}>
              {!c.running ? (
                <button 
                  onClick={() => handleCycleAction(c.id, "start")}
                  style={{
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginRight: "5px"
                  }}
                >
                  Starten
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => handleCycleAction(c.id, "stop")}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginRight: "5px"
                    }}
                  >
                    Stoppen
                  </button>
                  <button 
                    onClick={() => handleCycleAction(c.id, "pause")} 
                    disabled={c.paused}
                    style={{
                      backgroundColor: c.paused ? "#6c757d" : "#ffc107",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: c.paused ? "not-allowed" : "pointer",
                      marginRight: "5px"
                    }}
                  >
                    Pause
                  </button>
                  <button 
                    onClick={() => handleCycleAction(c.id, "resume")} 
                    disabled={!c.paused}
                    style={{
                      backgroundColor: !c.paused ? "#6c757d" : "#28a745",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: !c.paused ? "not-allowed" : "pointer",
                      marginRight: "5px"
                    }}
                  >
                    Fortsetzen
                  </button>
                  <button 
                    onClick={() => handleCycleAction(c.id, "disable")} 
                    disabled={c.disabled}
                    style={{
                      backgroundColor: c.disabled ? "#6c757d" : "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: c.disabled ? "not-allowed" : "pointer",
                      marginRight: "5px"
                    }}
                  >
                    Deaktivieren
                  </button>
                  <button 
                    onClick={() => handleCycleAction(c.id, "enable")} 
                    disabled={!c.disabled}
                    style={{
                      backgroundColor: !c.disabled ? "#6c757d" : "#28a745",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      cursor: !c.disabled ? "not-allowed" : "pointer"
                    }}
                  >
                    Aktivieren
                  </button>
                </>
              )}
            </div>
            {c.running && (
              <div style={{ 
                backgroundColor: "#f8f9fa",
                padding: "15px",
                borderRadius: "4px",
                marginBottom: "15px"
              }}>
                <div style={{ marginBottom: "10px" }}>
                  Zyklus-Dauer: {formatTime(c.durationMs)}
                  {c.startPoint > 0 && (
                    <span style={{ marginLeft: "15px", color: "#666" }}>
                      Startpunkt: {formatTime(c.startPoint)}
                    </span>
                  )}
                </div>
                {c.nextAction && (
                  <div>
                    <div style={{ 
                      color: "#2c5e2c",
                      fontWeight: "bold",
                      marginBottom: "10px"
                    }}>
                      Nächste Aktion: {getNextActionTime(c)}
                    </div>
                    <ul style={{ 
                      listStyle: "none",
                      padding: 0,
                      margin: 0
                    }}>
                      {c.nextAction.point.actions.map((a, i) => (
                        <li key={i} style={{ 
                          padding: "5px 0",
                          borderBottom: "1px solid #e0efe0"
                        }}>
                          {a.type === 'relay' 
                            ? `Relais ${a.relayId}: ${a.on ? 'An' : 'Aus'}`
                            : `Zyklus ${a.cycleId}: ${a.action}`
                          }
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div style={{ marginTop: "15px" }}>
              <h4 style={{ color: "#2c5e2c", marginBottom: "10px" }}>Schritte:</h4>
              <ul style={{ 
                listStyle: "none",
                padding: 0,
                margin: 0
              }}>
                {c.points.map((p, i) => (
                  <li key={i} style={{ 
                    padding: "10px",
                    backgroundColor: "#f8f9fa",
                    marginBottom: "5px",
                    borderRadius: "4px"
                  }}>
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                      Zeit: {formatTime(p.timeMs)}
                    </div>
                    <ul style={{ 
                      listStyle: "none",
                      padding: 0,
                      margin: 0
                    }}>
                      {p.actions.map((a, j) => (
                        <li key={j} style={{ 
                          padding: "5px 0",
                          borderBottom: "1px solid #e0efe0"
                        }}>
                          {a.type === 'relay' 
                            ? `Relais ${a.relayId}: ${a.on ? 'An' : 'Aus'}`
                            : `Zyklus ${a.cycleId}: ${a.action}`
                          }
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
      </ul>
            </div>
            <button 
              onClick={() => { setEdit(c.id); setForm(c); }}
              style={{
                backgroundColor: "#4a8a4a",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "15px"
              }}
            >
              Bearbeiten
            </button>
          </div>
        ))}
      </div>

      {edit && (
        <div style={{ 
          margin: 20, 
          padding: 20, 
          border: "1px solid #4a8a4a",
          borderRadius: "8px",
          backgroundColor: "#f0f7f0"
        }}>
          <h3 style={{ color: "#2c5e2c" }}>Zyklus bearbeiten</h3>
          <input
            placeholder="Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
            style={{
              padding: "8px",
              margin: "5px 0",
              borderRadius: "4px",
              border: "1px solid #ced4da",
              width: "100%"
            }}
          /><br />
          
          <TimeInput
            label="Zyklus-Dauer"
            value={form.durationMs}
            onChange={value => setForm(f => ({ ...f, durationMs: value }))}
          />

          <TimeInput
            label="Startpunkt"
            value={form.startPoint}
            onChange={value => setForm(f => ({ ...f, startPoint: value }))}
          />
          
          <h4 style={{ color: "#2c5e2c", marginTop: "20px" }}>Zeitpunkte</h4>
          <div style={{ margin: 10 }}>
            <TimeInput
              label="Zeitpunkt"
              value={newPoint.timeMs}
              onChange={value => setNewPoint(p => ({ ...p, timeMs: value }))}
            />
            <button 
              onClick={handleAddPoint}
              style={{
                backgroundColor: "#4a8a4a",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "10px"
              }}
            >
              Zeitpunkt hinzufügen
            </button>
          </div>

          <div style={{ margin: 10 }}>
            {form.points.map((p, i) => (
              <div key={i} style={{ margin: 5, padding: 5, border: "1px solid #eee" }}>
                <div>Zeit: {formatTime(p.timeMs)}</div>
                <div>
                  <select
                    value={newAction.type}
                    onChange={e => setNewAction(a => ({ ...a, type: e.target.value }))}
                  >
                    <option value="relay">Relais</option>
                    <option value="cycle">Zyklus</option>
                  </select>
                  {newAction.type === 'relay' ? (
                    <>
                      <select
                        value={newAction.relayId}
                        onChange={e => setNewAction(a => ({ ...a, relayId: e.target.value }))}
                      >
                        <option value="">Relais wählen</option>
                        {relays.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (ID: {r.id})</option>
                        ))}
                      </select>
                      <label>
                        <input
                          type="checkbox"
                          checked={newAction.on}
                          onChange={e => setNewAction(a => ({ ...a, on: e.target.checked }))}
                        />
                        An
                      </label>
                    </>
                  ) : (
                    <>
                      <input
                        placeholder="Zyklus ID"
                        value={newAction.cycleId || ''}
                        onChange={e => setNewAction(a => ({ ...a, cycleId: e.target.value }))}
                      />
                      <select
                        value={newAction.action}
                        onChange={e => setNewAction(a => ({ ...a, action: e.target.value }))}
                      >
                        <option value="pause">Pausieren</option>
                        <option value="resume">Fortsetzen</option>
                        <option value="disable">Deaktivieren</option>
                        <option value="enable">Aktivieren</option>
                      </select>
                    </>
                  )}
                  <button onClick={() => handleAddAction(i)}>Aktion hinzufügen</button>
                </div>
                <div>
                  {p.actions.map((a, j) => (
                    <div key={j}>
                      {a.type === 'relay' 
                        ? `Relais ${a.relayId}: ${a.on ? 'An' : 'Aus'}`
                        : `Zyklus ${a.cycleId}: ${a.action}`
                      }
                      <button onClick={() => handleRemoveAction(i, j)}>Entfernen</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleRemovePoint(i)}>Zeitpunkt entfernen</button>
              </div>
            ))}
          </div>

          <button onClick={handleSave}>Speichern</button>
          <button onClick={() => setEdit(null)}>Abbrechen</button>
        </div>
      )}
    </div>
  );
}

// --- Playback Tab ---
function PlaybackTab() {
  const [cams, setCams] = useState([]);
  const [selected, setSelected] = useState("");
  const [history, setHistory] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filteredImages, setFilteredImages] = useState([]);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    fps: 0,
    frameTime: 0,
    bufferSize: 0,
    memoryUsage: 0,
    loadTimes: [],
    errors: []
  });
  const playbackRef = useRef(null);
  const intervalRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const frameTimeHistoryRef = useRef([]);
  const debugIntervalRef = useRef(null);

  // Debug logging function
  const logDebug = useCallback((message, data = null) => {
    console.log(`[Playback Debug] ${message}`, data || '');
    setDebugInfo(prev => ({
      ...prev,
      errors: [...prev.errors.slice(-9), { timestamp: Date.now(), message, data }]
    }));
  }, []);

  // Performance monitoring
  useEffect(() => {
    if (!isPlaying) {
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
        debugIntervalRef.current = null;
      }
      return;
    }

    debugIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const frameTimes = frameTimeHistoryRef.current;
      const recentFrameTimes = frameTimes.filter(time => time > now - 1000);
      
      const avgFrameTime = recentFrameTimes.length > 0 
        ? recentFrameTimes.reduce((a, b) => a + b, 0) / recentFrameTimes.length 
        : 0;
      
      const fps = recentFrameTimes.length;
      
      setDebugInfo(prev => ({
        ...prev,
        fps,
        frameTime: avgFrameTime,
        bufferSize: filteredImages.length,
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0
      }));

      // Clear old frame times
      frameTimeHistoryRef.current = recentFrameTimes;
    }, 1000);

    return () => {
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
        debugIntervalRef.current = null;
      }
    };
  }, [isPlaying, filteredImages.length]);

  // Image loading performance monitoring
  const measureImageLoad = useCallback((startTime) => {
    const loadTime = performance.now() - startTime;
    setDebugInfo(prev => ({
      ...prev,
      loadTimes: [...prev.loadTimes.slice(-9), loadTime]
    }));
    logDebug(`Image loaded in ${loadTime.toFixed(2)}ms`);
  }, [logDebug]);

  // Helper function to validate timestamp
  const validateTimestamp = useCallback((filename) => {
    try {
      // Extract timestamp from filename (format: timestamp.jpg)
      const timestampStr = filename.split('.')[0];
      if (!timestampStr) {
        logDebug('Empty timestamp in filename', { filename });
        return null;
      }

      const timestamp = parseInt(timestampStr);
      if (isNaN(timestamp)) {
        logDebug('Invalid numeric timestamp', { filename, timestampStr });
        return null;
      }

      // Validate timestamp range
      const now = Date.now();
      // Allow timestamps from 5 years ago to 1 hour in the future
      const minTimestamp = now - (5 * 365 * 24 * 60 * 60 * 1000); // 5 years ago
      const maxTimestamp = now + (60 * 60 * 1000); // 1 hour in future

      if (timestamp > maxTimestamp) {
        logDebug('Timestamp too far in future', { 
          filename, 
          timestamp, 
          maxTimestamp,
          difference: (timestamp - maxTimestamp) / 1000 / 60 + ' minutes'
        });
        return null;
      }
      if (timestamp < minTimestamp) {
        logDebug('Timestamp too old', { 
          filename, 
          timestamp, 
          minTimestamp,
          difference: (minTimestamp - timestamp) / 1000 / 60 / 60 / 24 + ' days'
        });
        return null;
      }

      // Log successful validation
      logDebug('Valid timestamp', { 
        filename, 
        timestamp,
        date: new Date(timestamp).toISOString()
      });

      return timestamp;
    } catch (err) {
      logDebug('Error validating timestamp', { filename, error: err.message });
      return null;
    }
  }, [logDebug]);

  // Add function to format timestamp for display
  const formatTimestamp = useCallback((timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  }, []);

  // Add function to handle file upload
  const handleFileUpload = useCallback(async (file, camera) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('camera', camera);

      const response = await axios.post(`${API}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        logDebug('File uploaded successfully', { filename: response.data.filename });
        // Reload camera history
        const res = await axios.get(`${API}/camera/${camera}`);
        setHistory(res.data);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      logDebug('Error uploading file', { error: err.message });
      setError('Fehler beim Hochladen der Datei: ' + err.message);
    }
  }, [logDebug]);

  useEffect(() => {
    axios.get(`${API}/cameras`).then(res => setCams(res.data));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setError(null);
    setIsLoading(true);
    logDebug(`Loading camera history for ${selected}`);
    
    const startTime = performance.now();
    axios.get(`${API}/camera/${selected}`)
      .then(res => {
        const loadTime = performance.now() - startTime;
        logDebug(`Camera history loaded in ${loadTime.toFixed(2)}ms`, { imageCount: res.data.length });
        
        // Filter and validate filenames
        const validFiles = res.data.filter(filename => {
          const timestamp = validateTimestamp(filename);
          return timestamp !== null;
        });

        if (validFiles.length === 0) {
          logDebug('No valid files found', { totalFiles: res.data.length });
          setError('Keine gültigen Aufnahmen gefunden');
          return;
        }

        if (validFiles.length < res.data.length) {
          logDebug('Some files were invalid', { 
            validFiles: validFiles.length, 
            totalFiles: res.data.length 
          });
        }

        setHistory(validFiles);
        
        // Extract unique days from valid filenames
        const days = [...new Set(validFiles.map(filename => {
          const timestamp = validateTimestamp(filename);
          if (!timestamp) return null;
          
          const date = new Date(timestamp);
          return date.toISOString().split('T')[0];
        }).filter(Boolean))].sort().reverse();
        
        setAvailableDays(days);
        if (days.length > 0) {
          setSelectedDay(days[0]);
        } else {
          setSelectedDay("");
        }
      })
      .catch(err => {
        logDebug('Error loading camera history', { error: err.message });
        setError('Fehler beim Laden der Kamerahistorie: ' + err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selected, logDebug, validateTimestamp]);

  useEffect(() => {
    if (!history.length || !selectedDay) {
      setFilteredImages([]);
      return;
    }

    try {
      const startOfDay = new Date(selectedDay).getTime();
      const endOfDay = startOfDay + (24 * 60 * 60 * 1000);

      const filtered = history.filter(filename => {
        const timestamp = validateTimestamp(filename);
        if (!timestamp) return false;
        return timestamp >= startOfDay && timestamp < endOfDay;
      }).sort((a, b) => {
        const timeA = validateTimestamp(a);
        const timeB = validateTimestamp(b);
        return (timeA || 0) - (timeB || 0);
      });

      if (filtered.length === 0) {
        logDebug('No images found for selected day', { selectedDay });
        setError('Keine Aufnahmen für den ausgewählten Tag gefunden');
      } else {
        logDebug('Filtered images', { 
          count: filtered.length, 
          day: selectedDay 
        });
      }

      setFilteredImages(filtered);
      setCurrentIndex(0);
    } catch (err) {
      logDebug('Error filtering images', { error: err.message });
      setError('Fehler beim Filtern der Bilder: ' + err.message);
    }
  }, [history, selectedDay, validateTimestamp, logDebug]);

  useEffect(() => {
    if (!isPlaying || !filteredImages.length) {
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const targetFPS = 2 * playbackSpeed;
    const frameInterval = 1000 / targetFPS;
    let lastFrameTime = performance.now();

    function animate(currentTime) {
      if (!isPlaying) return;

      const elapsed = currentTime - lastFrameTime;
      frameTimeHistoryRef.current.push(elapsed);
      
      if (elapsed >= frameInterval) {
        setCurrentIndex(prev => {
          if (prev >= filteredImages.length - 1) {
            logDebug('Playback completed, resetting to start');
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
        lastFrameTime = currentTime;
        frameCountRef.current++;
      }

      intervalRef.current = requestAnimationFrame(animate);
    }

    intervalRef.current = requestAnimationFrame(animate);
    logDebug('Playback started', { targetFPS, frameInterval });

    return () => {
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current);
        intervalRef.current = null;
        logDebug('Playback stopped');
      }
    };
  }, [isPlaying, filteredImages, playbackSpeed, logDebug]);

  const handlePlay = () => {
    if (!filteredImages.length) return;
    setIsPlaying(true);
    lastFrameTimeRef.current = performance.now();
    frameCountRef.current = 0;
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
  };

  const handleFullscreen = () => {
    if (!playbackRef.current) return;
    
    if (!isFullscreen) {
      if (playbackRef.current.requestFullscreen) {
        playbackRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = async () => {
    if (!filteredImages.length) return;
    
    try {
      setIsLoading(true);
      const zip = new JSZip();
      
      await Promise.all(filteredImages.map(filename => 
        axios.get(`${API}/camera/${selected}/${filename}`, { responseType: 'blob' })
          .then(res => {
            zip.file(filename, res.data);
          })
      ));

      const content = await zip.generateAsync({type: "blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `camera_${selected}_${selectedDay}.zip`;
      link.click();
    } catch (err) {
      console.error('Error downloading images:', err);
      setError('Fehler beim Herunterladen der Bilder: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      console.error('Error formatting date:', dateString, err);
      return dateString;
    }
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(parseInt(timestamp));
      return date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (err) {
      return 'Ungültige Zeit';
    }
  };

  return (
    <div>
      <h2 style={{ color: "#2c5e2c" }}>Aufnahme-Wiedergabe</h2>
      
      {/* Debug Panel */}
      <div style={{ 
        marginBottom: "20px",
        padding: "10px",
        backgroundColor: "#f8f9fa",
        borderRadius: "4px",
        border: "1px solid #dee2e6"
      }}>
        <h3 style={{ color: "#2c5e2c", marginTop: 0 }}>Debug Information</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          <div>
            <strong>Performance:</strong>
            <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
              <li>FPS: {debugInfo.fps.toFixed(1)}</li>
              <li>Frame Time: {debugInfo.frameTime.toFixed(2)}ms</li>
              <li>Buffer Size: {debugInfo.bufferSize}</li>
              <li>Memory Usage: {debugInfo.memoryUsage.toFixed(2)}MB</li>
              <li>Valid Files: {history.length}</li>
              <li>Filtered Files: {filteredImages.length}</li>
              <li>Current Time: {new Date().toLocaleString('de-DE')}</li>
            </ul>
          </div>
          <div>
            <strong>Recent Errors:</strong>
            <ul style={{ margin: "5px 0", paddingLeft: "20px", maxHeight: "100px", overflowY: "auto" }}>
              {debugInfo.errors.map((error, i) => (
                <li key={i} style={{ 
                  color: error.message.includes('Error') ? "#dc3545" : 
                         error.message.includes('Valid') ? "#28a745" : "#6c757d", 
                  fontSize: "0.9em" 
                }}>
                  {new Date(error.timestamp).toLocaleTimeString()}: {error.message}
                  {error.data && (
                    <pre style={{ 
                      margin: "2px 0", 
                      fontSize: "0.8em", 
                      color: "#666" 
                    }}>
                      {JSON.stringify(error.data, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Existing error display */}
      {error && (
        <div style={{ 
          color: "#dc3545", 
          padding: "10px", 
          marginBottom: "20px",
          backgroundColor: "#f8d7da",
          borderRadius: "4px"
        }}>
          {error}
        </div>
      )}
      
      <div style={{ marginBottom: "20px" }}>
        <select 
          value={selected} 
          onChange={e => setSelected(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ced4da",
            marginRight: "10px",
            width: "200px"
          }}
        >
          <option value="">Kamera wählen</option>
          {cams.map(c => <option key={c}>{c}</option>)}
        </select>

        {availableDays.length > 0 && (
          <select
            value={selectedDay}
            onChange={e => setSelectedDay(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ced4da",
              marginRight: "10px",
              width: "300px"
            }}
          >
            {availableDays.map(day => (
              <option key={day} value={day}>
                {formatDate(day)}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading && (
        <div style={{ 
          textAlign: "center", 
          padding: "20px",
          color: "#2c5e2c"
        }}>
          Lade...
        </div>
      )}

      {filteredImages.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div 
            ref={playbackRef}
            style={{ 
              border: "1px solid #ced4da",
              padding: "10px",
              borderRadius: "4px",
              backgroundColor: "white",
              display: "inline-block",
              marginBottom: "10px",
              position: "relative",
              width: isFullscreen ? "100vw" : "auto",
              height: isFullscreen ? "100vh" : "auto"
            }}
          >
            <img 
              src={`${API}/camera/${selected}/${filteredImages[currentIndex]}`}
              alt={`Frame ${currentIndex + 1}`}
              style={{ 
                maxWidth: "100%", 
                height: "auto",
                display: "block"
              }}
              onError={(e) => {
                console.error('Error loading image:', filteredImages[currentIndex]);
                setError('Fehler beim Laden des Bildes');
              }}
            />
            <div style={{
              position: "absolute",
              bottom: "20px",
              left: "20px",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              color: "white",
              padding: "10px",
              borderRadius: "4px",
              fontSize: "1.2em"
            }}>
              {formatTime(filteredImages[currentIndex].replace('.jpg', ''))}
            </div>
          </div>

          <div style={{ marginTop: "10px" }}>
            <div style={{ marginBottom: "10px" }}>
              Frame {currentIndex + 1} von {filteredImages.length}
            </div>

            <div style={{ marginBottom: "10px" }}>
              <button
                onClick={handlePlay}
                disabled={isPlaying || isLoading}
                style={{
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: isPlaying || isLoading ? "not-allowed" : "pointer",
                  marginRight: "5px",
                  opacity: isPlaying || isLoading ? 0.5 : 1
                }}
              >
                Abspielen
              </button>
              <button
                onClick={handlePause}
                disabled={!isPlaying || isLoading}
                style={{
                  backgroundColor: "#ffc107",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: !isPlaying || isLoading ? "not-allowed" : "pointer",
                  marginRight: "5px",
                  opacity: !isPlaying || isLoading ? 0.5 : 1
                }}
              >
                Pause
              </button>
              <button
                onClick={handleStop}
                disabled={isLoading}
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  marginRight: "5px",
                  opacity: isLoading ? 0.5 : 1
                }}
              >
                Stopp
              </button>
              <button
                onClick={handleFullscreen}
                disabled={isLoading}
                style={{
                  backgroundColor: "#4a8a4a",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  marginRight: "5px",
                  opacity: isLoading ? 0.5 : 1
                }}
              >
                {isFullscreen ? "Vollbild beenden" : "Vollbild"}
              </button>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ marginRight: "10px" }}>Geschwindigkeit:</label>
              <select
                value={playbackSpeed}
                onChange={e => handleSpeedChange(Number(e.target.value))}
                disabled={isLoading}
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  opacity: isLoading ? 0.5 : 1
                }}
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
                <option value={8}>8x</option>
                <option value={16}>16x</option>
                <option value={32}>32x</option>
              </select>
            </div>

            <button
              onClick={handleDownload}
              disabled={isLoading}
              style={{
                backgroundColor: "#4a8a4a",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.5 : 1
              }}
            >
              Aufnahmen herunterladen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Debug Tab ---
function DebugTab() {
  const [debug, setDebug] = useState({});
  useEffect(() => { axios.get(`${API}/debug`).then(res => setDebug(res.data)); }, []);
  return (
    <div>
      <h2>Debug</h2>
      <pre style={{ background: "#eee", padding: 10 }}>{JSON.stringify(debug, null, 2)}</pre>
    </div>
  );
}

// --- Emergency Tab ---
function EmergencyTab() {
  function handleEmergency() {
    axios.post(`${API}/emergency-off`);
    alert("Alle Relais ausgeschaltet!");
  }
  return (
    <div>
      <h2 style={{ color: "#2c5e2c" }}>Notfall</h2>
      <button 
        onClick={handleEmergency} 
        style={{ 
          background: "#dc3545", 
          color: "white", 
          fontSize: 20,
          padding: "20px 40px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          transition: "transform 0.2s",
          ":hover": {
            transform: "scale(1.05)"
          }
        }}
      >
        ALLE RELAIS AUS!
      </button>
    </div>
  );
}

export default App;
