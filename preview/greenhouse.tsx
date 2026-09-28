import { useRef } from "react";
import {
  Greenhouse,
  useGreenhouse,
  type GreenhouseActivityInput,
  type GreenhouseApp,
  type GreenhouseCandidateInput,
  type GreenhouseInterview,
  type GreenhouseRecommendation,
  type GreenhouseScorecard,
  type GreenhouseSeed,
} from "../apps/greenhouse";
import { FACES } from "./faces";

// apps/greenhouse.html's job and demo, driving the React version: the same
// hiring team, pipeline and candidates, with the scorecards, activity and
// interviews the mockup makes up for each one, and the coordinator booking
// an interview a moment after you ask for one.

const STAGES = ["Application Review", "Recruiter Screen", "Take Home Assessment", "Onsite Interview", "Offer", "Hired"];
const COLORS = ["#2f7d6b", "#6b5ca5", "#b5613a", "#3a6ea5", "#a5456b", "#5f7d2f", "#8a6d1f", "#2f6f8a"];
const ATTRS = ["System design", "Code quality", "Communication", "Ownership"];
const RECS: GreenhouseRecommendation[] = [null, "no", "yes", "strong-yes"];
const DAY = 86_400_000;
const daysAgo = (n: number) => Date.now() - n * DAY - 60_000;

// "Tue, Sep 30, 10:00 AM PT"-style times, a few days from now.
function upcoming(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

type Row = [id: number, name: string, company: string, title: string, source: string, stage: number, days: number, rating: number, needs: boolean];
const ROWS: Row[] = [
  [1, "Priya Raman", "Lumen Freight", "Backend Engineer II", "LinkedIn", 0, 2, 0, false],
  [2, "Tomas Brandt", "Quillstack", "Software Engineer", "Careers page", 0, 4, 0, false],
  [3, "Aisha Mensah", "Northwind Pay", "Senior Software Engineer", "Referral", 0, 1, 0, false],
  [4, "Jordan Ellis", "Brightcart", "Platform Engineer", "Indeed", 1, 3, 1, true],
  [5, "Mei Tanaka", "Orbital Health", "Senior Backend Engineer", "LinkedIn", 1, 5, 2, false],
  [6, "Rafael Ortiz", "Canopy Data", "Backend Engineer", "Agency", 1, 6, 1, false],
  [7, "Elena Petrova", "Fernway Logistics", "Senior Engineer", "Referral", 2, 4, 2, true],
  [8, "Kwame Asante", "Tidepool Labs", "Software Engineer III", "Careers page", 2, 8, 1, false],
  [9, "Sarah Lindqvist", "Harbor Analytics", "Staff Engineer", "LinkedIn", 3, 2, 3, true],
  [10, "Daniel Cho", "Pinecrest Systems", "Senior Backend Engineer", "Referral", 3, 5, 2, false],
  [11, "Nadia Farouk", "Solace Cloud", "Senior Software Engineer", "Sourced", 3, 3, 3, true],
  [12, "Oliver Grant", "Meridian Bank", "Lead Backend Engineer", "Referral", 4, 2, 3, false],
  [13, "Lucia Moreno", "Kestrel AI", "Senior Engineer", "LinkedIn", 5, 12, 3, false],
];

// The mockup's made-up scorecards: one per step the candidate has passed, one of them awaited when `needs`.
function scorecards([id, , , , , stage, , rating, needs]: Row): GreenhouseScorecard[] {
  const r = (i: number, base: number) => Math.max(1, Math.min(3, base + ((id + i) % 3 === 0 ? -1 : 0)));
  const list: { by: string; step: string; rec: number }[] = [];
  if (stage >= 1) list.push({ by: "hana", step: "Recruiter Screen", rec: stage === 1 && needs ? 0 : r(0, Math.max(2, rating)) });
  if (stage >= 2) list.push({ by: "dev", step: "Take Home Review", rec: stage === 2 && needs ? 0 : r(1, rating || 2) });
  if (stage >= 3)
    ([["marcus", "Onsite: System Design"], ["sofia", "Onsite: Behavioral"], ["lena", "Onsite: Coding"]] as const).forEach(([by, step], i) =>
      list.push({ by, step, rec: stage === 3 && needs && i === 2 ? 0 : r(i + 2, rating) })
    );
  return list.map(({ by, step, rec }) => ({
    by,
    step,
    recommendation: RECS[rec],
    attributes: rec
      ? ATTRS.map((a, i): [string, number] => [a, Math.max(1, Math.min(4, rec + ((id + i + by.length) % 3) - 1 + (rec === 3 ? 1 : 0)))])
      : undefined,
  }));
}

function activity([, name, company, , source, stage, days, rating]: Row): GreenhouseActivityInput[] {
  const first = name.split(" ")[0];
  return [
    ...(stage >= 1
      ? [
          { kind: "move", by: "hana", text: `Moved to ${STAGES[stage]}`, at: daysAgo(days || 1) } as const,
          { kind: "mail", by: "hana", text: `Emailed ${first}: "Next steps for Senior Backend Engineer at Casuro"`, at: daysAgo(days + 1) } as const,
        ]
      : []),
    { kind: "note", by: "naman", text: `Strong ${rating >= 2 ? "distributed systems" : "API"} background at ${company}. Worth a closer look.`, at: daysAgo(days + 3) },
    { kind: "move", by: "Greenhouse", text: `Applied via ${source}`, at: daysAgo(days + 5) },
  ];
}

function interviews(stage: number): GreenhouseInterview[] {
  if (stage === 1) return [{ title: "Recruiter Screen", when: "Tue, Sep 30, 10:00 AM PT", with: ["hana"] }];
  if (stage === 2) return [{ title: "Take Home Debrief", when: "Wed, Oct 1, 2:00 PM PT", with: ["dev", "naman"] }];
  if (stage === 3)
    return [
      { title: "Onsite Loop (3 sessions)", when: "Thu, Oct 2, 9:30 AM PT", with: ["marcus", "sofia", "lena"] },
      { title: "Hiring Manager Chat", when: "Thu, Oct 2, 1:00 PM PT", with: ["naman"] },
    ];
  if (stage === 4) return [{ title: "Offer Call", when: "Mon, Oct 6, 11:00 AM PT", with: ["naman", "hana"] }];
  return [];
}

const candidate = (row: Row): GreenhouseCandidateInput => {
  const [id, name, company, title, source, stage, days, rating] = row;
  return {
    id: String(id),
    name,
    color: COLORS[id % COLORS.length],
    company,
    title,
    source,
    stage: STAGES[stage],
    days,
    rating,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    phone: `(415) 555-0${100 + id * 7}`,
    tags: [source === "Referral" ? "Referral" : null, rating >= 3 ? "Top talent" : null, "Go", "Distributed systems"].filter((t): t is string => !!t),
    applied: `${days + 5} days ago`,
    scorecards: scorecards(row),
    activity: activity(row),
    interviews: interviews(stage),
  };
};

export const GREENHOUSE_DEMO: GreenhouseSeed = {
  company: { name: "Casuro" },
  me: "naman",
  notifications: true,
  staff: {
    naman: { name: "Naman Shukla", role: "Hiring Manager", photo: FACES.naman },
    hana: { name: "Hana Kim", role: "Recruiter", photo: FACES.hana },
    marcus: { name: "Marcus Chen", role: "Staff Engineer", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", role: "Engineering Manager", photo: FACES.sofia },
    dev: { name: "Dev Patel", role: "Senior Engineer", photo: FACES.dev },
    lena: { name: "Lena Okafor", role: "Principal Engineer", photo: FACES.lena },
  },
  job: {
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "San Francisco / Remote",
    req: "ENG-2041",
    status: "Open",
    hiringTeam: ["naman", "hana"],
    recruiter: "hana",
    coordinator: "hana",
  },
  stages: STAGES,
  candidates: ROWS.map(candidate),
};

export function GreenhousePreview() {
  const ref = useRef<GreenhouseApp | null>(null);
  const greenhouse = useGreenhouse(GREENHOUSE_DEMO, {
    onEvent(event) {
      const g = ref.current!;
      if (event.type === "action" && event.kind === "notifications") g.toast("3 scorecards are due today");
      if (event.type === "action" && event.kind === "add") g.toast("Add a candidate is not available in this mockup");
      if (event.type === "schedule") {
        // Hana books it a moment later.
        setTimeout(() => {
          const c = ref.current!.candidates.find((x) => x.id === event.candidate);
          if (!c) return;
          const first = c.name.split(" ")[0];
          ref.current!.scheduleInterview(c.id, { title: `${c.stage} Follow-up`, when: upcoming(2, 11), with: ["hana", "naman"] });
          ref.current!.addActivity(c.id, { kind: "mail", by: "hana", text: `Emailed ${first}: "Interview invitation for Senior Backend Engineer at Casuro"` });
          ref.current!.toast(`Hana Kim scheduled an interview with ${first}`);
        }, 2200);
      }
    },
  });
  ref.current = greenhouse;
  return <Greenhouse greenhouse={greenhouse} />;
}
