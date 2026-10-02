import { useCallback, useState } from 'react';
import { Header } from '@/components/Header';
import { RecordingStudio } from '@/components/RecordingStudio';
import { RecordingsLibrary } from '@/components/RecordingsLibrary';
import { CapturedNumbersLibrary } from '@/components/CapturedNumbersLibrary';
import { PrivacyConsent } from '@/components/PrivacyConsent';
import { useRecordings } from '@/lib/useRecordings';
import type { Tab } from '@/lib/types';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('studio');
  const [consentAccepted, setConsentAccepted] = useState(false);

  const {
    recordings,
    loading,
    error,
    deleteRecording,
    updateRecording,
    getRecordingVideoUrl,
    getCapturedNumbers,
    refresh,
  } = useRecordings();

  const handleSaved = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-rose-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-sky-500/5 blur-3xl" />
      </div>

      <div className="relative">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          recordingCount={recordings.length}
        />

        <main>
          {activeTab === 'studio' && consentAccepted && (
            <RecordingStudio onSaved={handleSaved} />
          )}
          {activeTab === 'library' && (
            <RecordingsLibrary
              recordings={recordings}
              loading={loading}
              error={error}
              onDelete={deleteRecording}
              onUpdate={updateRecording}
              getVideoUrl={getRecordingVideoUrl}
              getCapturedNumbers={getCapturedNumbers}
              onRefresh={refresh}
            />
          )}
          {activeTab === 'data' && (
            <CapturedNumbersLibrary
              recordings={recordings}
              getCapturedNumbers={getCapturedNumbers}
            />
          )}
        </main>

        {!consentAccepted && (
          <PrivacyConsent onAccept={() => setConsentAccepted(true)} />
        )}
      </div>
    </div>
  );
}

export default App;
