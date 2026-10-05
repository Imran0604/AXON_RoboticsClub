"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { checkInAction, type CheckInResult } from "@/app/actions/admin";
import { REG_STATUS_LABEL, REG_STATUS_TONE } from "@/lib/types";

/**
 * Venue check-in.
 *
 * Two input paths on purpose. The camera is the fast one, but camera access
 * needs HTTPS and a permission grant and simply is not available in some
 * browsers — so manual code entry is always present and always works. A door
 * tool that can fail closed is not a door tool.
 */
export function Scanner({ initialCode }: { initialCode?: string }) {
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "error">("off");
  const [cameraError, setCameraError] = useState<string>("");
  const [manual, setManual] = useState(initialCode ?? "");
  const [history, setHistory] = useState<CheckInResult[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  function submit(code: string) {
    if (!code.trim()) return;
    startTransition(async () => {
      const r = await checkInAction(code);
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 8));
      if (navigator.vibrate) navigator.vibrate(r.ok ? 80 : [60, 50, 60]);
    });
  }

  // Check in automatically if the page was opened from a ticket link.
  useEffect(() => {
    if (initialCode) submit(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setCamera("starting");
    setCameraError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decoded: string) => {
          // One QR stays in frame for many frames; ignore repeats for 3s.
          const now = Date.now();
          if (decoded === lastScan.current.code && now - lastScan.current.at < 3000) return;
          lastScan.current = { code: decoded, at: now };
          submit(decoded);
        },
        () => {
          // Per-frame decode misses are normal; nothing to report.
        }
      );
      setCamera("on");
    } catch (e) {
      setCamera("error");
      setCameraError(
        e instanceof Error
          ? e.message
          : "The camera could not be started. Use manual entry below instead."
      );
    }
  }

  async function stopCamera() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // Already stopped — nothing to clean up.
    }
    setCamera("off");
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop?.().catch(() => {});
      }
    };
  }, []);

  const tone = result?.ok ? "ok" : result ? "crit" : "neutral";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ------------------------------------------------------------ input */}
      <div className="flex flex-col gap-4">
        <div className="card p-4">
          <h3 className="text-[0.9375rem] font-extrabold">Scan a QR pass</h3>
          <p className="mt-1 text-[0.8125rem] text-ink-2">
            Point the camera at the QR code on a participant&apos;s ticket.
          </p>

          <div
            id="qr-reader"
            className="mt-3 overflow-hidden rounded-sm"
            style={{
              background: "var(--surface-3)",
              minHeight: camera === "on" ? 240 : 0,
            }}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {camera === "on" ? (
              <button type="button" onClick={stopCamera} className="btn btn-ghost btn-sm">
                Stop camera
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="btn btn-primary btn-sm"
                disabled={camera === "starting"}
              >
                {camera === "starting" ? "Starting…" : "Start camera"}
              </button>
            )}
          </div>

          {camera === "error" && (
            <p className="err mt-2">
              {cameraError} Camera access needs HTTPS and permission — manual entry below always
              works.
            </p>
          )}
        </div>

        <div className="card p-4">
          <h3 className="text-[0.9375rem] font-extrabold">Or type the code</h3>
          <p className="mt-1 text-[0.8125rem] text-ink-2">
            Works without a camera. Ticket codes look like <code className="mono">AXN-K4D-9PQ</code>.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(manual);
            }}
            className="mt-3 flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              className="field mono flex-1 uppercase"
              placeholder="AXN-___-___"
              aria-label="Ticket code"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn-primary" disabled={pending || !manual.trim()}>
              {pending ? "Checking…" : "Check in"}
            </button>
          </form>
        </div>
      </div>

      {/* ----------------------------------------------------------- result */}
      <div className="flex flex-col gap-4">
        <div
          className="card flex min-h-[13rem] flex-col gap-3 p-5"
          style={
            result
              ? {
                  background: result.ok ? "var(--ok-soft)" : "var(--crit-soft)",
                  borderColor: result.ok ? "var(--ok)" : "var(--crit)",
                }
              : undefined
          }
          aria-live="polite"
        >
          {!result ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--ink-3)" strokeWidth="1.6" aria-hidden="true">
                <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" strokeLinecap="round" />
                <path d="M3 12h18" strokeLinecap="round" opacity="0.5" />
              </svg>
              <p className="text-[0.875rem] font-semibold text-ink-2">Waiting for a ticket</p>
              <p className="max-w-[16rem] text-[0.75rem] text-ink-3">
                Scan a QR pass or type a code. The result appears here with the participant&apos;s
                details.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                {result.ok ? (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--ok)" strokeWidth="2.2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M7.5 12.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--crit)" strokeWidth="2.2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 7.5v6M12 16.5v.5" strokeLinecap="round" />
                  </svg>
                )}
                <p
                  className="text-[1.0625rem] font-extrabold"
                  style={{ color: result.ok ? "var(--ok)" : "var(--crit)" }}
                >
                  {result.message}
                </p>
              </div>

              {result.detail ? (
                <dl className="flex flex-col gap-2.5 border-t pt-3" style={{ borderColor: "var(--line)" }}>
                  <div>
                    <dt className="eyebrow">Participant</dt>
                    <dd className="text-[1.0625rem] font-bold">{result.detail.name}</dd>
                    {result.detail.institution && (
                      <dd className="text-[0.8125rem] text-ink-2">{result.detail.institution}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="eyebrow">Event</dt>
                    <dd className="text-[0.875rem] font-semibold">{result.detail.event}</dd>
                  </div>
                  {result.detail.team && (
                    <div>
                      <dt className="eyebrow">Team</dt>
                      <dd className="text-[0.875rem]">{result.detail.team}</dd>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${REG_STATUS_TONE[result.detail.status]}`}>
                      {REG_STATUS_LABEL[result.detail.status]}
                    </span>
                    <code className="mono text-[0.75rem] text-ink-2">{result.detail.code}</code>
                  </div>
                  {result.detail.alreadyAt && (
                    <p className="mono text-[0.75rem] text-ink-2">
                      First checked in at {new Date(result.detail.alreadyAt).toLocaleString("en-GB")}
                    </p>
                  )}
                </dl>
              ) : (
                <p className="text-[0.8125rem] text-ink-2">
                  Check the code and try again, or search for the participant by name in the
                  participants table.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setManual("");
                }}
                className="btn btn-ghost btn-sm mt-auto self-start"
              >
                Scan the next one
              </button>
            </>
          )}
        </div>

        {history.length > 0 && (
          <div className="card p-4">
            <p className="eyebrow">This session</p>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {history.map((h, i) => (
                <li key={i} className="flex items-center gap-2 text-[0.8125rem]">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: h.ok ? "var(--ok)" : "var(--crit)" }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {h.detail?.name ?? "Unknown ticket"}
                    <span className="text-ink-3"> · {h.detail?.event ?? h.message}</span>
                  </span>
                  <span className="mono shrink-0 text-[0.625rem]" style={{ color: h.ok ? "var(--ok)" : "var(--crit)" }}>
                    {h.ok ? "IN" : "NO"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
