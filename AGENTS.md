# AGENTS.md

You edit this app through Outer's MCP tools: `commit` with exact-match
`edits`, one idea per message. Outer runs `bun install` and `bun run build`,
then deploys. The call returns `success` with the URL, `failed` with the build
log, or `blocked` with the lines to fix. After touching server code, read
`app_logs`.

In a local checkout, `bun run fmt` formats the code (oxfmt) and
`bun run check` runs the typecheck, Oxlint, the format check and `bun test`.

## Files

- `pages/index.tsx` → `/`. The file path is the route; `_`-prefixed files
  are components, never routes.
- `pages/index.server.ts` — loader + action on D1. They run in the Worker.
- `pages/layout.tsx` — wraps every page. Its footer links
  https://ilha.build; removable.
- `pages/app.css` — Tailwind + daisyUI (`light` default, `dark` for
  `prefers-color-scheme`).
- `void.config.ts` — Worker name, document `head`, bindings. Edits need
  `bun run build` (bindings and `head` are read from the built config).
- `public/favicon.svg` — the app icon; `head` in `void.config.ts` links the
  PWA manifest + icons (see `## PWA`).

## Ilha

A component is a function returning JSX. Primitives are order-based: call
`atom`/`watch` at the top level, in the same order every render — never in
`if`, loops, callbacks, or after `await`.

```tsx
import * as Atom from "effect/reactivity/Atom";
import { atom, watch } from "ilha";

export default function Counter({ start = 0 }: { start?: number }) {
  const count = atom(start); // read count(), write count.set(1)
  const doubled = atom(Atom.map(count.atom, (n) => n * 2)); // derived
  const startedAt = atom.lazy(() => Date.now()); // per-instance init
  watch.once(() => {
    // mount-only side effect; return a cleanup if needed
  });
  return (
    <button type="button" onclick={() => count.update((n) => n + 1)}>
      {count} / {doubled} (since {startedAt})
    </button>
  );
}
```

- `atom(value)` takes a value, an Effect atom, an Effect, or a Stream —
  never a plain function; use `atom.lazy(() => …)` for init or a stored
  function. Pass `handle.atom` to Effect APIs.
- Lowercase DOM names: `onclick`, `class`, `for`. Never `onClick`.
- `key` on every component returned from `.map()`. `yield* when(…)` only in
  a generator component. Never put JSX in atoms.
- Islands: name the page `*.island.tsx` (static HTML, no client JS except
  islands) and import with
  `import X from "./_x" with { island: "visible" }`. Island props are JSON
  only. On island pages use `useIslandForm()` from `@ilha/void`, not
  `useForm()`. Test with `renderHtml(Component)` from `ilha/test`.
- Every Ilha error carries a code (`ILHA002`), a `Fix:` line, and a link.

## Void

The starter page is the pattern to copy: `pages/index.server.ts` has a
loader that reads D1 and one action that writes it; `pages/index.tsx`
renders the list with one `useForm` per form. Replace it with the user's
app — don't keep the starter list around.

```ts
// pages/index.server.ts
import { defineHandler } from "void";
import type { InferProps } from "void";

export type Props = InferProps<typeof loader>;
export const loader = defineHandler(async () => ({ items: [] }));
// One action per page; an `intent` field tells the forms apart.
export const action = defineHandler(async (c) => {
  const { intent, text } = await c.req.json<{ intent?: string; text?: string }>();
  if (intent === "add" && !text?.trim()) {
    return c.json({ errors: { text: "Write something first." } }, 422);
  }
  // ...mutate, then return nothing: Void re-runs the loader and applies
  // the page JSON in place. Returning data forces a full reload.
});
```

```tsx
import { Form, useForm } from "@ilha/void";

const add = useForm("/" as string, { intent: "add", text: "" });
// add.data.text, add.setData("text", v), add.errors.text, add.pending
```

- `422` with `{ errors: { field: "message" } }` fills the form's errors.
- `Link` from `@ilha/void` navigates without a reload:
  `<Link href="/about" prefetch>About</Link>`. `<a>` attributes pass
  through; `class` works.

## daisyUI

Style with daisyUI components (https://daisyui.com/components/), not
hand-rolled utility stacks: `navbar`, `card card-body card-title`, `btn
btn-primary btn-ghost btn-sm`, `input`, `join join-item`, `list list-row
list-col-grow`, `badge`, `alert alert-soft`, `fieldset`, `footer`,
`link`, `text-error`. Use Tailwind utilities only for layout (`flex`,
`gap-*`, `max-w-*`). Faint text is `opacity-70`, not gray utilities —
hardcoded colors break the `dark` theme. Only `light` and `dark` are
enabled (`pages/app.css`); switching themes needs no code.

## celld

- No module-scope state across requests in production: every request reads
  fresh state. `fetch` handlers only.
- No Workers AI, Vectorize, or Cache bindings.
- Outbound traffic never reaches loopback, private ranges, link-local, or
  metadata addresses; SMTP ports 25/465/587 are blocked — send mail through
  an HTTP API with a secret.
- Stream large downloads instead of buffering them into memory.

## D1

`env.DB` is on by default (`void.config.ts`, `d1_databases`); Outer
provisions it on first deploy. Outer's deploy does NOT run migration files
— create tables in code, as `pages/index.server.ts` does:

```ts
import { env } from "cloudflare:workers";

await env.DB.prepare(
  "CREATE TABLE IF NOT EXISTS item (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)",
).run();
const text = "Milk"; // e.g. a trimmed form field from the action
await env.DB.prepare("INSERT INTO item (text) VALUES (?)").bind(text).run();
const { results } = await env.DB.prepare("SELECT id, text FROM item ORDER BY id").all();
```

`prepare()` takes one statement; `bind(...)` fills `?`; `all()` returns
`{ results }`, `first()` one row, `run()` writes. Verify against
https://void.cloud/guide/database and https://celld.dev/docs/services/d1/.

## PWA

Every app is installable: `vite-plugin-pwa` (`registerType: autoUpdate`,
`generateSW`) owns `manifest.webmanifest`, `sw.js`, and all icons, built
into `dist/client/` from the single source `public/favicon.svg` (`pwaAssets`
regenerates PNGs every build — never commit icon PNGs or a hand-written
manifest). The SSR app has no index.html, so `pages/_pwa.ts` registers the
SW on the client and `void.config.ts` `head` carries the manifest/icon
links. Never set `navigateFallback` or precache HTML: navigations go to the
network so reloads always show fresh D1 data. Rename the app via `manifest`
`name` in `vite.config.ts` + `head` `title`.

## Page text

No strong profanity in page text, seed data, or SQL string literals — the
pre-live gate reads rendered text and literals. A blocked deploy never goes
live; the previous version keeps serving. Fix the flagged lines and commit
again.
