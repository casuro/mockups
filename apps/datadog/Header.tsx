import { useUI } from "./context";
import * as I from "./icons";

// The page header (favorite star, breadcrumb, title, Share, time picker)
// and the template variable bar under it.

export function PageHead() {
  const { app } = useUI();
  const d = app.seed.dashboard;
  const starred = app.state.starred;
  return (
    <header className="page-head">
      <div className="page-title">
        <button className={`icon-btn star-btn${starred ? " on" : ""}`} data-tip={starred ? "Remove from favorites" : "Add to favorites"} aria-pressed={starred} aria-label="Favorite" onClick={app.ui.star}>
          <I.Star />
        </button>
        <div className="ttl-wrap">
          <div className="crumbs">
            Dashboards
            {d.folder ? (
              <>
                <I.ChevRight style={{ width: 12, height: 12 }} /> {d.folder}
              </>
            ) : null}
          </div>
          <h1>{d.title}</h1>
        </div>
      </div>
      <div className="page-actions">
        <button
          className="btn"
          onClick={() => {
            void navigator.clipboard?.writeText(location.href).catch(() => {});
            app.toast("Dashboard link copied to clipboard");
            app.ui.emit({ type: "share" });
          }}
        >
          <I.Share />Share
        </button>
        <TimePicker />
      </div>
    </header>
  );
}

export function TimePicker() {
  const { app, openPop, closePop } = useUI();
  const p = app.view.preset;
  return (
    <div className="tp">
      <button
        className="tp-btn"
        aria-haspopup="true"
        onClick={(e) =>
          openPop(
            e.currentTarget,
            () => (
              <div className="tp-pop" role="menu">
                {app.presets.map((x) => (
                  <button key={x.key} className={`opt${app.state.time === x.key ? " on" : ""}`} role="menuitemradio" aria-checked={app.state.time === x.key} onClick={() => { closePop(); app.ui.pickTime(x.key); }}>
                    <span className="tp-badge">{x.badge}</span>
                    {x.label}
                  </button>
                ))}
              </div>
            ),
            { align: "end" }
          )
        }
      >
        <I.Clock />
        <span className="tp-badge">{p.badge}</span>
        <span className="tp-label">{p.label}</span>
        <I.ChevDown />
      </button>
    </div>
  );
}

export function VariableBar() {
  const { app, openPop, closePop } = useUI();
  const vars = app.seed.variables ?? [];
  if (!vars.length) return null;
  const def = (name: string) => {
    const v = vars.find((x) => x.name === name)!;
    return v.default ?? v.options[0];
  };
  const changed = vars.some((v) => app.state.vars[v.name] !== def(v.name));
  return (
    <div className="tv-bar">
      {vars.map((v) => (
        <button
          key={v.name}
          className={`tv${app.state.vars[v.name] !== def(v.name) ? " changed" : ""}`}
          aria-haspopup="true"
          onClick={(e) =>
            openPop(e.currentTarget, () => (
              <div className="menu" role="menu">
                <h6>${v.name}</h6>
                {v.options.map((o) => {
                  const on = app.state.vars[v.name] === o;
                  return (
                    <button key={o} className={`mi${on ? " on" : ""}`} role="menuitem" onClick={() => { closePop(); app.ui.pickVariable(v.name, o); }}>
                      <span>{o}</span>
                      {on ? <I.Check className="i ck" /> : null}
                    </button>
                  );
                })}
              </div>
            ))
          }
        >
          <span className="k">{v.name}</span>
          <span className="v">{app.state.vars[v.name]}<I.ChevDown /></span>
        </button>
      ))}
      {changed ? (
        <button className="btn ghost sm" onClick={app.ui.resetVariables}>
          <I.Reset />Reset
        </button>
      ) : null}
    </div>
  );
}
