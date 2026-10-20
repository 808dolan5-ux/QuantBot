import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import VersionPills from '@/components/tester/report/VersionPills';
import ChartLoader from '@/components/quant/ChartLoader';
import SessionHeader from './SessionHeader';
import SavedRunReport from './SavedRunReport';

export default function SessionDetail({ session }) {
  const [runs, setRuns] = useState(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const opts = { sort: 'version', limit: 100 };
    // Older runs were saved without a session link; match them by bot name instead
    base44.entities.StrategyRun.filter({ session_id: session.id }, opts).then((page) => (
      page.items.length ? page : base44.entities.StrategyRun.filter({ bot_name: session.bot_name, session_id: { $exists: false } }, opts)
    )).then((page) => {
      setRuns(page.items);
      setIdx(page.items.length - 1);
    });
  }, [session.id]);

  const run = runs?.[idx];
  return (
    <div className="max-w-6xl space-y-4">
      <SessionHeader session={session} />
      {!runs && <div className="flex justify-center py-10"><ChartLoader className="w-20 h-12" /></div>}
      {runs && !runs.length && <p className="text-sm text-muted-foreground">No versions were saved in this session.</p>}
      {run && (
        <>
          <VersionPills runs={runs} activeIdx={idx} onSelect={setIdx} />
          <SavedRunReport key={run.id} run={run} balance={session.balance} />
        </>
      )}
    </div>
  );
}