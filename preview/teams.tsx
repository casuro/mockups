import { useEffect, useRef } from "react";
import { Teams, useTeams, type TeamsApp, type TeamsSeed } from "../apps/teams";
import { FACES } from "./faces";

// apps/teams.html's organization and demo script, driving the React
// version: the same people, chats, teams and meeting, canned replies to
// what you send, people picking up (or not) when you call, and the meeting
// chat answering back.

// "9:12 AM", `days` days ago.
function at(days: number, time: string) {
  const [, h, m, ap] = time.match(/(\d+):(\d+) (AM|PM)/)!;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours((+h % 12) + (ap === "PM" ? 12 : 0), +m, 0, 0);
  return d.getTime();
}
// This week's weekday `day` (0 is Monday) at `hour` (9.5 is 9:30).
function week(day: number, hour: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + day);
  return d.getTime() + hour * 3_600_000;
}
const R = (emoji: string, count: number, mine = false) => ({ emoji, count, mine });
const FIG = { name: "Onboarding v4.fig", meta: "Figma · 18 frames", color: "#a259ff", ext: "FIG" };
const MEETING_START = Date.now() - (14 * 60 + 23) * 1000;
const TODAY = (new Date().getDay() + 6) % 7;

export const TEAMS_DEMO: TeamsSeed = {
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", title: "Engineering Manager", color: "#8764b8", presence: "available", photo: FACES.naman },
    hana: { name: "Hana Kim", title: "Product Designer", color: "#c239b3", presence: "busy", note: "In a meeting", photo: FACES.hana },
    marcus: { name: "Marcus Chen", title: "Staff Engineer", color: "#0078d4", presence: "available", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", title: "Platform Engineer", color: "#498205", presence: "oof", photo: FACES.sofia },
    dev: { name: "Dev Patel", title: "Backend Engineer", color: "#ca5010", presence: "busy", note: "In a meeting", photo: FACES.dev },
    lena: { name: "Lena Okafor", title: "Design Lead", color: "#038387", presence: "busy", note: "Presenting", photo: FACES.lena },
  },
  chats: [
    {
      with: "hana", pinned: true,
      messages: [
        { from: "hana", at: at(1, "5:48 PM"), text: "Did you get a chance to look at the new permissions step?" },
        { from: "naman", at: at(1, "5:52 PM"), text: "Skimmed it. I think splitting it into two screens is right 👍", reactions: [R("❤️", 1)] },
        { from: "hana", at: at(0, "10:40 AM"), text: "Can we move our 1:1 to 4? 🙏" },
      ],
    },
    {
      id: "crew", name: "Onboarding v4 crew", members: ["lena", "hana", "naman"],
      messages: [
        { from: "lena", at: at(0, "8:52 AM"), text: "Uploaded v4 to Figma, would love eyes before the review", file: FIG },
        { from: "hana", at: at(0, "9:01 AM"), text: "Looking now 👀" },
        { from: "naman", at: at(0, "9:15 AM"), text: "Step 3 copy reads really well. Let's discuss the toggle density in the review.", reactions: [R("👍", 2)] },
      ],
    },
    { with: "dev", unread: 1, messages: [{ from: "dev", at: at(0, "11:07 AM"), text: "Also flagged you in Engineering on the migration PR, no rush" }] },
    {
      with: "marcus",
      messages: [
        { from: "marcus", at: at(1, "6:02 PM"), text: "Thanks for the help on the flaky test!" },
        { from: "naman", at: at(1, "6:05 PM"), text: "Anytime 🙌" },
        { from: "naman", at: at(1, "6:10 PM"), call: { kind: "ended", duration: "4m 12s" } },
      ],
    },
    {
      with: "sofia",
      messages: [
        { from: "sofia", at: at(3, "3:12 PM"), call: { kind: "missed" } },
        { from: "sofia", at: at(3, "3:30 PM"), text: "Out sick today, will be back Monday 🤒" },
      ],
    },
    { with: "lena", messages: [{ from: "lena", at: at(9, "2:14 PM"), text: "Great chatting today. Sharing the research notes here." }] },
  ],
  teams: [
    {
      id: "casuro", name: "Casuro", color: "#8764b8", members: ["naman", "hana", "marcus", "sofia", "dev", "lena"],
      channels: [
        {
          id: "general", name: "General",
          messages: [
            { from: "hana", at: at(3, "9:12 AM"), subject: "All-hands moved to Thursday", text: "Reminder that the all-hands moves to *Thursday 3pm* this week. Agenda is in the Files tab.", reactions: [R("👍", 12), R("🙏", 4, true)], replies: [{ from: "marcus", at: at(3, "9:20 AM"), text: "Thanks Hana!" }] },
            { from: "marcus", at: at(0, "10:02 AM"), text: "Office Wi-Fi will be down 12:30 - 1:00 for the router swap. Tether up if you have calls in that window.", reactions: [R("👀", 6)] },
          ],
        },
        {
          id: "announcements", name: "Announcements",
          messages: [{ from: "lena", at: at(9, "11:47 AM"), subject: "Welcome to the team", text: "Please welcome our two new designers joining this week! 👋", reactions: [R("🎉", 18, true), R("❤️", 9)] }],
        },
      ],
    },
    {
      id: "product", name: "Product & Design", color: "#c239b3", members: ["lena", "hana", "dev", "naman", "marcus"],
      channels: [
        { id: "general", name: "General", messages: [{ from: "lena", at: at(5, "9:00 AM"), subject: "Q4 roadmap draft", text: "Q4 roadmap draft is ready for comments.", reactions: [R("👍", 5)] }] },
        {
          id: "design", name: "Design",
          messages: [
            {
              from: "lena", at: at(0, "8:55 AM"), subject: "Onboarding v4 is ready for review", file: FIG, reactions: [R("👀", 4, true)],
              text: "Uploaded the new onboarding flow for review. Main question: does step 3 feel too dense?",
              replies: [
                { from: "hana", at: at(0, "9:20 AM"), text: "Love the new illustration style. Step 3: I'd split the permissions ask into its own screen." },
                { from: "dev", at: at(0, "9:31 AM"), text: "+1, and the toggles could default to off." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "platform", name: "Platform", color: "#0078d4", members: ["marcus", "dev", "sofia", "naman"],
      channels: [
        { id: "general", name: "General", messages: [{ from: "sofia", at: at(1, "4:18 PM"), text: "Heads up: I bumped the Postgres pool size to 40 in staging. If you see connection errors, ping me.", reactions: [R("💯", 3)] }] },
        {
          id: "engineering", name: "Engineering", unread: 1,
          messages: [
            {
              from: "marcus", at: at(0, "10:14 AM"), subject: "Latency after deploy #1482", reactions: [R("🚀", 7, true), R("📉", 2)],
              text: "p95 latency after the retry fix dropped from ~70ms to ~28ms. Nice work everyone 🚀",
              replies: [
                { from: "dev", at: at(0, "10:16 AM"), text: "Was it the retry fix or the pool change?" },
                { from: "marcus", at: at(0, "10:19 AM"), text: "Retry fix mostly. Pool change isn't in prod yet." },
                { from: "sofia", at: at(0, "10:22 AM"), text: "Confirmed from traces, timeouts on `/v2/orders` went to ~0 🎯" },
              ],
            },
            { from: "dev", at: at(0, "11:05 AM"), text: "@naman can you review the migration PR before lunch? It adds the `assessment_spaces` table and backfills.\nhttps://github.com/casuro/core/pull/912" },
          ],
        },
        { id: "incidents", name: "Incidents", messages: [{ from: "dev", at: at(6, "2:10 AM"), subject: "SEV-2 checkout errors", text: "*Resolved* SEV-2: elevated 5xx on checkout. Postmortem doc to follow.", reactions: [R("✅", 5)] }] },
      ],
    },
  ],
  meetings: [
    {
      in: { team: "product", channel: "design" }, title: "Onboarding v4 review", people: ["lena", "hana", "dev"], startedAt: MEETING_START,
      video: ["lena", "dev"], muted: ["hana"], sharing: { by: "lena", title: "Onboarding v4 - Figma" },
      chat: [{ from: "lena", text: "Sharing the v4 file now" }, { from: "hana", text: "Link: figma.com/file/onboarding-v4" }],
    },
  ],
  activity: [
    { from: "dev", type: "mention", text: "Dev Patel mentioned you", where: "Platform > Engineering", preview: "can you review the migration PR before lunch?", at: at(0, "11:05 AM"), go: { team: "platform", channel: "engineering" }, unread: true },
    { from: "hana", type: "chat", text: "Hana Kim sent a message", where: "Chat", preview: "Can we move our 1:1 to 4? 🙏", at: at(0, "10:40 AM"), go: { chat: "hana" }, unread: true },
    { from: "lena", type: "meeting", text: "Lena Okafor started a meeting", where: "Product & Design > Design", preview: "Onboarding v4 review", go: { team: "product", channel: "design" }, unread: true },
    { from: "hana", type: "like", text: "Hana Kim reacted to your message", where: "Chat", preview: "Skimmed it. I think splitting it into two screens is right 👍", at: at(1, "5:53 PM"), go: { chat: "hana" } },
    { from: "marcus", type: "reply", text: "Marcus Chen replied", where: "Casuro > General", preview: "Thanks Hana!", at: at(3, "9:20 AM"), go: { team: "casuro", channel: "general" } },
  ],
  events: [
    ...[0, 1, 2, 3, 4].map((d) => ({ title: "Daily standup", start: week(d, 9.5), end: week(d, 9.75), where: "Teams meeting" })),
    { title: "Architecture sync", start: week(1, 11), end: week(1, 12), where: "Platform", color: "green" as const },
    { title: "Hiring loop debrief", start: week(2, 14), end: week(2, 15), where: "Conference room 2", color: "amber" as const },
    { title: "All-hands", start: week(3, 15), end: week(3, 16), where: "Casuro > General" },
    { title: "1:1 with Hana", start: week(4, 16), end: week(4, 16.5), where: "Teams meeting" },
    ...(TODAY < 5 ? [{ title: "Onboarding v4 review", start: MEETING_START, end: MEETING_START + 3_600_000, where: "Product & Design > Design", meeting: { team: "product", channel: "design" } }] : []),
  ],
  openChannel: { team: "platform", channel: "engineering" },
  calendars: [{ name: "Calendar" }, { name: "Casuro holidays", color: "#6bb700" }],
  speedDial: ["hana", "marcus", "dev", "lena"],
  calls: [
    { with: "marcus", kind: "outgoing", duration: "4m 12s", at: at(1, "6:10 PM") },
    { with: "sofia", kind: "missed", at: at(3, "3:12 PM") },
    { with: "hana", kind: "incoming", duration: "18m 40s", at: at(4, "11:02 AM") },
    { with: "dev", kind: "outgoing", duration: "2m 5s", at: at(5, "4:30 PM") },
  ],
  files: [
    { name: "Onboarding v4.fig", by: "lena", modified: at(0, "8:52 AM"), color: "#a259ff", ext: "FIG" },
    { name: "Q4 roadmap.docx", by: "hana", modified: at(5, "9:00 AM"), color: "#185abd", ext: "W" },
    { name: "Latency report.xlsx", by: "marcus", modified: at(1, "4:00 PM"), color: "#107c41", ext: "X" },
    { name: "All-hands deck.pptx", by: "hana", modified: at(3, "9:12 AM"), color: "#c43e1c", ext: "P" },
    { name: "Postmortem SEV-2.docx", by: "dev", modified: at(6, "2:10 AM"), color: "#185abd", ext: "W" },
  ],
};

const REPLIES = ["Sounds good 👍", "On it!", "Makes sense to me.", "Let me take a look after standup.", "Love this 🙌", "Good catch!"];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const away = (id: string) => ["oof", "offline"].includes(TEAMS_DEMO.people[id]?.presence ?? "available");

export function TeamsPreview() {
  const ref = useRef<TeamsApp | null>(null);
  const later = (ms: number, fn: () => void) => setTimeout(fn, ms);

  const teams = useTeams(TEAMS_DEMO, {
    onEvent(event) {
      const t = ref.current!;
      // Someone in the chat answers most messages.
      if (event.type === "send" && "chat" in event.where) {
        const chat = t.chatOf(`chat:${event.where.chat}`);
        const pool = (chat?.others ?? []).filter((p) => !away(p));
        if (!pool.length || Math.random() > 0.85) return;
        const where = event.where;
        later(600, () => void t.deliver(where, { from: pick(pool), text: pick(REPLIES) }, { typing: 1500 + Math.random() * 1200 }));
      }
      if (event.type !== "meeting") return;
      const id = event.meeting;
      // A call rings everyone in the chat: those around pick up, the others don't answer.
      if (event.action === "start" && event.where && "chat" in event.where) {
        (t.chatOf(id)?.others ?? []).forEach((p, i) =>
          later(2800 + i * 1400, () => {
            if (ref.current!.state.inCall !== id) return;
            if (away(p)) ref.current!.meeting.decline(id, p);
            else ref.current!.meeting.join(id, p, { video: Math.random() < 0.6 });
          })
        );
      }
      // Meet in a channel: a teammate who is around drops in.
      if (event.action === "start" && event.where && "team" in event.where) {
        const team = TEAMS_DEMO.teams!.find((x) => x.id === (event.where as { team: string }).team);
        const joiner = (team?.members ?? []).find((p) => p !== TEAMS_DEMO.me && !away(p));
        if (joiner) later(2800, () => ref.current!.state.inCall === id && ref.current!.meeting.join(id, joiner, { video: Math.random() < 0.6 }));
      }
      // Joining the design review: Hana waves.
      if (event.action === "join" && id === "ch:product/design") later(1200, () => ref.current!.meeting.react(id, "hana", "👋"));
      // The meeting chat answers back.
      if (event.action === "chat") {
        const others = (t.state.meetings[id]?.people ?? []).filter((p) => p !== TEAMS_DEMO.me);
        if (others.length) later(1800, () => ref.current!.meeting.say(id, pick(others), pick(REPLIES)));
      }
    },
  });
  ref.current = teams;

  // Whoever is in your meeting and not muted takes turns talking; you now and then.
  useEffect(() => {
    const timer = setInterval(() => {
      const t = ref.current!;
      const h = t.state.inCall ? t.state.meetings[t.state.inCall] : null;
      if (!h) return t.meeting.speaking([]);
      const talkers = h.people.filter((p) => p !== t.me && !h.muted.includes(p));
      const now: string[] = [];
      if (talkers.length && Math.random() < 0.8) now.push(pick(talkers));
      if (!h.muted.includes(t.me) && Math.random() < 0.2) now.push(t.me);
      t.meeting.speaking(now);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  return <Teams teams={teams} />;
}
