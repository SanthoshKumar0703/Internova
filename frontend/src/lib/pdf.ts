
function sanitize(s: string): string {
  return String(s ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/•/g, "*")
    .replace(/₹/g, "Rs. ")
    .replace(/✓/g, "OK")
    
    
    
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function esc(s: string): string {
  return sanitize(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, maxChars: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.length ? lines : [""];
}

interface Block {
  kind: "title" | "subtitle" | "heading" | "body" | "gap";
  text: string;
}

function buildPdf(blocks: Block[], opts: { footer?: string } = {}): Blob {
  const W = 595;
  const H = 842;
  const MX = 58;
  const TOP = 786;
  const BOTTOM = 64;

  
  type Line = { font: string; size: number; leading: number; text: string; gapAfter: number };
  const lines: Line[] = [];
  for (const b of blocks) {
    if (b.kind === "gap") {
      lines.push({ font: "/F1", size: 10, leading: 8, text: "", gapAfter: 0 });
    } else if (b.kind === "title") {
      for (const l of wrap(b.text, 34))
        lines.push({ font: "/F2", size: 22, leading: 28, text: l, gapAfter: 0 });
      lines.push({ font: "/F1", size: 10, leading: 10, text: "", gapAfter: 0 });
    } else if (b.kind === "subtitle") {
      for (const l of wrap(b.text, 72))
        lines.push({ font: "/F1", size: 10, leading: 15, text: l, gapAfter: 0 });
      lines.push({ font: "/F1", size: 10, leading: 12, text: "", gapAfter: 0 });
    } else if (b.kind === "heading") {
      lines.push({ font: "/F1", size: 10, leading: 10, text: "", gapAfter: 0 });
      for (const l of wrap(b.text, 62))
        lines.push({ font: "/F2", size: 13, leading: 19, text: l, gapAfter: 0 });
      lines.push({ font: "/F1", size: 10, leading: 6, text: "", gapAfter: 0 });
    } else {
      for (const para of String(b.text).split("\n")) {
        for (const l of wrap(para, 92))
          lines.push({ font: "/F1", size: 10.5, leading: 15.5, text: l, gapAfter: 0 });
        lines.push({ font: "/F1", size: 10, leading: 9, text: "", gapAfter: 0 });
      }
    }
  }

  const pages: Line[][] = [];
  let cur: Line[] = [];
  let y = TOP;
  for (const ln of lines) {
    if (y - ln.leading < BOTTOM && cur.length) {
      pages.push(cur);
      cur = [];
      y = TOP;
    }
    y -= ln.leading;
    cur.push(ln);
  }
  if (cur.length) pages.push(cur);

  const streams = pages.map((pg, pi) => {
    let s = `BT ${MX} ${TOP} Td\n`;
    let lastFont = "";
    let lastLead = 0;
    for (const ln of pg) {
      if (ln.font !== lastFont || ln.leading !== lastLead) {
        s += `${ln.font} ${ln.size} Tf ${ln.leading} TL\n`;
        lastFont = ln.font;
        lastLead = ln.leading;
      }
      s += `(${(ln.text ? esc(ln.text) : " ")}) Tj T*\n`;
    }
    s += "ET\n";
    if (opts.footer) {
      const f = esc(`${opts.footer}  |  Page ${pi + 1} of ${pages.length}`);
      s += `BT /F1 8 Tf 12 TL ${MX} 40 Td (${f}) Tj ET\n`;
    }
    return s;
  });

  
  const objs: string[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const pageObjNos = pages.map((_, i) => 5 + i * 2);
  objs[2] = `<< /Type /Pages /Kids [${pageObjNos.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  streams.forEach((st, i) => {
    const pno = 5 + i * 2;
    const cno = 6 + i * 2;
    objs[pno] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cno} 0 R >>`;
    objs[cno] = `<< /Length ${st.length} >>\nstream\n${st}endstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++)
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export function legalPdf(title: string, subtitle: string, sections: LegalSection[]): Blob {
  const blocks: Block[] = [
    { kind: "title", text: title },
    { kind: "subtitle", text: subtitle },
  ];
  for (const s of sections) {
    blocks.push({ kind: "heading", text: s.heading });
    for (const p of s.paragraphs) blocks.push({ kind: "body", text: p });
  }
  return buildPdf(blocks, { footer: "InterNova" });
}

export function certificatePdf(cert: {
  studentName: string; companyName: string; role: string; duration: string;
  completionDate: string; _id: string; grade?: string; skills?: string[];
}): Blob {
  const cx = (text: string, size: number, bold = false) =>
    Math.round((595 - sanitize(text).length * size * (bold ? 0.58 : 0.5)) / 2);
  const put = (x: number, y: number, font: string, size: number, text: string) =>
    `BT ${font} ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET\n`;

  let s = "";
  s += "0.48 0.22 0.99 RG 3 w 28 28 539 786 re S\n";
  s += "0.48 0.22 0.99 RG 0.8 w 38 38 519 766 re S\n";
  s += put(cx("INTERNOVA", 13), 730, "/F2", 13, "I N T E R N O V A");
  s += put(cx("Certificate of Completion", 30, true), 676, "/F2", 30, "Certificate of Completion");
  s += put(cx("This certificate is proudly presented to", 11), 632, "/F1", 11, "This certificate is proudly presented to");
  s += put(cx(cert.studentName, 30, true), 584, "/F2", 30, cert.studentName);
  s += "0.48 0.22 0.99 RG 1.2 w 170 566 255 0 re S\n";
  const line2 = `for successfully completing the role of ${cert.role}`;
  s += put(cx(line2, 11), 530, "/F1", 11, line2);
  s += put(cx(`at ${cert.companyName}`, 14, true), 500, "/F2", 14, `at ${cert.companyName}`);
  s += put(cx(`Duration: ${cert.duration}   |   Completed: ${cert.completionDate}`, 10), 462, "/F1", 10,
    `Duration: ${cert.duration}   |   Completed: ${cert.completionDate}`);
  if (cert.grade)
    s += put(cx(`Grade: ${cert.grade}`, 11, true), 436, "/F2", 11, `Grade: ${cert.grade}`);
  if (cert.skills?.length)
    s += put(cx(`Skills: ${cert.skills.join(", ")}`, 10), 412, "/F1", 10, `Skills: ${cert.skills.join(", ")}`);
  s += put(cx(`Certificate ID: ${cert._id}`, 11, true), 360, "/F2", 11, `Certificate ID: ${cert._id}`);
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : "https://internova.app"}/verify/${cert._id}`;
  s += put(cx(`Verify at: ${verifyUrl}`, 9), 338, "/F1", 9, `Verify at: ${verifyUrl}`);
  
  s += "0.2 0.2 0.25 RG 1 w 110 190 150 0 re S\n";
  s += "0.2 0.2 0.25 RG 1 w 335 190 150 0 re S\n";
  s += put(140, 172, "/F1", 10, "Mentor");
  s += put(352, 172, "/F1", 10, "Company Authority");
  s += put(cx("Issued by the InterNova platform. This document is verifiable online.", 9), 120, "/F1", 9,
    "Issued by the InterNova platform. This document is verifiable online.");

  const objs: string[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [5 0 R] /Count 1 >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objs[5] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>";
  objs[6] = `<< /Length ${s.length} >>\nstream\n${s}endstream`;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++)
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
