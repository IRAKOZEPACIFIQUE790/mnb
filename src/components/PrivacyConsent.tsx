import { useEffect, useState } from 'react';

interface PrivacyConsentProps {
  onAccept: () => void;
}

const STORAGE_KEY = 'screencast-privacy-accepted';

export function PrivacyConsent({ onAccept }: PrivacyConsentProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      setVisible(true);
    } else {
      onAccept();
    }
  }, [onAccept]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    onAccept();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Privacy & Consent</h2>
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            ScreenCast Studio uses your browser's built-in screen capture API. Before you begin,
            please understand the following:
          </p>
          <ul className="space-y-2 pl-5">
            <li className="list-disc">
              Your browser will ask you to choose which screen, window, or tab to share. You are
              always in control of what is recorded.
            </li>
            <li className="list-disc">
              Recordings are stored <strong className="text-white">locally on your device</strong>{' '}
              in your browser's storage. They are not uploaded to any external server.
            </li>
            <li className="list-disc">
              Only metadata (title, duration, tags, notes) is synced to the cloud so your library
              follows you across sessions. The actual video files never leave your device.
            </li>
            <li className="list-disc">
              You are responsible for obtaining consent from anyone visible or audible in your
              recordings before sharing them.
            </li>
          </ul>
        </div>

        <button
          onClick={handleAccept}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition-all hover:from-rose-600 hover:to-orange-600 hover:shadow-rose-500/30 active:scale-[0.98]"
        >
          I Understand — Continue
        </button>
      </div>
    </div>
  );
}
