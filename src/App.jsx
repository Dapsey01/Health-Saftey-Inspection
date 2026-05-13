import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "cc_walk_form";
const HISTORY_KEY = "cc_walk_history";

const STATUS_OPTIONS = ["OK", "Issue"];
const ACTION_OPTIONS = ["No Action", "Call Made", "HOTSOS Logged"];

const MAX_PHOTOS_PER_ITEM = 3;
const PHOTO_MAX_DIMENSION = 900;
const PHOTO_QUALITY = 0.65;

const ISSUE_OPTIONS = {
  "Hand Sink": ["Needs Cleaning", "Needs Soap", "Needs Paper Towels", "No Hot Water", "Needs Trash Can"],
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
      { name: "Pantry 110", items: ["Hand Sink", "Reach-in Fridge"] },
      { name: "Pantry 108", items: ["Hand Sink", "Reach-in Fridge"] },
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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isTempItem(item) {
  return item.startsWith("Reach-in") || item === "Walk-in" || item === "Walk-in Cooler";
}

function getIssueOptions(item) {
  if (item.startsWith("Reach-in")) return ISSUE_OPTIONS["Reach-in Fridge"];
  return ISSUE_OPTIONS[item] || [];
}

function isOutOfRange(value) {
  if (value === "" || value === null || value === undefined) return false;
  const num = Number(value);
  return num < 33 || num > 41;
}

function tempValues() {
  const values = [];
  for (let v = 29; v <= 60; v += 0.5) {
    values.push(Number.isInteger(v) ? v : Number(v.toFixed(1)));
  }
  return values;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTagDate(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const [year, month, day] = parts;
  return `${Number(month)}/${Number(day)}/${String(year).slice(-2)}`;
}

function formatTagTime(value) {
  if (!value) return "";
  const parts = value.split(":");
  if (parts.length < 2) return value;

  let hour = Number(parts[0]);
  const minute = parts[1];
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${suffix}`;
}

function sortAreasForDisplay(group) {
  if (group.floor !== "1st Floor") return group.areas;

  const pantries = group.areas.filter((area) => area.name.toLowerCase().startsWith("pantry"));
  const otherAreas = group.areas.filter((area) => !area.name.toLowerCase().startsWith("pantry"));

  const getSortParts = (name) => {
    const match = name.match(/(\d+)([A-Za-z]*)/);
    if (!match) return { number: 9999, suffix: "" };
    return {
      number: Number(match[1]),
      suffix: match[2] || "",
    };
  };

  pantries.sort((a, b) => {
    const aParts = getSortParts(a.name);
    const bParts = getSortParts(b.name);

    if (aParts.number !== bParts.number) return aParts.number - bParts.number;
    return aParts.suffix.localeCompare(bParts.suffix);
  });

  return [...pantries, ...otherAreas];
}

function compressImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
          resolve(compressed);
        } catch {
          resolve(reader.result);
        }
      };

      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };

    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
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

function normalizeFormData(raw) {
  const base = buildInitialState();
  if (!raw || typeof raw !== "object") return base;

  base.inspector = raw.inspector || "";
  base.date = raw.date || "";
  base.time = raw.time || "";

  Object.keys(base.areas).forEach((areaName) => {
    const rawArea = raw.areas?.[areaName];
    if (!rawArea) return;

    base.areas[areaName].notes = rawArea.notes || "";

    Object.keys(base.areas[areaName].items).forEach((itemName) => {
      const rawItem = rawArea.items?.[itemName];
      if (!rawItem) return;

      base.areas[areaName].items[itemName] = {
        status: rawItem.status || "",
        issue: rawItem.issue || "",
        temperature: rawItem.temperature || "",
        engineerAction: rawItem.engineerAction || "",
        hotsos: rawItem.hotsos || "",
        photos: Array.isArray(rawItem.photos) ? rawItem.photos.slice(0, MAX_PHOTOS_PER_ITEM) : [],
      };
    });
  });

  return base;
}

function stripPhotosFromForm(form) {
  return deepClone(form);
}

export default function App() {
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeFormData(JSON.parse(saved)) : buildInitialState();
    } catch {
      return buildInitialState();
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [openAreaName, setOpenAreaName] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const areaRefs = useRef({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch (err) {
      console.warn("Auto-save skipped:", err);
      setCopyMessage("Auto-save skipped. Too much photo data. Delete extra photos.");
      setTimeout(() => setCopyMessage(""), 4000);
    }
  }, [form]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
      console.warn("History save skipped:", err);
    }
  }, [history]);

  const setTopField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setAreaNotes = (areaName, value) => {
    setForm((prev) => {
      const next = deepClone(prev);
      next.areas[areaName].notes = value;
      return next;
    });
  };

  const setItemField = (areaName, itemName, field, value) => {
    setForm((prev) => {
      const next = deepClone(prev);
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

  const addIssuePhotos = async (areaName, itemName, files) => {
    if (!files || !files.length) return;

    try {
      const currentPhotos = form.areas[areaName].items[itemName].photos || [];
      const remainingSlots = MAX_PHOTOS_PER_ITEM - currentPhotos.length;

      if (remainingSlots <= 0) {
        setCopyMessage(`Photo limit reached: max ${MAX_PHOTOS_PER_ITEM} photos per issue.`);
        setTimeout(() => setCopyMessage(""), 3000);
        return;
      }

      const selectedFiles = Array.from(files).slice(0, remainingSlots);
      const compressedImages = (await Promise.all(selectedFiles.map((file) => compressImageFile(file)))).filter(Boolean);

      if (!compressedImages.length) {
        setCopyMessage("Photo could not be added.");
        setTimeout(() => setCopyMessage(""), 3000);
        return;
      }

      setForm((prev) => {
        const next = deepClone(prev);
        const current = next.areas[areaName].items[itemName].photos || [];
        next.areas[areaName].items[itemName].photos = [...current, ...compressedImages].slice(0, MAX_PHOTOS_PER_ITEM);
        return next;
      });

      if (Array.from(files).length > remainingSlots) {
        setCopyMessage(`Added ${remainingSlots} photo${remainingSlots === 1 ? "" : "s"}. Max ${MAX_PHOTOS_PER_ITEM} per issue.`);
      } else {
        setCopyMessage("Photo compressed and saved.");
      }

      setTimeout(() => setCopyMessage(""), 3000);
    } catch (err) {
      console.warn("Photo upload failed:", err);
      setCopyMessage("Photo upload failed. Try one photo at a time.");
      setTimeout(() => setCopyMessage(""), 3000);
    }
  };

  const removeIssuePhoto = (areaName, itemName, index) => {
    setForm((prev) => {
      const next = deepClone(prev);
      next.areas[areaName].items[itemName].photos.splice(index, 1);
      return next;
    });
  };

  const handleAreaToggle = (areaName) => {
    setOpenAreaName((prev) => {
      const next = prev === areaName ? "" : areaName;

      if (next) {
        requestAnimationFrame(() => {
          const el = areaRefs.current[areaName];
          if (!el) return;

          const rect = el.getBoundingClientRect();
          const targetTop = window.scrollY + rect.top - window.innerHeight * 0.18;

          window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: "smooth",
          });
        });
      }

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
      areas: sortAreasForDisplay(group).map((area) => {
        const areaItems = form.areas[area.name].items;

        const issues = Object.entries(areaItems)
          .filter(([, item]) => item.status === "Issue")
          .map(([itemName, item]) => ({
            itemName,
            ...item,
          }));

        const temps = Object.entries(areaItems)
          .filter(([itemName, item]) => isTempItem(itemName) && item.temperature !== "")
          .map(([itemName, item]) => ({
            itemName,
            temperature: item.temperature,
          }));

        const routineChecks = Object.entries(areaItems)
          .filter(([itemName]) => itemName === "Hand Sink" || itemName === "Ice Machine")
          .map(([itemName, item]) => ({
            itemName,
            status: item.status === "Issue" ? "Issue" : "OK",
            issue: item.status === "Issue" ? item.issue || "Issue logged" : "No issues noted",
          }));

        return {
          name: area.name,
          issues,
          temps,
          routineChecks,
          notes: form.areas[area.name].notes,
        };
      }),
    }));
  }, [form]);

  const hotsosTagIssues = useMemo(() => {
    const tags = [];

    STRUCTURE.forEach((group) => {
      sortAreasForDisplay(group).forEach((area) => {
        const areaItems = form.areas[area.name]?.items || {};
        Object.entries(areaItems).forEach(([itemName, item]) => {
          if (
            item.status === "Issue" &&
            item.engineerAction === "HOTSOS Logged" &&
            String(item.hotsos || "").trim()
          ) {
            tags.push({
              floor: group.floor,
              area: area.name,
              itemName,
              issue: item.issue || "Issue logged",
              hotsos: item.hotsos,
              date: form.date,
              time: form.time,
            });
          }
        });
      });
    });

    return tags;
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

  const reportSubject = `CC Walk - ${form.inspector || "Supervisor"} - ${form.date || "No Date"}`;

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

  const saveWalk = () => {
    const entry = {
      id: Date.now(),
      savedAt: new Date().toLocaleString(),
      inspector: form.inspector || "Unknown",
      date: form.date || "",
      time: form.time || "",
      issues: issueCount,
      data: stripPhotosFromForm(form),
    };
    setHistory((prev) => [entry, ...prev]);
    setCopyMessage("Walk saved.");
    setTimeout(() => setCopyMessage(""), 2000);
  };

  const loadWalk = (entry) => {
    setForm(normalizeFormData(deepClone(entry.data)));
    setOpenAreaName("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteWalk = (id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const newWalk = () => {
    localStorage.removeItem(STORAGE_KEY);
    setForm(buildInitialState());
    setOpenAreaName("");
  };

  const scrollToHistory = () => {
    const el = document.getElementById("walk-history-section");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const hotsosTagsHtml = useMemo(() => {
    const tagsHtml = hotsosTagIssues.length
      ? hotsosTagIssues
          .map(
            (tag) => `
              <section class="tag-page">
                <div class="tag-card">
                  <div class="item-name">${escapeHtml(tag.itemName).toUpperCase()}</div>
                  <div class="out-of-order">OUT OF ORDER</div>
                  <div class="hotsos">HotSOS #${escapeHtml(tag.hotsos)}</div>
                  <div class="date">${escapeHtml(formatTagDate(tag.date))}</div>
                  <div class="time">${escapeHtml(formatTagTime(tag.time))}</div>
                  <div class="location">${escapeHtml(tag.area)} • ${escapeHtml(tag.floor)}</div>
                  <div class="issue">${escapeHtml(tag.issue)}</div>
                </div>
              </section>
            `
          )
          .join("")
      : `
          <section class="tag-page">
            <div class="tag-card">
              <div class="item-name">NO HOTSOS</div>
              <div class="out-of-order">TAGS FOUND</div>
              <div class="hotsos">No items currently have a HOTSOS # entered.</div>
            </div>
          </section>
        `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>HOT SOS Tags</title>
          <style>
            @page {
              size: letter portrait;
              margin: 0.5in;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              background: #ffffff;
              color: #000000;
            }

            .tag-page {
              min-height: 10in;
              page-break-after: always;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .tag-page:last-child {
              page-break-after: auto;
            }

            .tag-card {
              width: 7.5in;
              min-height: 5.2in;
              border: 3px solid #000000;
              padding: 0.42in 0.35in;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }

            .item-name {
              color: #e60000;
              font-size: 54px;
              line-height: 1.05;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 26px;
            }

            .out-of-order {
              color: #e60000;
              font-size: 54px;
              line-height: 1.05;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 34px;
            }

            .hotsos {
              font-size: 48px;
              line-height: 1.15;
              font-weight: 500;
              margin-bottom: 28px;
            }

            .date {
              font-size: 46px;
              line-height: 1.15;
              font-weight: 500;
              margin-bottom: 10px;
            }

            .time {
              font-size: 42px;
              line-height: 1.15;
              font-weight: 500;
              margin-bottom: 22px;
            }

            .location {
              font-size: 22px;
              line-height: 1.3;
              font-weight: 700;
              margin-top: 6px;
            }

            .issue {
              font-size: 18px;
              line-height: 1.3;
              margin-top: 8px;
              color: #333333;
            }

            @media print {
              body {
                background: #ffffff;
              }
            }
          </style>
        </head>
        <body>
          ${tagsHtml}
        </body>
      </html>
    `;
  }, [hotsosTagIssues]);

  const htmlEmail = useMemo(() => {
    const floorSummaryHtml = `
      <div style="margin:16px 0;border:1px solid #dbe2ea;border-radius:18px;background:#ffffff;padding:16px;">
        <div style="font-weight:700;font-size:16px;color:#111827;margin-bottom:10px;">Floor Summary</div>
        ${floorSummary
          .map(
            (f) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-top:1px solid #e5e7eb;">
              <div style="font-size:14px;color:#111827;">${escapeHtml(f.floor)}</div>
              <div style="font-size:13px;font-weight:700;color:${f.issues === 0 ? "#15803d" : "#dc2626"};">
                ${f.issues === 0 ? "Clear" : `${f.issues} Issues`}
              </div>
            </div>`
          )
          .join("")}
      </div>
    `;

    const floorBlocks = detailedReport
      .map((group) => {
        const headerBg = group.building === "Separate" ? "#ede9fe" : "#dbeafe";
        const headerText = "#111827";

        const areaHtml = group.areas
          .map((area) => {
            const hasContent =
              area.issues.length || area.temps.length || area.notes || area.routineChecks.length;

            const routineChecksHtml = area.routineChecks.length
              ? `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
                  <tr>
                    <td colspan="2" style="background:#f8fafc;color:#475569;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Routine Checks</td>
                  </tr>
                  ${area.routineChecks
                    .map(
                      (check) => `
                      <tr>
                        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-size:14px;">${escapeHtml(check.itemName)}</td>
                        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:${check.status === "OK" ? "#15803d" : "#b91c1c"};font-size:14px;font-weight:700;text-align:right;">${escapeHtml(check.status)}${check.status === "OK" ? "" : ` - ${escapeHtml(check.issue)}`}</td>
                      </tr>`
                    )
                    .join("")}
                </table>`
              : "";

            const issuesHtml = area.issues
              .map(
                (issue) => `
                <tr>
                  <td style="padding:12px;border:1px solid #fecdd3;background:#ffffff;border-radius:12px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td valign="top" style="padding-right:12px;">
                          <div style="font-weight:700;color:#111827;font-size:15px;">${escapeHtml(issue.itemName)}</div>
                          <div style="margin-top:4px;color:#475569;font-size:14px;line-height:1.4;">${escapeHtml(issue.issue || "Issue logged")}</div>
                          <div style="margin-top:8px;">
                            ${
                              issue.temperature
                                ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;border-radius:999px;padding:4px 8px;margin:0 6px 6px 0;">Temp ${escapeHtml(issue.temperature)}°F</span>`
                                : ""
                            }
                            ${
                              issue.engineerAction && issue.engineerAction !== "No Action"
                                ? `<span style="display:inline-block;background:#e5e7eb;color:#374151;font-size:12px;font-weight:700;border-radius:999px;padding:4px 8px;margin:0 6px 6px 0;">${escapeHtml(issue.engineerAction)}</span>`
                                : ""
                            }
                            ${
                              issue.hotsos
                                ? `<span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:700;border-radius:999px;padding:4px 8px;margin:0 6px 6px 0;">HOTSOS #${escapeHtml(issue.hotsos)}</span>`
                                : ""
                            }
                          </div>
                        </td>
                        <td valign="top" width="110">
                          ${
                            issue.photos && issue.photos[0]
                              ? `<img src="${issue.photos[0]}" alt="Issue photo" width="110" style="display:block;width:110px;height:96px;object-fit:cover;border-radius:12px;border:1px solid #d1d5db;" />`
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
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
                  <tr>
                    <td style="background:#f8fafc;color:#475569;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Temperature Log</td>
                    <td style="background:#f8fafc;color:#475569;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:10px 12px;border-bottom:1px solid #e5e7eb;">Reading</td>
                  </tr>
                  ${area.temps
                    .map(
                      (temp) => `
                      <tr>
                        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-size:14px;">${escapeHtml(temp.itemName)}</td>
                        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:700;">${escapeHtml(temp.temperature)}°F</td>
                      </tr>`
                    )
                    .join("")}
                </table>`
              : "";

            const notesHtml = area.notes
              ? `<div style="margin-top:12px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;padding:12px;"><div style="font-weight:700;color:#111827;font-size:14px;margin-bottom:6px;">Notes</div><div style="color:#475569;font-size:14px;line-height:1.5;">${escapeHtml(area.notes)}</div></div>`
              : "";

            return `
              <div style="margin-top:12px;border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;padding:16px;">
                <div style="font-weight:700;font-size:18px;color:#111827;margin-bottom:8px;">${escapeHtml(area.name)}</div>
                ${!hasContent ? `<div style="font-size:14px;color:#64748b;">No issues noted.</div>` : ""}
                ${routineChecksHtml}
                ${issuesHtml ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">${issuesHtml}</table>` : ""}
                ${tempsHtml}
                ${notesHtml}
              </div>`;
          })
          .join("");

        return `
          <div style="margin-top:18px;border:1px solid #dbe2ea;border-radius:18px;overflow:hidden;background:#ffffff;">
            <div style="background:${headerBg};color:${headerText};font-weight:700;font-size:18px;padding:14px 18px;border-bottom:1px solid #dbe2ea;">
              ${escapeHtml(group.floor)}
            </div>
            <div style="padding:16px;">
              ${areaHtml}
            </div>
          </div>`;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f3f4f6;">
            <tr>
              <td align="center" style="padding:24px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:860px;border-collapse:collapse;">
                  <tr>
                    <td style="background:#ffffff;border:1px solid #dbe2ea;border-radius:22px;overflow:hidden;">
                      <div style="background:#e5eefc;color:#111827;font-size:26px;font-weight:700;padding:22px 24px;border-bottom:1px solid #dbe2ea;">
                        Conference Center Health &amp; Safety Walk Report
                      </div>
                      <div style="padding:18px 24px;background:#ffffff;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td style="font-size:14px;color:#374151;padding:0 12px 0 0;"><strong>Inspector:</strong> ${escapeHtml(form.inspector || "—")}</td>
                            <td style="font-size:14px;color:#374151;padding:0 12px;"><strong>Date:</strong> ${escapeHtml(form.date || "—")}</td>
                            <td style="font-size:14px;color:#374151;padding:0 0 0 12px;"><strong>Time:</strong> ${escapeHtml(formatTagTime(form.time) || form.time || "—")}</td>
                          </tr>
                          <tr>
                            <td colspan="3" style="font-size:13px;color:#64748b;padding-top:10px;"><strong>Subject:</strong> ${escapeHtml(reportSubject)}</td>
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
                          <td width="33.33%" style="background:#ffffff;border:1px solid #dbe2ea;border-radius:18px;padding:18px;vertical-align:top;">
                            <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Areas Reviewed</div>
                            <div style="margin-top:10px;font-size:32px;font-weight:700;color:#111827;">${STRUCTURE.reduce((sum, g) => sum + g.areas.length, 0)}</div>
                          </td>
                          <td width="33.33%" style="background:#ffffff;border:1px solid #dbe2ea;border-radius:18px;padding:18px;vertical-align:top;">
                            <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Issues Logged</div>
                            <div style="margin-top:10px;font-size:32px;font-weight:700;color:#dc2626;">${issueCount}</div>
                          </td>
                          <td width="33.33%" style="background:#ffffff;border:1px solid #dbe2ea;border-radius:18px;padding:18px;vertical-align:top;">
                            <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Engineering Follow Up</div>
                            <div style="margin-top:10px;font-size:14px;font-weight:700;color:#111827;">Calls: ${callCount}<br/>HOTSOS: ${hotsosCount}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr><td height="16"></td></tr>

                  <tr>
                    <td>
                      ${floorSummaryHtml}
                      ${floorBlocks}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }, [detailedReport, floorSummary, form.date, form.inspector, form.time, issueCount, callCount, hotsosCount, reportSubject]);

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
      setCopyMessage("Copy failed on this browser. Use Download Report.");
      setTimeout(() => setCopyMessage(""), 3000);
    }
  };

  const openOutlookDraft = () => {
    const subject = encodeURIComponent(reportSubject);
    const body = encodeURIComponent(
      "Your formatted report is copied. Paste it into the body of this Outlook message for best results."
    );
    const url = `https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`;
    window.open(url, "_blank");
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

  const downloadHotsosTags = () => {
    const blob = new Blob([hotsosTagsHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hotsos-tags-${form.date || "draft"}.html`;
    link.click();
    URL.revokeObjectURL(url);

    if (!hotsosTagIssues.length) {
      setCopyMessage("No HOTSOS tags found.");
    } else {
      setCopyMessage(`Downloaded ${hotsosTagIssues.length} HOTSOS tag${hotsosTagIssues.length === 1 ? "" : "s"}.`);
    }

    setTimeout(() => setCopyMessage(""), 2500);
  };

  const styles = {
    page: { background: "#020617", minHeight: "100vh", padding: 12, fontFamily: "Arial, sans-serif" },
    container: { maxWidth: 1100, margin: "0 auto" },
    card: { background: "#334155", border: "1px solid #1f2937", borderRadius: 18, overflow: "hidden", marginBottom: 14 },
    topHeader: { background: "#1e3a8a", color: "#ffffff", fontWeight: "bold", fontSize: 22, padding: "16px 18px", borderBottom: "1px solid #3b82f6", boxShadow: "0 0 10px rgba(59,130,246,0.3)" },
    topFields: { display: "grid", gap: 10, padding: 14 },
    topButtonRow: { display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" },
    input: { width: "100%", padding: 14, borderRadius: 18, border: "1px solid #334155", fontSize: 18, fontWeight: 600, boxSizing: "border-box", background: "linear-gradient(145deg, #475569, #1e293b)", color: "#ffffff", boxShadow: "0 6px 14px rgba(0,0,0,0.4), 0 0 10px rgba(148,163,184,0.25), inset 0 2px 0 rgba(255,255,255,0.12)", outline: "none" },
    textarea: { width: "100%", minHeight: 95, padding: 14, borderRadius: 18, border: "1px solid #334155", fontSize: 15, boxSizing: "border-box", background: "linear-gradient(145deg, #475569, #1e293b)", color: "#ffffff", boxShadow: "0 6px 14px rgba(0,0,0,0.4), 0 0 10px rgba(148,163,184,0.25), inset 0 2px 0 rgba(255,255,255,0.12)", outline: "none" },
    select: { width: "100%", padding: 14, borderRadius: 18, border: "1px solid #334155", fontSize: 15, fontWeight: 600, boxSizing: "border-box", background: "linear-gradient(145deg, #475569, #1e293b)", color: "#ffffff", boxShadow: "0 6px 14px rgba(0,0,0,0.4), 0 0 10px rgba(148,163,184,0.25), inset 0 2px 0 rgba(255,255,255,0.12)", outline: "none" },
    disabled: { opacity: 0.55 },
    tempAlert: { border: "1px solid #ef4444", background: "#450a0a", color: "#fecaca" },
    sectionTitle: { fontWeight: "bold", fontSize: 19, padding: "14px 16px 8px", color: "#ffffff" },
    mainStack: { display: "grid", gridTemplateColumns: "1fr", gap: 16 },
    floorHeaderBlue: { marginBottom: 8, padding: "12px 14px", background: "#1e3a8a", color: "#ffffff", borderRadius: 10, fontWeight: "bold", boxShadow: "0 0 10px rgba(59,130,246,0.3)" },
    floorHeaderPurple: { marginBottom: 8, padding: "12px 14px", background: "#6d28d9", color: "#ffffff", borderRadius: 10, fontWeight: "bold" },
    pantryTile: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", marginBottom: 10, background: "linear-gradient(145deg, #475569, #334155)", border: "1px solid #334155", borderRadius: 18, fontWeight: 700, fontSize: 18, cursor: "pointer", color: "#f8fafc", boxShadow: "0 6px 14px rgba(0,0,0,0.4), 0 0 10px rgba(148,163,184,0.18), inset 0 2px 0 rgba(255,255,255,0.12)" },
    chevron: { color: "#93c5fd", fontSize: 13 },
    areaBody: { background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 12, marginTop: -2, marginBottom: 8 },
    itemCard: { border: "1px solid #1f2937", background: "#020617", borderRadius: 12, padding: 12, marginBottom: 12 },
    itemTitle: { fontWeight: 700, marginBottom: 10, color: "#f8fafc" },
    twoColGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
    smallLabel: { fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 },
    photoRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, alignItems: "flex-start" },
    thumb: { width: 64, height: 64, objectFit: "cover", borderRadius: 10, border: "1px solid #334155", display: "block", marginBottom: 6 },
    outOfRangeNote: { marginTop: 10, display: "inline-block", padding: "6px 10px", borderRadius: 999, background: "#7f1d1d", color: "#fecaca", fontSize: 12, fontWeight: "bold" },
    btnPrimary: { padding: "14px 22px", minWidth: 120, textAlign: "center", borderRadius: 999, border: "1px solid #1e3a8a", background: "linear-gradient(145deg, #60a5fa, #1d4ed8)", color: "#ffffff", fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 18px rgba(0,0,0,0.5), 0 0 18px rgba(59,130,246,0.9), inset 0 2px 0 rgba(255,255,255,0.3)", transition: "all 0.15s ease" },
    btnSecondary: { padding: "14px 22px", minWidth: 120, textAlign: "center", borderRadius: 999, border: "1px solid #334155", background: "linear-gradient(145deg, #475569, #1e293b)", color: "#ffffff", fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 14px rgba(0,0,0,0.4), 0 0 10px rgba(148,163,184,0.4), inset 0 2px 0 rgba(255,255,255,0.2)", transition: "all 0.15s ease" },
    reportHeader: { background: "#0f172a", color: "#fff", fontWeight: "bold", fontSize: 20, padding: "16px 18px" },
    buttonBar: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #1f2937" },
    copyMessage: { fontSize: 14, fontWeight: 600, color: "#cbd5e1" },
    previewScroll: { padding: 14, maxHeight: "80vh", overflow: "auto", background: "#334155" },
    previewIntroCard: { border: "1px solid #1f2937", background: "#1e293b", borderRadius: 18, padding: 16, marginBottom: 14 },
    previewTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
    previewMetaGrid: { display: "grid", gap: 8, marginTop: 10, color: "#e2e8f0" },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 14 },
    statCard: { border: "1px solid #1f2937", borderRadius: 18, padding: 16, background: "#1e293b" },
    statLabel: { fontSize: 11, fontWeight: "bold", letterSpacing: ".06em", textTransform: "uppercase", color: "#cbd5e1" },
    statNumber: { marginTop: 8, fontSize: 34, fontWeight: "bold", color: "#ffffff" },
    statSmall: { marginTop: 8, fontSize: 14, fontWeight: 700, color: "#ffffff" },
    previewSummaryCard: { overflow: "hidden", borderRadius: 18, border: "1px solid #1f2937", background: "#334155", marginBottom: 14 },
    previewSummaryHeader: { padding: "14px 16px", fontWeight: "bold", background: "#0f172a", color: "#ffffff" },
    previewSummaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 14 },
    previewSummaryCol: { display: "grid", gap: 10 },
    previewSummaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, border: "1px solid #334155", borderRadius: 12, padding: "12px 14px", background: "#1e293b" },
    previewClear: { color: "#86efac", fontWeight: "bold", fontSize: 13 },
    previewIssue: { color: "#f87171", fontWeight: "bold", fontSize: 13 },
    previewGroupCard: { overflow: "hidden", borderRadius: 18, border: "1px solid #1f2937", background: "#334155", marginBottom: 14 },
    previewGroupHeader: { padding: "14px 16px", fontWeight: "bold", color: "#ffffff" },
    previewGroupBody: { padding: 14, display: "grid", gap: 12 },
    previewAreaCard: { border: "1px solid #1f2937", borderRadius: 16, background: "#1e293b", padding: 14 },
    previewAreaTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff", marginBottom: 8 },
    noIssuesText: { fontSize: 14, color: "#cbd5e1" },
    previewRoutineWrap: { marginTop: 10, overflow: "hidden", border: "1px solid #334155", borderRadius: 12, background: "#111827" },
    previewRoutineHeader: { background: "#0f172a", padding: "10px 12px", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", color: "#cbd5e1" },
    previewRoutineRow: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8, padding: "10px 12px", borderTop: "1px solid #334155", color: "#f8fafc", fontSize: 14 },
    previewIssueCard: { display: "grid", gridTemplateColumns: "1fr 110px", gap: 12, border: "1px solid #7f1d1d", borderRadius: 14, background: "#111827", padding: 12, marginBottom: 10, color: "#ffffff" },
    issueBadges: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
    tempBadge: { background: "#78350f", color: "#fde68a", fontSize: 12, fontWeight: "bold", borderRadius: 999, padding: "4px 8px" },
    grayBadge: { background: "#334155", color: "#e2e8f0", fontSize: 12, fontWeight: "bold", borderRadius: 999, padding: "4px 8px" },
    redBadge: { background: "#7f1d1d", color: "#fecaca", fontSize: 12, fontWeight: "bold", borderRadius: 999, padding: "4px 8px" },
    previewIssueImage: { width: 110, height: 96, objectFit: "cover", borderRadius: 12, border: "1px solid #334155" },
    noPhotoBox: { width: 110, height: 96, borderRadius: 12, border: "1px dashed #475569", color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" },
    tempTableWrap: { marginTop: 14, overflow: "hidden", border: "1px solid #334155", borderRadius: 12, background: "#111827" },
    tempTableHeaderRow: { display: "grid", gridTemplateColumns: "1.5fr 1fr", background: "#0f172a", padding: "10px 12px", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", color: "#cbd5e1" },
    tempTableRow: { display: "grid", gridTemplateColumns: "1.5fr 1fr", padding: "10px 12px", borderTop: "1px solid #334155", fontSize: 14, color: "#f8fafc" },
    notesBox: { marginTop: 14, border: "1px solid #334155", borderRadius: 12, background: "#111827", padding: 12, fontSize: 14, color: "#cbd5e1" },
    historyWrap: { display: "grid", gap: 10, marginTop: 14 },
    historyItem: { border: "1px solid #334155", padding: 12, borderRadius: 14, background: "#1e293b", color: "#ffffff" },
    historyMeta: { color: "#cbd5e1", fontSize: 13, marginBottom: 8 },
    historyButtons: { display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" },
  };

  const press = (e) => {
    e.currentTarget.style.transform = "translateY(2px) scale(0.98)";
    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  };

  const release = (e) => {
    e.currentTarget.style.transform = "translateY(0) scale(1)";
    e.currentTarget.style.boxShadow = "";
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.topHeader}>Conference Center Health & Safety Walk</div>

          <div style={styles.topFields}>
            <input style={styles.input} placeholder="Inspector" value={form.inspector} onChange={(e) => setTopField("inspector", e.target.value)} />
            <input style={styles.input} type="date" value={form.date} onChange={(e) => setTopField("date", e.target.value)} />
            <input style={styles.input} type="time" value={form.time} onChange={(e) => setTopField("time", e.target.value)} />

            <div style={styles.topButtonRow}>
              <button type="button" style={styles.btnSecondary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={newWalk}>New Walk</button>
              <button type="button" style={styles.btnPrimary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={saveWalk}>Save Walk</button>
              <button type="button" style={styles.btnSecondary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={scrollToHistory}>Walk History</button>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Floor Summary</div>
          <div style={styles.previewSummaryGrid}>
            <div style={styles.previewSummaryCol}>
              {previewLeft.map((f) => (
                <div key={`top-left-${f.floor}`} style={styles.previewSummaryRow}>
                  <div style={{ color: "#ffffff", fontWeight: 600 }}>{f.floor}</div>
                  <div style={f.issues === 0 ? styles.previewClear : styles.previewIssue}>{f.issues === 0 ? "Clear" : `${f.issues} Issues`}</div>
                </div>
              ))}
            </div>

            <div style={styles.previewSummaryCol}>
              {previewRight.map((f) => (
                <div key={`top-right-${f.floor}`} style={styles.previewSummaryRow}>
                  <div style={{ color: "#ffffff", fontWeight: 600 }}>{f.floor}</div>
                  <div style={f.issues === 0 ? styles.previewClear : styles.previewIssue}>{f.issues === 0 ? "Clear" : `${f.issues} Issues`}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.mainStack}>
          <div>
            {STRUCTURE.map((group) => (
              <div key={group.floor} style={{ marginBottom: 16 }}>
                <div style={group.building === "Separate" ? styles.floorHeaderPurple : styles.floorHeaderBlue}>{group.floor}</div>

                {sortAreasForDisplay(group).map((area) => {
                  const isOpen = openAreaName === area.name;

                  return (
                    <div key={area.name} style={{ marginBottom: 10 }} ref={(el) => { areaRefs.current[area.name] = el; }}>
                      <button
                        type="button"
                        onMouseDown={press}
                        onMouseUp={release}
                        onMouseLeave={release}
                        onClick={() => handleAreaToggle(area.name)}
                        style={{
                          ...styles.pantryTile,
                          border: isOpen ? "1px solid #3b82f6" : styles.pantryTile.border,
                          boxShadow: isOpen
                            ? "0 0 0 1px #3b82f6, 0 6px 14px rgba(0,0,0,0.4), 0 0 10px rgba(148,163,184,0.18), inset 0 2px 0 rgba(255,255,255,0.12)"
                            : styles.pantryTile.boxShadow,
                        }}
                      >
                        <span>{area.name}</span>
                        <span style={styles.chevron}>{isOpen ? "▲" : "▼"}</span>
                      </button>

                      {isOpen && (
                        <div style={styles.areaBody}>
                          {area.items.map((item) => {
                            const data = form.areas[area.name].items[item];
                            const issueMode = data.status === "Issue";

                            return (
                              <div key={item} style={styles.itemCard}>
                                <div style={styles.itemTitle}>{item}</div>

                                <div style={styles.twoColGrid}>
                                  <select style={styles.select} value={data.status} onChange={(e) => setItemField(area.name, item, "status", e.target.value)}>
                                    <option value="">Status ▼</option>
                                    {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>

                                  {isTempItem(item) ? (
                                    <select
                                      style={{ ...styles.select, ...(isOutOfRange(data.temperature) ? styles.tempAlert : {}) }}
                                      value={data.temperature}
                                      onChange={(e) => setItemField(area.name, item, "temperature", e.target.value)}
                                    >
                                      <option value="">Temp °F ▼</option>
                                      {tempValues().map((t) => <option key={t} value={t}>{t}°F</option>)}
                                    </select>
                                  ) : (
                                    <select
                                      style={{ ...styles.select, ...(!issueMode ? styles.disabled : {}) }}
                                      value={data.issue}
                                      disabled={!issueMode}
                                      onChange={(e) => setItemField(area.name, item, "issue", e.target.value)}
                                    >
                                      <option value="">Issue ▼</option>
                                      {getIssueOptions(item).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  )}

                                  {isTempItem(item) ? (
                                    <select
                                      style={{ ...styles.select, ...(!issueMode ? styles.disabled : {}) }}
                                      value={data.issue}
                                      disabled={!issueMode}
                                      onChange={(e) => setItemField(area.name, item, "issue", e.target.value)}
                                    >
                                      <option value="">Issue ▼</option>
                                      {getIssueOptions(item).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  ) : (
                                    <select
                                      style={{ ...styles.select, ...(!issueMode ? styles.disabled : {}) }}
                                      value={data.engineerAction}
                                      disabled={!issueMode}
                                      onChange={(e) => setItemField(area.name, item, "engineerAction", e.target.value)}
                                    >
                                      <option value="">Engineer Action ▼</option>
                                      {ACTION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  )}

                                  {isTempItem(item) ? (
                                    <select
                                      style={{ ...styles.select, ...(!issueMode ? styles.disabled : {}) }}
                                      value={data.engineerAction}
                                      disabled={!issueMode}
                                      onChange={(e) => setItemField(area.name, item, "engineerAction", e.target.value)}
                                    >
                                      <option value="">Engineer Action ▼</option>
                                      {ACTION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  ) : (
                                    <input
                                      style={{ ...styles.input, ...(!issueMode || data.engineerAction !== "HOTSOS Logged" ? styles.disabled : {}), gridColumn: "1 / -1" }}
                                      placeholder="HOTSOS #"
                                      value={data.hotsos}
                                      disabled={!issueMode || data.engineerAction !== "HOTSOS Logged"}
                                      onChange={(e) => setItemField(area.name, item, "hotsos", e.target.value)}
                                    />
                                  )}

                                  {isTempItem(item) && (
                                    <input
                                      style={{ ...styles.input, ...(!issueMode || data.engineerAction !== "HOTSOS Logged" ? styles.disabled : {}), gridColumn: "1 / -1" }}
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
                                    <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => addIssuePhotos(area.name, item, e.target.files)} />
                                    <div style={styles.photoRow}>
                                      {(data.photos || []).map((photo, idx) => (
                                        <div key={idx}>
                                          <img src={photo} alt="Issue" style={styles.thumb} />
                                          <button type="button" style={styles.btnSecondary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={() => removeIssuePhoto(area.name, item, idx)}>Delete</button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {isTempItem(item) && isOutOfRange(data.temperature) && <div style={styles.outOfRangeNote}>Out of range</div>}
                              </div>
                            );
                          })}

                          <textarea style={styles.textarea} placeholder="Notes" value={form.areas[area.name].notes} onChange={(e) => setAreaNotes(area.name, e.target.value)} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <div style={styles.reportHeader}>Email Report Preview</div>

            <div style={styles.buttonBar}>
              <button type="button" style={styles.btnSecondary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={copyHtmlEmail}>Copy for Desktop Outlook</button>
              <button type="button" style={styles.btnSecondary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={openOutlookDraft}>Open Outlook Draft</button>
              <button type="button" style={styles.btnPrimary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={downloadHtmlEmail}>Download Report</button>
              <button type="button" style={styles.btnPrimary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={downloadHotsosTags}>Download HOTSOS Tags</button>
              {copyMessage ? <span style={styles.copyMessage}>{copyMessage}</span> : null}
            </div>

            <div style={styles.previewScroll}>
              <div style={styles.previewIntroCard}>
                <div style={styles.previewTitle}>Conference Center Health &amp; Safety Walk Report</div>
                <div style={styles.previewMetaGrid}>
                  <div><strong>Inspector:</strong> {form.inspector || "—"}</div>
                  <div><strong>Date:</strong> {form.date || "—"}</div>
                  <div><strong>Time:</strong> {formatTagTime(form.time) || form.time || "—"}</div>
                  <div><strong>Subject:</strong> {reportSubject}</div>
                  <div><strong>Printable HOTSOS Tags:</strong> {hotsosTagIssues.length}</div>
                </div>
              </div>

              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Areas Reviewed</div>
                  <div style={styles.statNumber}>{STRUCTURE.reduce((sum, g) => sum + g.areas.length, 0)}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Issues Logged</div>
                  <div style={{ ...styles.statNumber, color: "#f87171" }}>{issueCount}</div>
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
                      <div key={`email-left-${f.floor}`} style={styles.previewSummaryRow}>
                        <div style={{ color: "#ffffff", fontWeight: 600 }}>{f.floor}</div>
                        <div style={f.issues === 0 ? styles.previewClear : styles.previewIssue}>{f.issues === 0 ? "Clear" : `${f.issues} Issues`}</div>
                      </div>
                    ))}
                  </div>

                  <div style={styles.previewSummaryCol}>
                    {previewRight.map((f) => (
                      <div key={`email-right-${f.floor}`} style={styles.previewSummaryRow}>
                        <div style={{ color: "#ffffff", fontWeight: 600 }}>{f.floor}</div>
                        <div style={f.issues === 0 ? styles.previewClear : styles.previewIssue}>{f.issues === 0 ? "Clear" : `${f.issues} Issues`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {detailedReport.map((group) => (
                <div key={group.floor} style={styles.previewGroupCard}>
                  <div style={{ ...styles.previewGroupHeader, background: group.building === "Separate" ? "#6d28d9" : "#1e3a8a" }}>{group.floor}</div>

                  <div style={styles.previewGroupBody}>
                    {group.areas.map((area) => {
                      const hasContent = area.issues.length || area.temps.length || area.notes || area.routineChecks.length;

                      return (
                        <div key={area.name} style={styles.previewAreaCard}>
                          <div style={styles.previewAreaTitle}>{area.name}</div>
                          {!hasContent && <div style={styles.noIssuesText}>No issues noted.</div>}

                          {!!area.routineChecks.length && (
                            <div style={styles.previewRoutineWrap}>
                              <div style={styles.previewRoutineHeader}>Routine Checks</div>
                              {area.routineChecks.map((check, idx) => (
                                <div key={`${area.name}-check-${idx}`} style={styles.previewRoutineRow}>
                                  <div>{check.itemName}</div>
                                  <div style={{ fontWeight: 700, textAlign: "right", color: check.status === "OK" ? "#86efac" : "#f87171" }}>
                                    {check.status === "OK" ? "OK" : `Issue - ${check.issue}`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!!area.issues.length && (
                            <div style={{ marginTop: 10 }}>
                              {area.issues.map((issue, idx) => (
                                <div key={`${area.name}-${issue.itemName}-${idx}`} style={styles.previewIssueCard}>
                                  <div>
                                    <div style={{ fontWeight: 700, color: "#ffffff" }}>{issue.itemName}</div>
                                    <div style={{ marginTop: 4, color: "#cbd5e1", fontSize: 14 }}>{issue.issue || "Issue logged"}</div>
                                    <div style={styles.issueBadges}>
                                      {issue.temperature ? <span style={styles.tempBadge}>Temp {issue.temperature}°F</span> : null}
                                      {issue.engineerAction && issue.engineerAction !== "No Action" ? <span style={styles.grayBadge}>{issue.engineerAction}</span> : null}
                                      {issue.hotsos ? <span style={styles.redBadge}>HOTSOS #{issue.hotsos}</span> : null}
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

        <div id="walk-history-section" style={styles.historyWrap}>
          {history.map((entry) => (
            <div key={entry.id} style={styles.historyItem}>
              <div style={styles.historyMeta}>
                {entry.date || "No Date"} {entry.time ? `• ${entry.time}` : ""} • {entry.inspector} • {entry.issues} issues • {entry.savedAt}
              </div>

              <div style={styles.historyButtons}>
                <button type="button" style={styles.btnPrimary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={() => loadWalk(entry)}>Open</button>
                <button type="button" style={styles.btnSecondary} onMouseDown={press} onMouseUp={release} onMouseLeave={release} onClick={() => deleteWalk(entry.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
