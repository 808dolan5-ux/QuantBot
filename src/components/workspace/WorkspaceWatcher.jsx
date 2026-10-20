import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { getKeyStatus } from '@/lib/quantApi';
import { defaultModel } from '@/lib/models';
import { testAllMarkets } from '@/lib/backtest/testAll';
import { ws } from '@/lib/workspace';
import { IS_LOCAL } from '@/desktop/isLocal';

// Desktop only: backtests every script an agent drops in the project folder's inbox/ on all markets
async function processInbox() {
  const files = await ws('scan');
  if (!files.length) return;
  const [user, status] = await Promise.all([base44.auth.me(), getKeyStatus()]);
  const model = status?.anthropic?.linked || status?.google?.linked ? defaultModel(status, user) : 'builtin';
  for (const f of files) {
    const model = f.sub ? f.sub.split('/')[1] : '';
    const name = (model ? `${model} ` : '') + f.file.replace(/\.(mq5|pine)$/i, '');
    const script = { code: f.code, language: /\.pine$/i.test(f.file) ? 'Pine' : 'MT5' };
    const t = toast({ title: `Backtesting ${f.file} from the project folder...` });
    const { md, json: out } = await testAllMarkets(name, script, model);
    if (f.backtester) await ws('finishBackTester', f.file, md, out, f.sub, f.mtime);
    else await ws('finish', f.file, md, out, f.sub);
    t.update({ id: t.id, title: `${f.file} tested, results written` });
  }
}

export default function WorkspaceWatcher() {
  useEffect(() => {
    if (!IS_LOCAL) return;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      busy = true;
      try { await processInbox(); } finally { busy = false; }
    }, 4000);
    return () => clearInterval(timer);
  }, []);
  return null;
}