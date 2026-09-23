
export interface CalEvent {
  title: string;
  details?: string;
  location?: string;
  date: string;      
  endDate?: string;  
}

const d2 = (n: number) => String(n).padStart(2, "0");
const compact = (ds: string) => ds.slice(0, 10).replace(/-/g, "");

function plusOneDay(ds: string): string {
  const c = compact(ds);
  const d = new Date(`${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${d2(d.getMonth() + 1)}${d2(d.getDate())}`;
}

export function gcalUrl(e: CalEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${compact(e.date)}/${plusOneDay(e.endDate || e.date)}`,
    details: e.details || "",
    location: e.location || "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const escIcs = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function icsFor(events: CalEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  let s = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//InterNova//Deadlines//EN\r\nCALSCALE:GREGORIAN\r\n";
  events.forEach((e, i) => {
    s += `BEGIN:VEVENT\r\nUID:internova-${Date.now()}-${i}@internova.app\r\nDTSTAMP:${stamp}\r\n`;
    s += `DTSTART;VALUE=DATE:${compact(e.date)}\r\nDTEND;VALUE=DATE:${plusOneDay(e.endDate || e.date)}\r\n`;
    s += `SUMMARY:${escIcs(e.title)}\r\n`;
    if (e.details) s += `DESCRIPTION:${escIcs(e.details)}\r\n`;
    if (e.location) s += `LOCATION:${escIcs(e.location)}\r\n`;
    s += "END:VEVENT\r\n";
  });
  return s + "END:VCALENDAR\r\n";
}

export function downloadICS(filename: string, events: CalEvent[]) {
  const blob = new Blob([icsFor(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
