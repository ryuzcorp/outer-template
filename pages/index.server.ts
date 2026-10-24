import { env } from "cloudflare:workers";
import { defineHandler } from "void";
import type { InferProps } from "void";

export interface Item {
  id: number;
  text: string;
}

// D1 is the app's database. Outer's deploy runs no migration files, so the
// table is created here, on first use. Nothing is kept in module scope: the
// app can sleep between requests, and only D1 survives.
async function database() {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS item (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)",
  ).run();
  return env.DB;
}

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const db = await database();
  const { results } = await db.prepare("SELECT id, text FROM item ORDER BY id").all<Item>();
  return { items: results ?? [] };
});

// One action per page; `intent` says which form sent it.
export const action = defineHandler(async (c) => {
  const body = await c.req.json<{ intent?: string; text?: string; id?: number }>();
  const db = await database();
  if (body.intent === "add") {
    const text = body.text?.trim() ?? "";
    if (!text) {
      return c.json({ errors: { text: "Write something first." } }, 422);
    }
    await db.prepare("INSERT INTO item (text) VALUES (?)").bind(text.slice(0, 200)).run();
  } else if (body.intent === "remove" && Number.isInteger(body.id)) {
    await db.prepare("DELETE FROM item WHERE id = ?").bind(body.id).run();
  }
  // Return nothing: Void re-runs the loader and answers with the page JSON
  // (`X-VoidPages`), which the client applies in place. Returning data here
  // would bypass the pages protocol and force a full-page reload.
});
