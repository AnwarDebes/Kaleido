/**
 * Minimal RFC 5545 .ics generator for "scheduled post" reminders.
 * We don't pull in a full library since the data we emit is small and rigid:
 * a list of VEVENTs with a DTSTART, SUMMARY and DESCRIPTION.
 */

export interface IcsEvent {
  uid: string;
  start: Date;
  /** Default duration: 15 minutes after `start`. */
  end?: Date;
  summary: string;
  description?: string;
  location?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toIcsDate(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold long lines per RFC 5545 (max 75 octets). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    const slice = line.slice(i, i + 73);
    parts.push(i === 0 ? slice : " " + slice);
    i += 73;
  }
  return parts.join("\r\n");
}

export function buildIcs(events: IcsEvent[], calName = "Kaleido schedule"): string {
  const now = toIcsDate(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kaleido//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(calName)}`,
  ];

  for (const ev of events) {
    const end = ev.end || new Date(ev.start.getTime() + 15 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${toIcsDate(ev.start)}`,
      `DTEND:${toIcsDate(end)}`,
      fold(`SUMMARY:${escape(ev.summary)}`),
    );
    if (ev.description) lines.push(fold(`DESCRIPTION:${escape(ev.description)}`));
    if (ev.location) lines.push(fold(`LOCATION:${escape(ev.location)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
