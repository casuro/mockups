import { useEffect, useRef } from "react";
import { PagerDuty, usePagerDuty, type PagerDutyAccount, type PagerDutyIncidentInput, type PagerDutySeed } from "../apps/pagerduty";
import { FACES } from "./faces";

// apps/pagerduty.html's Casuro account, driving the React version: the same
// people, escalation policies, services and incidents (the checkout 5xx
// story from the Datadog mockup), the mockup's notices for the controls it
// has no behaviour for, and teammates who answer: Marcus follows up on an
// acknowledged P1, and whoever you reassign or escalate to acknowledges. A
// minute in, a Redis memory alert pages you.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => Date.now() - ms;
// `h:m` on the most recent Monday before today.
function monday(h: number, m: number) {
  const d = new Date();
  d.setDate(d.getDate() - (((d.getDay() + 6) % 7) || 7));
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
// Next Friday, 9:00 AM: when the Platform rotation hands over.
function friday() {
  const d = new Date();
  d.setDate(d.getDate() + ((((5 - d.getDay()) + 7) % 7) || 7));
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}
const dd = (title: string, detail: string, at: number, status: "triggered" | "resolved" = "triggered") => ({ source: "datadog", title, detail, at, status });
const triggered = (at: number) => ({ type: "trigger" as const, at, text: "**Triggered** through the Datadog integration", via: "datadog" });

const INCIDENTS: PagerDutyIncidentInput[] = [
  {
    id: 4127, title: "[P1] checkout 5xx rate above 2%", service: "checkout", priority: "P1", assignee: "naman", createdAt: ago(12 * MIN),
    bridge: { zoom: "casuro.zoom.us/j/81234567890", slack: "#inc-checkout" },
    alerts: [
      dd("[P1] checkout 5xx rate above 2%", "service:checkout env:prod - value 3.08%", ago(12 * MIN)),
      dd("[P2] checkout p95 latency above 150ms", "service:checkout env:prod - value 212ms", ago(10 * MIN)),
    ],
    timeline: [
      triggered(ago(12 * MIN)),
      { type: "notify", at: ago(12 * MIN), text: "Notified **Naman Shukla** by push notification", channel: "push" },
      { type: "notify", at: ago(11 * MIN), text: "Notified **Naman Shukla** by SMS to +1 (415) 555-0142", channel: "sms" },
      { type: "alert", at: ago(10 * MIN), text: "Alert grouped: **[P2] checkout p95 latency above 150ms**", via: "datadog" },
    ],
  },
  {
    id: 4126, title: "[P2] postgres-primary connections above 95%", service: "postgres-primary", status: "acknowledged", priority: "P2", assignee: "naman", createdAt: ago(21 * MIN), responders: ["marcus"],
    alerts: [dd("[P2] postgres-primary connections above 95%", "db:postgres-primary - 97 of 100 pool connections in use", ago(21 * MIN))],
    timeline: [
      triggered(ago(21 * MIN)),
      { type: "notify", at: ago(21 * MIN), text: "Notified **Naman Shukla** by push notification", channel: "push" },
      { type: "ack", at: ago(19 * MIN), text: "**Acknowledged** by Naman Shukla" },
      { type: "responders", at: ago(17 * MIN), text: "Naman Shukla requested **Marcus Chen** to respond" },
      { type: "note", at: ago(15 * MIN), by: "marcus", text: "Pool is pinned at 97/100 since the retry change in Deploy #1482. Looking at pgbouncer stats now, not touching max_connections yet." },
    ],
  },
  {
    id: 4125, title: "[P3] api-gateway 5xx rate above 1%", service: "api-gateway", urgency: "low", priority: "P3", assignee: "hana", level: 2, createdAt: ago(8 * MIN),
    alerts: [dd("[P3] api-gateway 5xx rate above 1%", "service:api-gateway env:prod - value 1.21%", ago(8 * MIN))],
    timeline: [
      triggered(ago(8 * MIN)),
      { type: "escalate", at: ago(8 * MIN), text: "Assigned to **Hana Kim** (level 2, low urgency rule)" },
      { type: "notify", at: ago(8 * MIN), text: "Notified **Hana Kim** by email", channel: "email" },
    ],
  },
  {
    id: 4124, title: "Synthetic test slow: assessment start page p95 above 3s", service: "assessments", status: "acknowledged", urgency: "low", priority: "P4", assignee: "sofia", createdAt: ago(2 * HOUR + 14 * MIN),
    alerts: [dd("Synthetic: assessment start page p95 above 3s", "test:assessment-start location:aws:us-east-1 - 3.4s", ago(2 * HOUR + 14 * MIN))],
    timeline: [triggered(ago(2 * HOUR + 14 * MIN)), { type: "ack", at: ago(2 * HOUR + 2 * MIN), text: "**Acknowledged** by Sofia Alvarez" }],
  },
  {
    id: 4122, title: "web-frontend LCP p75 above 2.5s on /jobs", service: "web-frontend", urgency: "low", priority: "P5", assignee: "lena", createdAt: ago(5 * HOUR + 40 * MIN),
    alerts: [dd("web-frontend LCP p75 above 2.5s", "view:/jobs env:prod - 2.7s", ago(5 * HOUR + 40 * MIN))],
    timeline: [triggered(ago(5 * HOUR + 40 * MIN)), { type: "notify", at: ago(5 * HOUR + 40 * MIN), text: "Notified **Lena Okafor** by email", channel: "email" }],
  },
  {
    id: 4118, title: "SEV-2: checkout errors from connection pool exhaustion", service: "checkout", status: "resolved", priority: "P2", assignee: "dev", level: 3,
    createdAt: monday(14, 6), resolvedAt: monday(15, 22), responders: ["naman", "hana", "sofia"],
    alerts: [dd("[P1] checkout 5xx rate above 2%", "service:checkout env:prod - value 4.6%", monday(14, 6), "resolved")],
    timeline: [
      triggered(monday(14, 6)),
      { type: "ack", at: monday(14, 8), text: "**Acknowledged** by Hana Kim" },
      { type: "escalate", at: monday(14, 15), text: "Escalated to **Dev Patel** (level 3) by Hana Kim" },
      { type: "note", at: monday(14, 52), by: "sofia", text: "Rolled back the retry change. Pool back under 60%, error rate recovering." },
      { type: "resolve", at: monday(15, 22), text: "**Resolved** by Dev Patel" },
    ],
  },
  {
    id: 4115, title: "orders-service error rate above 1%", service: "orders-service", status: "resolved", priority: "P3", assignee: "sofia",
    createdAt: ago(2 * DAY + 5 * HOUR - 3 * MIN), resolvedAt: ago(2 * DAY + 4 * HOUR + 20 * MIN),
    alerts: [dd("orders-service error rate above 1%", "service:orders-service env:prod - value 1.52%", ago(2 * DAY + 5 * HOUR - 3 * MIN), "resolved")],
    timeline: [
      triggered(ago(2 * DAY + 5 * HOUR - 3 * MIN)),
      { type: "ack", at: ago(2 * DAY + 4 * HOUR + 58 * MIN), text: "**Acknowledged** by Sofia Alvarez" },
      { type: "resolve", at: ago(2 * DAY + 4 * HOUR + 20 * MIN), text: "**Resolved** automatically by Datadog", via: "datadog" },
    ],
  },
  {
    id: 4110, title: "Disk usage above 85% on prod-db-02", service: "postgres-primary", status: "resolved", urgency: "low", priority: "P4", assignee: "marcus",
    createdAt: ago(4 * DAY + 3 * HOUR), resolvedAt: ago(4 * DAY + HOUR),
    alerts: [dd("Disk usage above 85% on prod-db-02", "host:prod-db-02 device:/data - 87%", ago(4 * DAY + 3 * HOUR), "resolved")],
    timeline: [
      triggered(ago(4 * DAY + 3 * HOUR)),
      { type: "note", at: ago(4 * DAY + 2 * HOUR), by: "marcus", text: "Vacuumed the audit_events table and rotated WAL archives. 61% now." },
      { type: "resolve", at: ago(4 * DAY + HOUR), text: "**Resolved** by Marcus Chen" },
    ],
  },
];

export const PAGERDUTY_DEMO: PagerDutySeed = {
  account: { name: "Casuro" },
  me: "naman",
  people: {
    naman: { name: "Naman Shukla", email: "naman@casuro.com", role: "Platform Engineer", photo: FACES.naman },
    hana: { name: "Hana Kim", email: "hana@casuro.com", role: "Platform Engineer", photo: FACES.hana },
    marcus: { name: "Marcus Chen", email: "marcus@casuro.com", role: "Infrastructure Engineer", photo: FACES.marcus },
    sofia: { name: "Sofia Alvarez", email: "sofia@casuro.com", role: "Backend Engineer", photo: FACES.sofia },
    dev: { name: "Dev Patel", email: "dev@casuro.com", role: "Engineering Manager", photo: FACES.dev },
    lena: { name: "Lena Okafor", email: "lena@casuro.com", role: "Frontend Engineer", photo: FACES.lena },
  },
  policies: {
    platform: { name: "Casuro Platform Primary", levels: ["naman", "hana", "dev"], rotation: "Platform rotation" },
    product: { name: "Casuro Product Engineering", levels: ["sofia", "lena", "dev"] },
  },
  services: {
    checkout: { policy: "platform" },
    "orders-service": { policy: "platform" },
    "api-gateway": { policy: "platform" },
    "postgres-primary": { policy: "platform" },
    assessments: { policy: "product" },
    "web-frontend": { policy: "product" },
    "redis-cache": { policy: "platform" },
  },
  incidents: INCIDENTS,
  onCall: { policy: "platform", until: friday() },
};

// The mockup's notices for controls it has no behaviour for.
const NOTICES: Record<string, string> = {
  Help: "Help center and keyboard shortcuts",
  "Saved filters": "Incident filters saved",
  "New Incident": "New incident form",
  "View schedule": "Platform on-call schedule",
  "My profile": "Your profile",
  "My on-call shifts": "Your on-call shifts",
  "Notification rules": "Notification rules",
  "Log out": "Signed out (demo)",
};
const NAV = ["Services", "People", "Analytics", "Automation"];

export function PagerDutyPreview() {
  const ref = useRef<PagerDutyAccount | null>(null);
  const later = (ms: number, fn: (pd: PagerDutyAccount) => void) => setTimeout(() => ref.current && fn(ref.current), ms);
  const pagerduty = usePagerDuty(PAGERDUTY_DEMO, {
    onEvent(event) {
      const pd = ref.current!;
      if (event.type === "action") {
        const [kind, rest] = event.label.split(": ");
        if (kind === "Zoom") pd.toast("Joining the Zoom bridge");
        else if (kind === "Slack") pd.toast(`Opening ${rest} in Slack`);
        else if (kind === "Service") pd.toast(`Service ${rest}`);
        else pd.toast(NOTICES[event.label] ?? (NAV.includes(event.label) ? `${event.label} is not available in this demo` : event.label));
      }
      // Marcus follows up once the P1 is acknowledged.
      if (event.type === "acknowledge" && event.incident === 4127)
        later(4000, (pd) => pd.addNote(4127, "marcus", "Seeing the same pool pressure from checkout. Want me to roll back the retry change from Deploy #1482?"));
      // Whoever it lands on acknowledges a few seconds later.
      if ((event.type === "reassign" || event.type === "escalate") && event.to !== pd.me) {
        const { incident, to } = event;
        later(5000, (pd) => pd.acknowledge(incident, to));
      }
    },
  });
  ref.current = pagerduty;

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.trigger({
        id: 4128, title: "redis-cache memory usage above 80%", service: "redis-cache", urgency: "low", priority: "P3",
        alerts: [{ source: "datadog", title: "redis-cache memory usage above 80%", detail: "host:prod-redis-02 - 83% of maxmemory" }],
      });
    }, 60_000);
    return () => clearTimeout(t);
  }, []);

  return <PagerDuty pagerduty={pagerduty} />;
}
