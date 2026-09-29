import { useEffect, useRef } from "react";
import { Zoom, useZoom, type ZoomMeetingApi, type ZoomSeed, type ZoomShare } from "../apps/zoom";
import { FACES } from "./faces";

// apps/zoom.html's meeting and demo script, driving the React version: the
// same people, chat and shared screens, someone knocking in the waiting
// room, hands, reactions, Lena sharing her design file, people talking (with
// captions), and replies to what you write in the chat.

const MIN = 60_000;
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export const ZOOM_DEMO: ZoomSeed = {
  meeting: {
    title: "Onboarding v4 review",
    id: "845 2231 9067",
    passcode: "4v7Rk2",
    host: "naman",
    link: "https://casuro.zoom.us/j/84522319067?pwd=NHY3UmsyODQ1IDIyMzEgOTA2Nw",
    startedAt: Date.now() - 12 * MIN + 34_000,
  },
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", photo: FACES.naman, status: "Available" },
    hana: { name: "Hana Kim", photo: FACES.hana, status: "Available" },
    marcus: { name: "Marcus Chen", photo: FACES.marcus, status: "In a meeting" },
    sofia: { name: "Sofia Alvarez", photo: FACES.sofia, status: "Away" },
    dev: { name: "Dev Patel", photo: FACES.dev, status: "Available" },
    lena: { name: "Lena Okafor", photo: FACES.lena, status: "In a meeting" },
  },
  participants: ["hana", "marcus", "sofia", "lena"],
  muted: ["marcus"],
  cameraOff: ["sofia"],
  contacts: ["hana", "marcus", "sofia", "dev", "lena"],
  chat: [{ from: "lena", text: "Agenda: welcome flow, invite step, rollout plan", at: Date.now() - 9 * MIN }],
  screens: [
    { id: "desktop", title: "Screen", thumb: "desktop" },
    { id: "canvas", title: "Casuro Canvas - Onboarding v4", thumb: "design" },
    { id: "doc", title: "Onboarding v4 - Launch checklist", thumb: "document" },
    { id: "terminal", title: "Terminal", thumb: "terminal" },
  ],
  whiteboards: [
    {
      title: "Onboarding flow map",
      notes: [
        { x: 180, y: 180, color: "#fff3a8", tilt: -2, by: "Hana", text: "Step 1: Welcome, one line of copy" },
        { x: 420, y: 200, color: "#c9f2d6", tilt: 1, by: "Lena", text: "Step 2: Workspace name + use case" },
        { x: 660, y: 170, color: "#d6e4ff", tilt: -1, by: "Marcus", text: "Step 3: Invite teammates via link" },
        { x: 900, y: 210, color: "#ffd9c7", tilt: 2, by: "Sofia", text: "Add a skip option here?" },
      ],
    },
    {
      title: "Q3 retro board",
      notes: [
        { x: 220, y: 200, color: "#c9f2d6", tilt: -1, by: "Dev", text: "Went well: invite API shipped early" },
        { x: 520, y: 220, color: "#ffd9c7", tilt: 2, by: "Hana", text: "Improve: design review turnaround" },
      ],
    },
  ],
  apps: [
    { name: "Notes", description: "Take shared meeting notes", color: "#0b5cff", icon: "notes" },
    { name: "Polls & Quizzes", description: "Ask the room a quick question", color: "#7a3ff2", icon: "poll" },
    { name: "Docs", description: "Open Onboarding v4 - Launch checklist", color: "#0e9f6e", icon: "docs" },
    { name: "Timer", description: "Keep the agenda on time", color: "#ff742e", icon: "timer" },
    { name: "Casuro Standup Bot", description: "Internal app by Casuro IT", color: "#232333", icon: "bot" },
  ],
};

const CAPTIONS: Record<string, string[]> = {
  naman: ["Let's start with the welcome step and then look at invites.", "I think we can ship this behind a flag first.", "Great, let's capture that as an action item."],
  hana: ["The welcome copy is shorter now, one line under the title.", "I'd like to show progress from the very first screen.", "We tested the skip option with five customers last week."],
  marcus: ["Invite links are ready on staging, the API is stable.", "We can roll out to ten percent on Monday.", "I'll add the metrics dashboard before launch."],
  sofia: ["Customers keep asking whether they can skip step three.", "Support has two new help articles ready to go.", "Setup completion is our biggest lever this quarter."],
  dev: ["The invite endpoint handles bulk emails now.", "Latency is under a hundred milliseconds on staging.", "I can pair on the rollout script this afternoon."],
  lena: ["Here's the updated welcome flow, three frames in total.", "The primary button is now full width on every step.", "Let me zoom into the invite step for a second."],
};
const CHAT_LINES = ["Makes sense 👍", "+1 to shipping behind a flag", "Can we get the link to the checklist?", "I'll follow up on that after the call", "Agreed", "Love the new welcome screen"];
const DM_REPLIES = ["Sounds good!", "On it.", "Thanks, will take a look.", "Makes sense to me.", "Let's discuss after the review.", "Got it 👍"];

// ---------- What the shared screens show (1280x800) ----------

const face = (id: keyof typeof FACES) => <img src={FACES[id]} alt="" />;

function CanvasApp() {
  return (
    <div className="fx cv">
      <div className="cv-top">
        <span className="lg" />
        <div className="tools"><i className="on" /><i /><i /><i /><i /></div>
        <div className="file">Onboarding v4 <small>/ Welcome flow</small></div>
        <div className="faces">{face("lena")}{face("hana")}{face("marcus")}</div>
        <span className="share">Share</span>
      </div>
      <div className="cv-main">
        <div className="cv-layers">
          <h6>Layers</h6>
          <div className="on">01 Welcome</div><div className="in">Title</div><div className="in">Primary CTA</div>
          <div>02 Workspace setup</div><div>03 Invite teammates</div><div>04 All set</div>
          <h6 style={{ marginTop: 18 }}>Pages</h6>
          <div>Flows</div><div>Components</div><div>Archive</div>
        </div>
        <div className="cv-canvas">
          <div className="cv-frame sel">
            <label>01 Welcome</label>
            <div className="phone">
              <div className="steps"><i className="on" /><i /><i /></div>
              <div className="hero" />
              <h5>Welcome to Casuro</h5>
              <p>Set up your workspace in under two minutes. We&apos;ll bring your team along.</p>
              <div className="cta">Get started</div>
              <div className="ghost">I have an invite code</div>
            </div>
          </div>
          <div className="cv-frame">
            <label>02 Workspace setup</label>
            <div className="phone">
              <div className="steps"><i className="on" /><i className="on" /><i /></div>
              <h5>Name your workspace</h5>
              <div className="field2">casuro-team</div>
              <p>What will you use Casuro for?</p>
              <div className="chiprow"><span className="on">Product</span><span>Design</span><span className="on">Engineering</span><span>Support</span><span>Sales</span></div>
              <div className="cta">Continue</div>
            </div>
          </div>
          <div className="cv-frame">
            <label>03 Invite teammates</label>
            <div className="phone">
              <div className="steps"><i className="on" /><i className="on" /><i className="on" /></div>
              <h5>Invite your teammates</h5>
              <div className="person">{face("hana")}Hana Kim<em>Invited</em></div>
              <div className="person">{face("marcus")}Marcus Chen<em>Invited</em></div>
              <div className="person">{face("sofia")}Sofia Alvarez<em>Invited</em></div>
              <div className="field2">name@casuro.com</div>
              <div className="cta">Send invites</div>
              <div className="ghost">Skip for now</div>
            </div>
          </div>
          <div className="sticky" style={{ left: 250, top: 520 }}><b>Lena</b>Tighten the step 1 copy, one line max.</div>
          <div className="sticky" style={{ left: 560, top: 540, transform: "rotate(2deg)", background: "#c9f2d6" }}><b>Hana</b>Show progress earlier?</div>
          <div className="cursor-tag" style={{ left: 150, top: 385 }}>
            <svg viewBox="0 0 24 24"><path d="M4 3l14 7.5-6 1.6L9.3 18z" fill="#e5427a" stroke="#fff" strokeWidth="1.5" /></svg>
            <span>Lena Okafor</span>
          </div>
        </div>
        <div className="cv-props">
          <h6>Design</h6>
          <div className="pr"><span>Frame</span><b>Mobile 390</b></div><div className="pr"><span>W</span><b>390</b></div>
          <div className="pr"><span>H</span><b>844</b></div><div className="pr"><span>Radius</span><b>28</b></div>
          <h6 style={{ marginTop: 14 }}>Fill</h6>
          <div className="swatches"><i style={{ background: "#0b5cff" }} /><i style={{ background: "#7aa6ff" }} /><i style={{ background: "#111" }} /><i style={{ background: "#f4f5f7", boxShadow: "inset 0 0 0 1px #ddd" }} /></div>
          <h6 style={{ marginTop: 8 }}>Typography</h6>
          <div className="pr"><span>Font</span><b>Lato</b></div><div className="pr"><span>Title</span><b>22 / 28</b></div><div className="pr"><span>Body</span><b>14 / 20</b></div>
          <h6 style={{ marginTop: 14 }}>Export</h6>
          <div className="pr"><span>PNG</span><b>2x</b></div>
        </div>
      </div>
    </div>
  );
}

function DeskApp() {
  const now = new Date();
  return (
    <div className="fx desk">
      <div className="menubar">
        <b>Docs</b><span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span>
        <span className="r">{`${now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}  ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}</span>
      </div>
      <div className="docwin">
        <div className="wbar"><i /><i /><i /><span>Onboarding v4 - Launch checklist</span></div>
        <div className="dbody">
          <h1>Onboarding v4 - Launch checklist</h1>
          <div className="dm">Owner: Naman Shukla  ·  Last edited by Hana Kim 12 minutes ago</div>
          <h2>Before launch</h2>
          <ul>
            <li className="done"><i /><span>Welcome flow copy final (Lena)</span></li>
            <li className="done"><i /><span>Invite link API on staging (Dev)</span></li>
            <li><i /><span>Skip option on step 3 (Hana)</span></li>
            <li><i /><span>Help center articles updated (Sofia)</span></li>
            <li><i /><span>Rollout plan: 10% then 50% then 100% (Marcus)</span></li>
          </ul>
          <h2>Success metrics</h2>
          <table>
            <tbody>
              <tr><th>Metric</th><th>v3 baseline</th><th>v4 target</th></tr>
              <tr><td>Setup completion</td><td>61%</td><td>75%</td></tr>
              <tr><td>Teammates invited in week 1</td><td>1.8</td><td>3.0</td></tr>
              <tr><td>Time to first project</td><td>9 min</td><td>4 min</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TermApp() {
  const c = (color: string, text: string) => <span style={{ color }}>{text}</span>;
  return (
    <div className="fx" style={{ background: "#101114", color: "#d6d6d6", fontFamily: "Menlo, Consolas, monospace", fontSize: 17, lineHeight: "28px", padding: "30px 36px" }}>
      <div style={{ color: "#7a8599" }}>~/casuro/onboarding-v4 (main)</div>
      <div>{c("#23d959", "$")} npm run dev</div>
      <div style={{ color: "#7a8599" }}>&gt; onboarding-v4@4.0.0 dev</div>
      <div>  {c("#6fa0ff", "ready")} started server on http://localhost:3000</div>
      <div>  {c("#6fa0ff", "event")} compiled client and server successfully in 812 ms</div>
      <div>  {c("#f5a623", "wait")}  compiling /welcome ...</div>
      <div>  {c("#6fa0ff", "event")} compiled /welcome in 204 ms</div>
      <div>{c("#23d959", "$")} <span style={{ display: "inline-block", width: 11, height: 22, background: "#d6d6d6", verticalAlign: "middle" }} /></div>
    </div>
  );
}

/** Draws the demo's shared screens: Lena's design file, the launch checklist, a terminal. */
export function renderDemoScreen(share: ZoomShare) {
  return (
    <div className="zs">
      <style>{SCREEN_CSS}</style>
      {share.screen === "canvas" ? <CanvasApp /> : share.screen === "terminal" ? <TermApp /> : <DeskApp />}
    </div>
  );
}

// ---------- The demo script ----------

function useDemo(zoom: ZoomMeetingApi) {
  const z = useRef(zoom);
  z.current = zoom;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => void timers.current.push(setTimeout(fn, ms));

  const scenario = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const inCall = (id: string) => z.current.state.phase === "meeting" && z.current.state.people.includes(id);
    later(3000, () => z.current.chat("hana", "Welcome step copy is updated in the doc 🎉"));
    later(6500, () => z.current.admitRequest("dev"));
    later(16000, () => z.current.raiseHand("marcus", true));
    later(21000, () => z.current.react("sofia", "👍"));
    later(34000, () => z.current.raiseHand("marcus", false));
    later(45000, () => {
      const s = z.current.state;
      if (s.share || s.phase !== "meeting") return;
      if (!inCall("lena")) z.current.join("lena");
      z.current.share("lena", "canvas");
    });
    const bump = () => {
      const s = z.current.state;
      const others = s.people.filter((p) => p !== z.current.me);
      if (s.phase === "meeting" && others.length && Math.random() < 0.6) z.current.react(rand(others), rand(["👍", "👏", "❤️", "😂"]));
      later(14000 + Math.random() * 12000, bump);
    };
    later(12000, bump);
  };

  useEffect(() => {
    scenario();
    // Someone new is talking every few seconds; the sharer most often.
    let active: string | null = "hana";
    z.current.say("hana", rand(CAPTIONS.hana));
    const talk = setInterval(() => {
      const zm = z.current;
      const s = zm.state;
      if (s.phase !== "meeting") return;
      const cands = s.people.filter((id) => id !== zm.me && !s.muted.includes(id));
      let next: string | null = null;
      if (s.share && s.share.by !== zm.me && cands.includes(s.share.by) && Math.random() < 0.7) next = s.share.by;
      else if (cands.length) next = active && cands.includes(active) && Math.random() < 0.45 ? active : rand(cands);
      if (s.audio && !s.muted.includes(zm.me) && Math.random() < 0.15) next = zm.me;
      active = next;
      if (next) {
        const lines = CAPTIONS[next] ?? ["..."];
        zm.say(next, lines[Math.floor(Date.now() / 7000) % lines.length]);
      } else zm.speaking([]);
    }, 2600);
    const pending = timers.current;
    return () => {
      clearInterval(talk);
      pending.forEach(clearTimeout);
      timers.current.forEach(clearTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { scenario, later };
}

export function ZoomPreview() {
  const demo = useRef<ReturnType<typeof useDemo> | null>(null);
  const zoom = useZoom(ZOOM_DEMO, {
    onEvent(event) {
      const z = zoomRef.current;
      const d = demo.current;
      if (!z || !d) return;
      const s = z.state;
      switch (event.type) {
        case "chat": {
          const responders = event.to === "everyone" ? s.people.filter((p) => p !== z.me) : [event.to];
          d.later(1600 + Math.random() * 1800, () => {
            const who = rand(responders.filter((r) => zoomRef.current?.state.people.includes(r)));
            if (who) zoomRef.current?.chat(who, rand(event.to === "everyone" ? CHAT_LINES : DM_REPLIES), event.to === "everyone" ? "everyone" : z.me);
          });
          break;
        }
        case "attach":
          z.chat(z.me, "", event.to, { file: { name: "Onboarding-v4-notes.pdf", size: "248 KB" } });
          z.toast("File sent");
          break;
        case "participant":
          if (event.action === "ask-unmute") d.later(1600, () => { zoomRef.current?.mute(event.person, false); zoomRef.current?.toast(`${z.nameOf(event.person)} unmuted`); });
          if (event.action === "ask-video") d.later(1600, () => zoomRef.current?.camera(event.person, true));
          break;
        case "record":
          if (event.action === "ask") d.later(2400, () => zoomRef.current?.toast(`${z.nameOf(s.host)} allowed you to record on this computer`));
          break;
        case "invite":
          event.people.forEach((id, i) => d.later(2200 + i * 1400, () => zoomRef.current?.join(id)));
          break;
        case "rejoin":
          d.scenario();
          break;
      }
    },
  });
  const zoomRef = useRef<ZoomMeetingApi | null>(null);
  zoomRef.current = zoom;
  demo.current = useDemo(zoom);

  return (
    <div style={{ height: "100vh" }}>
      <Zoom zoom={zoom} renderScreen={renderDemoScreen} />
    </div>
  );
}

// The shared screens' look, from apps/zoom.html (the kit draws whatever `renderScreen` returns).
const SCREEN_CSS = `
.zs { display: contents; }
.zs .fx { position: absolute; inset: 0; font-family: Lato, "Segoe UI", sans-serif; font-size: 13px; color: #222; }
.zs .cv { background: #e9e9ec; display: grid; grid-template-rows: 44px 1fr; }
.zs .cv-top { background: #2c2c2c; color: #ddd; display: flex; align-items: center; gap: 14px; padding: 0 14px; font-size: 13px; }
.zs .cv-top .lg { width: 22px; height: 22px; border-radius: 6px; background: linear-gradient(135deg, #a259ff, #ff7262); }
.zs .cv-top .tools { display: flex; gap: 4px; }
.zs .cv-top .tools i { width: 30px; height: 30px; border-radius: 6px; display: block; background: #3a3a3a; }
.zs .cv-top .tools i.on { background: #0b5cff; }
.zs .cv-top .file { flex: 1; text-align: center; color: #fff; }
.zs .cv-top .file small { color: #999; }
.zs .cv-top .share { background: #0b5cff; color: #fff; border-radius: 6px; padding: 4px 12px; font-weight: 700; }
.zs .cv-top .faces { display: flex; }
.zs .cv-top .faces img { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #2c2c2c; margin-left: -6px; object-fit: cover; }
.zs .cv-main { display: grid; grid-template-columns: 220px 1fr 240px; min-height: 0; }
.zs .cv-layers { background: #fff; border-right: 1px solid #e3e3e3; padding: 12px 10px; }
.zs .cv-layers h6, .zs .cv-props h6 { font-size: 11px; font-weight: 700; color: #777; margin: 4px 4px 8px; text-transform: uppercase; letter-spacing: .4px; }
.zs .cv-layers div { padding: 5px 8px; border-radius: 5px; font-size: 12px; color: #333; display: flex; align-items: center; gap: 8px; }
.zs .cv-layers div::before { content: "#"; color: #aaa; font-size: 11px; }
.zs .cv-layers div.on { background: #e5eeff; color: #0b5cff; }
.zs .cv-layers div.in { padding-left: 24px; }
.zs .cv-layers div.in::before { content: "T"; }
.zs .cv-canvas { position: relative; padding: 40px 36px; display: flex; gap: 34px; align-items: flex-start; overflow: hidden; }
.zs .cv-frame { flex: none; }
.zs .cv-frame label { display: block; font-size: 11px; color: #777; margin-bottom: 6px; }
.zs .phone { width: 212px; height: 440px; border-radius: 26px; background: #fff; box-shadow: 0 8px 24px rgba(0, 0, 0, .12); overflow: hidden; display: flex; flex-direction: column; padding: 26px 18px 18px; gap: 12px; }
.zs .cv-frame.sel .phone { box-shadow: 0 0 0 2px #0b5cff, 0 8px 24px rgba(0, 0, 0, .12); }
.zs .phone .hero { height: 150px; border-radius: 16px; background: linear-gradient(135deg, #0b5cff, #7aa6ff); position: relative; }
.zs .phone .hero::after { content: ""; position: absolute; left: 50%; top: 50%; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 18px; background: rgba(255, 255, 255, .9); }
.zs .phone h5 { font-size: 17px; font-weight: 900; color: #111; line-height: 22px; }
.zs .phone p { font-size: 12px; color: #666; line-height: 17px; }
.zs .phone .cta { margin-top: auto; height: 38px; border-radius: 10px; background: #0b5cff; color: #fff; font-weight: 700; display: grid; place-items: center; font-size: 13px; }
.zs .phone .ghost { height: 34px; border-radius: 10px; border: 1px solid #ddd; display: grid; place-items: center; font-size: 12px; color: #333; }
.zs .phone .field2 { height: 34px; border-radius: 8px; border: 1px solid #ddd; padding: 0 10px; display: flex; align-items: center; font-size: 12px; color: #999; }
.zs .phone .steps { display: flex; gap: 5px; }
.zs .phone .steps i { flex: 1; height: 4px; border-radius: 2px; background: #e3e3e3; }
.zs .phone .steps i.on { background: #0b5cff; }
.zs .phone .chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
.zs .phone .chiprow span { font-size: 11px; border: 1px solid #ddd; border-radius: 14px; padding: 3px 9px; color: #444; }
.zs .phone .chiprow span.on { border-color: #0b5cff; color: #0b5cff; background: #eef3ff; }
.zs .phone .person { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #333; }
.zs .phone .person img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.zs .phone .person em { margin-left: auto; font-style: normal; color: #0b5cff; font-weight: 700; font-size: 11px; }
.zs .sticky { position: absolute; width: 150px; padding: 10px 12px; background: #fff3a8; box-shadow: 0 4px 10px rgba(0, 0, 0, .12); font-size: 12px; line-height: 16px; color: #4a4020; transform: rotate(-2deg); }
.zs .sticky b { display: block; margin-bottom: 3px; }
.zs .cursor-tag { position: absolute; display: flex; align-items: flex-start; gap: 2px; z-index: 3; }
.zs .cursor-tag svg { width: 18px; height: 18px; }
.zs .cursor-tag span { background: #e5427a; color: #fff; font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-top: 12px; }
.zs .cv-props { background: #fff; border-left: 1px solid #e3e3e3; padding: 12px; font-size: 12px; }
.zs .cv-props .pr { display: flex; justify-content: space-between; padding: 6px 4px; border-bottom: 1px solid #f0f0f0; color: #555; }
.zs .cv-props .pr b { color: #222; font-weight: 700; }
.zs .cv-props .swatches { display: flex; gap: 6px; padding: 8px 4px; }
.zs .cv-props .swatches i { width: 22px; height: 22px; border-radius: 5px; }
.zs .desk { background: linear-gradient(135deg, #2b4a8a, #6b8fd6 55%, #a9c1ee); }
.zs .desk .menubar { height: 26px; background: rgba(255, 255, 255, .75); display: flex; align-items: center; gap: 18px; padding: 0 16px; font-size: 12px; color: #222; }
.zs .desk .menubar b { font-weight: 900; }
.zs .desk .menubar .r { margin-left: auto; }
.zs .docwin { position: absolute; left: 110px; top: 60px; width: 1060px; height: 700px; background: #fff; border-radius: 10px; box-shadow: 0 20px 60px rgba(0, 0, 0, .35); overflow: hidden; display: flex; flex-direction: column; }
.zs .docwin .wbar { height: 38px; background: #f3f4f6; border-bottom: 1px solid #e3e4e8; display: flex; align-items: center; gap: 8px; padding: 0 14px; font-size: 12px; color: #555; }
.zs .docwin .wbar i { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; }
.zs .docwin .wbar i:nth-child(2) { background: #febc2e; }
.zs .docwin .wbar i:nth-child(3) { background: #28c840; }
.zs .docwin .wbar span { flex: 1; text-align: center; margin-right: 60px; }
.zs .docwin .dbody { flex: 1; padding: 44px 120px; overflow: hidden; color: #222; }
.zs .docwin h1 { font-size: 30px; font-weight: 900; line-height: 38px; margin-bottom: 6px; }
.zs .docwin .dm { color: #777; font-size: 13px; margin-bottom: 24px; }
.zs .docwin h2 { font-size: 18px; font-weight: 700; margin: 22px 0 10px; }
.zs .docwin li { list-style: none; display: flex; gap: 10px; align-items: flex-start; padding: 5px 0; font-size: 15px; }
.zs .docwin li i { width: 16px; height: 16px; border: 2px solid #b5b9c2; border-radius: 4px; margin-top: 2px; flex: none; }
.zs .docwin li.done i { background: #0b5cff; border-color: #0b5cff; }
.zs .docwin li.done span { color: #888; text-decoration: line-through; }
.zs .docwin table { border-collapse: collapse; width: 100%; font-size: 14px; }
.zs .docwin td, .zs .docwin th { border: 1px solid #e3e4e8; padding: 8px 12px; text-align: left; }
.zs .docwin th { background: #f6f7f9; font-weight: 700; }
`;
