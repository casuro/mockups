import { useRef } from "react";
import { Zendesk, useZendesk, type ZendeskMessageInput, type ZendeskSeed, type ZendeskTicketInput, type ZendeskWorkspace } from "../apps/zendesk";
import { FACES } from "./faces";

// apps/zendesk.html's help desk, driving the React version: the same
// agents, customers, tickets and conversations, the mockup's notices for
// the controls it has no behaviour for, and a customer who answers your
// public replies.

// "09:14", `days` days ago.
function at(days: number, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
const MIN = 60_000;
const ago = (minutes: number) => Date.now() - minutes * MIN;

const ORGS = {
  northwind: { name: "Northwind Hiring", plan: "Enterprise", timezone: "America/New_York", city: "New York" },
  contoso: { name: "Contoso Talent", plan: "Growth", timezone: "Europe/London", city: "London" },
  fabrikam: { name: "Fabrikam Labs", plan: "Enterprise", timezone: "America/Los_Angeles", city: "Seattle" },
  tailspin: { name: "Tailspin Recruiting", plan: "Starter", timezone: "Australia/Sydney", city: "Sydney" },
  adatum: { name: "Adatum Systems", plan: "Growth", timezone: "Europe/Berlin", city: "Berlin" },
  litware: { name: "Litware Inc", plan: "Enterprise", timezone: "Asia/Kolkata", city: "Bengaluru" },
};
type Org = keyof typeof ORGS;

const PEOPLE: Record<string, { name: string; email: string; org: Org; color: string; title: string }> = {
  rachel: { name: "Rachel Moore", email: "rachel.moore@northwindhiring.com", org: "northwind", color: "#5c6970", title: "Talent Ops Lead" },
  omar: { name: "Omar Haddad", email: "omar@contosotalent.co.uk", org: "contoso", color: "#b35e1a", title: "Recruiting Manager" },
  priya: { name: "Priya Raman", email: "priya.r@fabrikamlabs.com", org: "fabrikam", color: "#7a4dab", title: "IT Administrator" },
  jake: { name: "Jake Thornton", email: "jake@tailspinrecruiting.au", org: "tailspin", color: "#2a8a78", title: "Founder" },
  elena: { name: "Elena Vogt", email: "e.vogt@adatum.de", org: "adatum", color: "#c2436b", title: "Hiring Coordinator" },
  arjun: { name: "Arjun Mehta", email: "arjun.mehta@litware.in", org: "litware", color: "#1f73b7", title: "Engineering Manager" },
  chloe: { name: "Chloe Martin", email: "chloe@northwindhiring.com", org: "northwind", color: "#8a6b00", title: "Recruiter" },
  ben: { name: "Ben Asante", email: "ben.asante@fabrikamlabs.com", org: "fabrikam", color: "#3b6ea5", title: "Candidate Experience" },
};

const CONVOS: Record<number, ZendeskMessageInput[]> = {
  4821: [
    { from: "rachel", at: at(0, "09:14"), channel: "email", text: "Hi team,\n\nOne of our senior backend candidates (Tom Reyes) clicked his Casuro assessment link this morning and got \"This link has expired\". The invite was sent Friday and the deadline is set to Oct 2, so it should still be valid.\n\nCould you take a look? He's only available today and tomorrow.\n\nThanks,\nRachel" },
    { from: "naman", at: at(0, "09:31"), channel: "email", text: "Hi Rachel,\n\nThanks for the details and sorry for the trouble. I can see the invite for Tom in your workspace. I'm checking with our engineering team why the link was marked expired early and will update you shortly." },
    { from: "hana", at: at(0, "09:48"), channel: "web", note: true, text: "Looks like the invite was re-sent after the template edit on Friday, which rotated the token. The old link in Tom's inbox is the expired one. Resending from the candidate page should fix it. Known issue CAS-2291." },
    { from: "rachel", at: at(0, "09:55"), channel: "email", text: "Great, thank you. If you can resend it directly that would be ideal, I'm in back to back interviews most of the day." },
  ],
  4819: [
    { from: "arjun", at: at(0, "07:52"), channel: "web", text: "Candidates on our Staff Engineer loop are getting \"File too large\" when uploading their take-home repo as a .zip (around 38 MB). The limit in settings says 50 MB. This is blocking 6 candidates this week.", attachment: "upload-error.png" },
    { from: "naman", at: at(0, "08:20"), channel: "web", text: "Hi Arjun, thanks for flagging. I reproduced this with a 40 MB zip. The limit is being applied before compression is accounted for. I've escalated this to engineering as urgent." },
    { from: "dev", at: at(0, "08:41"), channel: "web", note: true, text: "Fix is in review (PR #1184). Workaround: candidates can link a GitHub repo instead of uploading. Enable 'Allow repo links' on the assessment." },
  ],
  4817: [
    { from: "priya", at: at(1, "16:20"), channel: "email", text: "After moving our IdP to Okta, users get stuck in a redirect loop between Casuro and Okta. We updated the SAML metadata URL. Screenshot of the network trace attached.", attachment: "saml-trace.har" },
    { from: "lena", at: at(1, "16:48"), channel: "web", note: true, text: "ACS URL in their Okta app still points to the old tenant subdomain. Need them to update to fabrikam.casuro.com/sso/acs." },
    { from: "naman", at: at(1, "17:05"), channel: "email", text: "Hi Priya,\n\nThe loop is caused by the ACS URL in your Okta app. Please update it to https://fabrikam.casuro.com/sso/acs and re-test. Let me know once done and I'll verify on our side." },
  ],
};

// id, subject, requester, status, priority, assignee, type, tags, followers, requested, updated, channel
const TICKETS: ZendeskTicketInput[] = ([
  { id: 4821, subject: "Assessment link expired before candidate could start", requester: "rachel", status: "open", priority: "high", assignee: "naman", type: "incident", tags: ["assessment", "link_expiry", "enterprise"], followers: ["hana"], requestedAt: at(0, "09:14"), updatedAt: ago(12), channel: "email" },
  { id: 4819, subject: "Candidate can't upload code submission (file too large error)", requester: "arjun", status: "open", priority: "urgent", assignee: "naman", type: "problem", tags: ["upload", "code_submission", "bug"], followers: ["dev", "marcus"], requestedAt: at(0, "07:52"), updatedAt: ago(38), channel: "web" },
  { id: 4817, subject: "SSO login loop after Okta migration", requester: "priya", status: "pending", priority: "urgent", assignee: "naman", type: "incident", tags: ["sso", "okta", "enterprise"], followers: ["lena"], requestedAt: at(1, "16:20"), updatedAt: ago(120), channel: "email" },
  { id: 4823, subject: "How do we add a second hiring team to our workspace?", requester: "jake", status: "new", priority: "normal", assignee: null, type: "question", tags: ["workspace", "teams"], requestedAt: at(0, "10:02"), updatedAt: ago(4), channel: "chat" },
  { id: 4822, subject: "Scorecard PDF export shows blank rubric section", requester: "elena", status: "new", priority: "normal", assignee: null, type: "problem", tags: ["export", "scorecards"], requestedAt: at(0, "09:40"), updatedAt: ago(26), channel: "email" },
  { id: 4816, subject: "Request to extend candidate deadline for 14 invites", requester: "chloe", status: "open", priority: "normal", assignee: "hana", type: "task", tags: ["deadline", "bulk_action"], requestedAt: at(1, "14:05"), updatedAt: ago(60), channel: "email" },
  { id: 4814, subject: "Proctoring webcam check fails on Safari 18", requester: "ben", status: "open", priority: "high", assignee: "marcus", type: "problem", tags: ["proctoring", "safari"], followers: ["naman"], requestedAt: at(1, "11:31"), updatedAt: ago(180), channel: "web" },
  { id: 4812, subject: "Invoice for September shows wrong seat count", requester: "omar", status: "pending", priority: "low", assignee: "sofia", type: "question", tags: ["billing", "invoice"], requestedAt: at(3, "10:00"), updatedAt: at(1, "12:00"), channel: "email" },
  { id: 4809, subject: "Webhook for completed assessments stopped firing", requester: "arjun", status: "open", priority: "high", assignee: "dev", type: "incident", tags: ["webhooks", "api"], followers: ["naman"], requestedAt: at(4, "10:00"), updatedAt: at(1, "11:00"), channel: "email" },
  { id: 4806, subject: "Custom question bank import rejected CSV", requester: "elena", status: "pending", priority: "normal", assignee: "lena", type: "problem", tags: ["import", "question_bank"], requestedAt: at(5, "10:00"), updatedAt: at(2, "10:00"), channel: "web" },
  { id: 4801, subject: "Candidate report missing plagiarism score", requester: "rachel", status: "solved", priority: "normal", assignee: "naman", type: "problem", tags: ["reports", "plagiarism"], requestedAt: at(8, "10:00"), updatedAt: at(6, "10:00"), channel: "email" },
  { id: 4797, subject: "Reset 2FA for recruiter account", requester: "omar", status: "solved", priority: "normal", assignee: "sofia", type: "task", tags: ["2fa", "account"], requestedAt: at(9, "10:00"), updatedAt: at(9, "11:00"), channel: "chat" },
  { id: 4793, subject: "Timezone shown incorrectly on interview invites", requester: "jake", status: "solved", priority: "low", assignee: "hana", type: "problem", tags: ["timezone", "invites"], requestedAt: at(10, "10:00"), updatedAt: at(8, "10:00"), channel: "email" },
] satisfies ZendeskTicketInput[]).map((t) => ({
  ...t,
  // Tickets without a conversation in the mockup open with the requester's first message.
  messages: CONVOS[t.id!] ?? [
    { from: t.requester, at: t.requestedAt, text: `Hi Casuro support,\n\n${t.subject}. Could you help us with this?\n\nThanks,\n${PEOPLE[t.requester].name.split(" ")[0]}` },
  ],
}));

export const ZENDESK_DEMO: ZendeskSeed = {
  account: { name: "Casuro Support" },
  me: "naman",
  agents: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", photo: FACES.naman },
    hana: { name: "Hana Kim", email: "hana@casuro.com", photo: FACES.hana },
    marcus: { name: "Marcus Chen", email: "marcus@casuro.com", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", email: "sofia@casuro.com", photo: FACES.sofia },
    dev: { name: "Dev Patel", email: "dev@casuro.com", photo: FACES.dev },
    lena: { name: "Lena Okafor", email: "lena@casuro.com", photo: FACES.lena },
  },
  organizations: Object.fromEntries(Object.entries(ORGS).map(([id, o]) => [id, { ...o, tags: [`${o.plan.toLowerCase()}_customer`] }])),
  requesters: Object.fromEntries(
    Object.entries(PEOPLE).map(([id, p]) => [
      id,
      {
        ...p,
        history: [
          { text: 'Visited Help Center: "Candidate invite links"', when: "Sep 21" },
          { text: `Signed up for ${ORGS[p.org].name} workspace`, when: "Mar 2025" },
        ],
      },
    ])
  ),
  tickets: TICKETS,
  macros: [
    { name: "Assessment: resend invite", text: "I've resent the assessment invite so the candidate now has a fresh, working link. The original deadline is unchanged. Let us know if anything else comes up!" },
    { name: "Ask for screenshot / HAR", text: "Could you share a screenshot of the error and, if possible, a HAR file from the browser? That will help us pinpoint the issue quickly." },
    { name: "Escalated to engineering", text: "I've escalated this to our engineering team and marked it as high priority. I'll keep you updated as soon as I hear back." },
    { name: "Close: resolved", text: "Glad we could get this sorted! I'll mark this ticket as solved, but feel free to reply if anything else comes up." },
  ],
  view: "mine",
  tabs: [4821, 4819],
  open: 4821,
};

// The mockup's notices for controls it has no behaviour for.
const NOTICES: Record<string, string> = {
  Products: "Product tray",
  Notifications: "No new notifications",
  Help: "Help center",
  "Manage views": "Manage views is an admin feature",
  Play: "Play mode started",
  Options: "View options",
  Organization: "Organizations is not available in this demo",
};
const RAIL = ["Home", "Customers", "Organizations", "Reporting", "Admin"];
const THANKS = [
  "Thanks, that's really helpful. I'll give it a try and let you know.",
  "Perfect, thank you for the quick turnaround!",
  "Got it. I'll pass this on to the team and get back to you.",
];

export function ZendeskPreview() {
  const ref = useRef<ZendeskWorkspace | null>(null);
  const zendesk = useZendesk(ZENDESK_DEMO, {
    onEvent(event) {
      const z = ref.current!;
      if (event.type === "action")
        z.toast(NOTICES[event.label] ?? (RAIL.includes(event.label) ? `${event.label} is not available in this demo` : event.label));
      // The customer answers a public reply that leaves the ticket waiting on them.
      if (event.type === "submit" && event.text && !event.note && event.status === "pending")
        void z.customerReply(event.ticket, THANKS[Math.floor(Math.random() * THANKS.length)], { delay: 4000 });
    },
  });
  ref.current = zendesk;
  return <Zendesk zendesk={zendesk} />;
}
