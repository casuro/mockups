import { useRef } from "react";
import { WhatsApp, useWhatsApp, type WhatsAppApp, type WhatsAppSeed } from "../apps/whatsapp";
import { FACES } from "./faces";

// apps/whatsapp.html's chats and demo script, driving the React version: the
// same people, chats and messages, and what happens after you send one
// (delivered, read, someone types, a canned reply).

// "16:05", `days` days ago.
function at(days: number, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
// "17:11" on the last Friday (0 Sunday ... 6 Saturday) before yesterday.
function on(weekday: number, time: string) {
  let days = (new Date().getDay() - weekday + 7) % 7;
  if (days < 2) days += 7;
  return at(days, time);
}

export const WHATSAPP_DEMO: WhatsAppSeed = {
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", photo: FACES.naman },
    hana: { name: "Hana Kim", color: "#1f7aec", photo: FACES.hana, online: true },
    marcus: { name: "Marcus Chen", color: "#d4458a", photo: FACES.marcus, lastSeen: "last seen today at 09:34" },
    sofia: { name: "Sofia Alvarez", color: "#e5733a", photo: FACES.sofia, lastSeen: "last seen yesterday at 22:10" },
    dev: { name: "Dev Patel", color: "#7f66ff", photo: FACES.dev, online: true },
    lena: { name: "Lena Okafor", color: "#06a88e", photo: FACES.lena, lastSeen: "last seen Friday at 19:45" },
  },
  open: "eng",
  chats: [
    {
      id: "eng", name: "Casuro Eng", members: ["hana", "marcus", "dev", "lena"], pinned: true,
      messages: [
        { from: "marcus", at: at(1, "16:05"), text: "Staging deploy for the billing service is green. Promoting after lunch." },
        { from: "naman", at: at(1, "16:07"), text: "Nice, ping me if the migration takes longer than 5 min", ticks: "read" },
        { from: "hana", at: at(0, "09:12"), text: "Morning all ☀️ Standup moved to 10:30 today" },
        { from: "hana", at: at(0, "09:13"), document: { name: "Casuro_Q4_Roadmap.pdf", meta: "12 pages • PDF • 2.4 MB" } },
        { from: "naman", at: at(0, "09:20"), quote: { from: "hana", text: "Morning all ☀️ Standup moved to 10:30 today" }, text: "Works for me, I'll bring the onboarding metrics", ticks: "read" },
        { from: "marcus", at: at(0, "09:47"), image: { title: "Billing / p95 latency" }, text: "New dashboard for the billing service 📈" },
        { from: "dev", at: at(0, "10:21"), text: "Heads up: I'm pairing with Lena on the flaky e2e suite this morning", reactions: [{ emoji: "👍", count: 2 }, { emoji: "🙏", count: 1 }] },
        { from: "lena", at: at(0, "10:38"), voice: { seconds: 42 } },
        { from: "lena", at: at(0, "10:42"), text: "We found it, a race in the auth fixture 🎉" },
      ],
    },
    {
      id: "hana", with: "hana", pinned: true,
      messages: [
        { from: "hana", at: at(0, "10:02"), text: "Did you get a chance to look at the Q4 roadmap draft?" },
        { from: "naman", at: at(0, "10:15"), text: "Yes! Left a few comments, mostly on the onboarding section", ticks: "read" },
      ],
    },
    {
      id: "onb", name: "Onboarding v4 crew", members: ["sofia", "hana", "lena"], unread: 1, typing: "sofia",
      messages: [
        { from: "sofia", at: at(0, "09:40"), text: "New welcome flow mocks are in Figma, feedback welcome" },
        { from: "lena", at: at(0, "09:58"), text: "Step 3 copy reads really nicely now" },
      ],
    },
    {
      id: "marcus", with: "marcus", unread: 2,
      messages: [
        { from: "marcus", at: at(0, "09:30"), text: "Can you review my PR for the rate limiter?" },
        { from: "marcus", at: at(0, "09:31"), text: "No rush, sometime before EOD works" },
      ],
    },
    {
      id: "sofia", with: "sofia",
      messages: [
        { from: "sofia", at: at(1, "18:20"), text: "Thanks for the intro to the design council!" },
        { from: "naman", at: at(1, "18:24"), text: "Anytime, they loved your portfolio review 🙌", ticks: "read" },
      ],
    },
    {
      id: "dev", with: "dev", muted: true,
      messages: [{ from: "naman", at: at(1, "13:02"), text: "Lunch tomorrow? The new ramen place near the office", ticks: "delivered" }],
    },
    {
      id: "lena", with: "lena",
      messages: [
        { from: "lena", at: on(5, "17:11"), text: "Sending over the incident review notes now" },
        { from: "lena", at: on(5, "17:12"), text: "Great work on the fix btw" },
      ],
    },
    {
      id: "social", name: "Casuro Social 🎉", members: ["hana", "marcus", "sofia", "dev", "lena"], muted: true,
      messages: [{ from: "dev", at: on(4, "20:14"), text: "Board game night is on for Friday 🎲" }],
    },
  ],
};

const REPLIES = ["Sounds good 👍", "On it!", "Makes sense, let's do that.", "Love it 🙌", "Can we sync after standup?", "Good call, thanks Naman"];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function WhatsAppPreview() {
  const ref = useRef<WhatsAppApp | null>(null);
  const whatsapp = useWhatsApp(WHATSAPP_DEMO, {
    onEvent(event) {
      const w = ref.current!;
      if (event.type !== "send") return;
      // As in the mockup: delivered, read, then someone types and answers.
      const info = w.chat(event.chat);
      const who = info.group ? pick(info.members) : info.with!;
      setTimeout(() => w.setTicks(event.id, "delivered"), 700);
      setTimeout(() => w.setTicks(event.id, "read"), 1600);
      setTimeout(() => {
        if (!info.group) w.setOnline(who, true);
        void w.deliver(event.chat, { from: who, text: pick(REPLIES) }, { typing: 2300 });
      }, 2300);
    },
  });
  ref.current = whatsapp;
  return <WhatsApp whatsapp={whatsapp} />;
}
