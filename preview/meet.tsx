import { useEffect, useRef, useState, type ReactNode } from "react";
import { Meet, useMeet, type MeetCall, type MeetSeed } from "../apps/meet";
import { FACES } from "./faces";

// apps/meet.html's call and demo script, driving the React version: the
// same meeting and people, Lena presenting the onboarding flow in Figma,
// people talking with captions, joining, leaving, reacting, raising hands
// and answering in the chat.

const ago = (min: number) => Date.now() - min * 60000;

export const MEET_DEMO: MeetSeed = {
  meeting: {
    title: "Onboarding v4 review",
    code: "xkd-mvqa-pte",
    host: "lena",
    doc: "Onboarding v4 spec",
    dialIn: { number: "(US) +1 650-555-0142", pin: "318 402 991#" },
    org: "Casuro",
  },
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", color: "#1a73e8", photo: FACES.naman, room: { wall: ["#d8d0c4", "#c9bfb0"], side: "left", kind: "window" } },
    hana: { name: "Hana Kim", email: "hana@casuro.com", color: "#c5221f", photo: FACES.hana, room: { wall: ["#e1e6ee", "#cfd7e2"], side: "right", kind: "art" } },
    marcus: { name: "Marcus Chen", email: "marcus@casuro.com", color: "#188038", photo: FACES.marcus, room: { wall: ["#d6dccf", "#c3cbb9"], side: "left", kind: "shelf" } },
    sofia: { name: "Sofia Alvarez", email: "sofia@casuro.com", color: "#e37400", photo: FACES.sofia, room: { wall: ["#eadbd0", "#dcc7b8"], side: "left", kind: "art" } },
    dev: { name: "Dev Patel", email: "dev@casuro.com", color: "#8430ce", photo: FACES.dev, room: { wall: ["#cfd3da", "#bcc2cc"], side: "right", kind: "window" } },
    lena: { name: "Lena Okafor", email: "lena@casuro.com", color: "#007b83", photo: FACES.lena, room: { wall: ["#e4ddd0", "#d2c8b6"], side: "right", kind: "shelf" } },
  },
  inCall: ["lena", "hana", "marcus", "sofia"],
  video: ["lena", "marcus", "sofia", "dev"],
  muted: ["hana", "sofia"],
  presenter: "lena",
  chat: [{ from: "hana", text: "Research notes are in the team drive, folder Onboarding v4", at: ago(4) }],
  questions: [
    { from: "sofia", text: "Will the new permission groups work with SSO roles?", votes: 3 },
    { from: "dev", text: "Do we need a migration window for existing workspaces?", votes: 1 },
  ],
  invitable: ["hana", "marcus", "sofia", "dev", "lena"],
};

const CAPTIONS: Record<string, string[]> = {
  lena: ["Okay, let me walk everyone through the new onboarding flow.", "The welcome screen is now a single step instead of three.", "We moved the team invite right after account creation.", "Permissions are grouped now, so admins see everything in one place.", "Hana, do you want to talk about the illustrations?"],
  hana: ["Sure, the illustrations all come from the new brand kit.", "I tested two versions of the permissions screen last week.", "People finished the flow about forty percent faster.", "I can share the research notes right after the call."],
  marcus: ["From the engineering side this is mostly front end work.", "The invite endpoint already supports bulk adds.", "We could ship it behind a flag by the end of the sprint.", "I'd like Dev to double check the role migration."],
  sofia: ["Platform is fine with the new permission groups.", "We'll need to update the audit log events too.", "I can pair with Marcus on the rollout plan."],
  dev: ["The role migration is safe to run in batches.", "I'll write a dry run script first.", "Let's plan for Thursday so we have some buffer."],
};
const REPLIES = ["Makes sense", "+1 from me", "Agreed, let's do that", "I'll follow up after the call", "Good point", "Can you drop the link here?"];
const EMOJI = ["\u{1F496}", "\u{1F44D}", "\u{1F389}", "\u{1F44F}", "\u{1F602}", "\u{1F62E}"];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

// The Figma-like file Lena presents, as in apps/meet.html (drawn at 1280 x 720).
const SCREEN_CSS = `
.scr { width: 1280px; height: 720px; position: absolute; left: 0; top: 0; background: #2c2c2c; color: #e6e6e6; font-size: 12px; display: grid; grid-template-rows: 44px 1fr; font-family: Roboto, Arial, sans-serif; }
.scr .scr-top { display: flex; align-items: center; gap: 14px; padding: 0 12px; background: #2c2c2c; border-bottom: 1px solid #3d3d3d; }
.scr .scr-top .logo-sq { width: 26px; height: 26px; border-radius: 6px; background: linear-gradient(135deg, #7c5cff, #0b57d0); }
.scr .scr-top .tool { width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center; color: #d9d9d9; }
.scr .scr-top .tool.on { background: #0d99ff; color: #fff; }
.scr .scr-top .tool svg { width: 16px; height: 16px; }
.scr .scr-top .file { flex: 1; text-align: center; color: #bdbdbd; }
.scr .scr-top .file b { color: #fff; font-weight: 500; }
.scr .scr-top .share { background: #0d99ff; color: #fff; border-radius: 6px; padding: 5px 12px; font-weight: 500; }
.scr .scr-top .avs { display: flex; }
.scr .scr-top .avs img { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #2c2c2c; margin-left: -6px; object-fit: cover; }
.scr .scr-top .avs img.ring { border-color: #0d99ff; }
.scr .scr-body { display: grid; grid-template-columns: 220px 1fr 240px; min-height: 0; }
.scr .scr-side { background: #2c2c2c; border-right: 1px solid #3d3d3d; padding: 10px 0; overflow: hidden; }
.scr .scr-side.r { border-right: 0; border-left: 1px solid #3d3d3d; padding: 10px 14px; }
.scr .scr-side h6 { font-size: 11px; font-weight: 500; color: #fff; padding: 6px 14px; }
.scr .scr-side .it { padding: 5px 14px 5px 28px; color: #cfcfcf; display: flex; align-items: center; gap: 8px; }
.scr .scr-side .it.sel { background: #0c4a7a; color: #fff; }
.scr .scr-side .it i { width: 10px; height: 10px; border: 1.5px solid currentColor; border-radius: 2px; }
.scr .scr-side .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0 14px; }
.scr .scr-side .fld { background: #383838; border-radius: 4px; padding: 5px 8px; color: #e0e0e0; }
.scr .scr-side .sw { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.scr .scr-side .sw span { width: 16px; height: 16px; border-radius: 3px; }
.scr .scr-canvas { background: #1e1e1e; position: relative; overflow: hidden; }
.scr .frame { position: absolute; top: 70px; width: 210px; height: 440px; background: #fff; border-radius: 18px; padding: 44px 18px 18px; color: #1f1f1f; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
.scr .frame .fl { position: absolute; top: -22px; left: 2px; color: #bdbdbd; font-size: 11px; }
.scr .frame.sel { outline: 2px solid #0d99ff; outline-offset: 3px; }
.scr .frame .ill { height: 120px; border-radius: 12px; background: linear-gradient(135deg, #d3e3fd, #c2e7ff); margin-bottom: 18px; position: relative; overflow: hidden; }
.scr .frame .ill::after { content: ""; position: absolute; width: 80px; height: 80px; border-radius: 50%; background: #0b57d0; opacity: .25; right: -16px; bottom: -20px; }
.scr .frame .ill.b { background: linear-gradient(135deg, #fde7c9, #fbd1b5); }
.scr .frame .ill.c { background: linear-gradient(135deg, #d7f0dd, #b8e3c4); }
.scr .frame .ln { height: 9px; border-radius: 5px; background: #e3e3e3; margin-bottom: 10px; }
.scr .frame .ln.h { height: 14px; width: 70%; background: #1f1f1f; margin-bottom: 14px; }
.scr .frame .ln.s { width: 55%; }
.scr .frame .tg { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.scr .frame .tg i { width: 28px; height: 16px; border-radius: 8px; background: #0b57d0; flex: none; position: relative; }
.scr .frame .tg i::after { content: ""; position: absolute; right: 2px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #fff; }
.scr .frame .tg.off i { background: #c4c7c5; }
.scr .frame .tg.off i::after { right: auto; left: 2px; }
.scr .frame .tg .ln { flex: 1; margin: 0; }
.scr .frame .cta { position: absolute; left: 18px; right: 18px; bottom: 18px; height: 36px; border-radius: 18px; background: #0b57d0; }
.scr .sticky { position: absolute; width: 150px; padding: 12px; border-radius: 4px; color: #1f1f1f; font-size: 12px; line-height: 16px; box-shadow: 0 4px 10px rgba(0,0,0,.35); }
.scr .sticky b { display: block; font-size: 10px; margin-top: 8px; color: #555; font-weight: 500; }
.scr .cursor { position: absolute; z-index: 3; transition: left 1.6s cubic-bezier(.4,0,.2,1), top 1.6s cubic-bezier(.4,0,.2,1); }
.scr .cursor svg { width: 20px; height: 20px; display: block; }
.scr .cursor span { position: absolute; left: 14px; top: 16px; padding: 2px 8px; border-radius: 10px 10px 10px 2px; color: #fff; font-size: 11px; white-space: nowrap; }
`;

const Arrow = ({ color }: { color: string }) => (
  <svg viewBox="0 0 20 20"><path d="M4 2l12 7.5-5.2 1.3L8.4 16z" fill={color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" /></svg>
);
const Tool = ({ d, on }: { d: ReactNode; on?: boolean }) => (
  <span className={`tool${on ? " on" : ""}`}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  </span>
);

function FigmaScreen() {
  const [lena, setLena] = useState({ left: 640, top: 300 });
  const [hana, setHana] = useState({ left: 420, top: 180 });
  useEffect(() => {
    const t = setInterval(() => {
      setLena({ left: 470 + Math.random() * 380, top: 120 + Math.random() * 360 });
      if (Math.random() < 0.6) setHana({ left: 80 + Math.random() * 600, top: 120 + Math.random() * 400 });
    }, 2200);
    return () => clearInterval(t);
  }, []);
  const p = MEET_DEMO.people;
  const frame = (x: number, label: string, body: ReactNode, sel = false) => (
    <div className={`frame${sel ? " sel" : ""}`} style={{ left: x }}>
      <span className="fl">{label}</span>
      {body}
      <div className="cta" />
    </div>
  );
  const tg = (off = false) => <div className={`tg${off ? " off" : ""}`}><i /><div className="ln" /></div>;
  return (
    <div className="scr">
      <div className="scr-top">
        <span className="logo-sq" />
        <Tool on d={<path d="M5 3l14 8-6 1.5L10 19z" />} />
        <Tool d={<rect x="4" y="4" width="16" height="16" rx="1" />} />
        <Tool d={<path d="M4 20L20 4" />} />
        <Tool d={<path d="M6 5h12M12 5v14" />} />
        <Tool d={<path d="M4 12h16M12 4v16" />} />
        <span className="file">Drafts / <b>Onboarding v4</b></span>
        <span className="avs"><img className="ring" src={p.lena.photo} alt="" /><img src={p.hana.photo} alt="" /><img src={p.marcus.photo} alt="" /></span>
        <span className="share">Share</span>
        <span style={{ color: "#bdbdbd" }}>50%</span>
      </div>
      <div className="scr-body">
        <div className="scr-side">
          <h6>Pages</h6>
          <div className="it sel">Flows</div><div className="it">Components</div><div className="it">Archive</div>
          <h6 style={{ marginTop: 10 }}>Layers</h6>
          <div className="it"><i />1 - Welcome</div><div className="it"><i />2 - Your team</div><div className="it sel"><i />3 - Permissions</div><div className="it"><i />4 - All set</div><div className="it"><i />Research notes</div>
        </div>
        <div className="scr-canvas">
          {frame(56, "1 - Welcome", <><div className="ill" /><div className="ln h" /><div className="ln" /><div className="ln s" /></>)}
          {frame(306, "2 - Your team", <><div className="ill b" /><div className="ln h" /><div className="ln" /><div className="ln" /><div className="ln s" /></>)}
          {frame(556, "3 - Permissions", <><div className="ill c" /><div className="ln h" />{tg()}{tg()}{tg(true)}{tg()}</>, true)}
          <div className="sticky" style={{ left: 600, top: 540, background: "#ffe599" }}>Group roles so admins see everything on one screen<b>Hana Kim</b></div>
          <div className="sticky" style={{ left: 360, top: 560, background: "#b6d7a8" }}>Invite step moved up, test with 5 users<b>Lena Okafor</b></div>
          <div className="cursor" style={lena}><Arrow color={p.lena.color!} /><span style={{ background: p.lena.color }}>Lena</span></div>
          <div className="cursor" style={hana}><Arrow color={p.hana.color!} /><span style={{ background: p.hana.color }}>Hana</span></div>
        </div>
        <div className="scr-side r">
          <h6 style={{ padding: "6px 0" }}>Frame</h6>
          <div className="row2"><span className="fld">W 375</span><span className="fld">H 812</span></div>
          <h6 style={{ padding: "6px 0" }}>Fill</h6>
          <div className="sw"><span style={{ background: "#ffffff", border: "1px solid #555" }} />FFFFFF</div>
          <h6 style={{ padding: "6px 0" }}>Colors</h6>
          <div className="sw"><span style={{ background: "#0b57d0" }} />Primary</div>
          <div className="sw"><span style={{ background: "#c2e7ff" }} />Surface tint</div>
          <div className="sw"><span style={{ background: "#1f1f1f" }} />On surface</div>
          <h6 style={{ padding: "6px 0", marginTop: 10 }}>Text</h6>
          <div className="row2"><span className="fld">Title / 22</span><span className="fld">Body / 14</span></div>
        </div>
      </div>
    </div>
  );
}

export function MeetPreview() {
  const ref = useRef<MeetCall | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const lines = useRef<Record<string, number>>({});
  const speaker = useRef<string | null>(null);

  // Like the mockup's `later`: nothing fires once you have left the call.
  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      if (ref.current?.state.view === "call") fn();
    }, ms);
    timers.current.add(t);
  };
  const others = () => ref.current!.state.inCall;
  const say = (who: string) => {
    const list = CAPTIONS[who];
    if (!list) return;
    const i = (lines.current[who] = ((lines.current[who] ?? -1) + 1) % list.length);
    ref.current!.caption(who, list[i]);
  };

  // The mockup's script for the first few minutes of the call.
  const schedule = () => {
    const m = () => ref.current!;
    later(6000, () => m().join("dev", { video: true, muted: false }));
    later(24000, () => m().react("marcus", "\u{1F44D}"));
    later(30000, () => m().raiseHand("hana"));
    later(40000, () => m().chat("lena", "The flows page is the one to look at, frames 1 to 4"));
    later(62000, () => m().raiseHand("hana", false));
    later(120000, () => m().state.presenter === "lena" && m().present(null));
    later(135000, () => m().leave("sofia"));
    later(165000, () => m().join("sofia", { video: true, muted: true }));
    const loop = () =>
      later(18000 + Math.random() * 16000, () => {
        if (others().length) m().react(pick(others()), pick(EMOJI));
        if (Math.random() < 0.35 && others().length) m().chat(pick(others()), pick(REPLIES));
        loop();
      });
    loop();
  };

  const meet = useMeet(MEET_DEMO, {
    onEvent(event) {
      const m = ref.current!;
      if (event.type === "chat" && others().length) later(1800 + Math.random() * 2000, () => m.chat(pick(others()), pick(REPLIES)));
      if (event.type === "person" && event.action === "invite")
        later(3500, () => m.join(event.person, { video: MEET_DEMO.video!.includes(event.person), muted: false }));
      if (event.type === "poll" && event.action === "launch")
        others().forEach((_, i) => later(1500 + i * 1300, () => ref.current!.state.poll && m.vote(Math.floor(Math.random() * event.options.length))));
      if (event.type === "question" && event.action === "ask") later(3000, () => m.upvote(event.id, 2));
      if (event.type === "captions" && event.on && speaker.current) say(speaker.current);
      if (event.type === "leave") {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
      }
      if (event.type === "rejoin") schedule();
    },
  });
  ref.current = meet;

  useEffect(() => {
    schedule();
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Whoever is unmuted takes turns talking (the presenter more often), with captions.
  useEffect(() => {
    const t = setInterval(() => {
      const m = ref.current!;
      if (m.state.view !== "call") return;
      const talk = m.state.inCall.filter((p) => !m.state.muted.includes(p));
      const prev = speaker.current;
      if (!prev || !talk.includes(prev) || Math.random() < 0.3) {
        const pres = m.state.presenter;
        if (pres && pres !== m.me && talk.includes(pres) && Math.random() < 0.55) speaker.current = pres;
        else speaker.current = talk.length && Math.random() < 0.85 ? pick(talk) : null;
      }
      const now = speaker.current;
      m.speaking([...(now ? [now] : []), ...(Math.random() < 0.12 ? [m.me] : [])]);
      if (now && (now !== prev || Math.random() < 0.35)) say(now);
    }, 1700);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{SCREEN_CSS}</style>
      <Meet meet={meet} renderScreen={(who) => (who === "lena" ? <FigmaScreen /> : undefined)} />
    </>
  );
}
