// CLEAN VERSION - NO HANDOFF / IMPORT FEATURES

import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "cc_walk_form";
const HISTORY_KEY = "cc_walk_history";

const STATUS_OPTIONS = ["OK", "Issue"];
const ACTION_OPTIONS = ["No Action", "Call Made", "HOTSOS Logged"];

const ISSUE_OPTIONS = {
  "Hand Sink": ["Needs Cleaning", "Needs Soap", "Needs Paper Towels", "No Hot Water"],
  "Ice Machine": ["Not working", "Needs Cleaning"],
  "Reach-in Fridge": ["Temp Too Low", "Temp Too High"],
  "Walk-in Cooler": ["Temp Too Low", "Temp Too High"],
  "Walk-in": ["Temp Too Low", "Temp Too High"],
};

const STRUCTURE = [
  {
    floor: "1st Floor",
    building: "Main",
    areas: [
      { name: "Pantry 1A", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
      { name: "Pantry 1B", items: ["Hand Sink", "Ice Machine", "Reach-in 1B.1", "Reach-in 1B.2"] },
      { name: "Main Walk-in", items: ["Walk-in Cooler"] },
      { name: "Specialty Cooler", items: ["Walk-in Cooler"] },
    ],
  },
  {
    floor: "2nd Floor",
    building: "Main",
    areas: [
      { name: "Pantry 2A", items: ["Hand Sink", "Ice Machine", "Reach-in 2A.1", "Reach-in 2A.2"] },
      { name: "Pantry 2B", items: ["Hand Sink", "Walk-in"] },
      { name: "201 Pantry", items: ["Hand Sink", "Reach-in Fridge"] },
      { name: "204 Pantry", items: ["Hand Sink", "Reach-in Fridge"] },
      { name: "205 Ice Machine", items: ["Ice Machine"] },
    ],
  },
  {
    floor: "3rd Floor",
    building: "Main",
    areas: [
      { name: "Pantry 3A", items: ["Hand Sink", "Ice Machine", "Reach-in 3A.1", "Reach-in 3A.2"] },
      { name: "Pantry 3B", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
    ],
  },
  {
    floor: "Marquee",
    building: "Main",
    areas: [
      { name: "Marquee", items: ["Hand Sink", "Ice Machine", "Reach-in MQ.1", "Reach-in MQ.2", "Reach-in MQ.3"] },
    ],
  },
  {
    floor: "Signature Tower",
    building: "Separate",
    areas: [{ name: "Signature Tower", items: ["Hand Sink", "Reach-in Fridge", "Walk-in Cooler"] }],
  },
  {
    floor: "G.G.A. Kitchen",
    building: "Separate",
    areas: [{ name: "G.G.A. Kitchen", items: ["Hand Sink", "Reach-in Fridge", "Walk-in Cooler"] }],
  },
];

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function isTempItem(item) {
  return item.startsWith("Reach-in") || item === "Walk-in" || item === "Walk-in Cooler";
}

function isOutOfRange(v) {
  if (v === "" || v == null) return false;
  const n = Number(v);
  return n < 33 || n > 41;
}

function tempValues() {
  const arr = [];
  for (let v = 29; v <= 60; v += 0.5) {
    arr.push(Number.isInteger(v) ? v : Number(v.toFixed(1)));
  }
  return arr;
}

function buildInitialState() {
  const s = { inspector: "", date: "", time: "", areas: {} };

  STRUCTURE.forEach((g) => {
    g.areas.forEach((a) => {
      s.areas[a.name] = { notes: "", items: {} };
      a.items.forEach((i) => {
        s.areas[a.name].items[i] = {
          status: "",
          issue: "",
          temperature: "",
          engineerAction: "",
          hotsos: "",
          photos: [],
        };
      });
    });
  });

  return s;
}

export default function App() {
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : buildInitialState();
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [openArea, setOpenArea] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const setItem = (area, item, field, value) => {
    setForm((prev) => {
      const next = deepClone(prev);
      next.areas[area].items[item][field] = value;
      return next;
    });
  };

  const saveWalk = () => {
    setHistory((prev) => [
      {
        id: Date.now(),
        inspector: form.inspector,
        date: form.date,
        time: form.time,
        data: form,
      },
      ...prev,
    ]);
  };

  const newWalk = () => {
    setForm(buildInitialState());
  };

  return (
    <div style={{ padding: 12, background: "#020617", minHeight: "100vh", color: "#fff" }}>
      <h2>Conference Center Walk</h2>

      <input
        placeholder="Inspector"
        value={form.inspector}
        onChange={(e) => setForm({ ...form, inspector: e.target.value })}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button onClick={newWalk}>New Walk</button>
        <button onClick={saveWalk}>Save Walk</button>
        <button onClick={() => window.scrollTo({ top: document.body.scrollHeight })}>
          Walk History
        </button>
      </div>

      {STRUCTURE.map((group) => (
        <div key={group.floor}>
          <h3>{group.floor}</h3>

          {group.areas.map((area) => (
            <div key={area.name}>
              <button onClick={() => setOpenArea(openArea === area.name ? "" : area.name)}>
                {area.name}
              </button>

              {openArea === area.name &&
                area.items.map((item) => (
                  <div key={item}>
                    <strong>{item}</strong>

                    <select
                      onChange={(e) => setItem(area.name, item, "status", e.target.value)}
                    >
                      <option value="">Status</option>
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 40 }}>
        <h3>Walk History</h3>
        {history.map((h) => (
          <div key={h.id}>
            {h.inspector} - {h.date}
          </div>
        ))}
      </div>
    </div>
  );
}
