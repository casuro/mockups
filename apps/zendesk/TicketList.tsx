import { Avatar, Badge, useUI } from "./context";
import { cap, when } from "./format";
import { matches } from "./use-zendesk";

// A view's tickets: the title, Play and Options, and the table. A row opens
// its ticket in a tab.

export function TicketList() {
  const { zendesk } = useUI();
  const { state, views, people, me } = zendesk;
  const view = views.find((v) => v.id === state.view) ?? views[0];
  const rows = view ? state.tickets.filter((t) => matches(t, view.filter, me)) : [];
  return (
    <>
      <div className="list-head">
        <h1>{view?.name ?? "Tickets"}</h1>
        <button className="btn" onClick={() => zendesk.ui.action("Play")}>Play</button>
        <button className="btn" onClick={() => zendesk.ui.action("Options")}>Options</button>
        <div className="sub">{`${rows.length} tickets`}</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}><span className="chk" /></th>
              <th>Status</th>
              <th>Subject</th>
              <th>Requester</th>
              <th>Requested</th>
              <th>Priority</th>
              <th>Assignee</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((t) => (
                <tr key={t.id} onClick={() => zendesk.ui.openTicket(t.id)}>
                  <td><span className="chk" /></td>
                  <td><Badge status={t.status} /></td>
                  <td className="subj"><b>{t.subject}</b><span className="id">{`#${t.id}`}</span></td>
                  <td><span className="who"><Avatar id={t.requester} size="sm" />{people[t.requester]?.name}</span></td>
                  <td className="muted">{when(t.requestedAt)}</td>
                  <td><span className={`prio ${t.priority}`}>{cap(t.priority)}</span></td>
                  <td>
                    {t.assignee ? (
                      <span className="who"><Avatar id={t.assignee} size="sm" />{people[t.assignee]?.name}</span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="muted" style={{ padding: "24px 10px" }}>No tickets in this view</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
