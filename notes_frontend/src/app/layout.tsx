import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secure Notes (Retro)",
  description:
    "A retro-themed secure notes app with markdown, tags, and autosave.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="min-h-screen">
          <div className="container">
            <header className="panel scanlines px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl border border-[color:var(--border)] bg-[rgba(6,182,212,0.12)] grid place-items-center font-bold">
                    SN
                  </div>
                  <div>
                    <div className="text-base font-semibold">Secure Notes</div>
                    <div className="text-xs text-[color:var(--muted)]">
                      Private markdown notes • tags • autosave
                    </div>
                  </div>
                </div>
                <nav className="flex items-center gap-2 text-sm">
                  <a className="btn secondary" href="#/login">
                    Log in
                  </a>
                  <a className="btn" href="#/signup">
                    Sign up
                  </a>
                </nav>
              </div>
            </header>

            <main className="mt-4">{children}</main>

            <footer className="mt-6 pb-8 text-xs text-[color:var(--muted)]">
              Tip: Use <span className="kbd">Ctrl</span> +{" "}
              <span className="kbd">K</span> to focus search.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
