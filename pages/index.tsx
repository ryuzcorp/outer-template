import { Form, useForm } from "@ilha/void";
import { atom, watch } from "ilha";

import type { Props } from "./index.server.ts";

export default function Home({ todos }: Props) {
  const form = useForm("/" as string, { text: "" });
  // The form is server-rendered in place, but its controlled input and
  // submit handler exist only after the client hydrates: a fill or click
  // before that is lost. The controls stay disabled until then.
  const mounted = atom(false);
  watch.once(() => {
    if (typeof window === "undefined") {
      return;
    }
    mounted.set(true);
  });
  return (
    <div class="flex flex-col gap-6">
      <header class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold">Todos</h1>
        <p class="text-sm opacity-70">
          Rendered on the server by the loader in <code>pages/index.server.ts</code>. Edit{" "}
          <code>pages/index.tsx</code>, then commit to deploy.
        </p>
      </header>

      <section class="card bg-base-100 shadow-sm">
        <div class="card-body gap-4">
          <ul class="list flex flex-col gap-1">
            {todos.map((todo) => (
              <li key={todo.id} class="list-row items-center">
                {todo.text}
              </li>
            ))}
          </ul>
          <fieldset disabled={!mounted()} class="m-0 min-w-0 border-0 p-0">
            <Form form={form} class="join w-full">
              <input
                name="text"
                aria-label="New todo"
                placeholder="Something to do"
                value={form.data.text}
                oninput={(event) => form.setData("text", event.currentTarget.value)}
                class="input join-item grow"
              />
              <button type="submit" disabled={form.pending} class="btn btn-primary join-item">
                Add
              </button>
            </Form>
          </fieldset>
          {form.errors.text ? <p class="text-sm text-error">{form.errors.text}</p> : null}
          <p class="text-sm opacity-70">
            Adding one calls the server action in <code>pages/index.server.ts</code> — it runs in
            the Worker, never in the browser.
          </p>
        </div>
      </section>
    </div>
  );
}
