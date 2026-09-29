// Days and times, the way Google Calendar writes them. Days are local
// "YYYY-MM-DD" strings; times of day are hours as numbers (9.5 is 9:30).

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDay = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const monday = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() + 6) % 7));
};

/** "09:30" to 9.5. */
export const toHours = (t: string | undefined, fallback = 0) => {
  const m = t?.match(/^(\d{1,2}):(\d{2})$/);
  return m ? +m[1] + +m[2] / 60 : fallback;
};
/** 9.5 to "09:30". */
export const fromHours = (h: number) => {
  const hh = Math.floor(h);
  return `${String(hh).padStart(2, "0")}:${String(Math.round((h - hh) * 60)).padStart(2, "0")}`;
};

/** 9.5 to "9:30am", 14 to "2pm". */
export const fmtH = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const ap = hh < 12 || hh === 24 ? "am" : "pm";
  const h12 = hh % 12 || 12;
  return mm ? `${h12}:${String(mm).padStart(2, "0")}${ap}` : `${h12}${ap}`;
};
/** "9:30 – 10am", or "11:30am – 12:30pm" across noon. */
export const fmtRange = (s: number, e: number) =>
  s < 12 === e < 12 ? `${fmtH(s).replace(/am|pm/, "")} – ${fmtH(e)}` : `${fmtH(s)} – ${fmtH(e)}`;

/** "Monday, September 28". */
export const dateLabel = (k: string) => {
  const x = parseDay(k);
  return `${LONG_DOW[x.getDay()]}, ${MONTHS[x.getMonth()]} ${x.getDate()}`;
};

/** The header's title for the days on screen: "September 2026", "Sep – Oct 2026". */
export function periodLabel(start: Date, n: number, view: string, anchor: Date, narrow: boolean) {
  const end = addDays(start, n - 1);
  const short = (d: Date) => MONTHS[d.getMonth()].slice(0, 3);
  if (narrow) {
    const d = view === "month" ? anchor : start;
    return `${short(d)} ${d.getFullYear()}`;
  }
  if (view === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  if (start.getMonth() === end.getMonth()) return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  return start.getFullYear() === end.getFullYear()
    ? `${short(start)} – ${short(end)} ${end.getFullYear()}`
    : `${short(start)} ${start.getFullYear()} – ${short(end)} ${end.getFullYear()}`;
}

/** "GMT+05:30", for the corner above the hours. */
export function gmtLabel(d: Date) {
  const off = -d.getTimezoneOffset() / 60;
  return `GMT${off < 0 ? "-" : "+"}${String(Math.floor(Math.abs(off))).padStart(2, "0")}${Math.abs(off) % 1 ? ":30" : ""}`;
}
