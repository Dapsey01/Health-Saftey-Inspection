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

function tempValues() {
  return Array.from({ length: 61 }, (_, i) => i - 10);
}

function buildInitialState() {
  const state = { inspector: "", date: "", time: "", areas: {} };

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

export default function CCWalkApp() {
  const [form, setForm] = useState(buildInitialState);
  const [openAreas, setOpenAreas] = useState({});
  const [copyMessage, setCopyMessage] = useState("");

  const setTopField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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

  const setAreaNotes = (area, value) => {
    setForm((prev) => ({
      ...prev,
      areas: {
        ...prev.areas,
        [area]: {
          ...prev.areas[area],
          notes: value,
        },
      },
    }));
  };

  const addPhotos = (area, item, files) => {
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
        const next = structuredClone(prev);
        next.areas[area].items[item].photos = [...next.areas[area].items[item].photos, ...images];
        return next;
      });
    });
  };

  const removePhoto = (area, item, index) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      next.areas[area].items[item].photos.splice(index, 1);
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
      return { floor: group.floor, issues, building: group.building };
    });
  }, [form]);

  const detailedReport = useMemo(() => {
    return STRUCTURE.map((group) => ({
      ...group,
      areas: group.areas.map((area) => {
        const issues = Object.entries(form.areas[area.name].items)
          .filter(([, item]) => item.status === "Issue")
          .map(([itemName, item]) => ({ itemName, ...item }));

        const temps = Object.entries(form.areas[area.name].items)
          .filter(([itemName, item]) => isTempItem(itemName) && item.temperature)
          .map(([itemName, item]) => ({ itemName, temperature: item.temperature }));

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
    (sum, group) => sum + group.areas.reduce((aSum, area) => aSum + area.issues.length, 0),
    0
  );

  const callCount = detailedReport.reduce(
    (sum, group) =>
      sum +
      group.areas.reduce(
        (aSum, area) =>
          aSum + area.issues.filter((issue) => issue.engineerAction === "Call Made").length,
        0
      ),
    0
  );

  const hotsosCount = detailedReport.reduce(
    (sum, group) =>
      sum +
      group.areas.reduce(
        (aSum, area) =>
          aSum + area.issues.filter((issue) => issue.engineerAction === "HOTSOS Logged").length,
        0
      ),
    0
  );

  const htmlEmail = useMemo(() => {
    const escapeHtml = (value) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

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
                            ${issue.temperature ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;border-radius:999px;padding:4px 8px;margin:0 6px 6px 0;">Temp ${escapeHtml(issue.temperature)}°F</span>` : ""}
                            ${issue.engineerAction && issue.engineerAction !== "No Action" ? `<span style="display:inline-block;background:#e2e8f0;color:#334155;font-size:12px;font-weight:700;border-radius:999px;padding:4px 8px;margin:0 6px 6px 0;">${escapeHtml(issue.engineerAction)}</span>` : ""}
                            ${issue.hotsos ? `<span style="display:inline-block;background:#ffe4e6;color:#be123c;font-size:12px;font-weight:700;border-radius:999px;padding:4px 8px;margin:0 6px 6px 0;">HOTSOS #${escapeHtml(issue.hotsos)}</span>` : ""}
                          </div>
                        </td>
                        <td valign="top" width="110">
                          ${issue.photos && issue.photos[0]
                            ? `<img src="${issue.photos[0]}" alt="Issue photo" width="110" style="display:block;width:110px;height:96px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;" />`
                            : `<div style="width:110px;height:96px;border-radius:12px;border:1px dashed #cbd5e1;color:#94a3b8;font-size:12px;text-align:center;line-height:96px;">No Photo</div>`}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="10"></td></tr>`
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
              ? `<div style="margin-top:12px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;padding:12px;"><div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:6px;">Notes</div><div style="color:#334155;font-size:14px;line-height:1.5;">${escapeHtml(area.notes)}</div></div>`
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

    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f1f5f9;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:860px;border-collapse:collapse;"><tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;"><div style="background:#eab308;color:#0f172a;font-size:26px;font-weight:700;padding:22px 24px;">Conference Center Health &amp; Safety Walk Report</div><div style="padding:18px 24px;background:#ffffff;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="font-size:14px;color:#334155;padding:0 12px 0 0;"><strong>Inspector:</strong> ${escapeHtml(form.inspector || "—")}</td><td style="font-size:14px;color:#334155;padding:0 12px;"><strong>Date:</strong> ${escapeHtml(form.date || "—")}</td><td style="font-size:14px;color:#334155;padding:0 0 0 12px;"><strong>Time:</strong> ${escapeHtml(form.time || "—")}</td></tr></table></div></td></tr><tr><td height="16"></td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px 0; margin:0 -12px;"><tr><td width="33.33%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;vertical-align:top;"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Areas Reviewed</div><div style="margin-top:10px;font-size:32px;font-weight:700;color:#0f172a;">${STRUCTURE.reduce((sum, g) => sum + g.areas.length, 0)}</div></td><td width="33.33%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;vertical-align:top;"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Issues Logged</div><div style="margin-top:10px;font-size:32px;font-weight:700;color:#e11d48;">${issueCount}</div></td><td width="33.33%" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:18px;vertical-align:top;"><div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Engineering Follow Up</div><div style="margin-top:10px;font-size:14px;font-weight:700;color:#0f172a;">Calls: ${callCount}<br/>HOTSOS: ${hotsosCount}</div></td></tr></table></td></tr><tr><td height="16"></td></tr><tr><td>${floorBlocks}</td></tr></table></td></tr></table></body></html>`;
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
    const subject = encodeURIComponent(`Conference Center Health & Safety Walk Report${form.date ? ` - ${form.date}` : ""}`);
    const body = encodeURIComponent("Your formatted report is copied. Paste it into the body of this Outlook message for best results.");
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
    <div className="min-h-screen bg-slate-100 p-3 md:p-6">
      <style>{`
        body { font-family: Arial, sans-serif; }
        .soft-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .soft-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-yellow-500 px-4 py-4 text-xl font-bold text-slate-900">Conference Center Health &amp; Safety Walk</div>
          <div className="grid gap-2 p-4 md:grid-cols-3">
            <input className="rounded-xl border border-slate-300 px-3 py-3" placeholder="Inspector" value={form.inspector} onChange={(e) => setTopField("inspector", e.target.value)} />
            <input className="rounded-xl border border-slate-300 px-3 py-3" type="date" value={form.date} onChange={(e) => setTopField("date", e.target.value)} />
            <input className="rounded-xl border border-slate-300 px-3 py-3" type="time" value={form.time} onChange={(e) => setTopField("time", e.target.value)} />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-3 text-lg font-bold text-slate-900">Floor Summary</div>
          <div className="grid gap-2 p-4 md:grid-cols-3">
            {floorSummary.map((f) => (
              <div key={f.floor} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3">
                <span className="font-medium text-slate-800">{f.floor}</span>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${f.issues === 0 ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"}`}>
                  {f.issues === 0 ? "Clear" : `${f.issues} Issues`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            {STRUCTURE.map((group) => (
              <div key={group.floor}>
                <div className={`mb-2 rounded-xl px-4 py-3 font-bold ${group.building === "Separate" ? "bg-purple-200 text-slate-900" : "bg-yellow-500 text-slate-900"}`}>
                  {group.floor}
                </div>

                {group.areas.map((area) => (
                  <div key={area.name} className="mb-3">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-4 text-left text-lg font-semibold text-slate-900 shadow-sm"
                      onClick={() => setOpenAreas((prev) => ({ ...prev, [area.name]: !prev[area.name] }))}
                    >
                      <span>{area.name}</span>
                      <span className="text-sm text-slate-500">{openAreas[area.name] ? "▲" : "▼"}</span>
                    </button>

                    {openAreas[area.name] && (
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        {area.items.map((item) => {
                          const data = form.areas[area.name].items[item];
                          const issueMode = data.status === "Issue";

                          return (
                            <div key={item} className="mb-3 rounded-xl border border-slate-200 p-3 last:mb-0">
                              <div className="mb-2 font-semibold text-slate-900">{item}</div>

                              <div className="grid grid-cols-2 gap-2">
                                <select className="rounded-xl border border-slate-300 px-3 py-3" value={data.status} onChange={(e) => setItemField(area.name, item, "status", e.target.value)}>
                                  <option value="">Status ▼</option>
                                  {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>

                                {isTempItem(item) ? (
                                  <select className="rounded-xl border border-slate-300 px-3 py-3" value={data.temperature} onChange={(e) => setItemField(area.name, item, "temperature", e.target.value)}>
                                    <option value="">Temp °F ▼</option>
                                    {tempValues().map((t) => <option key={t} value={t}>{t}°F</option>)}
                                  </select>
                                ) : (
                                  <select className="rounded-xl border border-slate-300 px-3 py-3" value={data.issue} disabled={!issueMode} onChange={(e) => setItemField(area.name, item, "issue", e.target.value)}>
                                    <option value="">Issue ▼</option>
                                    {(ISSUE_OPTIONS[item] || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                )}

                                {isTempItem(item) ? (
                                  <select className="rounded-xl border border-slate-300 px-3 py-3" value={data.issue} disabled={!issueMode} onChange={(e) => setItemField(area.name, item, "issue", e.target.value)}>
                                    <option value="">Issue ▼</option>
                                    {(ISSUE_OPTIONS[item] || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                ) : (
                                  <select className="rounded-xl border border-slate-300 px-3 py-3" value={data.engineerAction} disabled={!issueMode} onChange={(e) => setItemField(area.name, item, "engineerAction", e.target.value)}>
                                    <option value="">Engineer Action ▼</option>
                                    {ACTION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                )}

                                {isTempItem(item) ? (
                                  <select className="rounded-xl border border-slate-300 px-3 py-3" value={data.engineerAction} disabled={!issueMode} onChange={(e) => setItemField(area.name, item, "engineerAction", e.target.value)}>
                                    <option value="">Engineer Action ▼</option>
                                    {ACTION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                ) : (
                                  <input className="col-span-2 rounded-xl border border-slate-300 px-3 py-3" placeholder="HOTSOS #" value={data.hotsos} disabled={!issueMode || data.engineerAction !== "HOTSOS Logged"} onChange={(e) => setItemField(area.name, item, "hotsos", e.target.value)} />
                                )}

                                {isTempItem(item) && (
                                  <input className="col-span-2 rounded-xl border border-slate-300 px-3 py-3" placeholder="HOTSOS #" value={data.hotsos} disabled={!issueMode || data.engineerAction !== "HOTSOS Logged"} onChange={(e) => setItemField(area.name, item, "hotsos", e.target.value)} />
                                )}
                              </div>

                              {issueMode && (
                                <div className="mt-3">
                                  <div className="mb-1 text-sm font-medium text-slate-600">Issue Photos</div>
                                  <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => addPhotos(area.name, item, e.target.files)} />
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(data.photos || []).map((photo, pIdx) => (
                                      <div key={pIdx} className="relative">
                                        <img src={photo} alt="Issue" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
                                        <button type="button" onClick={() => removePhoto(area.name, item, pIdx)} className="absolute right-1 top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">X</button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <textarea className="min-h-[90px] w-full rounded-xl border border-slate-300 px-3 py-3" placeholder="Notes" value={form.areas[area.name].notes} onChange={(e) => setAreaNotes(area.name, e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-slate-900 px-4 py-4 text-lg font-bold text-white">Email Report Preview</div>
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
                <button type="button" onClick={copyHtmlEmail} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Copy for Outlook</button>
                <button type="button" onClick={openOutlookDraft} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Open Outlook Draft</button>
                <button type="button" onClick={downloadHtmlEmail} className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-slate-900">Download Outlook HTML</button>
                {copyMessage && <span className="text-sm font-medium text-slate-600">{copyMessage}</span>}
              </div>

              <div className="space-y-4 p-4 soft-scroll max-h-[80vh] overflow-auto">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xl font-bold text-slate-900">Conference Center Health &amp; Safety Walk Report</div>
                  <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-3">
                    <div><span className="font-semibold">Inspector:</span> {form.inspector || "—"}</div>
                    <div><span className="font-semibold">Date:</span> {form.date || "—"}</div>
                    <div><span className="font-semibold">Time:</span> {form.time || "—"}</div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Areas Reviewed</div>
                    <div className="mt-2 text-3xl font-bold text-slate-900">{STRUCTURE.reduce((sum, g) => sum + g.areas.length, 0)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Issues Logged</div>
                    <div className="mt-2 text-3xl font-bold text-rose-600">{issueCount}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Engineering Follow Up</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">Calls: {callCount} • HOTSOS: {hotsosCount}</div>
                  </div>
                </div>

                {detailedReport.map((group) => (
                  <div key={group.floor} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className={`px-4 py-3 font-bold ${group.building === "Separate" ? "bg-purple-200 text-slate-900" : "bg-yellow-500 text-slate-900"}`}>
                      {group.floor}
                    </div>

                    <div className="space-y-3 p-4">
                      {group.areas.map((area) => {
                        const hasContent = area.issues.length || area.temps.length || area.notes;

                        return (
                          <div key={area.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-3 text-lg font-bold text-slate-900">{area.name}</div>

                            {!hasContent && <div className="text-sm text-slate-500">No issues noted.</div>}

                            {!!area.issues.length && (
                              <div className="space-y-3">
                                {area.issues.map((issue, idx) => (
                                  <div key={`${area.name}-${issue.itemName}-${idx}`} className="grid gap-3 rounded-xl border border-rose-200 bg-white p-3 md:grid-cols-[1fr,110px]">
                                    <div>
                                      <div className="font-semibold text-slate-900">{issue.itemName}</div>
                                      <div className="mt-1 text-sm text-slate-700">{issue.issue || "Issue logged"}</div>
                                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        {issue.temperature && <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">Temp {issue.temperature}°F</span>}
                                        {issue.engineerAction && issue.engineerAction !== "No Action" && <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{issue.engineerAction}</span>}
                                        {issue.hotsos && <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">HOTSOS #{issue.hotsos}</span>}
                                      </div>
                                    </div>
                                    {issue.photos && issue.photos[0] ? (
                                      <img src={issue.photos[0]} alt="Issue" className="h-24 w-full rounded-xl border border-slate-200 object-cover" />
                                    ) : (
                                      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">No Photo</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {!!area.temps.length && (
                              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <div className="grid grid-cols-[1.5fr,1fr] bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                                  <div>Temperature Log</div>
                                  <div>Reading</div>
                                </div>
                                {area.temps.map((temp, idx) => (
                                  <div key={`${area.name}-temp-${idx}`} className="grid grid-cols-[1.5fr,1fr] border-t border-slate-200 px-3 py-2 text-sm">
                                    <div>{temp.itemName}</div>
                                    <div className="font-semibold">{temp.temperature}°F</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {!!area.notes && (
                              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                <div className="mb-1 font-semibold text-slate-900">Notes</div>
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
  );
}
