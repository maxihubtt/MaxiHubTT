import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

const DISMISSED_KEY = "mxihub_install_dismissed";
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_DAYS * 86400_000;
  } catch { return false; }
}

function dismiss() {
  try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* noop */ }
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (isDismissed()) return;

    if (isIOS()) {
      setMode("ios");
      setTimeout(() => setVisible(true), 2000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setMode("android");
      setTimeout(() => setVisible(true), 1800);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setVisible(false));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setVisible(false);
    setPromptEvent(null);
  }

  function handleDismiss() {
    dismiss();
    setVisible(false);
  }

  if (!visible || !mode) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div
        className="mx-auto max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f3d2e 0%, #0a2e21 100%)",
          animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(120%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        <div className="flex items-center gap-3 p-4 pb-2">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            <span className="text-teal-900">M</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-tight">Install Maxi Hub TT</p>
            {mode === "ios" ? (
              <p className="text-teal-300 text-xs mt-0.5 leading-snug">
                Tap <Share className="inline w-3 h-3 mb-0.5 text-blue-400" /> Share, then <strong className="text-white">"Add to Home Screen"</strong>
              </p>
            ) : (
              <p className="text-teal-300 text-xs mt-0.5 leading-snug">
                Add to your home screen for quick access
              </p>
            )}
          </div>
          <button onClick={handleDismiss} className="text-teal-500 hover:text-white transition-colors shrink-0 p-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-4 pt-2">
          <button
            onClick={handleDismiss}
            className="flex-1 h-10 rounded-xl border border-white/15 text-teal-300 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            Not now
          </button>
          {mode === "android" && (
            <button
              onClick={handleInstall}
              className="flex-1 h-10 rounded-xl font-black text-teal-900 text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}
          {mode === "ios" && (
            <div
              className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 font-black text-teal-900 text-sm"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              <Share className="w-3.5 h-3.5" />
              Tap Share
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
