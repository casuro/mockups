import { useEffect, useRef } from "react";
import { Slack, useSlack, type SlackSeed, type SlackWorkspace } from "../apps/slack";
import { FACES } from "./faces";

// apps/slack.html's workspace and demo script, driving the React version:
// the same people, channels and messages, canned replies to what you send,
// and someone joining a huddle you start.

// "9:12 AM", `days` days ago.
function at(days: number, time: string) {
  const [, h, m, ap] = time.match(/(\d+):(\d+) (AM|PM)/)!;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours((+h % 12) + (ap === "PM" ? 12 : 0), +m, 0, 0);
  return d.getTime();
}
const R = (emoji: string, count: number, mine = false) => ({ emoji, count, mine });
const BOOKMARKS = [
  { label: "Q4 roadmap", color: "#0f9d58", letter: "S" },
  { label: "Design system", color: "#1d1c1d", letter: "F" },
  { label: "Sprint board", color: "#5e6ad2", letter: "L" },
];

export const SLACK_DEMO: SlackSeed = {
  workspace: { name: "Casuro" },
  me: "naman",
  later: 3,
  people: {
    naman: { name: "Naman Shukla", color: "#e8a33d", status: "🏗️", photo: FACES.naman },
    hana: { name: "Hana Kim", color: "#e01e5a", status: "🎨", photo: FACES.hana },
    marcus: { name: "Marcus Chen", color: "#1264a3", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", color: "#2bac76", online: false, status: "🤒", photo: FACES.sofia },
    dev: { name: "Dev Patel", color: "#7c3085", photo: FACES.dev },
    lena: { name: "Lena Okafor", color: "#0b4c8c", photo: FACES.lena },
    deploy: { name: "Deploybot", initials: "⚙", color: "#2eb67d", bot: true },
    github: { name: "GitHub", color: "#36c5f0", bot: true },
  },
  apps: ["deploy", "github"],
  open: { channel: "engineering" },
  channels: [
    {
      id: "general",
      topic: "Company-wide announcements and work-based matters",
      members: ["hana", "marcus", "sofia", "dev", "lena"],
      memberCount: 42,
      bookmarks: BOOKMARKS,
      messages: [
        { from: "hana", at: at(3, "9:12 AM"), text: "Good morning team ☀️ Reminder that the all-hands moves to *Thursday 3pm* this week. Agenda lives in the Q4 roadmap bookmark above.", reactions: [R("👍", 12), R("🙏", 4, true)] },
        { from: "lena", at: at(3, "11:47 AM"), text: "Welcome to our two new folks joining design this week! Say hi in #design 👋", reactions: [R("🎉", 18, true), R("👋", 9)] },
        { from: "marcus", at: at(0, "10:02 AM"), text: "Office wifi will be down 12:30 - 1:00 for the router swap. Tether up if you have calls in that window.", reactions: [R("🫡", 6)] },
      ],
    },
    {
      id: "engineering",
      topic: "Ship it 🚢  ·  On-call: @dev  ·  Runbooks pinned",
      members: ["marcus", "dev", "sofia", "hana"],
      memberCount: 18,
      unread: 2,
      bookmarks: BOOKMARKS,
      messages: [
        { from: "sofia", at: at(1, "4:18 PM"), text: "Heads up: I bumped the Postgres pool size to 40 in staging. If you see connection errors, ping me." },
        { from: "dev", at: at(1, "4:31 PM"), text: "Nice. Is that going to prod with tomorrow's release?" },
        { from: "sofia", at: at(1, "4:33 PM"), text: "Only after we watch staging overnight 👀", reactions: [R("💯", 3)] },
        { from: "deploy", at: at(0, "9:40 AM"), card: { title: "Deploy #1482 to *production*", rows: [["Service", "api-gateway"], ["Commit", "a3f9e1c - fix: retry idempotent requests"], ["Duration", "3m 12s"], ["Status", "Succeeded", "ok"]], buttons: ["View logs", "Rollback"] } },
        {
          from: "marcus", at: at(0, "10:14 AM"), text: "p95 latency after the deploy 👇 looking much healthier",
          chart: [62, 70, 66, 74, 58, 40, 34, 31, 29, 28, 30, 27], reactions: [R("🚀", 7, true), R("📉", 2)],
          replies: [
            { from: "dev", at: at(0, "10:16 AM"), text: "That drop is gorgeous. Was it the retry fix or the pool change?" },
            { from: "marcus", at: at(0, "10:19 AM"), text: "Retry fix mostly. Pool change isn't in prod yet." },
            { from: "sofia", at: at(0, "10:22 AM"), text: "Confirmed from traces, timeouts on `/v2/orders` went to ~0 🎯" },
          ],
        },
        {
          from: "dev", at: at(0, "11:05 AM"), text: "@naman can you review the migration PR before lunch? It adds the `assessment_spaces` table and backfills.\nhttps://github.com/casuro/core/pull/912",
          link: { site: "GitHub", color: "#1d1c1d", title: "feat(db): add assessment_spaces with backfill #912", body: "+412 −37 · 6 files changed · Checks passing" },
        },
        { from: "dev", at: at(0, "11:06 AM"), text: "Here's the backfill query, mostly worried about the lock:\n```UPDATE spaces SET owner_id = u.id\nFROM users u\nWHERE spaces.legacy_owner = u.email;```" },
      ],
    },
    {
      id: "design",
      topic: "Pixels, prototypes, and polite critique",
      members: ["lena", "hana", "dev", "naman"],
      memberCount: 11,
      bookmarks: BOOKMARKS,
      messages: [
        { from: "lena", at: at(0, "8:55 AM"), text: "Uploaded the new onboarding flow for review. Main question: does step 3 feel too dense?", file: { name: "Onboarding v4.fig", meta: "Figma file · 18 frames", color: "#a259ff", ext: "FIG" }, reactions: [R("👀", 4, true)] },
        { from: "hana", at: at(0, "9:20 AM"), text: "Love the new illustration style. Step 3: I'd split the permissions ask into its own screen.", reactions: [R("➕", 3)] },
      ],
    },
    {
      id: "random",
      topic: "Non-work banter and water cooler conversation",
      members: ["marcus", "dev", "lena", "hana", "sofia"],
      memberCount: 40,
      unread: 1,
      bookmarks: BOOKMARKS,
      messages: [{ from: "marcus", at: at(0, "12:41 PM"), text: "Who took the last oat milk. I just want to talk. ☕", reactions: [R("😂", 11), R("🕵️", 3, true)] }],
    },
    {
      id: "incidents",
      topic: "Active incidents only. Use threads.",
      members: ["dev", "sofia", "marcus"],
      memberCount: 14,
      muted: true,
      bookmarks: BOOKMARKS,
      messages: [{ from: "dev", at: at(7, "2:10 AM"), text: "*Resolved* SEV-2: elevated 5xx on checkout. Postmortem doc to follow.", reactions: [R("✅", 5)] }],
    },
  ],
  dms: [
    { with: "hana", unread: 1, messages: [{ from: "hana", at: at(0, "10:40 AM"), text: "Can we move our 1:1 to 4? 🙏" }] },
    { with: "marcus", messages: [{ from: "marcus", at: at(1, "6:02 PM"), text: "Thanks for the help on the flaky test!" }, { from: "naman", at: at(1, "6:05 PM"), text: "Anytime 🙌" }] },
    { with: "sofia", messages: [{ from: "sofia", at: at(6, "3:30 PM"), text: "Out sick today, will be back tomorrow" }] },
    { with: "dev", messages: [{ from: "dev", at: at(0, "11:07 AM"), text: "(also flagged you in #engineering, no rush)" }] },
  ],
  huddles: [
    {
      in: { channel: "design" }, by: "lena", people: ["lena", "hana", "dev"], startedAt: Date.now() - (14 * 60 + 23) * 1000,
      video: ["lena", "dev"], muted: ["hana"], sharing: { by: "lena", title: "Onboarding v4 - Figma" },
    },
  ],
};

const REPLIES = ["On it 👍", "Makes sense to me.", "Let me take a look after standup.", "Love this 🙌", "Can we sync on this in 10?", "Good catch!"];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function SlackPreview() {
  const ref = useRef<SlackWorkspace | null>(null);
  const members = (where: { channel: string } | { dm: string }) =>
    "dm" in where ? [where.dm] : (SLACK_DEMO.channels.find((c) => c.id === where.channel)?.members ?? []);
  const online = (id: string) => {
    const p = SLACK_DEMO.people[id];
    return id !== SLACK_DEMO.me && !!p && p.online !== false && !p.bot;
  };

  const slack = useSlack(SLACK_DEMO, {
    onEvent(event) {
      const s = ref.current!;
      if (event.type === "send") {
        const pool = members(event.where).filter(online);
        if (!pool.length || Math.random() > 0.8) return;
        const from = pick(pool);
        setTimeout(() => void s.deliver(event.where, { from, text: pick(REPLIES), thread: event.thread }, { typing: 1600 + Math.random() * 1200 }), 700);
      }
      if (event.type === "huddle" && event.action === "start") {
        const pool = members(event.where).filter(online);
        if (!pool.length) return s.toast("No one else is online. We'll let them know you're here.");
        const joiner = pick(pool);
        setTimeout(() => s.huddle.join(event.where, joiner, { video: Math.random() < 0.5 }), 2600);
      }
      if (event.type === "action" && event.kind === "card")
        s.toast(event.label === "Rollback" ? "Rollback needs approval from #incidents on-call" : event.label === "View logs" ? "Opening deploy logs..." : event.label);
    },
  });
  ref.current = slack;

  // Whoever is in your huddle and not muted takes turns talking.
  useEffect(() => {
    const t = setInterval(() => {
      const s = ref.current!;
      const key = s.state.inHuddle;
      const h = key ? s.state.huddles[key] : null;
      const talkers = h ? h.people.filter((p) => p !== s.me && !h.muted.includes(p)) : [];
      s.huddle.speaking(talkers.length && Math.random() < 0.8 ? [pick(talkers)] : []);
    }, 1300);
    return () => clearInterval(t);
  }, []);

  return <Slack slack={slack} />;
}
