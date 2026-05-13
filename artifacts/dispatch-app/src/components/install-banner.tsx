import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

const DISMISSED_KEY = "mxihub_install_dismissed";
const DISMISS_DAYS = 30;

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_DAYS * 86400_000;
  } catch {
    return false;
  }
}

function dismiss() {
  try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* noop */ }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      if (!isDismissed()) {
        setTimeout(() => setVisible(true), 1800);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setVisible(false);
      setInstalled(true);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setInstalled(true);
    }
    setPromptEvent(null);
  }

  function handleDismiss() {
    dismiss();
    setVisible(false);
  }

  if (installed || !visible || !promptEvent) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-safe"
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

        <div className="flex items-center gap-3 p-4">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            <span className="text-teal-900">M</span>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-tight">Maxi Hub TT</p>
            <p className="text-teal-300 text-xs mt-0.5 leading-snug">
              Add to home screen for quick booking &amp; driver access
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="text-teal-500 hover:text-white transition-colors shrink-0 p-1 -mr-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleDismiss}
            className="flex-1 h-10 rounded-xl border border-white/15 text-teal-300 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 h-10 rounded-xl font-black text-teal-900 text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
