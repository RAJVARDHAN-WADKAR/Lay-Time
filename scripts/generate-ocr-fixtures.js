const fs = require("fs");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");

const OUT_DIR = path.join(process.cwd(), "tests", "fixtures", "ocr");
fs.mkdirSync(OUT_DIR, { recursive: true });

function buildSimplePdf(lines, options = {}) {
  const { minBytes = 16384 } = options;
  const escaped = (s) =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  let streamContent = "BT\n/F1 11 Tf\n50 750 Td\n16 TL\n";
  for (let i = 0; i < lines.length; i++) {
    if (i === 0) {
      streamContent += `(${escaped(lines[i])}) Tj\n`;
    } else {
      streamContent += `T* (${escaped(lines[i])}) Tj\n`;
    }
  }
  streamContent += "ET\n";

  const objs = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, "utf8")} >>\nstream\n${streamContent}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  ];

  let pdf = "%PDF-1.4\n";
  // Pad safely inside PDF comments BEFORE xref if >= 15 KB upload fixture is desired
  if (minBytes > 2048) {
    const padLine = "% Maritime SoF Digital Test Fixture Padding Line 0123456789ABCDEF\n";
    while (Buffer.byteLength(pdf, "utf8") < minBytes - 1200) {
      pdf += padLine;
    }
  }

  const offsets = [0];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objs.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

// 1. High-quality text-layer PDF SoF
const textPdfLines = [
  "STATEMENT OF FACTS - MV NORDIC VOYAGER",
  "10/07/2024 04:00 Vessel arrived at outer anchorage",
  "10/07/2024 0430-1030 NOR tendered",
  "10/07/2024 10:30 Waiting for berth",
  "11/07/2024 12:00 Pilot on board",
  "11/07/2024 13:30 All fast",
  "11/07/2024 15:00 Commenced discharging",
  "12/07/2024 1400-1800 Rain interruption",
  "13/07/2024 20:00 Completed discharging",
  "13/07/2024 22:00 Sailed"
];
const textPdfBuf = buildSimplePdf(textPdfLines);
fs.writeFileSync(path.join(OUT_DIR, "sof-text-layer.pdf"), textPdfBuf);

// 2. Identical bytes renamed to antwerp_bad.pdf (to prove filename keywords are ignored)
fs.writeFileSync(path.join(OUT_DIR, "antwerp_bad.pdf"), textPdfBuf);

// 3. Alternate date & time formats PDF
const altDateLines = [
  "PORT STATEMENT OF FACTS - ALTERNATE DATE FORMATS",
  "10-Jul-2024 0600 hrs Vessel arrived",
  "10-Jul-2024 from 0700 to 1300 NOR tendered",
  "11.07.24 0800-0930 Pilot on board",
  "11.07.24 10:00 Hoses connected",
  "11.07.24 11:00 Commenced loading",
  "12.07.24 1630 hrs Completed loading"
];
fs.writeFileSync(path.join(OUT_DIR, "sof-alt-dates.pdf"), buildSimplePdf(altDateLines));

// 4. Crisp scanned PNG SoF
function generateCrispPng() {
  const c = createCanvas(1200, 720);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1200, 720);
  ctx.fillStyle = "#111111";
  ctx.font = "bold 28px Arial";
  ctx.fillText("STATEMENT OF FACTS", 50, 65);
  ctx.font = "22px Arial";
  const rows = [
    "15/07/2024 04:00 Vessel arrived",
    "15/07/2024 0430-1030 NOR tendered",
    "15/07/2024 12:00 Pilot on board",
    "15/07/2024 14:00 All fast",
    "15/07/2024 16:00 Commenced discharging",
    "16/07/2024 18:00 Completed discharging"
  ];
  rows.forEach((line, idx) => {
    ctx.fillText(line, 50, 140 + idx * 65);
  });
  // Slight harmless border texture so PNG buffer exceeds 15 KB upload minimum
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 2;
  for (let y = 110; y <= 550; y += 65) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(1160, y);
    ctx.stroke();
  }
  return c.toBuffer("image/png");
}
const crispPng = generateCrispPng();
fs.writeFileSync(path.join(OUT_DIR, "sof-scanned.png"), crispPng);

// 5. Skewed / low-quality degraded PNG scan (expected low confidence < 80%)
function generateSkewedLowPng() {
  const c = createCanvas(1100, 620);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#efeae0";
  ctx.fillRect(0, 0, 1100, 620);

  // Add moderate scan speckle so text remains readable with degraded OCR confidence
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#a5a095" : "#d0cac0";
    ctx.fillRect((i * 73) % 1100, (i * 137) % 620, 2, 2);
  }

  ctx.save();
  ctx.translate(45, 110);
  ctx.rotate(0.035); // slight skew
  ctx.fillStyle = "#3a3832";
  ctx.font = "19px Arial";
  const blurryLines = [
    "18/07/2024 08:00 Vessel arrived",
    "18/07/2024 09:00-13:00 Equipmnt brkdwn on pier",
    "18/07/2024 14:30 Hvy rn dlay standby",
    "19/07/2024 11:00 Commenced discharging"
  ];
  blurryLines.forEach((ln, idx) => {
    ctx.fillText(ln, 15, idx * 55);
  });
  ctx.restore();
  return c.toBuffer("image/png");
}
const skewedPng = generateSkewedLowPng();
fs.writeFileSync(path.join(OUT_DIR, "sof-skewed-low.png"), skewedPng);

// 6. Blank PDF (valid structure, empty page)
const blankPdf = buildSimplePdf([]);
fs.writeFileSync(path.join(OUT_DIR, "sof-blank.pdf"), blankPdf);

// 7. Corrupt PDF bytes (starts with %PDF-1.4 header then garbage, >= 15 KB)
const corruptHeader = Buffer.from("%PDF-1.4\n%CORRUPTED_XREF_AND_OBJECTS\n");
const garbage = Buffer.alloc(16384, 0xaa);
fs.writeFileSync(path.join(OUT_DIR, "sof-corrupt.pdf"), Buffer.concat([corruptHeader, garbage]));

console.log("Generated OCR fixtures in tests/fixtures/ocr/:");
for (const f of fs.readdirSync(OUT_DIR)) {
  const sz = fs.statSync(path.join(OUT_DIR, f)).size;
  console.log(` - ${f}: ${(sz / 1024).toFixed(1)} KB (${sz} bytes)`);
}
