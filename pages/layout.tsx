import { Link } from "@ilha/void";
import type { View } from "ilha";

import "./app.css";
// /guide/auto-update (SSR/SSG): no index.html entry point, so register the
// service worker via dynamic import guarded by `typeof window` — this never
// runs during server rendering, only in the hydrated client.
if (typeof window !== "undefined") {
  import("./_pwa");
}

export default function Layout({ children }: { children?: View }) {
  return (
    <div class="flex min-h-screen flex-col">
      <header class="navbar bg-base-100 shadow-sm">
        <div class="mx-auto w-full max-w-2xl px-4">
          <Link href="/" class="btn btn-ghost px-2 text-lg">
            Outer App
          </Link>
        </div>
      </header>
      <main class="mx-auto w-full max-w-2xl grow px-4 py-8">{children}</main>
      <footer class="footer footer-center bg-base-200 p-4 text-sm">
        <p>
          Built with{" "}
          <a class="link" href="https://ilha.build">
            Ilha
          </a>
        </p>
      </footer>
    </div>
  );
}
