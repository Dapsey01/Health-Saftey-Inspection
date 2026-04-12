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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function tempValues() {
  return Array.from({ length: 61 }, (_, i) => i - 10);
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
      const next = deepClone(prev);
      next.areas[areaName].items[itemName][field] = value;

      if (field === "status" && value !== "Issue") {
        next.areas[areaName].items[itemName].issue = "";
        next.areas[areaName].items[itemName].engineerAction = "";
        next.areas[areaName].items[itemName].hotsos = "";
        next.areas[areaName].items[itemName].photos = [];
      }

      if (field === "engineerAction" && value !== "HOTSOS Logged") {
        next.areas[areaName].items[itemName].hotsos = "";
      }

      return next;
    });
  };

  const setAreaNotes = (areaName, value) => {
    setForm((prev) => {
      const next = deepClone(prev);
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
        const next = deepClone(prev);
        next.areas[areaName].items[itemName].photos.push(...images);
        return next;
      });
    });
  };

  const removeIssuePhoto = (areaName, itemName, index) => {
    setForm((prev) => {
      const next = deepClone(prev);
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
          .filter(([itemName, item]) => isTempItem(itemName) && item.temperature)
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
    (sum, group) => sum + group.areas.reduce((areaSum, area) => areaSum + area.issues.length, 0),
    0
  );

  const callCount = detailedReport.reduce(
    (sum, group) =>
      sum +
      group.areas.reduce(
        (areaSum, area) =>
          areaSum +
          area.issues.filter((issue) => issue.engineerAction === "Call Made").length,
        0
      ),
    0
  );

  const hotsosCount = detailedReport.reduce(
    (sum, group) =>
      sum +
      group.areas.reduce(
        (areaSum, area) =>
          areaSum +
          area.issues.filter((issue) => issue.engineerAction === "HOTSOS Logged").length,
        0
      ),
    0
  );

  const htmlEmail = useMemo(() => {
    const floorBlocks = detailedReport
      .map((group) => {
        const headerBg = group.building === "Separate" ? "#ddd6fe" : "#eab308";

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
                        </tr>
                      `
                    )
                    .join("")}
                </table>
              `
              : "";

            const notesHtml = area.notes
              ? `
                <div style="margin-top:12px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;padding:12px;">
                  <div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:6px;">Notes</div>
                  <div style="color:#334155;font-size:14px;line-height:1.5;">${escapeHtml(area.notes)}</div>
                </div>
              `
              : "";

            return `
              <div style="margin-top:12px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:16px;">
                <div style="font-weight:700;font-size:18px;color:#0f172a;margin-bottom:8px;">${escapeHtml(area.name)}</div>
                ${!hasContent ? `<div style="font-size:14px;color:#64748b;">No issues noted.</div>` : ""}
                ${issuesHtml ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${issuesHtml}</table>` : ""}
                ${tempsHtml}
                ${notesHtml}
              </div>
            `;
          })
          .join("");

        return `
          <div style="margin-top:18px;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;background:#ffffff;">
            <div style="background:${headerBg};color:#0f172a;font-weight:700;font-size:18px;padding:14px 18px;">${escapeHtml(group.floor)}</div>
            <div style="padding:16px;">${areaHtml}</div>
          </div>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f1f5f9;">
            <tr>
              <td align="center" style="padding:24px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:860px;border-collapse:collapse;">
                  <tr>
                    <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;">
                      <div style="background:#eab308;color:#0f172a;font-size:26px;font-weight:700;padding:22px 24px;">Conference Center Health &amp; Safety Walk Report</div>
                      <div style="padding:18px 24px;background:#ffffff;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td style="font-size:14px;color:#334155;padding:0 12px 0 0;"><strong>Inspector:</strong> ${escapeHtml(form.inspector || "—")}</td>
                            <td style="font-size:14px;color:#334155;padding:0 12px;"><strong>Date:</strong> ${escapeHtml(form.date || "—")}</td>
                            <td style="font-size:14px;color:#334155;padding:0 0 0 12px;"><strong>Time:</strong> ${escapeHtml(form.time || "—")}</td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>

                  <tr><td height="16"></td></tr>

                  <tr>
                    <td>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px 0; margin:0 -12px;">
                        <tr>
                          <td width="33.33%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;vertical-align:top;">
                            <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Areas Reviewed</div>
                            <div style="margin-top:10px;font-size:32px;font-weight:700;color:#0f172a;">${STRUCTURE.reduce((sum, g) => sum + g.areas.length, 0)}</div>
                          </td>
                          <td width="33.33%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;vertical-align:top;">
                            <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Issues Logged</div>
                            <div style="margin-top:10px;font-size:32px;font-weight:700;color:#e11d48;">${issueCount}</div>
                          </td>
                          <td width="33.33%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;vertical-align:top;">
                            <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Engineering Follow Up</div>
                            <div style="margin-top:10px;font-size:14px;font-weight:700;color:#0f172a;">Calls: ${callCount}<br/>HOTSOS: ${hotsosCount}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr><td height="16"></td></tr>
                  <tr><td>${floorBlocks}</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }, [detailedReport, form.date, form.inspector, form.time, issueCount, callCount, hotsosCount]);

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
    } catch (error) {
      setCopyMessage("Copy failed on this browser. Use Download Outlook HTML.");
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

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerCardStyle}>
          <div style={topHeaderStyle}>Conference Center Health & Safety Walk</div>
          <div style={topFieldsWrapStyle}>
            <input
              style={inputStyle}
              placeholder="Inspector"
              value={form.inspector}
              onChange={(e) => setTopField("inspector", e.target.value)}
            />
            <input
              style={inputStyle}
              type="date"
              value={form.date}
              onChange={(e) => setTopField("date", e.target.value)}
            />
            <input
              style={inputStyle}
              type="time"
              value={form.time}
              onChange={(e) => setTopField("time", e.target.value)}
            />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Floor Summary</div>
          <div style={summaryGridStyle}>
            {floorSummary.map((f) => (
              <div key={f.floor} style={summaryRowStyle}>
                <span style={{ fontWeight: 600 }}>{f.floor}</span>
                <span style={f.issues === 0 ? clearBadgeStyle : issueBadgeStyle}>
                  {f.issues === 0 ? "Clear" : `${f.issues} Issues`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={mainGridStyle}>
          <div>
            {STRUCTURE.map((group) => (
              <div key={group.floor} style={{ marginBottom: 16 }}>
                <div style={group.building === "Separate" ? floorHeaderPurple : floorHeaderGold}>
                  {group.floor}
                </div>

                {group.areas.map((area) => (
                  <div key={area.name} style={{ marginBottom: 10 }}>
                    <button
                      type="button"
                      style={pantryTileStyle}
                      onClick={() =>
                        setOpenAreas((prev) => ({ ...prev, [area.name]: !prev[area.name] }))
                      }
                    >
                      <span>{area.name}</span>
                      <span style={{ color: "#64748b", fontSize: 13 }}>
                        {openAreas[area.name] ? "▲" : "▼"}
                      </span>
                    </button>

                    {openAreas[area.name] && (
                      <div style={areaBodyStyle}>
                        {area.items.map((item) => {
                          const data = form.areas[area.name].items[item];
                          const issueMode = data.status === "Issue";

                          return (
                            <div key={item} style={itemCardStyle}>
                              <div style={itemTitleStyle}>{item}</div>

                              <div style={controlsGridStyle}>
                                <select
                                  style={selectStyle}
                                  value={data.status}
                                  onChange={(e) =>
                                    setItemField(area.name, item, "status", e.target.value)
                                  }
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
                                    style={selectStyle}
                                    value={data.temperature}
                                    onChange={(e) =>
                                      setItemField(area.name, item, "temperature", e.target.value)
                                    }
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
                                    style={selectStyle}
                                    value={data.issue}
                                    disabled={!issueMode}
                                    onChange={(e) =>
                                      setItemField(area.name, item, "issue", e.target.value)
                                    }
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
                                    style={selectStyle}
                                    value={data.issue}
                                    disabled={!issueMode}
                                    onChange={(e) =>
                                      setItemField(area.name, item, "issue", e.target.value)
                                    }
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
                                    style={selectStyle}
                                    value={data.engineerAction}
                                    disabled={!issueMode}
                                    onChange={(e) =>
                                      setItemField(
                                        area.name,
                                        item,
                                        "engineerAction",
                                        e.target.value
                                      )
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
                                    style={selectStyle}
                                    value={data.engineerAction}
                                    disabled={!issueMode}
                                    onChange={(e) =>
                                      setItemField(
                                        area.name,
                                        item,
                                        "engineerAction",
                                        e.target.value
                                      )
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
                                    style={fullWidthInputStyle}
                                    placeholder="HOTSOS #"
                                    value={data.hotsos}
                                    disabled={!issueMode || data.engineerAction !== "HOTSOS Logged"}
                                    onChange={(e) =>
                                      setItemField(area.name, item, "hotsos", e.target.value)
                                    }
                                  />
                                )}

                                {isTempItem(item) && (
                                  <input
                                    style={fullWidthInputStyle}
                                    placeholder="HOTSOS #"
                                    value={data.hotsos}
                                    disabled={!issueMode || data.engineerAction !== "HOTSOS Logged"}
                                    onChange={(e) =>
                                      setItemField(area.name, item, "hotsos", e.target.value)
                                    }
                                  />
                                )}
                              </div>

                              {issueMode && (
                                <div style={{ marginTop: 12 }}>
                                  <div style={smallLabelStyle}>Issue Photos</div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    onChange={(e) => addIssuePhotos(area.name, item, e.target.files)}
                                  />
                                  <div style={thumbWrapRowStyle}>
                                    {(data.photos || []).map((photo, pIdx) => (
                                      <div key={pIdx} style={{ position: "relative" }}>
                                        <img src={photo} alt="Issue" style={thumbStyle} />
                                        <button
                                          type="button"
                                          style={removeThumbButtonStyle}
                                          onClick={() => removeIssuePhoto(area.name, item, pIdx)}
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
                          style={textareaStyle}
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

          <div>
            <div style={cardStyle}>
              <div style={reportHeaderStyle}>Email Report Preview</div>

              <div style={buttonBarStyle}>
                <button type="button" style={darkBtn} onClick={copyHtmlEmail}>
                  Copy for Outlook
                </button>
                <button type="button" style={lightBtn} onClick={openOutlookDraft}>
                  Open Outlook Draft
                </button>
                <button type="button" style={goldBtn} onClick={downloadHtmlEmail}>
                  Download Outlook HTML
                </button>
                {copyMessage ? <span style={copyMessageStyle}>{copyMessage}</span> : null}
              </div>

              <div style={reportPreviewWrapStyle}>
                <div
                  style={reportInnerStyle}
                  dangerouslySetInnerHTML={{ __html: htmlEmail }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  background: "#f1f5f9",
  minHeight: "100vh",
  padding: 12,
  fontFamily: "Arial, sans-serif",
};

const containerStyle = {
  maxWidth: 1300,
  margin: "0 auto",
};

const headerCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  overflow: "hidden",
  marginBottom: 14,
};

const topHeaderStyle = {
  background: "#eab308",
  color: "#111827",
  fontWeight: "bold",
  fontSize: 24,
  padding: "18px 20px",
};

const topFieldsWrapStyle = {
  display: "grid",
  gap: 10,
  padding: 14,
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  overflow: "hidden",
  marginBottom: 14,
};

const cardTitleStyle = {
  fontWeight: "bold",
  fontSize: 20,
  color: "#111827",
  padding: "16px 18px 8px",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  padding: "0 14px 14px",
};

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "12px 14px",
  background: "#fff",
  gap: 8,
};

const clearBadgeStyle = {
  background: "#dcfce7",
  color: "#166534",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: "bold",
};

const issueBadgeStyle = {
  background: "#ffe4e6",
  color: "#be123c",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: "bold",
};

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 16,
};

const floorHeaderGold = {
  marginBottom: 8,
  padding: "12px 14px",
  background: "#eab308",
  color: "#111827",
  borderRadius: 10,
  fontWeight: "bold",
};

const floorHeaderPurple = {
  marginBottom: 8,
  padding: "12px 14px",
  background: "#ddd6fe",
  color: "#111827",
  borderRadius: 10,
  fontWeight: "bold",
};

const pantryTileStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 16px",
  marginBottom: 10,
  background: "#fef3c7",
  border: "1px solid #fde68a",
  borderRadius: 14,
  fontWeight: 700,
  fontSize: 18,
  cursor: "pointer",
  color: "#111827",
};

const areaBodyStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 12,
  marginTop: -2,
  marginBottom: 8,
};

const itemCardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
};

const itemTitleStyle = {
  fontWeight: 700,
  marginBottom: 10,
  color: "#111827",
};

const controlsGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 16,
  boxSizing: "border-box",
};

const selectStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  background: "#fff",
  boxSizing: "border-box",
};

const fullWidthInputStyle = {
  gridColumn: "1 / -1",
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  boxSizing: "border-box",
};

const textareaStyle = {
  width: "100%",
  minHeight: 95,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  boxSizing: "border-box",
};

const smallLabelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 6,
};

const thumbWrapRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 8,
};

const thumbStyle = {
  width: 64,
  height: 64,
  objectFit: "cover",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
};

const removeThumbButtonStyle = {
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
};

const reportHeaderStyle = {
  background: "#0f172a",
  color: "#fff",
  fontWeight: "bold",
  fontSize: 20,
  padding: "16px 18px",
};

const buttonBarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  padding: "12px 14px",
  borderBottom: "1px solid #e2e8f0",
};

const darkBtn = {
  padding: "10px 14px",
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const lightBtn = {
  padding: "10px 14px",
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  color: "#111827",
};

const goldBtn = {
  padding: "10px 14px",
  background: "#eab308",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  color: "#111827",
};

const copyMessageStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: "#475569",
};

const reportPreviewWrapStyle = {
  padding: 14,
  maxHeight: "80vh",
  overflow: "auto",
  background: "#fff",
};

const reportInnerStyle = {
  minWidth: 320,
};
