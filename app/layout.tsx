import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Logo } from "@/components/Logo";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "AXON Robotics Club — Fests, Events & Registration",
    template: "%s · AXON Robotics Club",
  },
  description:
    "The AXON Robotics Club platform. Browse festivals, explore events, register in one place, and manage the whole operation from a single dashboard — no third-party forms.",
  openGraph: {
    title: "AXON Robotics Club",
    description:
      "Browse fests, explore events and register — the club operations platform built for the 9th DRMC International Tech Carnival.",
    type: "website",
    url: SITE,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0b0a",
};

/**
 * Dark is the default, so this script only has to stamp the root when the
 * visitor has explicitly chosen light. It must run before first paint —
 * otherwise a light-mode visitor sees a dark flash on every navigation.
 */
const NO_FLASH = `
try {
  if (localStorage.getItem('axon-theme') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-color-scheme="dark" className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Nav />
        <main className="flex-1">{children}</main>

        <footer className="mt-auto border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-[84rem] px-5 py-10">
            <div className="flex flex-col gap-8 md:flex-row md:justify-between">
              <div className="max-w-sm">
                <div className="flex items-center gap-2.5">
                  <Logo size={26} />
                  <span className="text-[0.9375rem] font-extrabold tracking-[0.04em]">AXON</span>
                </div>
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-2">
                  The robotics society of Dhaka Residential Model College. We build autonomous
                  machines, run competitions, and teach anyone who turns up how to solder.
                </p>
                <p className="eyebrow mt-4">Signals into motion</p>
              </div>

              <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3">
                <nav className="flex flex-col gap-2" aria-label="Browse">
                  <span className="eyebrow">Browse</span>
                  <Link href="/fests" className="text-[0.8125rem] text-ink-2 hover:text-ink">
                    All fests
                  </Link>
                  <Link href="/events" className="text-[0.8125rem] text-ink-2 hover:text-ink">
                    All events
                  </Link>
                  <Link href="/events?open=1" className="text-[0.8125rem] text-ink-2 hover:text-ink">
                    Open for registration
                  </Link>
                </nav>
                <nav className="flex flex-col gap-2" aria-label="Account">
                  <span className="eyebrow">Account</span>
                  <Link href="/login" className="text-[0.8125rem] text-ink-2 hover:text-ink">
                    Sign in
                  </Link>
                  <Link href="/signup" className="text-[0.8125rem] text-ink-2 hover:text-ink">
                    Create account
                  </Link>
                  <Link href="/me/registrations" className="text-[0.8125rem] text-ink-2 hover:text-ink">
                    My registrations
                  </Link>
                </nav>
                <nav className="flex flex-col gap-2" aria-label="Project">
                  <span className="eyebrow">Project</span>
                  <Link href="/judge" className="text-[0.8125rem] text-ink-2 hover:text-ink">
                    For judges
                  </Link>
                  <a
                    href="https://github.com/Imran0604/AXON_RoboticsClub"
                    className="text-[0.8125rem] text-ink-2 hover:text-ink"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source on GitHub
                  </a>
                </nav>
              </div>
            </div>

            <div className="mt-9 flex flex-col gap-2 border-t border-line pt-6 text-[0.75rem] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="mono">
                Built for the 9th DRMC International Tech Carnival 2026 · AI Web Development Contest
              </p>
              <p className="mono">MIT Licensed · Sample data is fictional</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
