import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { IS_LOCAL } from '@/desktop/isLocal';
import { ws } from '@/lib/workspace';
import { runningModels, ensureModelFolder } from '@/lib/localAi';

// Desktop only: as soon as a local AI model is running, gives it its own folder with all the market data
export default function LocalAiWatcher() {
  useEffect(() => {
    if (!IS_LOCAL) return;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        if (!(await ws('get')).folder) return;
        for (const m of await runningModels()) {
          if (await ensureModelFolder(m)) toast({ title: `Created a data folder for ${m}` });
        }
      } catch { /* local AI server not running */ } finally { busy = false; }
    };
    check();
    const timer = setInterval(check, 15000);
    return () => clearInterval(timer);
  }, []);
  return null;
}