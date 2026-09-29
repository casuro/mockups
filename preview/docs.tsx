import { useRef } from "react";
import { GoogleDocs, useGoogleDocs, type DocsSeed, type GoogleDocsApp } from "../apps/docs";
import { FACES } from "./faces";

// apps/docs.html's document, driving the React version: the same PRD, people,
// comments and suggested edit, Lena's cursor, and a collaborator answering
// the comments and replies you post.

// "2:14 PM", `days` days ago.
function at(days: number, time: string) {
  const [, h, m, ap] = time.match(/(\d+):(\d+) (AM|PM)/)!;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours((+h % 12) + (ap === "PM" ? 12 : 0), +m, 0, 0);
  return d.getTime();
}

export const DOCS_DEMO: DocsSeed = {
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", photo: FACES.naman },
    hana: { name: "Hana Kim", email: "hana@casuro.com", color: "#9334e6", photo: FACES.hana },
    marcus: { name: "Marcus Chen", email: "marcus@casuro.com", color: "#1e8e3e", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", email: "sofia@casuro.com", photo: FACES.sofia },
    dev: { name: "Dev Patel", email: "dev@casuro.com", photo: FACES.dev },
    lena: { name: "Lena Okafor", email: "lena@casuro.com", color: "#e8710a", photo: FACES.lena },
  },
  document: {
    title: "Onboarding v4 - Product Requirements",
    folder: "Casuro / Product / PRDs",
    url: "https://docs.google.com/document/d/casuro-onboarding-v4/edit",
    content: [
      { type: "title", text: "Onboarding v4 - Product Requirements" },
      { type: "subtitle", text: "Casuro Product - Growth squad" },
      { type: "p", text: "**Owner:** Naman Shukla   **Reviewers:** Hana Kim, Marcus Chen, Lena Okafor\n**Status:** In review   **Target launch:** November 18, 2026" },
      { type: "h1", text: "1. Overview" },
      { type: "p", text: "New workspaces on Casuro take too long to become useful. Today an admin has to invite teammates, connect a data source, and build a first board before anyone sees value, and 38% of trial workspaces never finish that path. Onboarding v4 replaces the linear setup wizard with a guided, template-first flow that cuts median time-to-first-value from 11 minutes to under 4 minutes." },
      { type: "h1", text: "2. Goals" },
      {
        type: "ul",
        items: [
          "Reduce required setup steps from seven to three for every new workspace.",
          "Let admins start from workspace templates for sales, support, and engineering teams.",
          "Invite teammates inline, without leaving the first board.",
          "Keep the trial length at 14 days for workspaces that finish setup.",
        ],
      },
      { type: "h2", text: "2.1 Non-goals" },
      { type: "p", text: "Billing changes, SSO setup, and the mobile onboarding flow are out of scope for v4 and tracked separately in the Q1 roadmap." },
      { type: "h1", text: "3. User flow" },
      {
        type: "ol",
        items: [
          "Admin signs up and picks a team type.",
          "Casuro suggests a template and pre-fills a sample board with demo data from Northwind Labs.",
          "Admin invites teammates from the board header and connects a real data source when ready.",
        ],
      },
      { type: "p", text: "Demo data is clearly labeled and can be cleared with one click. We will A/B test the template picker against the current wizard for two weeks before rolling out to 100% of new signups." },
      { type: "h1", text: "4. Success metrics" },
      {
        type: "table",
        header: ["Metric", "Baseline", "Target", "Owner"],
        rows: [
          ["Median time-to-first-value", "11 min", "< 4 min", "Naman Shukla"],
          ["Setup completion rate", "62%", "80%", "Hana Kim"],
          ["Day-7 active workspaces", "41%", "55%", "Sofia Alvarez"],
          ["Invites sent in first session", "1.3", "3.0", "Dev Patel"],
        ],
      },
      { type: "h1", text: "5. Open questions" },
      { type: "p", text: "Should templates be editable by workspace admins, or managed centrally by Casuro? Marcus is checking whether the permissions model supports per-template sharing before we commit to either option." },
      { type: "p", text: "Next review: Thursday, October 1 in the Growth weekly." },
    ],
  },
  collaborators: [{ id: "lena", cursor: "permissions model" }, { id: "hana" }, { id: "marcus" }],
  comments: [
    {
      id: "c1",
      anchor: "cuts median time-to-first-value from 11 minutes to under 4 minutes",
      from: "hana",
      at: at(2, "2:14 PM"),
      text: 'Is under 4 minutes realistic if connecting a data source is still required? Maybe define first value as "first board with data".',
      replies: [
        { from: "naman", at: at(2, "3:02 PM"), text: "Good call. In v4 the connection happens after the first board, so demo data counts. I will add a definition in section 4." },
        { from: "hana", at: at(2, "3:10 PM"), text: "Perfect, thanks." },
      ],
    },
    {
      id: "c2",
      anchor: "workspace templates",
      from: "lena",
      at: at(1, "10:41 AM"),
      text: "Can we launch with three templates and add marketing in v4.1? The support template still needs design polish. @Sofia Alvarez",
      replies: [{ from: "sofia", at: at(1, "11:05 AM"), text: "+1. I can own the support template copy this sprint." }],
    },
    {
      id: "c3",
      anchor: "We will A/B test the template picker against the current wizard for two weeks",
      from: "lena",
      at: at(1, "4:18 PM"),
      text: "Two weeks is short for a day-7 metric. Could we run it for three so we get two full cohorts?",
    },
  ],
  suggestions: [{ id: "s1", from: "marcus", at: at(1, "9:30 AM"), replace: "14 days", with: "21 days" }],
  share: {
    people: { hana: "Editor", marcus: "Editor", lena: "Commenter", sofia: "Editor", dev: "Viewer" },
    general: { name: "Casuro", role: "Commenter" },
  },
};

const REPLIES = ["Makes sense to me.", "Good point, let me think about it.", "Agreed, updating now.", "Can we discuss in the Growth weekly?"];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function DocsPreview() {
  const ref = useRef<GoogleDocsApp | null>(null);
  const docs = useGoogleDocs(DOCS_DEMO, {
    onEvent(event) {
      const d = ref.current!;
      // Whoever started the thread (or Lena, on a new one) answers.
      if (event.type === "comment" || event.type === "reply") {
        const thread = d.state.threads.find((t) => t.id === event.id);
        const from = thread && thread.from !== d.me ? thread.from : "lena";
        setTimeout(() => {
          if (ref.current?.state.threads.some((t) => t.id === event.id && t.status === "open")) ref.current.reply(event.id, from, pick(REPLIES));
        }, 2500);
      }
    },
  });
  ref.current = docs;
  return <GoogleDocs docs={docs} />;
}
