import { useRef } from "react";
import { Intercom, useIntercom, type IntercomSeed, type IntercomWorkspace } from "../apps/intercom";
import { FACES } from "./faces";

// apps/intercom.html's inbox, driving the React version: the same
// teammates, customers, conversations and Copilot answers, the mockup's
// toasts for what it leaves out, and customers answering what you send.

const min = (m: number) => Date.now() - m * 60000;
function yesterday(time: string) {
  const [, h, m, ap] = time.match(/(\d+):(\d+) (AM|PM)/)!;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours((+h % 12) + (ap === "PM" ? 12 : 0), +m, 0, 0);
  return d.getTime();
}

const SOURCES = [
  { title: "How assessment deadlines work", kind: "article" as const },
  { title: "Similar conversation with Contoso Talent", kind: "conversation" as const },
];
const OLDER = [{ subject: "Question about assessment templates", at: "Aug 21" }];
const holding = (first: string, company: string) => ({
  answer: `Hi ${first}, thanks for reaching out! I've checked your ${company} workspace and I'm looking into this with the team now. I'll follow up here as soon as I have an update.`,
  sources: SOURCES,
});

export const INTERCOM_DEMO: IntercomSeed = {
  workspace: { name: "Casuro" },
  me: "naman",
  teammates: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", photo: FACES.naman },
    hana: { name: "Hana Kim", photo: FACES.hana },
    marcus: { name: "Marcus Chen", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", photo: FACES.sofia },
    dev: { name: "Dev Patel", photo: FACES.dev },
    lena: { name: "Lena Okafor", photo: FACES.lena },
  },
  customers: {
    priya: {
      name: "Priya Raman", email: "priya.raman@northwindhiring.com", company: "Northwind Hiring", location: "Austin, TX", timezone: "America/Chicago", plan: "Growth (annual)", color: "#0f766e",
      recent: [{ subject: "Bulk invite CSV failing", at: "Sep 12" }, { subject: "Custom branding on candidate emails", at: "Aug 30" }],
    },
    daniel: { name: "Daniel Okoro", email: "daniel@contosotalent.com", company: "Contoso Talent", location: "London, UK", timezone: "Europe/London", plan: "Enterprise", color: "#7c3aed", recent: OLDER },
    mei: { name: "Mei Tanaka", email: "mei@fabrikamlabs.io", company: "Fabrikam Labs", location: "Tokyo, JP", timezone: "Asia/Tokyo", plan: "Starter", color: "#c2410c", recent: OLDER },
    carlos: { name: "Carlos Mendes", email: "carlos@tailspintalent.com", company: "Tailspin Talent", location: "Sao Paulo, BR", timezone: "America/Sao_Paulo", plan: "Growth", color: "#0369a1", recent: OLDER },
    olivia: { name: "Olivia Brandt", email: "olivia@woodgrovepeople.com", company: "Woodgrove People", location: "Berlin, DE", timezone: "Europe/Berlin", plan: "Enterprise", color: "#be185d", recent: OLDER },
    sam: { name: "Sam Whitfield", email: "sam@adventureworks.dev", company: "Adventure Works", location: "Toronto, CA", timezone: "America/Toronto", plan: "Trial", color: "#4d7c0f", recent: OLDER },
  },
  inboxes: [
    { id: "you", label: "Your inbox", icon: "👋" },
    { id: "mentions", label: "Mentions", icon: "@", count: 1 },
    { id: "created", label: "Created by you", icon: "✎", count: 0 },
    { id: "all", label: "All", icon: "☰", count: 48 },
    { id: "unassigned", label: "Unassigned", icon: "◯", count: 7 },
  ],
  teamInboxes: [
    { id: "support", label: "Support", icon: "🛠", count: 23 },
    { id: "billing", label: "Billing", icon: "💳", count: 6 },
    { id: "onboarding", label: "Onboarding", icon: "🚀", count: 9 },
  ],
  views: [
    { id: "v-sla", label: "SLA at risk", icon: "⏱", count: 3 },
    { id: "v-ent", label: "Enterprise customers", icon: "⭐", count: 11 },
    { id: "v-bugs", label: "Bugs to triage", icon: "🐛", count: 5 },
  ],
  inserts: {
    emoji: "👋",
    article: "Help article: How assessment deadlines work - casuro.intercom.help/articles/deadlines",
    macro: "Thanks for reaching out! I've looped in our engineering team and will update you within the hour.",
  },
  conversations: [
    {
      id: "1", customer: "priya", subject: "Assessment link expired for candidates", channel: "chat", sla: "12m", priority: true, team: "Support", tags: ["Assessments", "Bug"],
      copilot: {
        answer: "Hi Priya, thanks for your patience! This was caused by a timezone issue with invites sent before 4pm PT last week, which set the deadline to UTC midnight. It's fixed now. I've extended the deadline for all 12 affected candidates by 7 days, so their existing links will work again. No need to resend anything.",
        sources: SOURCES,
      },
      messages: [
        { kind: "customer", at: min(11), text: "Hi! Several of our candidates are telling us their assessment link says \"expired\" even though we sent it yesterday." },
        { kind: "fin", at: min(11), text: "Assessment links expire based on the deadline set when the invite was sent. You can extend it from Candidates > select candidate > Extend deadline. Would you like me to connect you with the team?" },
        { kind: "customer", at: min(9), text: "The deadline was set to 7 days though. This is for the Senior Backend Engineer assessment." },
        { kind: "event", at: min(9), text: "*Fin* handed the conversation to *Support*" },
        { kind: "note", by: "hana", at: min(7), text: "Looks related to the timezone bug Dev fixed on Friday. Invites created before 4pm PT used UTC midnight. @Naman can you confirm with her?" },
        { kind: "reply", by: "naman", at: min(5), seen: true, text: "Hi Priya, thanks for flagging! I'm taking a look now. Could you share one of the candidate emails so I can check the invite?" },
        { kind: "customer", at: min(2), text: "Sure, one of them is alex.m@example.com. Around 12 candidates are affected." },
      ],
    },
    {
      id: "2", customer: "daniel", subject: "Okta SSO: users land on login loop", channel: "email", unread: true, sla: "Overdue", slaBreached: true, team: "Support", tags: ["SSO"],
      copilot: holding("Daniel", "Contoso Talent"),
      messages: [
        { kind: "customer", at: min(36), text: "Hello team,\n\nAfter enabling Okta SSO this morning, our recruiters are stuck in a login loop. They sign in through Okta and get sent back to the Casuro login page.\n\nThanks,\nDaniel" },
        { kind: "reply", by: "marcus", at: min(24), seen: true, text: "Hi Daniel, can you confirm the ACS URL in Okta matches https://app.casuro.com/sso/acs exactly, with no trailing slash?" },
        { kind: "customer", at: min(18), text: "It had a trailing slash. Removed it, but the loop is still happening for some users." },
      ],
    },
    {
      id: "3", customer: "mei", subject: "Charged twice for October", channel: "chat", sla: "2h", team: "Billing", tags: ["Billing"],
      copilot: holding("Mei", "Fabrikam Labs"),
      messages: [
        { kind: "customer", at: min(47), text: "I think we were charged twice for our October renewal. Can you check invoice INV-20481?" },
        { kind: "reply", by: "sofia", at: min(41), seen: true, text: "Hi Mei, I can see two charges. One is a pending authorization that will drop off in 3-5 days. I'll send you the confirmation by email too." },
      ],
    },
    {
      id: "4", customer: "carlos", subject: "Candidate submission missing code", channel: "chat", unread: true, team: "Support", tags: ["Submissions"],
      copilot: holding("Carlos", "Tailspin Talent"),
      messages: [{ kind: "customer", at: min(75), text: "A candidate says she submitted her solution but the report shows no code. Submission ID sub_8812." }],
    },
    {
      id: "5", customer: "olivia", subject: "Adding 40 hiring managers", channel: "email", team: "Onboarding", tags: ["Onboarding"],
      copilot: holding("Olivia", "Woodgrove People"),
      messages: [
        { kind: "customer", at: min(212), text: "What's the best way to bulk invite 40 hiring managers with the Reviewer role?" },
        { kind: "reply", by: "lena", at: min(190), seen: true, text: "Hi Olivia! You can upload a CSV under Team > Invite > Bulk import. I've attached a template." },
      ],
    },
    {
      id: "6", customer: "sam", subject: "Greenhouse integration question", channel: "chat", team: "Support", tags: ["Integrations"],
      copilot: holding("Sam", "Adventure Works"),
      messages: [
        { kind: "customer", at: yesterday("4:12 PM"), text: "Does the Greenhouse integration sync scores back to the candidate profile automatically?" },
        { kind: "reply", by: "dev", at: yesterday("4:30 PM"), seen: true, text: "Yes! Scores and the report link sync as soon as the candidate is graded." },
      ],
    },
  ],
  open: "1",
  view: "you",
};

const REPLIES = ["Thanks, that makes sense!", "Great, I'll let the team know.", "Perfect, that fixed it for us 🙌", "Okay, let me check on our side and get back to you.", "Appreciate the quick reply!"];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const RAIL = ["Fin AI Agent", "Knowledge", "Reports", "Outbound", "Contacts", "Settings"];

export function IntercomPreview() {
  const ref = useRef<IntercomWorkspace | null>(null);
  const intercom = useIntercom(INTERCOM_DEMO, {
    onEvent(event) {
      const s = ref.current!;
      if (event.type === "reply" && Math.random() < 0.8) {
        const id = event.conversation;
        setTimeout(() => void s.customerMessage(id, pick(REPLIES), { typing: 1800 + Math.random() * 1200 }), 900);
      }
      if (event.type === "action") {
        if (RAIL.includes(event.label)) s.toast(`${event.label} is not part of this mockup`);
        else if (event.label === "Insert GIF") s.toast("GIF picker is not part of this mockup");
        else if (event.label === "Attach a file") s.toast("Attachments are not part of this mockup");
        else s.toast(event.label);
      }
      if (event.type === "copilot") {
        if (event.action === "regenerate") s.toast("Copilot regenerated the answer");
        if (event.action === "source") s.toast("Opens source in Knowledge");
        if (event.action === "ask") {
          const answer = `I couldn't find a confident answer to "${event.text}" in your help center. Try rephrasing it, or ask a teammate in a note.`;
          setTimeout(() => s.suggest(event.conversation, { question: event.text, answer }), 700);
        }
      }
    },
  });
  ref.current = intercom;
  return <Intercom intercom={intercom} />;
}
