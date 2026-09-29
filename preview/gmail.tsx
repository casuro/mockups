import { useRef } from "react";
import { Gmail, useGmail, type GmailMailbox, type GmailSeed } from "../apps/gmail";
import { FACES } from "./faces";

// apps/gmail.html's mailbox and demo script, driving the React version: the
// same people, labels and mail, and a colleague answering a few seconds
// after you write to them.

// `days` days ago at h:m; a time later today than now becomes a few minutes ago.
function at(days: number, h: number, m = 0) {
  const now = Date.now();
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d.getTime() > now ? now - 60000 * (15 + days) : d.getTime();
}
const sig = (name: string) => `${name}\nCasuro`;
const review = at(0, 14);
const reviewDay = new Date(review).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

export const GMAIL_DEMO: GmailSeed = {
  me: "naman",
  domain: "casuro.com",
  people: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", color: "#8430ce", photo: FACES.naman },
    hana: { name: "Hana Kim", email: "hana@casuro.com", color: "#e52592", photo: FACES.hana, signature: sig("Hana Kim") },
    marcus: { name: "Marcus Chen", email: "marcus@casuro.com", color: "#1a73e8", photo: FACES.marcus, signature: sig("Marcus Chen") },
    sofia: { name: "Sofia Alvarez", email: "sofia@casuro.com", color: "#188038", photo: FACES.sofia, signature: sig("Sofia Alvarez") },
    dev: { name: "Dev Patel", email: "dev@casuro.com", color: "#e8710a", photo: FACES.dev, signature: sig("Dev Patel") },
    lena: { name: "Lena Okafor", email: "lena@casuro.com", color: "#12a4af", photo: FACES.lena, signature: sig("Lena Okafor") },
    people: { name: "Casuro People Team", email: "people@casuro.com", color: "#9334e6" },
    it: { name: "Casuro IT", email: "it-security@casuro.com", color: "#5f6368" },
    deploy: { name: "Deploybot", email: "deploybot@casuro.com", color: "#1e8e3e" },
    north: { name: "Northwind Travel", email: "trips@northwind.example", color: "#00796b" },
    contoso: { name: "Contoso Cloud", email: "offers@contoso.example", color: "#1967d2" },
    fabrik: { name: "Fabrikam Design Conf", email: "hello@fabrikam.example", color: "#d93025" },
    tailwind: { name: "Tailwind Coffee Roasters", email: "news@tailwindcoffee.example", color: "#795548" },
    acme: { name: "Acme Cloud Billing", email: "billing@acme.example", color: "#f9ab00" },
    meetup: { name: "Bay Area Design Systems", email: "events@designsystems.example", color: "#c5221f" },
    alumni: { name: "Casuro Alumni Network", email: "alumni@casuro.com", color: "#3949ab" },
    lucky: { name: "Prize Center", email: "winner@prize-center.example", color: "#b31412" },
  },
  labels: { Engineering: "#1a73e8", "Engineering/Incidents": "#d93025", Design: "#a142f4", Hiring: "#188038", Receipts: "#5f6368", Travel: "#e37400" },
  mails: [
    {
      subject: "Migration PR #912 needs review", unread: true, important: true, labels: ["Engineering"],
      messages: [
        { from: "dev", to: ["naman"], at: at(0, 9, 42), body: "Hi Naman,\n\nThe `assessment_spaces` migration is up as #912. It adds the table and backfills owners from the legacy column. I'm mostly worried about the lock on `spaces` during the backfill.\n\nCould you take a look before lunch?" },
        { from: "naman", to: ["dev"], at: at(0, 10, 3), body: "Will do. Can you batch the update in chunks of 5k so we don't hold the lock?" },
        { from: "dev", to: ["naman"], at: at(0, 11, 5), body: "Good call, pushed a batched version. Diff is small now:\n\n- Batched backfill (5k rows)\n- Index created concurrently\n- Rollback script added\n\nThanks!" },
      ],
    },
    {
      subject: "1:1 moved to 4pm?", unread: true, starred: true,
      messages: [{ from: "hana", to: ["naman"], at: at(0, 10, 40), body: "Hey! Something came up at 2. Can we move our 1:1 to 4pm today? 🙏\n\nHappy to do tomorrow morning instead if that's easier." }],
    },
    {
      subject: `Invitation: Onboarding v4 review @ ${reviewDay} 2pm - 3pm`, important: true, labels: ["Design"],
      invite: { title: "Onboarding v4 review", start: review, end: review + 3_600_000 },
      messages: [{ from: "lena", to: ["naman", "hana", "dev"], at: at(0, 8, 30), signed: false, body: "Let's walk through the v4 onboarding flow together and decide on the permissions step.\n\nAgenda:\n- Walkthrough (15 min)\n- Step 3 density\n- Next steps" }],
    },
    {
      subject: "Onboarding v4 - review notes", labels: ["Design"],
      messages: [{ from: "lena", to: ["naman", "hana"], at: at(0, 9, 12), body: "Sharing the exported flow and my notes from the last round. Main open question is whether step 3 is too dense.\n\nWould love comments before the review.", attachments: ["Onboarding v4.pdf", "Research notes.docx"] }],
    },
    {
      subject: "Latency report for deploy #1482", labels: ["Engineering"],
      messages: [{ from: "marcus", to: ["naman", "dev", "sofia"], at: at(1, 18, 2), body: "p95 latency dropped from ~70ms to ~28ms after the retry fix. Full breakdown by endpoint attached.\n\nPool size change is still only in staging.", attachments: ["latency-1482.xlsx"] }],
    },
    {
      subject: "Postmortem: SEV-2 checkout errors", labels: ["Engineering/Incidents"], unread: true, tab: "updates",
      messages: [{ from: "dev", to: ["naman", "marcus", "sofia"], at: at(2, 10, 30), body: "Postmortem for Monday's SEV-2 is ready for review. Root cause was connection pool exhaustion under retry storms.\n\nAction items are assigned in the doc.", attachments: ["Postmortem SEV-2.docx"] }],
    },
    { subject: "Out sick today", messages: [{ from: "sofia", to: ["naman"], at: at(3, 8, 5), body: "Hi Naman, I'm out sick today. On-call is covered by Dev. Back Monday." }] },
    {
      subject: "Benefits enrollment closes Friday", tab: "updates",
      messages: [{ from: "people", to: ["naman"], at: at(1, 9, 0), body: "Hi team,\n\nOpen enrollment for 2027 benefits closes this Friday at 5pm. If you don't make any changes, your current elections roll over.\n\nQuestions? Reply to this email." }],
    },
    {
      subject: "Security alert: new sign-in on Mac", tab: "updates",
      messages: [{ from: "it", to: ["naman"], at: at(0, 7, 55), body: "A new sign-in to your Casuro account was detected on a Mac in San Francisco, CA.\n\nIf this was you, you don't need to do anything. If not, reset your password right away." }],
    },
    {
      subject: "Deploy #1482 to production succeeded", tab: "updates", labels: ["Engineering"],
      messages: [{ from: "deploy", to: ["naman"], at: at(0, 9, 40), body: "*api-gateway* deployed to production in 3m 12s.\n\nCommit a3f9e1c - fix: retry idempotent requests" }],
    },
    {
      subject: "Your invoice for September", tab: "updates", labels: ["Receipts"],
      messages: [{ from: "acme", to: ["naman"], at: at(2, 6, 0), body: "Your September invoice is ready. Total due: $1,284.40.\n\nPayment will be charged automatically on October 1.", attachments: ["Invoice-2026-09.pdf"] }],
    },
    {
      subject: "Your trip to Austin: itinerary", tab: "updates", labels: ["Travel"], starred: true,
      messages: [{ from: "north", to: ["naman"], at: at(4, 12, 30), body: "Your flight and hotel are confirmed for the design systems summit.\n\nDeparts SFO Thursday, Oct 8 at 7:05 AM.", attachments: ["Itinerary.pdf"] }],
    },
    { subject: "20% off annual plans - this week only", tab: "promotions", messages: [{ from: "contoso", to: ["naman"], at: at(0, 6, 15), body: "Upgrade to an annual plan and save 20% on compute credits. Offer ends Sunday." }] },
    { subject: "Early bird pricing ends Sunday", tab: "promotions", unread: true, messages: [{ from: "fabrik", to: ["naman"], at: at(1, 11, 0), body: "Join 2,000 designers in Austin this October. Early bird tickets end Sunday." }] },
    { subject: "New seasonal blend: Harvest Moon ☕", tab: "promotions", messages: [{ from: "tailwind", to: ["naman"], at: at(3, 7, 45), body: "Notes of cherry, cocoa and toasted pecan. Free shipping this week." }] },
    { subject: "October meetup: tokens at scale", tab: "social", unread: true, messages: [{ from: "meetup", to: ["naman"], at: at(0, 8, 0), body: "Our October meetup is about design tokens at scale. RSVP to save a seat." }] },
    { subject: "Monthly alumni newsletter", tab: "social", messages: [{ from: "alumni", to: ["naman"], at: at(5, 10, 0), body: "Catch up with former teammates, new roles and a few familiar faces." }] },
    { folder: "sent", subject: "Re: Q4 roadmap draft", messages: [{ from: "naman", to: ["lena"], at: at(1, 16, 20), body: "Looks great. Left a few comments on the platform section." }] },
    { folder: "sent", subject: "Hiring loop debrief", labels: ["Hiring"], messages: [{ from: "naman", to: ["hana", "marcus"], at: at(2, 17, 5), body: "Thanks both. Let's sync Wednesday to finalize the decision." }] },
    { folder: "drafts", subject: "Offsite planning", messages: [{ from: "naman", to: ["people"], at: at(0, 8, 10), body: "Hi team, a few ideas for the November offsite:" }] },
    { folder: "snoozed", subject: "Renew conference badge", messages: [{ from: "fabrik", to: ["naman"], at: at(6, 9, 0), body: "Reminder to renew your speaker badge before the deadline." }] },
    { folder: "spam", subject: "You've WON a $1,000 gift card!!!", messages: [{ from: "lucky", to: ["naman"], at: at(0, 3, 12), body: "Click here to claim your prize now!!!" }] },
  ],
  agenda: [
    { time: "9:30 - 9:45 AM", title: "Daily standup" },
    { time: "2:00 - 3:00 PM", title: "Onboarding v4 review", now: true },
    { time: "4:00 - 4:30 PM", title: "1:1 with Hana" },
  ],
  notes: [
    { title: "Offsite ideas", text: "Boat tour, cooking class, hack day with prizes" },
    { title: "Migration checklist", text: "Batch backfill, concurrent index, rollback script, monitor locks" },
    { title: "Reading list", text: "Shape Up, Staff Engineer, Refactoring UI", yellow: true },
  ],
  tasks: [
    { text: "Review migration PR #912" },
    { text: "Send offsite survey" },
    { text: "Approve Q4 roadmap", done: true },
  ],
};

const COLLEAGUES = ["hana", "marcus", "dev", "lena"];
const REPLIES = ["Thanks, sounds good!", "Got it, I'll take a look this afternoon.", "Perfect, see you then 👍", "Makes sense. Let's go with that."];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function GmailPreview() {
  const ref = useRef<GmailMailbox | null>(null);
  const gmail = useGmail(GMAIL_DEMO, {
    onEvent(event) {
      const g = ref.current!;
      // A colleague you write to answers five seconds later, in the same conversation.
      const answer = (mail: string, to: string[]) => {
        const who = to.find((t) => COLLEAGUES.includes(t));
        if (who) void g.reply(mail, { from: who, body: pick(REPLIES) }, { delay: 5000 });
      };
      if (event.type === "send") answer(event.id, event.to);
      if (event.type === "reply") answer(event.mail, event.to);
    },
  });
  ref.current = gmail;
  return <Gmail gmail={gmail} />;
}
