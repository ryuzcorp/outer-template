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
- `pages/index.server.ts` — loader + action. They run in the Worker.
- `pages/layout.tsx` — wraps every page. Its footer links
  https://ilha.build; removable.
- `pages/app.css` — Tailwind + daisyUI (`light` default, `dark` for
  `prefers-color-scheme`).
- `void.config.ts` — Worker name, document `head`, bindings. Edits need
  `bun run build` (bindings and `head` are read from the built config).
- `public/manifest.webmanifest`, `public/favicon.svg` — linked from `head`
  in `void.config.ts`.

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

```ts
// pages/index.server.ts
import { defineHandler } from "void";
import type { InferProps } from "void";

export type Props = InferProps<typeof loader>;
export const loader = defineHandler(() => ({ todos: ["Ship it"] }));
export const action = defineHandler(async (c) => {
  const { text } = await c.req.json<{ text?: string }>();
  if (!text?.trim()) {
    return c.json({ errors: { text: "Write something first." } }, 422);
  }
  // ...mutate, then return nothing: Void re-runs the loader and applies
  // the page JSON in place. Returning data forces a full reload.
});
```

```tsx
import { Form, useForm } from "@ilha/void";

const form = useForm("/", { text: "" });
// form.data.text, form.setData("text", v), form.errors.text, form.pending
```

- `422` with `{ errors: { field: "message" } }` fills the form's errors.
- `Link` from `@ilha/void` navigates without a reload:
  `<Link href="/about" prefetch>About</Link>`. `<a>` attributes pass
  through; `class` works.

## daisyUI

Use component classes: `btn btn-primary`, `card card-body`, `input`,
`join join-item`, `navbar`, `footer footer-center`, `list list-row`,
`link`, `text-error`. Faint text is `opacity-70`, not gray utilities —
hardcoded grays break the `dark` theme. Only `light` and `dark` themes
are enabled (`pages/app.css`); switching themes needs no code.

## celld

- No module-scope state across requests in production: every request reads
  fresh state. `fetch` handlers only.
- No Workers AI, Vectorize, or Cache bindings.
- Outbound traffic never reaches loopback, private ranges, link-local, or
  metadata addresses; SMTP ports 25/465/587 are blocked — send mail through
  an HTTP API with a secret.
- Stream large downloads instead of buffering them into memory.

## D1

Uncomment `d1_databases` in `void.config.ts` and rebuild. Outer's deploy
does NOT run migration files — create tables in code with `exec`:

```ts
import { env } from "cloudflare:workers";

await env.DB.exec(`CREATE TABLE IF NOT EXISTS item (
  id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL)`);
await env.DB.prepare("INSERT INTO item (label) VALUES (?)").bind(label.trim()).run();
const { results } = await env.DB.prepare("SELECT id, label FROM item ORDER BY id").all();
```

`prepare()` takes one statement; `bind(...)` fills `?`; `all()` returns
`{ results }`, `first()` one row, `run()` writes. Verify against
https://void.cloud/guide/database and https://celld.dev/docs/services/d1/.

## Page text

No strong profanity in page text, seed data, or SQL string literals — the
pre-live gate reads rendered text and literals. A blocked deploy never goes
live; the previous version keeps serving. Fix the flagged lines and commit
again.
