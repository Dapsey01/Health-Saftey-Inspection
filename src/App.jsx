import React, { useMemo, useState } from "react";

const STATUS_OPTIONS = ["OK", "Issue"];
const ACTION_OPTIONS = ["No Action", "Call Made", "HOTSOS Logged"];
const ISSUE_OPTIONS = {
  "Hand Sink": ["Needs Cleaning", "Needs Soap", "Needs Paper Towels", "No Hot Water"],
  "Ice Machine": ["Not working", "Needs Cleaning"],
  "Reach-in Fridge": ["Temp Too Low", "Temp Too High"],
  "Walk-in Cooler": ["Temp Too Low", "Temp Too High"],
};

const STRUCTURE = [
  { floor: "1st Floor", building: "Main", areas: [
    { name: "Pantry 1A", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
    { name: "Pantry 1B", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
    { name: "Main Walk-in", items: ["Walk-in Cooler"] },
    { name: "Specialty Cooler", items: ["Walk-in Cooler"] },
  ]},
  { floor: "2nd Floor", building: "Main", areas: [
    { name: "Pantry 2A", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
    { name: "Pantry 2B", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
    { name: "201 Pantry", items: ["Hand Sink", "Reach-in Fridge"] },
    { name: "204 Pantry", items: ["Hand Sink", "Reach-in Fridge"] },
    { name: "205 Ice Machine", items: ["Ice Machine"] },
  ]},
  { floor: "3rd Floor", building: "Main", areas: [
    { name: "Pantry 3A", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
    { name: "Pantry 3B", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
  ]},
  { floor: "Marquee", building: "Main", areas: [
    { name: "Marquee", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
  ]},
  { floor: "Signature Tower", building: "Separate", areas: [
    { name: "Signature Tower", items: ["Hand Sink", "Reach-in Fridge", "Walk-in Cooler"] },
  ]},
  { floor: "G.G.A. Kitchen", building: "Separate", areas: [
    { name: "G.G.A. Kitchen", items: ["Hand Sink", "Reach-in Fridge", "Walk-in Cooler"] },
  ]},
];

function isTempItem(item) { return item === "Reach-in Fridge" || item === "Walk-in Cooler"; }
function tempValues() { return Array.from({ length: 61 }, (_, i) => i - 10); }

function buildInitialState() {
  const state = { inspector: "", date: "", time: "", areas: {} };
  STRUCTURE.forEach((group) => {
    group.areas.forEach((area) => {
      state.areas[area.name] = { notes: "", photos: [], items: {} };
      area.items.forEach((item) => {
        state.areas[area.name].items[item] = {
          status: "", issue: "", temperature: "", engineerAction: "", hotsos: ""
        };
      });
    });
  });
  return state;
}

export default function App() {
  const [form, setForm] = useState(buildInitialState);
  const [openAreas, setOpenAreas] = useState({});

  const setTopField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const setItemField = (area, item, field, value) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      next.areas[area].items[item][field] = value;
      if (field === "status" && value !== "Issue") {
        next.areas[area].items[item].issue = "";
        next.areas[area].items[item].engineerAction = "";
        next.areas[area].items[item].hotsos = "";
      }
      if (field === "engineerAction" && value !== "HOTSOS Logged") {
        next.areas[area].items[item].hotsos = "";
      }
      return next;
    });
  };

  const setAreaNotes = (area, value) => setForm((prev) => ({
    ...prev, areas: { ...prev.areas, [area]: { ...prev.areas[area], notes: value } }
  }));

  const addPhotos = (area, files) => {
    if (!files || !files.length) return;
    const readers = Array.from(files).map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then((images) => {
      setForm((prev) => ({
        ...prev,
        areas: { ...prev.areas, [area]: { ...prev.areas[area], photos: [...prev.areas[area].photos, ...images] } }
      }));
    });
  };

  const removePhoto = (area, index) => {
    setForm((prev) => {
      const photos = [...prev.areas[area].photos];
      photos.splice(index, 1);
      return { ...prev, areas: { ...prev.areas, [area]: { ...prev.areas[area], photos } } };
    });
  };

  const floorSummary = useMemo(() => STRUCTURE.map((group) => {
    let issues = 0;
    group.areas.forEach((area) => Object.values(form.areas[area.name].items).forEach((item) => { if (item.status === "Issue") issues += 1; }));
    return { floor: group.floor, issues };
  }), [form]);

  const emailReport = useMemo(() => {
    const lines = [];
    lines.push("CONFERENCE CENTER HEALTH & SAFETY WALK REPORT", "");
    lines.push(`Inspector: ${form.inspector}`);
    lines.push(`Date: ${form.date}`);
    lines.push(`Time: ${form.time}`, "", "FLOOR SUMMARY");
    floorSummary.forEach((f) => lines.push(`- ${f.floor}: ${f.issues === 0 ? "Clear" : `${f.issues} issue(s)`}`));
    lines.push("", "AREAS REQUIRING ATTENTION");
    let found = false;
    STRUCTURE.forEach((group) => group.areas.forEach((area) => Object.entries(form.areas[area.name].items).forEach(([itemName, item]) => {
      if (item.status === "Issue") {
        found = true;
        const bits = [area.name, itemName];
        if (item.issue) bits.push(item.issue);
        if (item.temperature) bits.push(`${item.temperature}°F`);
        if (item.engineerAction && item.engineerAction !== "No Action") bits.push(item.engineerAction);
        if (item.hotsos) bits.push(`HOTSOS #${item.hotsos}`);
        lines.push(`- ${bits.join(" — ")}`);
      }
    })));
    if (!found) lines.push("- No issues noted");
    lines.push("", "TEMPERATURE LOG");
    STRUCTURE.forEach((group) => group.areas.forEach((area) => Object.entries(form.areas[area.name].items).forEach(([itemName, item]) => {
      if (isTempItem(itemName) && item.temperature) lines.push(`- ${area.name} — ${itemName} — ${item.temperature}°F`);
    })));
    lines.push("", "NOTES");
    STRUCTURE.forEach((group) => group.areas.forEach((area) => {
      if (form.areas[area.name].notes.trim()) lines.push(`- ${area.name}: ${form.areas[area.name].notes.trim()}`);
    }));
    return lines.join("\\n");
  }, [form, floorSummary]);

  const copyReport = async () => {
    try { await navigator.clipboard.writeText(emailReport); alert("Report copied."); }
    catch { alert("Could not copy the report on this browser."); }
  };

  return (
    <div className="app-shell">
      <div className="app-card">
        <div className="top-header">Conference Center Health & Safety Walk</div>
        <div className="top-fields">
          <input placeholder="Inspector" value={form.inspector} onChange={(e) => setTopField("inspector", e.target.value)} />
          <input type="date" value={form.date} onChange={(e) => setTopField("date", e.target.value)} />
          <input type="time" value={form.time} onChange={(e) => setTopField("time", e.target.value)} />
        </div>
      </div>

      <div className="app-card">
        <div className="summary-title">Floor Summary</div>
        <div className="summary-grid">
          {floorSummary.map((f) => (
            <div key={f.floor} className="summary-row">
              <span>{f.floor}</span>
              <span className={f.issues === 0 ? "badge clear" : "badge issue"}>
                {f.issues === 0 ? "Clear" : `${f.issues} Issues`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {STRUCTURE.map((group) => (
        <div key={group.floor} className="floor-block">
          <div className={group.building === "Separate" ? "floor-header separate" : "floor-header main"}>{group.floor}</div>
          {group.areas.map((area) => (
            <div key={area.name} className="area-wrap">
              <button type="button" className="area-button" onClick={() => setOpenAreas((prev) => ({ ...prev, [area.name]: !prev[area.name] }))}>
                <span>{area.name}</span><span>{openAreas[area.name] ? "▲" : "▼"}</span>
              </button>
              {openAreas[area.name] && (
                <div className="area-body">
                  {area.items.map((item) => {
                    const data = form.areas[area.name].items[item];
                    const issueMode = data.status === "Issue";
                    return (
                      <div key={item} className="item-card">
                        <div className="item-title">{item}</div>
                        <div className="controls-grid">
                          <select value={data.status} onChange={(e) => setItemField(area.name, item, "status", e.target.value)}>
                            <option value="">Status</option>
                            {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>

                          {isTempItem(item) ? (
                            <select value={data.temperature} onChange={(e) => setItemField(area.name, item, "temperature", e.target.value)}>
                              <option value="">Temp °F</option>
                              {tempValues().map((t) => <option key={t} value={t}>{t}°F</option>)}
                            </select>
                          ) : (
                            <select value={data.issue} disabled={!issueMode} onChange={(e) => setItemField(area.name, item, "issue", e.target.value)}>
                              <option value="">Issue</option>
                              {(ISSUE_OPTIONS[item] || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )}

                          {isTempItem(item) ? (
                            <select value={data.issue} disabled={!issueMode} onChange={(e) => setItemField(area.name, item, "issue", e.target.value)}>
                              <option value="">Issue</option>
                              {(ISSUE_OPTIONS[item] || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <select value={data.engineerAction} disabled={!issueMode} onChange={(e) => setItemField(area.name, item, "engineerAction", e.target.value)}>
                              <option value="">Engineer Action</option>
                              {ACTION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )}

                          {isTempItem(item) ? (
                            <select value={data.engineerAction} disabled={!issueMode} onChange={(e) => setItemField(area.name, item, "engineerAction", e.target.value)}>
                              <option value="">Engineer Action</option>
                              {ACTION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <input className="full-row" placeholder="HOTSOS #" disabled={!issueMode || data.engineerAction !== "HOTSOS Logged"} value={data.hotsos} onChange={(e) => setItemField(area.name, item, "hotsos", e.target.value)} />
                          )}

                          {isTempItem(item) && (
                            <input className="full-row" placeholder="HOTSOS #" disabled={!issueMode || data.engineerAction !== "HOTSOS Logged"} value={data.hotsos} onChange={(e) => setItemField(area.name, item, "hotsos", e.target.value)} />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="photos-block">
                    <div className="small-label">Photos</div>
                    <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => addPhotos(area.name, e.target.files)} />
                    <div className="photos-preview">
                      {form.areas[area.name].photos.map((photo, i) => (
                        <div key={i} className="thumb-wrap">
                          <img src={photo} alt="" />
                          <button type="button" className="remove-photo" onClick={() => removePhoto(area.name, i)}>X</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <textarea placeholder="Notes" value={form.areas[area.name].notes} onChange={(e) => setAreaNotes(area.name, e.target.value)} />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="app-card">
        <div className="summary-title">Email Report Preview</div>
        <textarea className="report-box" value={emailReport} readOnly />
        <button type="button" className="copy-button" onClick={copyReport}>Copy Report</button>
      </div>
    </div>
  );
}