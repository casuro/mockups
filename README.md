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

Any app's name works in `?app=`: calendar, calendly, chatgpt, claude-code,
confluence, datadog, docs, gmail, greenhouse, intercom, jira, linear, meet,
notion, outlook, slack, teams, whatsapp, zendesk, zoom.

`npm run check` type-checks the React versions and the previews.
