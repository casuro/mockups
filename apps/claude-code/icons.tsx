import type { SVGProps } from "react";

// Claude Code's icons and logos, as drawn in apps/claude-code.html (the
// mockup's IC table, verbatim). Decorative: the button around each one
// carries its accessible name.

type IconProps = SVGProps<SVGSVGElement>;

function stroke(inner: string, strokeWidth = 1.8) {
  return function Icon(props: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    );
  };
}

function filled(inner: string) {
  return function Icon(props: IconProps) {
    return <svg viewBox="0 0 24 24" aria-hidden="true" {...props} dangerouslySetInnerHTML={{ __html: inner }} />;
  };
}

export const Plus = stroke("<path d=\"M12 5v14M5 12h14\"/>");
export const Search = stroke("<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/>");
export const X = stroke("<path d=\"M18 6 6 18M6 6l12 12\"/>");
export const ChevR = stroke("<path d=\"m9 6 6 6-6 6\"/>");
export const ChevD = stroke("<path d=\"m6 9 6 6 6-6\"/>");
export const Back = stroke("<path d=\"M19 12H5M12 19l-7-7 7-7\"/>");
export const More = stroke("<circle cx=\"5\" cy=\"12\" r=\"1.3\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\"1.3\" fill=\"currentColor\"/><circle cx=\"19\" cy=\"12\" r=\"1.3\" fill=\"currentColor\"/>");
export const Panel = stroke("<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"/><path d=\"M9 4v16\"/>");
export const Menu = stroke("<path d=\"M4 7h16M4 12h16M4 17h16\"/>");
export const Branch = stroke("<circle cx=\"6\" cy=\"5\" r=\"2\"/><circle cx=\"6\" cy=\"19\" r=\"2\"/><circle cx=\"18\" cy=\"7\" r=\"2\"/><path d=\"M6 7v10M18 9c0 5-6 4-11.5 8\"/>");
export const Repo = stroke("<path d=\"M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z\"/><path d=\"M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3\"/><path d=\"M9 7h6\"/>");
export const Cloud = stroke("<path d=\"M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7Z\"/>");
export const Laptop = stroke("<rect x=\"4\" y=\"5\" width=\"16\" height=\"11\" rx=\"1.5\"/><path d=\"M2 19h20\"/>");
export const File = stroke("<path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z\"/><path d=\"M14 3v5h5\"/>");
export const FileText = stroke("<path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z\"/><path d=\"M14 3v5h5M9 13h6M9 17h4\"/>");
export const Folder = stroke("<path d=\"M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z\"/>");
export const Pencil = stroke("<path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z\"/>");
export const Edit = stroke("<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z\"/>");
export const Terminal = stroke("<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2.5\"/><path d=\"m7 9 3 3-3 3M13 15h4\"/>");
export const Globe = stroke("<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18\"/>");
export const Diff = stroke("<path d=\"M8 3v8M4 7h8M4 17h8\"/><path d=\"M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3\"/>");
export const Check = stroke("<path d=\"m5 12.5 4.5 4.5L19 7.5\"/>', 'stroke-width=\"2.4\"");
export const CheckC = stroke("<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 12.5 2.8 2.8L16.5 9.5\"/>");
export const XC = stroke("<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m15 9-6 6M9 9l6 6\"/>");
export const Alert = stroke("<path d=\"M12 3 2 20h20L12 3Z\"/><path d=\"M12 10v4M12 17.5v.01\"/>");
export const Up = stroke("<path d=\"M12 19V5M5 12l7-7 7 7\"/>', 'stroke-width=\"2.2\"");
// stop is filled, not stroked
export const Stop = filled("<rect x=\"6.5\" y=\"6.5\" width=\"11\" height=\"11\" rx=\"2\" fill=\"currentColor\"/>");
export const Clip = stroke("<path d=\"m20.5 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.2-8.2a3.3 3.3 0 0 1 4.7 4.7l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6\"/>");
export const At = stroke("<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8\"/>");
export const Sparkle = stroke("<path d=\"M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6\"/>");
export const Brain = stroke("<path d=\"M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4H9ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4h1Z\"/>");
export const Todo = stroke("<rect x=\"3\" y=\"4\" width=\"6\" height=\"6\" rx=\"1.5\"/><path d=\"m4.5 16 1.5 1.5L9 14.5M13 7h8M13 16h8\"/>");
export const Bot = stroke("<rect x=\"4\" y=\"8\" width=\"16\" height=\"12\" rx=\"3\"/><path d=\"M12 8V4M9 13v1M15 13v1M2 14h2M20 14h2\"/>");
export const Shield = stroke("<path d=\"M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z\"/>");
export const Refresh = stroke("<path d=\"M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4\"/>");
export const Monitor = stroke("<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 20h8M12 16v4\"/>");
export const Tablet = stroke("<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M11 18h2\"/>");
export const Phone = stroke("<rect x=\"7\" y=\"3\" width=\"10\" height=\"18\" rx=\"2\"/><path d=\"M11 18h2\"/>");
export const Copy = stroke("<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"/>");
export const Trash = stroke("<path d=\"M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3\"/>");
export const Archive = stroke("<rect x=\"3\" y=\"4\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4\"/>");
export const Unarchive = stroke("<rect x=\"3\" y=\"4\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M12 17v-5M9.5 14.5 12 12l2.5 2.5\"/>");
export const Settings = stroke("<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z\"/>");
export const Sun = stroke("<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/>");
export const Moon = stroke("<path d=\"M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z\"/>");
export const Help = stroke("<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 3.7M12 17h.01\"/>");
export const Logout = stroke("<path d=\"M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4\"/>");
export const Keyboard = stroke("<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\"/><path d=\"M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10\"/>");
export const Lock = stroke("<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>");
export const Pr = stroke("<circle cx=\"6\" cy=\"6\" r=\"2\"/><circle cx=\"6\" cy=\"18\" r=\"2\"/><circle cx=\"18\" cy=\"18\" r=\"2\"/><path d=\"M6 8v8M18 16V9a3 3 0 0 0-3-3h-4M13 3.5 10.5 6 13 8.5\"/>");
export const Comment = stroke("<path d=\"M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z\"/>");
export const Undo = stroke("<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10.5a5.5 5.5 0 0 1 0 11H11\"/>");
export const Cpu = stroke("<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4\"/>");
export const Zap = stroke("<path d=\"M13 2 4 14h7l-1 8 9-12h-7l1-8Z\"/>");
export const Map = stroke("<path d=\"m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14\"/>");
export const Hand = stroke("<path d=\"M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5v-5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.3 15a1.5 1.5 0 0 1 2.4-1.8L8 15\"/>");
export const Ext = stroke("<path d=\"M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4\"/>");
export const Mic = stroke("<rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/>");
export const Video = stroke("<rect x=\"3\" y=\"6\" width=\"13\" height=\"12\" rx=\"2\"/><path d=\"m16 10 5-3v10l-5-3\"/>");
export const Headphones = stroke("<path d=\"M4 15v-3a8 8 0 0 1 16 0v3\"/><rect x=\"3\" y=\"14\" width=\"4\" height=\"6\" rx=\"1.5\"/><rect x=\"17\" y=\"14\" width=\"4\" height=\"6\" rx=\"1.5\"/>");
export const PhoneOff = stroke("<path d=\"M3 13.5c5-4 13-4 18 0l-2.5 2.5-3-1.5V12c-2-.6-5-.6-7 0v2.5l-3 1.5L3 13.5Z\"/>");
export const Bell = stroke("<path d=\"M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4\"/>");
export const Eye = stroke("<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>");
export const Layers = stroke("<path d=\"m12 3 9 5-9 5-9-5 9-5Z\"/><path d=\"m3 13 9 5 9-5\"/>");
export const Palette = stroke("<path d=\"M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5Z\"/><circle cx=\"7.5\" cy=\"11\" r=\"1\" fill=\"currentColor\"/><circle cx=\"10\" cy=\"7\" r=\"1\" fill=\"currentColor\"/><circle cx=\"15\" cy=\"7.5\" r=\"1\" fill=\"currentColor\"/>");
export const Gauge = stroke("<path d=\"M12 14l4-4\"/><path d=\"M3.5 18a10 10 0 1 1 17 0\"/>");
export const Circle = stroke("<circle cx=\"12\" cy=\"12\" r=\"8\"/>");
export const Send2 = stroke("<path d=\"m4 12 16-8-6 16-2.5-6.5L4 12Z\"/>");

// ---------- Logos (thesvg.org, as embedded in the mockup) ----------

const CLAUDE_PATH = "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z";

/** The Claude mark in its own clay color, or in the text color with `current`. */
export function ClaudeMark({ current = false, ...props }: IconProps & { current?: boolean }) {
  return (
    <svg aria-hidden="true" fill={current ? "currentColor" : "#D97757"} role="img" viewBox="0 0 24 24" {...props}>
      <path d={CLAUDE_PATH} />
    </svg>
  );
}

export function GitHub(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1024 1024" fill="none" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" transform="scale(64)" fill="#181717" />
    </svg>
  );
}
