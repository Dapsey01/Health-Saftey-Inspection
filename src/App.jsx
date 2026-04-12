  const reportData = useMemo(() => {
    const floorSummary = STRUCTURE.map((group) => {
      let issues = 0;

      group.areas.forEach((area) => {
        Object.values(form.areas[area.name]?.items || {}).forEach((item) => {
          if (item.status === "Issue") issues++;
        });
      });

      return {
        floor: group.floor,
        status: issues === 0 ? "Clear" : `${issues} Issue${issues > 1 ? "s" : ""}`,
        issues,
      };
    });

    const flaggedAreas = [];

    STRUCTURE.forEach((group) => {
      group.areas.forEach((area) => {
        const areaIssues = [];
        const temps = [];

        Object.entries(form.areas[area.name]?.items || {}).forEach(([itemName, item]) => {
          if ((itemName === "Reach-in Fridge" || itemName === "Walk-in") && item.temperature) {
            temps.push({
              item: itemName,
              temp: `${item.temperature}°F`,
            });
          }

          if (item.status === "Issue") {
            areaIssues.push({
              item: itemName,
              issue: item.issue || "Issue noted",
              temp: item.temperature ? `${item.temperature}°F` : "",
              engineerAction: item.engineerAction || "",
              hotsos: item.hotsos || "",
            });
          }
        });

        const notes = form.areas[area.name]?.notes?.trim() || "";

        if (areaIssues.length || temps.length || notes) {
          flaggedAreas.push({
            floor: group.floor,
            area: area.name,
            issues: areaIssues,
            temps,
            notes,
          });
        }
      });
    });

    return { floorSummary, flaggedAreas };
  }, [form]);

  const htmlReport = useMemo(() => {
    const summaryRows = reportData.floorSummary
      .map(
        (f) => `
          <tr>
            <td style="padding:10px 12px;border:1px solid #d1d5db;font-weight:600;">${f.floor}</td>
            <td style="padding:10px 12px;border:1px solid #d1d5db;color:${f.issues === 0 ? "#166534" : "#991b1b"};font-weight:700;">
              ${f.status}
            </td>
          </tr>
        `
      )
      .join("");

    const areaBlocks =
      reportData.flaggedAreas.length === 0
        ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px;margin-top:16px;">
            <div style="font-size:16px;font-weight:700;color:#166534;">No issues noted</div>
            <div style="margin-top:6px;color:#374151;">All inspected areas are currently clear.</div>
          </div>
        `
        : reportData.flaggedAreas
            .map((area) => {
              const issueList = area.issues.length
                ? `
                  <div style="margin-top:12px;">
                    <div style="font-size:13px;font-weight:800;color:#92400e;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px;">
                      Areas Requiring Attention
                    </div>
                    ${area.issues
                      .map(
                        (issue) => `
                          <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:12px;padding:12px;margin-bottom:10px;">
                            <div style="font-weight:700;color:#111827;">${issue.item}</div>
                            <div style="margin-top:4px;color:#374151;"><strong>Issue:</strong> ${issue.issue}</div>
                            ${issue.temp ? `<div style="margin-top:4px;color:#374151;"><strong>Recorded Temp:</strong> ${issue.temp}</div>` : ""}
                            ${issue.engineerAction ? `<div style="margin-top:4px;color:#374151;"><strong>Engineer Action:</strong> ${issue.engineerAction}</div>` : ""}
                            ${issue.hotsos ? `<div style="margin-top:4px;color:#374151;"><strong>HOTSOS #:</strong> ${issue.hotsos}</div>` : ""}
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                `
                : "";

              const tempTable = area.temps.length
                ? `
                  <div style="margin-top:12px;">
                    <div style="font-size:13px;font-weight:800;color:#1e3a8a;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px;">
                      Temperature Log
                    </div>
                    <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;">
                      <thead>
                        <tr style="background:#dbeafe;">
                          <th style="text-align:left;padding:10px 12px;border:1px solid #bfdbfe;">Equipment</th>
                          <th style="text-align:left;padding:10px 12px;border:1px solid #bfdbfe;">Temperature</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${area.temps
                          .map(
                            (t) => `
                              <tr>
                                <td style="padding:10px 12px;border:1px solid #dbeafe;">${t.item}</td>
                                <td style="padding:10px 12px;border:1px solid #dbeafe;">${t.temp}</td>
                              </tr>
                            `
                          )
                          .join("")}
                      </tbody>
                    </table>
                  </div>
                `
                : "";

              const notesBlock = area.notes
                ? `
                  <div style="margin-top:12px;">
                    <div style="font-size:13px;font-weight:800;color:#374151;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px;">
                      Notes
                    </div>
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px;color:#374151;">
                      ${area.notes}
                    </div>
                  </div>
                `
                : "";

              return `
                <div style="border:1px solid #e5e7eb;background:#ffffff;border-radius:18px;padding:18px;margin-top:16px;">
                  <div style="font-size:12px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">
                    ${area.floor}
                  </div>
                  <div style="font-size:20px;font-weight:800;color:#111827;margin-top:4px;">
                    ${area.area}
                  </div>
                  ${issueList}
                  ${tempTable}
                  ${notesBlock}
                </div>
              `;
            })
            .join("");

    return `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px;color:#111827;">
        <div style="max-width:860px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:22px;overflow:hidden;">
          <div style="background:#eab308;color:#111827;padding:22px 24px;">
            <div style="font-size:28px;font-weight:800;line-height:1.1;">Conference Center Health & Safety Walk</div>
            <div style="margin-top:8px;font-size:14px;font-weight:600;">Inspection Report</div>
          </div>

          <div style="padding:24px;">
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <tr>
                <td style="padding:8px 0;font-weight:700;width:140px;">Inspector</td>
                <td style="padding:8px 0;">${form.inspector || ""}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-weight:700;">Date</td>
                <td style="padding:8px 0;">${form.date || ""}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-weight:700;">Time</td>
                <td style="padding:8px 0;">${form.time || ""}</td>
              </tr>
            </table>

            <div style="font-size:14px;font-weight:800;color:#374151;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">
              Floor Summary
            </div>

            <table style="width:100%;border-collapse:collapse;border-radius:14px;overflow:hidden;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="text-align:left;padding:10px 12px;border:1px solid #d1d5db;">Floor</th>
                  <th style="text-align:left;padding:10px 12px;border:1px solid #d1d5db;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${summaryRows}
              </tbody>
            </table>

            ${areaBlocks}
          </div>
        </div>
      </div>
    `;
  }, [form, reportData]);

  const plainTextReport = useMemo(() => {
    const lines = [];

    lines.push("CONFERENCE CENTER HEALTH & SAFETY WALK");
    lines.push("");
    lines.push(`Inspector: ${form.inspector || ""}`);
    lines.push(`Date: ${form.date || ""}`);
    lines.push(`Time: ${form.time || ""}`);
    lines.push("");
    lines.push("FLOOR SUMMARY");

    reportData.floorSummary.forEach((f) => {
      lines.push(`- ${f.floor}: ${f.status}`);
    });

    lines.push("");
    lines.push("AREAS REQUIRING ATTENTION");

    if (reportData.flaggedAreas.length === 0) {
      lines.push("- No issues noted");
    } else {
      reportData.flaggedAreas.forEach((area) => {
        lines.push("");
        lines.push(`${area.floor} - ${area.area}`);

        area.issues.forEach((issue) => {
          lines.push(`  • ${issue.item}: ${issue.issue}`);
          if (issue.temp) lines.push(`    Temp: ${issue.temp}`);
          if (issue.engineerAction) lines.push(`    Engineer Action: ${issue.engineerAction}`);
          if (issue.hotsos) lines.push(`    HOTSOS #: ${issue.hotsos}`);
        });

        if (area.temps.length) {
          lines.push("  Temperature Log:");
          area.temps.forEach((t) => {
            lines.push(`    - ${t.item}: ${t.temp}`);
          });
        }

        if (area.notes) {
          lines.push(`  Notes: ${area.notes}`);
        }
      });
    }

    return lines.join("\n");
  }, [form, reportData]);

  const copyReport = async () => {
    await navigator.clipboard.writeText(plainTextReport);
    alert("Report copied.");
  };

  const downloadHtmlReport = () => {
    const blob = new Blob([htmlReport], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cc-walk-report-${form.date || "report"}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openOutlookDraft = () => {
    const subject = encodeURIComponent(`Conference Center Health & Safety Walk - ${form.date || ""}`);
    const body = encodeURIComponent(plainTextReport);
    window.open(`https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`, "_blank");
  };
