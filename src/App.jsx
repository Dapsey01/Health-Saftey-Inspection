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
  {
    floor: "1st Floor",
    building: "Main",
    areas: [
      { name: "Pantry 1A", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
      { name: "Pantry 1B", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
      { name: "Main Walk-in", items: ["Walk-in Cooler"] },
      { name: "Specialty Cooler", items: ["Walk-in Cooler"] },
    ],
  },
  {
    floor: "2nd Floor",
    building: "Main",
    areas: [
      { name: "Pantry 2A", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
      { name: "Pantry 2B", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
      { name: "201 Pantry", items: ["Hand Sink", "Reach-in Fridge"] },
      { name: "204 Pantry", items: ["Hand Sink", "Reach-in Fridge"] },
      { name: "205 Ice Machine", items: ["Ice Machine"] },
    ],
  },
  {
    floor: "3rd Floor",
    building: "Main",
    areas: [
      { name: "Pantry 3A", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
      { name: "Pantry 3B", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] },
    ],
  },
  {
    floor: "Marquee",
    building: "Main",
    areas: [{ name: "Marquee", items: ["Hand Sink", "Ice Machine", "Reach-in Fridge"] }],
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

function isTempItem(item) {
  return item === "Reach-in Fridge" || item === "Walk-in Cooler";
}

function isOutOfRange(value) {
  if (value === "" || value === null || value === undefined) return false;
  const num = Number(value);
  return num < 33 || num > 41;
}

function tempValues() {
  const values = [];
  for (let v = 29; v <= 60; v += 0.5) {
    const clean = Number.isInteger(v) ? v : Number(v.toFixed(1));
    values.push(clean);
  }
  return values;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInitialState() {
  const state = {
    inspector: "",
    date: "",
    time: "",
    areas: {},
  };

  STRUCTURE.forEach((group) => {
    group.areas.forEach((area) => {
      state.areas[area.name] = {
        notes: "",
        items: {},
      };

      area.items.forEach((item) => {
        state.areas[area.name].items[item] = {
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

  return state;
}

export default function App() {
  const [form, setForm] = useState(buildInitialState);
  const [openAreas, setOpenAreas] = useState({});
  const [copyMessage, setCopyMessage] = useState("");

  const setTopField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setItemField = (areaName, itemName, field, value) => {
    setForm((prev) => {
      const next = clone(prev);
      const item = next.areas[areaName].items[itemName];

      item[field] = value;

      if (field === "temperature" && isTempItem(itemName)) {
        const num = Number(value);
        if (value !== "" && !Number.isNaN(num) && isOutOfRange(value)) {
          item.status = "Issue";
          item.issue = num < 33 ? "Temp Too Low" : "Temp Too High";
        }
      }

      if (field === "status" && value !== "Issue") {
        item.issue = "";
        item.engineerAction = "";
        item.hotsos = "";
        item.photos = [];
      }

      if (field === "engineerAction" && value !== "HOTSOS Logged") {
        item.hotsos = "";
      }

      return next;
    });
  };

  const setAreaNotes = (areaName, value) => {
    setForm((prev) => {
      const next = clone(prev);
      next.areas[areaName].notes = value;
      return next;
    });
  };

  const addIssuePhotos = (areaName, itemName, files) => {
    if (!files || !files.length) return;

    const readers = Array.from(files).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((images) => {
      setForm((prev) => {
        const next = clone(prev);
        next.areas[areaName].items[itemName].photos.push(...images);
        return next;
      });
    });
  };

  const removeIssuePhoto = (areaName, itemName, index) => {
    setForm((prev) => {
      const next = clone(prev);
      next.areas[areaName].items[itemName].photos.splice(index, 1);
      return next;
    });
  };

  const floorSummary = useMemo(() => {
    return STRUCTURE.map((group) => {
      let issues = 0;

      group.areas.forEach((area) => {
        Object.values(form.areas[area.name].items).forEach((item) => {
          if (item.status === "Issue") issues += 1;
        });
      });

      return {
        floor: group.floor,
        building: group.building,
        issues,
      };
    });
  }, [form]);

  const detailedReport = useMemo(() => {
    return STRUCTURE.map((group) => ({
      ...group,
      areas: group.areas.map((area) => {
        const issues = Object.entries(form.areas[area.name].items)
          .filter(([, item]) => item.status === "Issue")
          .map(([itemName, item]) => ({
            itemName,
            ...item,
          }));

        const temps = Object.entries(form.areas[area.name].items)
          .filter(([itemName, item]) => isTempItem(itemName) && item.temperature !== "")
          .map(([itemName, item]) => ({
            itemName,
            temperature: item.temperature,
          }));

        return {
          name: area.name,
          issues,
          temps,
          notes: form.areas[area.name].notes,
        };
      }),
    }));
  }, [form]);

  const issueCount = detailedReport.reduce(
    (sum, group) => sum + group.areas.reduce((inner, area) => inner + area.issues.length, 0),
    0
  );

  const callCount = detailedReport.reduce(
    (sum, group) =>
      sum +
      group.areas.reduce(
        (inner, area) =>
          inner + area.issues.filter((issue) => issue.engineerAction === "Call Made").length,
        0
      ),
    0
  );

  const hotsosCount = detailedReport.reduce(
    (sum, group) =>
      sum +
      group.areas.reduce(
        (inner, area) =>
          inner + area.issues.filter((issue) => issue.engineerAction === "HOTSOS Logged").length,
        0
      ),
    0
  );

  const htmlEmail = useMemo(() => {
    const floorSummaryHtml = `
      <div style="margin:16px 0;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff;padding:16px;">
        <div style="font-weight:700;font-size:16px;color:#0f172a;margin-bottom:10px;">Floor Summary</div>
        ${floorSummary
          .map(
            (f) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-top:1px solid #e2e8f0;">
              <div style="font-size:14px;color:#0f172a;">${escapeHtml(f.floor)}</div>
              <div style="font-size:13px;font-weight:700;color:${f.issues === 0 ? "#16a34a" : "#dc2626"};">
                ${f.issues === 0 ? "Clear" : `${f.issues} Issues`}
              </div>
            </div>`
          )
          .join("")}
      </div>
    `;

    const floorBlocks = detailedReport
      .map((group) => {
        const headerBg = group.building === "Separate" ? "#ddd6fe" : "#334155";

        const areaHtml = group.areas
          .map((area) => {
            const hasContent = area.issues.length || area.temps.length || area.notes;

            const issuesHtml = area.issues
              .map(
                (issue) => `
                <tr>
                  <td style="padding:12px;border:1px solid #fecdd3;background:#ffffff;border-radius:12px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td valign="top" style="padding-right:12px;">
                          <div style="font-weight:700;color:#0f172a;font-size:15px;">${escapeHtml(issue.itemName)}</div>
                          <div style="margin-top:4px;color:#334155;font-size:14px;line-height:1.4;">${escapeHtml(issue.issue || "Issue logged")}</div>
                          <div style="margin-top:8px;">
                            ${
                              issue.temperature
                                ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;border-radius:999px;padding:4px 8px;margin:0 6px 6px 0;">Temp ${escapeHtml(issue.temperature)}°F</span>`
                                : ""
                            }
                            ${
                              issue.engineerAction && issue.engineerAction !== "No Action"
                                ? `<span style="display:inline-block;background:#e2e8f0;color:#334155;font-size:12px;font-weight:700;border-radius:999px;padding:4px 8px;margin:0 6px 6px 0;">${escapeHtml(issue.engineerAction)}</span>`
                                : ""
                            }
                            ${
                              issue.hotsos
                                ? `<span style="display:inline-block;background:#ffe4e6;color:#be123c;font-size:12px;font-weight:700;border-radius:999px;padding:4px 8px;margin:0 6px 6px 0;">HOTSOS #${escapeHtml(issue.hotsos)}</span>`
                                : ""
                            }
                          </div>
                        </td>
                        <td valign="top" width="110">
                          ${
                            issue.photos && issue.photos[0]
                              ? `<img src="${issue.photos[0]}" alt="Issue photo" width="110" style="display:block;width:110px;height:96px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;" />`
                              : `<div style="width:110px;height:96px;border-radius:12px;border:1px dashed #cbd5e1;color:#94a3b8;font-size:12px;text-align:center;line-height:96px;">No Photo</div>`
                          }
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="10"></td></tr>
              `
              )
              .join("");

            const tempsHtml = area.temps.length
              ? `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="background:#f8fafc;color:#475569;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:10px 12px;border-bottom:1px solid #e2e8f0;">Temperature Log</td>
                    <td style="background:#f8fafc;color:#475569;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:10px 12px;border-bottom:1px solid #e2e8f0;">Reading</td>
                  </tr>
                  ${area.temps
                    .map(
                      (temp) => `
                      <tr>
                        <td style="padding:10px 12px;border-top:1px solid #e2e8f0;color:#0f172a;font-size:14px;">${escapeHtml(temp.itemName)}</td>
                        <td style="padding:10px 12px;border-top:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:700;">${escapeHtml(temp.temperature)}°F</td>
                      </tr>`
                    )
                    .join("")}
                </table>`
              : "";

            const notesHtml = area.notes
              ? `<div style="margin-top:12px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;padding:12px;"><div style="font-weight:700;color:#ffffff;font-size:14px;margin-bottom:6px;">Notes</div><div style="color:#334155;font-size:14px;line-height:1.5;">${escapeHtml(area.notes)}</div></div>`
              : "";

            return `
              <div style="margin-top:12px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:16px;">
                <div style="font-weight:700;font-size:18px;color:#0f172a;margin-bottom:8px;">${escapeHtml(area.name)}</div>
                ${!hasContent ? `<div style="font-size:14px;color:#64748b;">No issues noted.</div>` : ""}
                ${issuesHtml ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${issuesHtml}</table>` : ""}
                ${tempsHtml}
                ${notesHtml}
              </div>`;
          })
          .join("");

        return `<div style="margin-top:18px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;background:#ffffff;"><div style="background:${headerBg};color:#0f172a;font-weight:700;font-size:18px;padding:14px 18px;">${escapeHtml(group.floor)}</div><div style="padding:16px;">${areaHtml}</div></div>`;
      })
      .join("");

    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f1f5f9;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:860px;border-collapse:collapse;"><tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;"><div style="background:#eab308;color:#0f172a;font-size:26px;font-weight:700;padding:22px 24px;">Conference Center Health &amp; Safety Walk Report</div><div style="padding:18px 24px;background:#ffffff;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="font-size:14px;color:#334155;padding:0 12px 0 0;"><strong>Inspector:</strong> ${escapeHtml(form.inspector || "—")}</td><td style="font-size:14px;color:#334155;padding:0 12px;"><strong>Date:</strong> ${escapeHtml(form.date || "—")}</td><td style="font-size:14px;color:#334155;padding:0 0 0 12px;"><strong>Time:</strong> ${escapeHtml(form.time || "—")}</td></tr></table></div></td></tr><tr><td height="16"></td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px 0; margin:0 -12px;"><tr><td width="33.33%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;vertical-align:top;"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Areas Reviewed</div><div style="margin-top:10px;font-size:32px;font-weight:700;color:#0f172a;">${STRUCTURE.reduce((sum, g) => sum + g.areas.length, 0)}</div></td><td width="33.33%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;vertical-align:top;"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Issues Logged</div><div style="margin-top:10px;font-size:32px;font-weight:700;color:#e11d48;">${issueCount}</div></td><td width="33.33%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;vertical-align:top;"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Engineering Follow Up</div><div style="margin-top:10px;font-size:14px;font-weight:700;color:#0f172a;">Calls: ${callCount}<br/>HOTSOS: ${hotsosCount}</div></td></tr></table></td></tr><tr><td height="16"></td></tr><tr><td>${floorSummaryHtml}${floorBlocks}</td></tr></table></td></tr></table></body></html>`;
  }, [detailedReport, floorSummary, form.date, form.inspector, form.time, issueCount, callCount, hotsosCount]);

  const copyHtmlEmail = async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          "text/html": new Blob([htmlEmail], { type: "text/html" }),
          "text/plain": new Blob([htmlEmail.replace(/<[^>]+>/g, " ")], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(htmlEmail);
      }
      setCopyMessage("Copied! Paste into Outlook.");
      setTimeout(() => setCopyMessage(""), 2500);
    } catch {
      setCopyMessage("Copy failed on this browser. Use Download for Mobile Outlook.");
      setTimeout(() => setCopyMessage(""), 3000);
    }
  };

  const openOutlookDraft = () => {
    const subject = encodeURIComponent(
      `Conference Center Health & Safety Walk Report${form.date ? ` - ${form.date}` : ""}`
    );
    const body = encodeURIComponent(
      "Your formatted report is copied. Paste it into the body of this Outlook message for best results."
    );
    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`;
    window.open(outlookUrl, "_blank");
  };

  const downloadHtmlEmail = () => {
    const blob = new Blob([htmlEmail], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cc-walk-report-${form.date || "draft"}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const previewLeft = [
  floorSummary.find((f) => f.floor === "1st Floor"),
  floorSummary.find((f) => f.floor === "2nd Floor"),
  floorSummary.find((f) => f.floor === "3rd Floor"),
].filter(Boolean);

const previewRight = [
  floorSummary.find((f) => f.floor === "Marquee"),
  floorSummary.find((f) => f.floor === "Signature Tower"),
  floorSummary.find((f) => f.floor === "G.G.A. Kitchen"),
].filter(Boolean);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.topHeader}>Conference Center Health & Safety Walk</div>
          <div style={styles.topFields}>
            <input
              style={styles.input}
              placeholder="Inspector"
              value={form.inspector}
              onChange={(e) => setTopField("inspector", e.target.value)}
            />
            <input
              style={styles.input}
              type="date"
              value={form.date}
              onChange={(e) => setTopField("date", e.target.value)}
            />
            <input
              style={styles.input}
              type="time"
              value={form.time}
              onChange={(e) => setTopField("time", e.target.value)}
            />
          </div>
        </div>

       <div style={styles.card}>
  <div style={styles.sectionTitle}>Floor Summary</div>

  <div style={styles.previewSummaryGrid}>
    <div style={styles.previewSummaryCol}>
      {[
        floorSummary.find((f) => f.floor === "1st Floor"),
        floorSummary.find((f) => f.floor === "2nd Floor"),
        floorSummary.find((f) => f.floor === "3rd Floor"),
      ].filter(Boolean).map((f) => (
        <div key={`top-left-${f.floor}`} style={styles.previewSummaryRow}>
          <div style={{ color: "#ffffff", fontWeight: 600 }}>{f.floor}</div>
          <div style={f.issues === 0 ? styles.previewClear : styles.previewIssue}>
            {f.issues === 0 ? "Clear" : `${f.issues} Issues`}
          </div>
        </div>
      ))}
    </div>

   <div style={styles.previewSummaryCol}>
  {[
    floorSummary.find((f) => f.floor === "Marquee"),
    floorSummary.find((f) => f.floor === "Signature Tower"),
    floorSummary.find((f) => f.floor === "G.G.A. Kitchen"),
  ]
    .filter(Boolean)
    .map((f) => (
      <div key={`top-right-${f.floor}`} style={styles.previewSummaryRow}>
        <div style={{ color: "#ffffff", fontWeight: 600 }}>{f.floor}</div>
        <div style={f.issues === 0 ? styles.previewClear : styles.previewIssue}>
          {f.issues === 0 ? "Clear" : `${f.issues} Issues`}
        </div>
      </div>
    ))}
</div>
        </div>
        <div style={styles.mainStack}>
          <div>
            {STRUCTURE.map((group) => (
              <div key={group.floor} style={{ marginBottom: 16 }}>
               <div style={group.building === "Separate" ? styles.floorHeaderPurple : styles.floorHeaderGold}>
  {group.floor}
</div>

                {group.areas.map((area) => (
                  <div key={area.name} style={{ marginBottom: 10 }}>
                   <button
  onClick={() =>
    setOpenAreas((prev) => ({
      ...prev,
      [area.name]: !prev[area.name],
    }))
  }
  style={{
    ...styles.pantryTile,
    background: "#1e293b",
    color: "#f8fafc",
    border: "1px solid #334155",
    ...(openAreas[area.name]
      ? {
          border: "1px solid #3b82f6",
          boxShadow: "0 0 0 1px #3b82f6",
        }
      : {}),
}}
                    >
                      <span>{area.name}</span>
                      <span style={styles.chevron}>{openAreas[area.name] ? "▲" : "▼"}</span>
                    </button>

                    {openAreas[area.name] && (
                      <div style={styles.areaBody}>
                        {area.items.map((item) => {
                          const data = form.areas[area.name].items[item];
                          const issueMode = data.status === "Issue";

                          return (
                            <div key={item} style={styles.itemCard}>
                              <div style={styles.itemTitle}>{item}</div>

                              <div style={styles.twoColGrid}>
                                <select
                                  style={styles.select}
                                  value={data.status}
                                  onChange={(e) => setItemField(area.name, item, "status", e.target.value)}
                                >
                                  <option value="">Status ▼</option>
                                  {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>

                                {isTempItem(item) ? (
                                  <select
                                    style={{
                                      ...styles.select,
                                      ...(isOutOfRange(data.temperature) ? styles.tempAlert : {}),
                                    }}
                                    value={data.temperature}
                                    onChange={(e) => setItemField(area.name, item, "temperature", e.target.value)}
                                  >
                                    <option value="">Temp °F ▼</option>
                                    {tempValues().map((t) => (
                                      <option key={t} value={t}>
                                        {t}°F
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <select
                                    style={styles.select}
                                    value={data.issue}
                                    disabled={!issueMode}
                                    onChange={(e) => setItemField(area.name, item, "issue", e.target.value)}
                                  >
                                    <option value="">Issue ▼</option>
                                    {(ISSUE_OPTIONS[item] || []).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {isTempItem(item) ? (
                                  <select
                                    style={styles.select}
                                    value={data.issue}
                                    disabled={!issueMode}
                                    onChange={(e) => setItemField(area.name, item, "issue", e.target.value)}
                                  >
                                    <option value="">Issue ▼</option>
                                    {(ISSUE_OPTIONS[item] || []).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <select
                                    style={styles.select}
                                    value={data.engineerAction}
                                    disabled={!issueMode}
                                    onChange={(e) =>
                                      setItemField(area.name, item, "engineerAction", e.target.value)
                                    }
                                  >
                                    <option value="">Engineer Action ▼</option>
                                    {ACTION_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {isTempItem(item) ? (
                                  <select
                                    style={styles.select}
                                    value={data.engineerAction}
                                    disabled={!issueMode}
                                    onChange={(e) =>
                                      setItemField(area.name, item, "engineerAction", e.target.value)
                                    }
                                  >
                                    <option value="">Engineer Action ▼</option>
                                    {ACTION_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    style={{ ...styles.input, gridColumn: "1 / -1" }}
                                    placeholder="HOTSOS #"
                                    value={data.hotsos}
                                    disabled={!issueMode || data.engineerAction !== "HOTSOS Logged"}
                                    onChange={(e) => setItemField(area.name, item, "hotsos", e.target.value)}
                                  />
                                )}

                                {isTempItem(item) && (
                                  <input
                                    style={{ ...styles.input, gridColumn: "1 / -1" }}
                                    placeholder="HOTSOS #"
                                    value={data.hotsos}
                                    disabled={!issueMode || data.engineerAction !== "HOTSOS Logged"}
                                    onChange={(e) => setItemField(area.name, item, "hotsos", e.target.value)}
                                  />
                                )}
                              </div>

                              {issueMode && (
                                <div style={{ marginTop: 12 }}>
                                  <div style={styles.smallLabel}>Issue Photos</div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    onChange={(e) => addIssuePhotos(area.name, item, e.target.files)}
                                  />
                                  <div style={styles.photoRow}>
                                    {(data.photos || []).map((photo, idx) => (
                                      <div key={idx} style={{ position: "relative" }}>
                                        <img src={photo} alt="Issue" style={styles.thumb} />
                                        <button
                                          type="button"
                                          style={styles.thumbDelete}
                                          onClick={() => removeIssuePhoto(area.name, item, idx)}
                                        >
                                          X
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <textarea
                          style={styles.textarea}
                          placeholder="Notes"
                          value={form.areas[area.name].notes}
                          onChange={(e) => setAreaNotes(area.name, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <div style={styles.reportHeader}>Email Report Preview</div>

            <div style={styles.buttonBar}>
              <button type="button" style={styles.darkBtn} onClick={copyHtmlEmail}>
                Copy for Desktop Outlook
              </button>
              <button type="button" style={styles.lightBtn} onClick={openOutlookDraft}>
                Open Outlook Draft
              </button>
              <button type="button" style={styles.goldBtn} onClick={downloadHtmlEmail}>
                Download for Mobile Outlook
              </button>
              {copyMessage ? <span style={styles.copyMessage}>{copyMessage}</span> : null}
            </div>

            <div style={styles.previewScroll}>
              <div style={styles.previewIntroCard}>
                <div style={styles.previewTitle}>Conference Center Health &amp; Safety Walk Report</div>
                <div style={styles.previewMetaGrid}>
                  <div><strong>Inspector:</strong> {form.inspector || "—"}</div>
                  <div><strong>Date:</strong> {form.date || "—"}</div>
                  <div><strong>Time:</strong> {form.time || "—"}</div>
                </div>
              </div>

              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Areas Reviewed</div>
                  <div style={styles.statNumber}>{STRUCTURE.reduce((sum, g) => sum + g.areas.length, 0)}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Issues Logged</div>
                  <div style={{ ...styles.statNumber, color: "#e11d48" }}>{issueCount}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Engineering Follow Up</div>
                  <div style={styles.statSmall}>Calls: {callCount} • HOTSOS: {hotsosCount}</div>
                </div>
              </div>

              <div style={styles.previewSummaryCard}>
                <div style={styles.previewSummaryHeader}>Floor Summary</div>
                <div style={styles.previewSummaryGrid}>
                  <div style={styles.previewSummaryCol}>
                    {previewLeft.map((f) => (
                      <div key={`left-${f.floor}`} style={styles.previewSummaryRow}>
                        <div>{f.floor}</div>
                        <div style={f.issues === 0 ? styles.previewClear : styles.previewIssue}>
                          {f.issues === 0 ? "Clear" : `${f.issues} Issues`}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={styles.previewSummaryCol}>
                    {previewRight.map((f) => (
                      <div key={`right-${f.floor}`} style={styles.previewSummaryRow}>
                        <div>{f.floor}</div>
                        <div style={f.issues === 0 ? styles.previewClear : styles.previewIssue}>
                          {f.issues === 0 ? "Clear" : `${f.issues} Issues`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {detailedReport.map((group) => (
                <div key={group.floor} style={styles.previewGroupCard}>
                  <div
                    style={{
                      ...styles.previewGroupHeader,
                      background: group.building === "Separate" ? "#ddd6fe" : "#334155",
                      color: group.building === "Separate" ? "#0f172a" : "#ffffff",
                    }}
                  >
                    {group.floor}
                  </div>

                  <div style={styles.previewGroupBody}>
                    {group.areas.map((area) => {
                      const hasContent = area.issues.length || area.temps.length || area.notes;

                      return (
                        <div key={area.name} style={styles.previewAreaCard}>
                          <div style={styles.previewAreaTitle}>{area.name}</div>

                          {!hasContent && <div style={styles.noIssuesText}>No issues noted.</div>}

                          {!!area.issues.length && (
                            <div style={{ marginTop: 10 }}>
                              {area.issues.map((issue, idx) => (
                                <div key={`${area.name}-${issue.itemName}-${idx}`} style={styles.previewIssueCard}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700 }}>{issue.itemName}</div>
                                    <div style={{ marginTop: 4, color: "#475569", fontSize: 14 }}>
                                      {issue.issue || "Issue logged"}
                                    </div>
                                    <div style={styles.issueBadges}>
                                      {issue.temperature ? (
                                        <span style={styles.tempBadge}>Temp {issue.temperature}°F</span>
                                      ) : null}
                                      {issue.engineerAction && issue.engineerAction !== "No Action" ? (
                                        <span style={styles.grayBadge}>{issue.engineerAction}</span>
                                      ) : null}
                                      {issue.hotsos ? (
                                        <span style={styles.redBadge}>HOTSOS #{issue.hotsos}</span>
                                      ) : null}
                                    </div>
                                  </div>

                                  {issue.photos && issue.photos[0] ? (
                                    <img src={issue.photos[0]} alt="Issue" style={styles.previewIssueImage} />
                                  ) : (
                                    <div style={styles.noPhotoBox}>No Photo</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {!!area.temps.length && (
                            <div style={styles.tempTableWrap}>
                              <div style={styles.tempTableHeaderRow}>
                                <div>Temperature Log</div>
                                <div>Reading</div>
                              </div>
                              {area.temps.map((temp, idx) => (
                                <div key={`${area.name}-temp-${idx}`} style={styles.tempTableRow}>
                                  <div>{temp.itemName}</div>
                                  <div style={{ fontWeight: 700 }}>{temp.temperature}°F</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!!area.notes && (
                            <div style={styles.notesBox}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>Notes</div>
                              {area.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
                </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#020617",
    minHeight: "100vh",
    padding: 12,
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  card: {
    background: "#334155",
    border: "1px solid #1f2937",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
  },
 topHeader: {
  background: "#1e3a8a",
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: 22,
  padding: "16px 18px",
  borderBottom: "1px solid #3b82f6",
  boxShadow: "0 0 10px rgba(59,130,246,0.3)",
},
  topFields: {
    display: "grid",
    gap: 10,
    padding: 14,
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 16,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: 95,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 15,
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 15,
    boxSizing: "border-box",
    background: "#fff",
  },
  tempAlert: {
    border: "1px solid #ef4444",
    background: "#fef2f2",
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 19,
    padding: "14px 16px 8px",
    color: "#f8fafc",
  },
  summaryGridTop: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    padding: "0 14px 14px",
  },
  summaryTopRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "12px 14px",
  color: "#f8fafc",
},
  clearBadge: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: "bold",
  },
  issueBadge: {
    background: "#ffe4e6",
    color: "#be123c",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: "bold",
  },
  mainStack: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  floorHeaderGold: {
  background: "#1e3a8a",
  color: "#ffffff",
  fontWeight: "bold",
  padding: "10px 14px",
  borderRadius: 10,
  marginBottom: 8,
},
  floorHeaderPurple: {
    marginBottom: 8,
    padding: "12px 14px",
    background: "#ddd6fe",
    color: "#111827",
    borderRadius: 10,
    fontWeight: "bold",
  },
  pantryTile: {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 16px",
  marginBottom: 10,
  background: "#3f4f68",           
  border: "1px solid #334155",     
  borderRadius: 14,
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
  color: "#f8fafc",                
},
  chevron: {
    color: "#64748b",
    fontSize: 13,
  },
  areaBody: {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 14,
  padding: 12,
  marginTop: -2,
  marginBottom: 8,
},
  itemCard: {
  border: "1px solid #1f2937",
  background: "#020617",
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
},
  itemTitle: {
    fontWeight: 700,
    marginBottom: 10,
    color: "#f8fafc",
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  smallLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
  },
  photoRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  thumb: {
    width: 64,
    height: 64,
    objectFit: "cover",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
  },
  thumbDelete: {
    position: "absolute",
    top: 4,
    right: 4,
    border: "none",
    background: "#ef4444",
    color: "#fff",
    borderRadius: 999,
    padding: "2px 6px",
    fontSize: 10,
    fontWeight: "bold",
    cursor: "pointer",
  },
  reportHeader: {
    background: "#0f172a",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
    padding: "16px 18px",
  },
  buttonBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    padding: "12px 14px",
    borderBottom: "1px solid #e2e8f0",
  },
  darkBtn: {
    padding: "10px 14px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  lightBtn: {
    padding: "10px 14px",
    background: "#fff",
    color: "#111827",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  goldBtn: {
    padding: "10px 14px",
    background: "#3b82f6",
    color: "#111827",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  copyMessage: {
    fontSize: 14,
    fontWeight: 600,
    color: "#475569",
  },
  previewScroll: {
    padding: 14,
    maxHeight: "80vh",
    overflow: "auto",
    background: "#fff",
  },
  previewIntroCard: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
  },
  previewMetaGrid: {
    display: "grid",
    gap: 8,
    marginTop: 10,
    color: "#334155",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 16,
    background: "#fff",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "#64748b",
  },
  statNumber: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: "bold",
    color: "#0f172a",
  },
  statSmall: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
  },
  previewSummaryCard: {
    overflow: "hidden",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    background: "#fff",
    marginBottom: 14,
  },
  previewSummaryHeader: {
    padding: "14px 16px",
    fontWeight: "bold",
    background: "#f1f5f9",
    color: "#0f172a",
  },
  previewSummaryGrid: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  padding: 14,
},
  previewSummaryCol: {
  display: "grid",
  gap: 10,
},
  previewSummaryRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  border: "1px solid #334155",
  borderRadius: 12,
  padding: "12px 14px",
  background: "#1e293b",
},
  previewClear: {
  color: "#86efac",
  fontWeight: "bold",
  fontSize: 13,
},
  previewIssue: {
  color: "#f87171",
  fontWeight: "bold",
  fontSize: 13,
},
  previewGroupCard: {
    overflow: "hidden",
    borderRadius: 18,
    border: "1px solid #e2e8f0",
    background: "#fff",
    marginBottom: 14,
  },
  previewGroupHeader: {
    padding: "14px 16px",
    fontWeight: "bold",
    color: "#0f172a",
  },
  previewGroupBody: {
    padding: 14,
    display: "grid",
    gap: 12,
  },
  previewAreaCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#f8fafc",
    padding: 14,
  },
  previewAreaTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  noIssuesText: {
    fontSize: 14,
    color: "#64748b",
  },
  previewIssueCard: {
    display: "grid",
    gridTemplateColumns: "1fr 110px",
    gap: 12,
    border: "1px solid #fecdd3",
    borderRadius: 14,
    background: "#fff",
    padding: 12,
    marginBottom: 10,
  },
  issueBadges: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tempBadge: {
    background: "#fef3c7",
    color: "#92400e",
    fontSize: 12,
    fontWeight: "bold",
    borderRadius: 999,
    padding: "4px 8px",
  },
  grayBadge: {
    background: "#e2e8f0",
    color: "#334155",
    fontSize: 12,
    fontWeight: "bold",
    borderRadius: 999,
    padding: "4px 8px",
  },
  redBadge: {
    background: "#ffe4e6",
    color: "#be123c",
    fontSize: 12,
    fontWeight: "bold",
    borderRadius: 999,
    padding: "4px 8px",
  },
  previewIssueImage: {
    width: 110,
    height: 96,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
  },
  noPhotoBox: {
    width: 110,
    height: 96,
    borderRadius: 12,
    border: "1px dashed #cbd5e1",
    color: "#94a3b8",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tempTableWrap: {
    marginTop: 14,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#fff",
  },
  tempTableHeaderRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    background: "#f1f5f9",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#475569",
  },
  tempTableRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    padding: "10px 12px",
    borderTop: "1px solid #e2e8f0",
    fontSize: 14,
  },
  notesBox: {
    marginTop: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#fff",
    padding: 12,
    fontSize: 14,
    color: "#334155",
  },
};
