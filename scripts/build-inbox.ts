// Build-time generator: turns the real MTSamples dataset (data/raw/mtsamples.csv)
// into ~140 realistic inbox messages, paired with synthetic patient identities.
// Output is committed (src/fixtures/generated.ts); the raw CSV stays gitignored.
//
// Run: bun run scripts/build-inbox.ts
//
// Patient identities are synthetic (no real patient data). MTSamples is public
// de-identified transcription text; we excerpt it for message bodies.

import { readFileSync, writeFileSync } from 'node:fs';
import type { InboxMessage, MessageType } from '../src/types';

const COUNT = 139; // + 11 curated hero messages = 150 total

// --- minimal robust CSV parser (handles quotes, escaped "", embedded commas/newlines) ---
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const excerpt = (s: string, n: number) => {
  const c = clean(s);
  if (c.length <= n) return c;
  const cut = c.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
};

// specialty -> message type + inbox subject prefix
function mapType(specialty: string): { type: MessageType; prefix: string } | null {
  const s = specialty.toLowerCase();
  if (s.includes('radiology')) return { type: 'hospital_report', prefix: 'Radiology' };
  if (s.includes('discharge')) return { type: 'hospital_report', prefix: 'Discharge summary' };
  if (s.includes('emergency')) return { type: 'hospital_report', prefix: 'ED report' };
  if (s.includes('letters')) return { type: 'fax_form', prefix: 'Letter' };
  if (s.includes('ime') || s.includes('work comp')) return { type: 'fax_form', prefix: 'Form' };
  if (s.includes('office notes') || s.includes('soap')) return { type: 'fax_form', prefix: 'Note' };
  // recognizable specialty consults
  const consults: Record<string, string> = {
    cardiovascular: 'Cardiology', pulmonary: 'Respirology', neurology: 'Neurology',
    neurosurgery: 'Neurosurgery', gastroenterology: 'Gastroenterology', orthopedic: 'Orthopedics',
    urology: 'Urology', nephrology: 'Nephrology', 'obstetrics': 'OB/GYN', gynecology: 'OB/GYN',
    ent: 'ENT', otolaryngology: 'ENT', ophthalmology: 'Ophthalmology', dermatology: 'Dermatology',
    'hematology': 'Hematology/Oncology', oncology: 'Hematology/Oncology', psychiatry: 'Psychiatry',
    'pain management': 'Pain clinic', surgery: 'Surgery', consult: 'Consult',
    'general medicine': 'Internal medicine', pediatrics: 'Pediatrics', podiatry: 'Podiatry',
    endocrinology: 'Endocrinology', rheumatology: 'Rheumatology', nephro: 'Nephrology',
  };
  for (const key in consults) if (s.includes(key)) return { type: 'specialist_report', prefix: consults[key] };
  return null; // skip unrecognized / fragment rows
}

// Synthetic, multicultural Canadian-style names. Not real patients.
const NAMES = [
  'James Tremblay', 'Aisha Khan', 'Robert MacDonald', 'Mei Lin Wong', 'David Okonkwo',
  'Sarah Gagnon', 'Mohammed Al-Rashid', 'Emily Roy', 'Raj Patel', 'Linda Bouchard',
  'Chen Wei', 'Fatima Hussein', 'Thomas Wilson', 'Priya Nair', 'Andre Cote',
  'Grace Mensah', 'William Campbell', 'Sofia Rossi', 'Hassan Farah', 'Margaret Scott',
  'Jean-Luc Pelletier', 'Anjali Sharma', 'George Papadopoulos', 'Nadia Haddad', 'Kevin Leblanc',
  'Yuki Tanaka', 'Daniel Cohen', 'Amara Diallo', 'Patrick Murphy', 'Ji-woo Park',
  'Helen Nguyen', 'Carlos Mendez', 'Ruth Abebe', 'Steven Clarke', 'Olga Petrov',
  'Ibrahim Toure', 'Catherine Roy', 'Marco Bianchi', 'Leila Ahmadi', 'Brian Foster',
];

const pad = (n: number, w: number) => String(n).padStart(w, '0');
function healthCard(i: number): string {
  const a = pad((i * 137 + 1009) % 10000, 4);
  const b = pad((i * 53 + 311) % 1000, 3);
  const c = pad((i * 91 + 17) % 1000, 3);
  const x = String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i * 7) % 26));
  return `${a}-${b}-${c}-${x}`;
}
function dob(i: number): string {
  const year = 1939 + ((i * 13) % 70);
  const month = pad(1 + ((i * 7) % 12), 2);
  const day = pad(1 + ((i * 11) % 28), 2);
  return `${year}-${month}-${day}`;
}

// receivedAt spread across the working morning, newest later in the list.
function receivedAt(i: number): string {
  const start = 6 * 60 + 5; // 06:05
  const minutes = start + Math.floor((i * (5 * 60)) / COUNT); // through ~11:05
  const h = pad(Math.floor(minutes / 60), 2);
  const m = pad(minutes % 60, 2);
  return `2026-06-20T${h}:${m}:00`;
}

// --- main ---
const csv = readFileSync('data/raw/mtsamples.csv', 'utf8');
const rows = parseCsv(csv);
const header = rows[0];
const col = (name: string) => header.indexOf(name);
const iSpec = col('medical_specialty');
const iSample = col('sample_name');
const iDesc = col('description');
const iTrans = col('transcription');

type Candidate = { type: MessageType; prefix: string; sample: string; desc: string; trans: string };
const candidates: Candidate[] = [];
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row || row.length <= iTrans) continue;
  const trans = clean(row[iTrans] ?? '');
  const sample = clean(row[iSample] ?? '');
  if (trans.length < 200 || sample.length < 3) continue; // need real content + a title
  const mapped = mapType(row[iSpec] ?? '');
  if (!mapped) continue;
  candidates.push({ ...mapped, sample, desc: clean(row[iDesc] ?? ''), trans });
}

// Deterministic spread by type: mostly consults, a chunk of hospital reports, a few faxes.
const want: Record<MessageType, number> = {
  specialist_report: 95, hospital_report: 33, fax_form: 11, lab: 0, refill: 0,
};
const picked: Candidate[] = [];
const taken: Record<string, number> = {};
// stride through candidates so we sample variety, not the first N of one specialty
for (const type of ['specialist_report', 'hospital_report', 'fax_form'] as MessageType[]) {
  const pool = candidates.filter((c) => c.type === type);
  const need = want[type];
  if (pool.length === 0) continue;
  const stride = Math.max(1, Math.floor(pool.length / need));
  for (let k = 0; picked.length < COUNT && (taken[type] ?? 0) < need && k * stride < pool.length; k++) {
    picked.push(pool[k * stride]);
    taken[type] = (taken[type] ?? 0) + 1;
  }
}

// Sort picked into a stable order then assign times/identities.
const messages: InboxMessage[] = picked.slice(0, COUNT).map((c, i) => {
  const name = NAMES[i % NAMES.length];
  // strip MTSamples' trailing " - N" sample numbering and the leading article junk
  const sampleClean = c.sample.replace(/\s*-\s*\d+\s*$/, '').trim();
  const subject = `${c.prefix} — ${sampleClean}`;
  return {
    id: `gen-${pad(i + 1, 3)}`,
    type: c.type,
    receivedAt: receivedAt(i),
    patientId: `pt-${pad(1000 + i, 4)}`,
    patientName: name,
    subject,
    body: excerpt(c.desc || c.trans, 160),
    raw: excerpt(c.trans, 1400),
  };
});

const banner = `// AUTO-GENERATED by scripts/build-inbox.ts from MTSamples (public, de-identified).
// Patient identities are synthetic. Do not edit by hand — re-run the generator.
// Count: ${messages.length}
import type { InboxMessage } from '../types';

export const generatedMessages: InboxMessage[] = ${JSON.stringify(messages, null, 2)};
`;

writeFileSync('src/fixtures/generated.ts', banner);
const dist: Record<string, number> = {};
for (const m of messages) dist[m.type] = (dist[m.type] ?? 0) + 1;
console.log(`Wrote src/fixtures/generated.ts with ${messages.length} messages`);
console.log('By type:', dist);
