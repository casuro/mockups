# mockups
This is a repository for application mockup in single file

Each app is one self-contained HTML file in `apps/`, with a React version in
a folder next to it (`apps/slack/` beside `apps/slack.html`): the
same app as components, which Casuro's episode builder copies into an
episode and builds on, the way shadcn components are copied into a project.
Each folder's README says how to use it.

To see a React version next to its mockup:

```bash
npm install
npm run dev   # then open /preview/?app=slack and /apps/slack.html
```

`desktops/` has lightweight desktop shells in the same shape: `macos.html`,
`windows.html` and `linux.html` (Ubuntu), each with a React version next to
it whose windows take any React content, so an app kit can run inside a
desktop window. Preview them with `?app=macos`, `?app=windows` and
`?app=linux`.

Every app kit's `icons.tsx` exports its logo for a launcher, in one shape:
`AppLogo`, an svg with no fixed size that fills the box it is put in, and
`appTile`, the Dock tile it sits on - `undefined` for the plain white tile,
a CSS color or gradient for a brand-colored tile (`AppLogo` is then the
glyph drawn for it, usually white), or `"full"` when `AppLogo` is itself the
whole square icon (Zoom). Each pairing follows the real app's icon. A desktop
launcher uses them as they are:

```tsx
import { AppLogo as SlackLogo, appTile as slackTile } from "./apps/slack/icons";

const item = { id: "slack", name: "Slack", icon: <SlackLogo />, tile: slackTile };
```

Any app's name works in `?app=`: calendar, calendly, chatgpt, claude-code,
confluence, datadog, docs, gmail, greenhouse, intercom, jira, linear, meet,
notion, outlook, pagerduty, slack, supabase, teams, whatsapp, zendesk, zoom.

`npm run check` type-checks the React versions and the previews.
