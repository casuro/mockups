import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `npm run dev` serves the previews: /preview/?app=slack renders the React
// version of an app with its mockup's sample data, to put next to
// /apps/slack.html.
export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: "preview/index.html" } },
});
