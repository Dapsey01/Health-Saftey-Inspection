import React, { useState } from "react";

export default function App() {
  const [copied, setCopied] = useState(false);

  const htmlReport = `
<div style="font-family:Arial;padding:20px;background:#f1f5f9;">
  <div style="max-width:800px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #ddd;">
    
    <div style="background:#eab308;padding:18px;font-size:24px;font-weight:bold;">
      Conference Center Health & Safety Walk
    </div>

    <div style="padding:20px;">
      
      <div style="display:flex;gap:20px;margin-bottom:20px;">
        <div><strong>Inspector:</strong> —</div>
        <div><strong>Date:</strong> —</div>
        <div><strong>Time:</strong> —</div>
      </div>

      <div style="margin-top:10px;font-weight:bold;font-size:16px;">
        Floor Summary
      </div>

      <div style="margin-top:10px;">
        <div style="padding:6px 0;">1st Floor: Clear</div>
        <div style="padding:6px 0;">2nd Floor: Clear</div>
        <div style="padding:6px 0;">3rd Floor: Clear</div>
        <div style="padding:6px 0;">Marquee: Clear</div>
        <div style="padding:6px 0;">Signature Tower: Clear</div>
        <div style="padding:6px 0;">G.G.A Kitchen: Clear</div>
      </div>

      <div style="margin-top:25px;padding:14px;background:#f0fdf4;border-radius:12px;font-weight:500;">
        No issues noted
      </div>

    </div>
  </div>
</div>
`;
  const copyReport = async () => {
    await navigator.clipboard.writeText(htmlReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openOutlook = () => {
    window.open("https://outlook.office.com/mail/deeplink/compose", "_blank");
  };

  const downloadHtml = () => {
    const blob = new Blob([htmlReport], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.html";
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial", background: "#f1f5f9" }}>
      
      <div style={{ background: "#eab308", padding: 16, fontWeight: "bold", fontSize: 22 }}>
        Conference Center Health & Safety Walk
      </div>

      <div style={{ marginTop: 20 }}>
        <input placeholder="Inspector" style={inputStyle} />
        <input placeholder="Date" style={inputStyle} />
        <input placeholder="Time" style={inputStyle} />
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: "bold" }}>Email Report Preview</div>

        <div style={{ marginTop: 10 }}>
          <button style={darkBtn} onClick={copyReport}>Copy for Outlook</button>
          <button style={lightBtn} onClick={openOutlook}>Open Outlook Draft</button>
          <button style={goldBtn} onClick={downloadHtml}>Download HTML</button>
        </div>

        {copied && <div style={{ marginTop: 10 }}>Copied! Paste into Outlook</div>}

        <div style={{ marginTop: 20, border: "1px solid #ccc", borderRadius: 10, padding: 10, background: "#fff" }}>
          <div dangerouslySetInnerHTML={{ __html: htmlReport }} />
        </div>
      </div>

    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 10,
  marginBottom: 10,
  borderRadius: 8,
  border: "1px solid #ccc"
};

const darkBtn = {
  padding: "10px 14px",
  marginRight: 8,
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};

const lightBtn = {
  padding: "10px 14px",
  marginRight: 8,
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 8,
  cursor: "pointer"
};

const goldBtn = {
  padding: "10px 14px",
  background: "#eab308",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};
