import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ws, exportWorkspaceData } from '@/lib/workspace';
import { IS_LOCAL } from '@/desktop/isLocal';

// Desktop only: project folder that Claude Code, Codex or Antigravity open
export default function WorkspaceCard() {
  const [folder, setFolder] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (IS_LOCAL) ws('get').then((c) => { setFolder(c.folder); setSaved(c.folder); }); }, []);

  const save = async () => {
    setBusy(true); setMsg('');
    try {
      const c = await ws('set', folder);
      setSaved(c.folder);
      if (c.folder) { await exportWorkspaceData(); setMsg('Market data, stats and agent instructions written.'); }
    } catch (e) { setMsg(e.response?.data?.error || e.message); }
    setBusy(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="font-medium">Agent project folder</h3>
        <p className="text-xs text-muted-foreground">Open this folder in Claude Code, Codex or Antigravity. Scripts saved to <code>inbox/</code> are backtested on every market and replaced with their results.</p>
      </div>
      {!IS_LOCAL && <p className="text-xs text-primary">Available in the QuantBot desktop app, since it reads and writes a folder on your PC.</p>}
      <div className="flex gap-2">
        <Input disabled={!IS_LOCAL} value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="C:\Users\you\QuantBotProject" className="bg-background" />
        <Button onClick={save} disabled={busy || !IS_LOCAL}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : saved && saved === folder ? 'Refresh data' : 'Save'}</Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}