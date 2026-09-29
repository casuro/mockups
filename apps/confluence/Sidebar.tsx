import { Avatar, useUI } from "./context";
import * as I from "./icons";

// The frame around the page: the top nav with search, and the space
// sidebar with its page tree.

export function TopNav() {
  const { confluence, toggleSide } = useUI();
  const { state, people, me, ui } = confluence;
  const action = (kind: "create" | "home" | "recent" | "spaces" | "notifications") => ui.emit({ type: "action", kind });
  const find = (raw: string) => {
    const query = raw.trim();
    if (!query) return;
    ui.emit({ type: "search", query });
    const q = query.toLowerCase();
    const hit = Object.values(state.pages).find((p) => p.title.toLowerCase().includes(q));
    if (hit) ui.open(hit.id);
    else confluence.toast(`No results for "${query}"`);
  };
  return (
    <header className="top">
      <button className="ibtn hamb" aria-label="Open sidebar" onClick={toggleSide}><I.Menu /></button>
      <button className="ibtn drawer" title="Switch sites or apps" aria-label="App switcher"><I.Apps /></button>
      <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
        <I.Logo />
        <span>Confluence</span>
      </a>
      <div className="menus">
        <button className="menu" onClick={() => action("home")}>Home</button>
        <button className="menu" onClick={() => action("recent")}>Recent <I.Chevron /></button>
        <button className="menu" onClick={() => action("spaces")}>Spaces <I.Chevron /></button>
        <button className="create" onClick={() => action("create")}><I.Plus />Create</button>
      </div>
      <div className="spacer" />
      <label className="search">
        <I.Search />
        <input
          placeholder="Search"
          aria-label="Search"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            find(e.currentTarget.value);
            e.currentTarget.value = "";
            e.currentTarget.blur();
          }}
        />
      </label>
      <button
        className={`ibtn${state.notifications ? " dot" : ""}`}
        data-count={state.notifications > 99 ? "99+" : state.notifications}
        title="Notifications"
        aria-label={state.notifications ? `Notifications, ${state.notifications} new` : "Notifications"}
        onClick={() => action("notifications")}
      >
        <I.Bell />
      </button>
      <button className="ibtn" title="Toggle theme" aria-label="Toggle theme" onClick={() => ui.setTheme(state.theme === "dark" ? "light" : "dark")}>
        <I.Theme />
      </button>
      <button className="me" title={people[me].name}><Avatar id={me} /></button>
    </header>
  );
}

export function Sidebar() {
  const { confluence } = useUI();
  const { seed, state, ui } = confluence;
  return (
    <aside className="side">
      <div className="space">
        <div className="space-ic">{seed.space.initial ?? seed.space.name.charAt(0).toUpperCase()}</div>
        <div>
          <b>{seed.space.name}</b>
          {seed.space.site ? <small>{seed.space.site}</small> : null}
        </div>
      </div>
      <button className="nav" onClick={() => ui.emit({ type: "action", kind: "overview" })}><I.Home />Overview</button>
      <button className="nav" onClick={() => ui.emit({ type: "action", kind: "blogs" })}><I.Blog />Blogs</button>
      <div className="sec">
        <span>Content</span>
        <button className="ibtn" style={{ width: 24, height: 24 }} aria-label="Add page" onClick={() => ui.emit({ type: "action", kind: "add-page" })}>
          <I.Plus />
        </button>
      </div>
      <Tree ids={state.roots} depth={0} />
    </aside>
  );
}

function Tree({ ids, depth }: { ids: string[]; depth: number }) {
  const { confluence } = useUI();
  const { state, ui } = confluence;
  return (
    <>
      {ids.map((id) => {
        const p = state.pages[id];
        const kids = p.children.length > 0;
        const open = kids && state.expanded.includes(id);
        const on = state.current === id;
        return (
          <div key={id}>
            <div
              className={`tree-row${on ? " on" : ""}`}
              style={{ paddingLeft: depth * 16 }}
              role="button"
              aria-current={on ? "page" : undefined}
              tabIndex={0}
              onClick={() => ui.open(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ui.open(id);
              }}
            >
              <span
                className={`caret${kids ? "" : " none"}${open ? " open" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  ui.toggleExpanded(id);
                }}
              >
                <I.Caret />
              </span>
              <span className="pg-ic"><I.Page /></span>
              <span className="ttl">{p.title}</span>
            </div>
            {open ? <Tree ids={p.children} depth={depth + 1} /> : null}
          </div>
        );
      })}
    </>
  );
}
