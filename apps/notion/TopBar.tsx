import { Fragment, useRef } from "react";
import { Avatar, PageIcon, Pop, titleOf, useUI, type Box } from "./context";
import { rel } from "./format";
import * as I from "./icons";

// Above the page: the breadcrumbs, when it was edited, who is viewing it,
// Share (and its popover), comments, updates, the favorite star.

export function TopBar({ onToggle }: { onToggle: () => void }) {
  const { notion, openPop } = useUI();
  const { state, people, page } = notion;
  const path = [];
  for (let c = page; c; c = state.pages[c.parent]) path.unshift(c);
  const fav = state.favorites.includes(page.id);
  return (
    <header className="topbar">
      <div className="tb-left">
        <button className={`tb-ibtn${state.collapsed ? "" : " only-phone"}`} aria-label="Open sidebar" onClick={onToggle}><I.Menu /></button>
        <nav className="crumbs" aria-label="Breadcrumbs">
          {path.map((c, i) => (
            <Fragment key={c.id}>
              {i ? <span className="crumb-sep hide-phone">/</span> : null}
              <div className={`crumb${i < path.length - 1 ? " hide-phone" : ""}`} role="link" tabIndex={0} onClick={() => notion.ui.go(c.id)}>
                <span className="e"><PageIcon id={c.id} /></span>
                <span className="t">{titleOf(c)}</span>
              </div>
            </Fragment>
          ))}
        </nav>
      </div>
      <div className="tb-right">
        <span className="tb-edited hide-phone">Edited {rel(page.edited)}</span>
        <div className="presence hide-phone">
          {page.presence.filter((id) => people[id]).map((id) => (
            <span key={id} className="pres" title={`${people[id].name} is viewing`}><Avatar id={id} /></span>
          ))}
        </div>
        <button className="tb-btn" data-pop="share" onClick={(e) => openPop("share", e.currentTarget)}>Share</button>
        <button className="tb-ibtn hide-phone" aria-label="Comments" onClick={() => notion.ui.action("Comments")}><I.Comment /></button>
        <button className="tb-ibtn hide-phone" aria-label="Updates" onClick={() => notion.ui.action("Updates")}><I.Clock /></button>
        <button className="tb-ibtn" aria-label="Favorite" aria-pressed={fav} onClick={notion.ui.favorite}>
          {fav ? <span className="fav-on"><I.StarFill /></span> : <I.Star />}
        </button>
        <button className="tb-ibtn" aria-label="More" onClick={() => notion.ui.action("Page options")}><I.More /></button>
      </div>
    </header>
  );
}

export function SharePop({ anchor }: { anchor: Box }) {
  const { notion, closePop } = useUI();
  const { people, me, page, seed } = notion;
  const input = useRef<HTMLInputElement>(null);
  const ws = seed.workspace;
  const invite = () => {
    const v = input.current?.value.trim();
    if (!v) return;
    closePop();
    notion.ui.invite(v);
  };
  return (
    <Pop anchor={anchor} align="right" className="share-pop" label="Share">
      <div className="sh-tabs">
        <button className="on">Share</button>
        <button onClick={() => notion.ui.action("Publish")}>Publish</button>
      </div>
      <div className="sh-body">
        <div className="sh-inv">
          <input ref={input} className="field" placeholder="Email or group, separated by commas" aria-label="Invite" onKeyDown={(e) => e.key === "Enter" && invite()} />
          <button className="btn primary" onClick={invite}>Invite</button>
        </div>
        <div className="sh-list">
          {page.share.filter((s) => people[s.person]).map((s) => (
            <div key={s.person} className="sh-row">
              <Avatar id={s.person} className="av s28" />
              <div className="who">
                <div className="n">{people[s.person].name}{s.person === me ? " (You)" : ""}</div>
                <div className="e">{people[s.person].email}</div>
              </div>
              <button className="acc" onClick={() => notion.ui.action("Change access", s.person)}>{s.access}<I.ChevDown /></button>
            </div>
          ))}
        </div>
        <div className="sh-h">General access</div>
        <div className="sh-row">
          <span className="ws-ic">{ws.initial ?? ws.name.charAt(0).toUpperCase()}</span>
          <div className="who">
            <div className="n">Everyone at {ws.name}</div>
            <div className="e">Anyone in the workspace can find this page</div>
          </div>
          <button className="acc" onClick={() => notion.ui.action("Change general access")}>{page.access}<I.ChevDown /></button>
        </div>
      </div>
      <div className="sh-foot">
        <a role="button" tabIndex={0} onClick={() => notion.ui.action("Learn about sharing")}><I.Question />Learn about sharing</a>
        <button className="btn ghost sm" onClick={() => { closePop(); notion.ui.copyLink(); }}><I.Link />Copy link</button>
      </div>
    </Pop>
  );
}
