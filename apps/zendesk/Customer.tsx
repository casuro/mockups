import { Avatar, Badge, useUI } from "./context";
import { ago, cap, localTime, when } from "./format";
import type { ZendeskTicket } from "./types";

// The right of a ticket: who asked, their organization and local time,
// their organization's other tickets, and their interaction history.

export function Customer({ ticket: t }: { ticket: ZendeskTicket }) {
  const { zendesk } = useUI();
  const { seed, state } = zendesk;
  const p = seed.requesters[t.requester];
  const org = p?.org ? seed.organizations?.[p.org] : undefined;
  const orgOf = (id: string) => seed.requesters[id]?.org;
  const others = state.tickets.filter((x) => x.id !== t.id && (p?.org ? orgOf(x.requester) === p.org : x.requester === t.requester));
  if (!p) return <aside className="ctx" />;
  return (
    <aside className="ctx" aria-label="Customer context">
      <section>
        <h3>Customer</h3>
        <div className="cust">
          <Avatar id={t.requester} size="lg" />
          <div>
            <div className="nm">{p.name}</div>
            <div className="em">{p.email}</div>
          </div>
        </div>
        <dl className="kv">
          {org ? (
            <>
              <dt>Organization</dt>
              <dd>
                <a href="#" onClick={(e) => { e.preventDefault(); zendesk.ui.action("Organization"); }}>{org.name}</a>{" "}
                {org.plan ? <span className="plan">{org.plan}</span> : null}
              </dd>
            </>
          ) : null}
          {p.title ? <><dt>Title</dt><dd>{p.title}</dd></> : null}
          {org?.timezone ? (
            <>
              <dt>Local time</dt>
              <dd>{localTime(org.timezone)} {org.city ? <span className="muted">{org.city}</span> : null}</dd>
            </>
          ) : null}
          <dt>Language</dt>
          <dd>{p.language ?? "English"}</dd>
          {org?.tags?.length ? <><dt>Tags</dt><dd>{org.tags.join(", ")}</dd></> : null}
        </dl>
      </section>
      <section>
        <h3>{`Recent tickets (${others.length})`}</h3>
        {others.length ? (
          others.slice(0, 4).map((o) => (
            <div key={o.id} className="rt">
              <Badge status={o.status} />
              <div className="s">
                <b
                  role="button"
                  tabIndex={0}
                  onClick={() => zendesk.ui.openTicket(o.id)}
                  onKeyDown={(e) => e.key === "Enter" && zendesk.ui.openTicket(o.id)}
                >
                  {o.subject}
                </b>
                <span>{`#${o.id} · ${when(o.requestedAt)}`}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="muted" style={{ fontSize: 13 }}>No other tickets</div>
        )}
      </section>
      <section>
        <h3>Interaction history</h3>
        <div className="hist">
          <div className="ev cur">{t.subject}<span>{`Current ticket · ${ago(t.updatedAt)}`}</span></div>
          {others.slice(0, 3).map((o) => (
            <div key={o.id} className="ev">{o.subject}<span>{`${cap(o.status)} · ${ago(o.updatedAt)}`}</span></div>
          ))}
          {(p.history ?? []).map((h, i) => (
            <div key={i} className="ev">{h.text}<span>{h.when}</span></div>
          ))}
        </div>
      </section>
    </aside>
  );
}
