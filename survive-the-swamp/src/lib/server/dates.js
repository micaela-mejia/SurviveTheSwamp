// Turns the free-text due dates Gemini returns ("Oct 15", "10/22", "Nov 3rd at
// 11:59pm", "Not specified") into "YYYY-MM-DD" or null. Pure: no imports.

const MONTH_RE =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const MONTH_INDEX = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n) => String(n).padStart(2, "0");

function validYmd(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${pad(m)}-${pad(d)}`;
}

// No year given: use this year, unless that date is >90 days in the past,
// in which case the syllabus must mean next year.
function inferYear(m, d, today) {
  const y = today.getFullYear();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const candidate = Date.UTC(y, m - 1, d);
  return todayUtc - candidate > 90 * 86400000 ? y + 1 : y;
}

export function parseDueDate(raw, today = new Date()) {
  if (typeof raw !== "string") return null;
  const text = raw.trim().replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  if (!text || /not specified|unspecified|\btbd\b|\btba\b|n\/a/i.test(text)) return null;

  let match = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (match) return validYmd(+match[1], +match[2], +match[3]);

  // "October 15, 2026" / "Oct 15"
  match = text.match(new RegExp(`\\b${MONTH_RE}\\b\\.?\\s+(\\d{1,2})(?:\\s*,?\\s*(\\d{4}))?\\b`, "i"));
  if (match) {
    const m = MONTH_INDEX[match[1].slice(0, 3).toLowerCase()];
    const d = +match[2];
    return validYmd(match[3] ? +match[3] : inferYear(m, d, today), m, d);
  }

  // "15 October 2026"
  match = text.match(new RegExp(`\\b(\\d{1,2})\\s+${MONTH_RE}\\b\\.?(?:\\s*,?\\s*(\\d{4}))?`, "i"));
  if (match) {
    const m = MONTH_INDEX[match[2].slice(0, 3).toLowerCase()];
    const d = +match[1];
    return validYmd(match[3] ? +match[3] : inferYear(m, d, today), m, d);
  }

  // US numeric: "10/15", "10/15/26", "10/15/2026"
  match = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/);
  if (match) {
    const m = +match[1];
    const d = +match[2];
    let y = match[3] ? +match[3] : inferYear(m, d, today);
    if (match[3] && match[3].length === 2) y += 2000;
    return validYmd(y, m, d);
  }

  return null;
}
