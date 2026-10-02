import { Monitor, Library, Table2 } from 'lucide-react';
import type { Tab } from '@/lib/types';

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  recordingCount: number;
}

export function Header({ activeTab, onTabChange, recordingCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/20">
            <Monitor className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
              ScreenCast Studio
            </h1>
            <p className="hidden text-xs text-slate-400 sm:block">
              Capture, manage, and replay your screen
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/50 p-1">
          <button
            onClick={() => onTabChange('studio')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:px-4 ${
              activeTab === 'studio'
                ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Studio</span>
          </button>
          <button
            onClick={() => onTabChange('data')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:px-4 ${
              activeTab === 'data'
                ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">Number Log</span>
          </button>
          <button
            onClick={() => onTabChange('library')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 sm:px-4 ${
              activeTab === 'library'
                ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
            {recordingCount > 0 && (
              <span
                className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                  activeTab === 'library'
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {recordingCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
