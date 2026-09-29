import { useRef } from "react";
import { Outlook, useOutlook, type OutlookMailbox, type OutlookSeed } from "../apps/outlook";
import { FACES } from "./faces";

// apps/outlook.html's mailbox and demo script, driving the React version:
// the same people, folders and mail, and a colleague writing back a few
// seconds after you send them something.

const NOW = new Date();
// Keep "today" mail in the past whatever time the page is opened: shift every seeded time by the same amount.
const SHIFT = Math.max(0, 11 * 60 + 20 - (NOW.getHours() * 60 + NOW.getMinutes()) + 6) * 60000;
const at = (daysAgo: number, h: number, m = 0) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.getTime() - SHIFT;
};
const future = (days: number, h: number, m = 0) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
const P = (...lines: string[]) => lines.map((l) => `<p>${l}</p>`).join("");

const PEOPLE = {
  naman: { name: "Naman Shukla", email: "naman@casuro.com", title: "Engineering Lead" },
  hana: { name: "Hana Kim", email: "hana@casuro.com", title: "Engineering Manager" },
  marcus: { name: "Marcus Chen", email: "marcus@casuro.com", title: "Site Reliability Engineer" },
  sofia: { name: "Sofia Alvarez", email: "sofia@casuro.com", title: "Product Manager" },
  dev: { name: "Dev Patel", email: "dev@casuro.com", title: "Backend Engineer" },
  lena: { name: "Lena Okafor", email: "lena@casuro.com", title: "Product Designer" },
};
type Colleague = keyof typeof PEOPLE;
const sig = (id: Colleague) => `${PEOPLE[id].name}\n${PEOPLE[id].title} | Casuro`;
const COLLEAGUES: Colleague[] = ["hana", "marcus", "sofia", "dev", "lena"];

// The week's calendar, for the invite's day view: [weekday (Mon = 0), start hour, end hour, title].
const EVENTS: [number, number, number, string][] = [
  ...[0, 1, 2, 3, 4].map((d) => [d, 9.5, 9.75, "Daily standup"] as [number, number, number, string]),
  [0, 10, 11, "Sprint planning"], [0, 13, 14, "Focus time"], [1, 11, 12, "Design crit"], [1, 15.5, 16, "Hiring sync"],
  [2, 14, 14.5, "1:1 with Hana"], [3, 12, 13, "Team lunch"], [4, 16, 17, "Demo day"],
];
const busyOn = (t: number) => {
  const day = (new Date(t).getDay() + 6) % 7;
  const base = new Date(t);
  base.setHours(0, 0, 0, 0);
  return EVENTS.filter((e) => e[0] === day).map(([, s, e, title]) => ({ title, start: base.getTime() + s * 3_600_000, end: base.getTime() + e * 3_600_000 }));
};

const ME = "naman";
const signIn = at(0, 7, 41);
const invite = future(1, 14);

export const OUTLOOK_DEMO: OutlookSeed = {
  me: ME,
  account: { organization: "Casuro" },
  people: {
    ...Object.fromEntries(Object.entries(PEOPLE).map(([id, p]) => [id, { name: p.name, email: p.email, photo: FACES[id as Colleague] }])),
    it: { name: "Casuro IT Security", email: "it-security@casuro.com", initials: "IT", color: 5 },
    people: { name: "Casuro People Team", email: "people@casuro.com", initials: "PT", color: 3 },
    deploy: { name: "Deploybot", email: "deploybot@casuro.com", initials: "DB", color: 2 },
    contoso: { name: "Contoso Weekly", email: "newsletter@contoso.example", initials: "CW", color: 0 },
    north: { name: "Northwind Traders", email: "orders@northwind.example", initials: "NT", color: 1 },
    tailwind: { name: "Tailwind Coffee", email: "hello@tailwindcoffee.example", initials: "TC", color: 4 },
    fabrik: { name: "Fabrikam Design Summit", email: "hello@fabrikam.example", initials: "FD", color: 6 },
    acme: { name: "Acme Cloud Billing", email: "billing@acmecloud.example", initials: "AC", color: 7 },
    prize: { name: "Prize Center", email: "winner@prize-center.example", initials: "PC", color: 1 },
  },
  suggested: COLLEAGUES,
  folders: [{ id: "f-projects", name: "Projects" }, { id: "f-receipts", name: "Receipts" }],
  groups: [{ name: "Platform Team", color: "#0f6cbd" }, { name: "Design Guild", color: "#8764b8" }],
  categories: { Urgent: "red", "Follow up": "orange", Finance: "yellow", Personal: "green", Engineering: "blue", Design: "purple" },
  conversations: [
    {
      id: "pr912", subject: "PR #912: assessment_spaces migration - review needed", unread: true, importance: "high", categories: ["Engineering"],
      messages: [
        { from: "dev", to: [ME], cc: ["marcus"], at: at(0, 9, 12), html: P("Hi Naman,", "The <code>assessment_spaces</code> migration is up as #912. It adds the new table and backfills owners from the legacy <code>space_owner</code> column.", "My main worry is the lock on <code>spaces</code> during the backfill. Could you take a look before standup tomorrow?"), signature: sig("dev") },
        { from: ME, to: ["dev"], cc: ["marcus"], at: at(0, 9, 40), text: "Thanks Dev. Can you batch the update in chunks of 5k rows so we never hold the lock for long? Also make sure the index is created concurrently." },
        {
          from: "dev", to: [ME], cc: ["marcus"], at: at(0, 11, 5), signature: sig("dev"), attachments: [{ name: "migration-912-plan.pdf", size: 312000 }],
          html: P("Good call. Pushed a batched version, the diff is small now:", "<ul><li>Backfill runs in 5k row batches with a 50ms pause</li><li>Index created <code>CONCURRENTLY</code></li><li>Rollback script added under <code>db/rollback/912.sql</code></li></ul>", "Dry run on staging took 4m 10s with no lock waits over 200ms. Migration plan attached."),
        },
      ],
    },
    {
      subject: "Can we move our 1:1 to Thursday?", unread: true,
      messages: [{ from: "hana", to: [ME], at: at(0, 10, 20), text: "Hi Naman,\n\nSomething came up with the leadership offsite prep on Wednesday afternoon. Could we move our 1:1 to Thursday at 3:30 PM instead?\n\nIf Thursday is tight for you, Friday morning works too. I'll send an updated invite once you confirm.\n\nThanks!", signature: sig("hana") }],
    },
    {
      subject: "Onboarding v4 review", unread: true, categories: ["Design"],
      invite: { start: invite, end: future(1, 15), busy: busyOn(invite) },
      messages: [{ from: "lena", to: [ME, "hana", "dev"], cc: ["sofia"], at: at(0, 8, 30), signature: sig("lena"), html: P("Hi all,", "Let's walk through the v4 onboarding flow together and make a call on the permissions step before we hand off to engineering.", "<b>Agenda</b><ul><li>Walkthrough of the new flow (15 min)</li><li>Step 3: is it too dense?</li><li>Permissions copy and empty states</li><li>Next steps and owners</li></ul>", "The prototype link is in the research notes I sent last week.") }],
    },
    {
      subject: "Action required: new sign-in to your Casuro account", unread: true, importance: "high", categories: ["Urgent"],
      messages: [{ from: "it", to: [ME], at: at(0, 7, 55), html: P("Hi Naman,", "We detected a new sign-in to your Casuro account.", `<table class="tbl"><tr><th>Device</th><td>MacBook Pro, macOS</td></tr><tr><th>Location</th><td>San Francisco, CA, United States</td></tr><tr><th>Time</th><td>${new Date(signIn).toLocaleDateString("en-US", { weekday: "short" })} ${new Date(signIn).getMonth() + 1}/${new Date(signIn).getDate()}/${new Date(signIn).getFullYear()} ${new Date(signIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</td></tr></table>`, "If this was you, you don't need to do anything. If you don't recognize this activity, reset your password right away and contact the IT help desk on #it-help.", "Casuro IT Security") }],
    },
    {
      subject: "Out sick today",
      messages: [{ from: "sofia", to: [ME], cc: ["hana"], at: at(0, 7, 30), text: "Hi Naman,\n\nI'm feeling pretty rough so I'm taking a sick day. I moved the roadmap sync to Wednesday and Dev is covering the on-call handoff.\n\nI'll check messages this evening if anything urgent comes up.", signature: sig("sofia") }],
    },
    {
      subject: "Latency report: deploy #1482", flagged: true, categories: ["Engineering"],
      messages: [{ from: "marcus", to: [ME, "dev"], cc: ["sofia"], at: at(1, 17, 45), signature: sig("marcus"), attachments: [{ name: "latency-1482.xlsx", size: 48200 }], html: P("Hi both,", "Numbers from the first 24 hours after deploy #1482 are in. p95 latency dropped from ~70 ms to ~28 ms once the retry fix went out.", '<table class="tbl"><tr><th>Endpoint</th><th>p50</th><th>p95</th><th>p99</th></tr><tr><td>/api/spaces</td><td>11 ms</td><td>26 ms</td><td>61 ms</td></tr><tr><td>/api/assessments</td><td>14 ms</td><td>31 ms</td><td>84 ms</td></tr><tr><td>/api/auth/session</td><td>6 ms</td><td>12 ms</td><td>30 ms</td></tr></table>', "The connection pool change is still only in staging. Full breakdown by endpoint and region is in the attached sheet.") }],
    },
    {
      subject: "Benefits open enrollment closes Friday", pinned: true, categories: ["Finance"],
      messages: [{ from: "people", to: [ME], at: at(2, 9, 0), attachments: [{ name: "2027-benefits-guide.pdf", size: 1260000 }], html: P("Hi team,", "Open enrollment for 2027 benefits closes this <b>Friday at 5 PM PT</b>. If you don't make any changes, your current medical, dental and vision elections roll over automatically.", "New this year: a higher HSA employer match and an expanded mental health benefit. The full guide is attached.", "Questions? Reply to this email or drop by People Team office hours on Thursday.", "Casuro People Team") }],
    },
    {
      subject: "Onboarding v4 - research notes", categories: ["Design"],
      messages: [{ from: "lena", to: [ME, "hana"], at: at(3, 16, 10), signature: sig("lena"), attachments: [{ name: "Onboarding v4.pptx", size: 4820000 }, { name: "Research notes.docx", size: 86000 }], html: P("Hi Naman and Hana,", "Sharing the exported flow and my notes from the last round of usability sessions (6 participants).", "<b>Highlights</b><ul><li>5 of 6 got stuck on step 3 (workspace permissions)</li><li>Everyone liked the progress indicator</li><li>Two people expected to invite teammates earlier</li></ul>", "Would love comments before Tuesday's review.") }],
    },
    {
      subject: "Postmortem: SEV-2 checkout errors", categories: ["Engineering"],
      messages: [{ from: "dev", to: [ME, "marcus", "sofia"], at: at(6, 10, 30), signature: sig("dev"), attachments: [{ name: "Postmortem SEV-2.docx", size: 142000 }], text: "Hi all,\n\nThe postmortem for last Tuesday's SEV-2 is ready for review. Root cause was connection pool exhaustion under a retry storm from the payments client.\n\nAction items are assigned in the doc. Please add comments by Friday." }],
    },
    {
      subject: "Q4 roadmap: final draft",
      messages: [
        { from: "hana", to: [ME, "sofia", "lena"], at: at(8, 15, 5), signature: sig("hana"), text: "Hi all,\n\nAttached is the final draft of the Q4 roadmap. The big bets are the assessment spaces launch, SSO for enterprise, and the onboarding v4 rollout.\n\nPlease flag anything that looks off by Wednesday so I can share it with leadership." },
        { from: "sofia", to: ["hana", ME, "lena"], at: at(7, 11, 40), signature: sig("sofia"), text: "Looks great. One note: SSO depends on the auth refactor landing in October, so I'd mark it as at-risk for now." },
      ],
    },
    // Other
    {
      focused: false, unread: true, subject: "Contoso Weekly: 5 patterns for resilient APIs",
      messages: [{ from: "contoso", to: [ME], at: at(0, 6, 15), html: `<div class="promo"><div class="hero" style="background:linear-gradient(135deg,#0f6cbd,#5b5fc7)">Contoso Weekly</div><div class="pb">${P("<b>5 patterns for resilient APIs</b>", "Retries with jitter, idempotency keys, circuit breakers, bulkheads and graceful degradation. This week we look at how each one holds up in production.", '<a class="cta" href="#" data-toast="Opening contoso.example in a new tab">Read the issue</a>')}</div></div>${P("You're receiving this because you subscribed to Contoso Weekly. Unsubscribe any time.")}` }],
    },
    {
      focused: false, unread: true, subject: "Your order #48213 has shipped",
      messages: [{ from: "north", to: [ME], at: at(1, 13, 20), html: P("Hi Naman,", "Good news: your order <b>#48213</b> is on its way.", '<table class="tbl"><tr><th>Item</th><th>Qty</th></tr><tr><td>Ergonomic desk mat, charcoal</td><td>1</td></tr><tr><td>USB-C dock, 11 ports</td><td>1</td></tr></table>', "Estimated delivery: Thursday. Track your package from your Northwind account.", "Northwind Traders") }],
    },
    {
      focused: false, subject: "New seasonal blend: Harvest Moon",
      messages: [{ from: "tailwind", to: [ME], at: at(2, 7, 45), html: `<div class="promo"><div class="hero" style="background:linear-gradient(135deg,#8a4b22,#c98b4b)">Harvest Moon</div><div class="pb">${P("Notes of cherry, cocoa and toasted pecan. Roasted fresh every Monday.", "Free shipping on orders over $30 this week.")}</div></div>` }],
    },
    {
      focused: false, unread: true, subject: "Early bird pricing ends Sunday",
      messages: [{ from: "fabrik", to: [ME], at: at(4, 11, 0), html: P("Join 2,000 designers and engineers in Austin this November for three days of talks on design systems, tokens and accessibility.", "Early bird tickets end Sunday at midnight.", '<a class="cta" href="#" data-toast="Opening fabrikam.example in a new tab">Get tickets</a>') }],
    },
    {
      focused: false, subject: "Your invoice for September is ready", categories: ["Finance"],
      messages: [{ from: "acme", to: [ME], at: at(5, 6, 0), attachments: [{ name: "Invoice-2026-09.pdf", size: 96000 }], html: P("Hi Naman,", "Your Acme Cloud invoice for September is ready. Total due: <b>$1,284.40</b>.", "Payment will be charged automatically to the card on file on October 1.", "Acme Cloud Billing") }],
    },
    {
      focused: false, subject: "Deploy #1482 to production succeeded",
      messages: [{ from: "deploy", to: [ME], at: at(2, 9, 40), html: P("<b>api-gateway</b> deployed to production in 3m 12s.", "Commit <code>a3f9e1c</code> fix: retry idempotent requests with jitter", "Triggered by Marcus Chen.") }],
    },
    // Sent Items
    { folder: "sent", subject: "Re: Q4 roadmap draft", messages: [{ from: ME, to: ["lena"], at: at(1, 16, 20), text: "Looks great, Lena. I left a few comments on the platform section, mostly about sequencing the SSO work." }] },
    { folder: "sent", subject: "Hiring loop debrief", messages: [{ from: ME, to: ["hana", "marcus"], at: at(2, 17, 5), text: "Thanks both for the thorough feedback. Let's sync Wednesday to finalize the decision on the backend candidate." }] },
    { folder: "sent", subject: "Offsite venue options", messages: [{ from: ME, to: ["sofia"], at: at(4, 12, 40), text: "Hi Sofia, here are the three venues I shortlisted for the November offsite. The waterfront one has the best breakout rooms." }] },
    // Everything else
    { folder: "drafts", subject: "Offsite planning", messages: [{ from: ME, to: ["people"], at: at(0, 8, 10), html: P("Hi team,", "A few ideas for the November offsite agenda:") }] },
    { folder: "scheduled", focused: false, subject: "Renew your speaker badge", snoozedUntil: future(1, 8), messages: [{ from: "fabrik", to: [ME], at: at(6, 9, 0), text: "Reminder to renew your speaker badge before the October 15 deadline." }] },
    { folder: "deleted", subject: "Lunch order for Friday?", messages: [{ from: "sofia", to: [ME, "dev", "lena"], at: at(10, 11, 30), text: "Thai or tacos for the Friday team lunch? Reply by Thursday!", signature: sig("sofia") }] },
    { folder: "junk", unread: true, subject: "You've WON a $1,000 gift card!!!", messages: [{ from: "prize", to: [ME], at: at(0, 3, 12), text: "Congratulations!!! You have been selected. Click here to claim your prize now!!!" }] },
    { folder: "archive", subject: "Welcome to Casuro!", messages: [{ from: "people", to: [ME], at: at(120, 9, 0), text: "Welcome aboard, Naman! Your first week schedule, laptop pickup details and team contacts are below." }] },
    { folder: "archive", subject: "Laptop refresh scheduled", messages: [{ from: "it", to: [ME], at: at(40, 14, 0), text: "Your laptop refresh is scheduled. Please back up local files before your appointment." }] },
    { folder: "notes", subject: "Offsite ideas", messages: [{ from: ME, to: [ME], at: at(3, 20, 5), text: "Boat tour, cooking class, hack day with prizes, a short retro on Q3." }] },
    { folder: "history", subject: "Chat with Marcus Chen", messages: [{ from: "marcus", to: [ME], at: at(2, 15, 10), html: P("<b>Marcus Chen</b>: pool size change looks good on staging", "<b>Naman Shukla</b>: nice, let's roll it out after the migration lands", "<b>Marcus Chen</b>: sounds good") }] },
    { folder: "f-projects", unread: true, subject: "Platform migration kickoff notes", messages: [{ from: "marcus", to: [ME, "dev"], at: at(9, 10, 0), text: "Notes from the kickoff: we'll migrate in three phases starting with read replicas. Owners are listed in the tracker.", signature: sig("marcus") }] },
    { folder: "f-receipts", subject: "Receipt for order #47790", messages: [{ from: "north", to: [ME], at: at(21, 18, 0), text: "Thanks for your order! Your receipt for order #47790 is attached.", attachments: [{ name: "Receipt-47790.pdf", size: 64000 }] }] },
  ],
};

const REPLIES: Record<Colleague, string[]> = {
  naman: [],
  hana: ["Thanks Naman, that works for me. I'll update the invite.", "Perfect, appreciate the quick reply!"],
  marcus: ["Got it, I'll take a look this afternoon and report back.", "Sounds good. I'll keep an eye on the dashboards."],
  sofia: ["Thanks! I'll follow up once I'm back tomorrow.", "Great, let's go with that."],
  dev: ["Thanks, I'll push an update in a bit.", "Makes sense. I'll ping you once the dry run finishes."],
  lena: ["Love it, thanks! I'll fold that into the next iteration.", "Great, see you at the review."],
};
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function OutlookPreview() {
  const ref = useRef<OutlookMailbox | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outlook = useOutlook(OUTLOOK_DEMO, {
    onEvent(event) {
      const o = ref.current!;
      // A colleague you write to answers five seconds later (unless you undo the send).
      if (event.type === "send" && !event.scheduled) {
        const who = event.to.find((x): x is Colleague => COLLEAGUES.includes(x as Colleague));
        if (!who) return;
        pending.current = setTimeout(() => void o.reply(event.conversation, { from: who, to: [ME], text: `Hi Naman,\n\n${pick(REPLIES[who])}`, signature: sig(who) }), 5000);
      }
      if (event.type === "undo" && event.label === "Send" && pending.current) clearTimeout(pending.current);
    },
  });
  ref.current = outlook;
  return <Outlook outlook={outlook} />;
}
