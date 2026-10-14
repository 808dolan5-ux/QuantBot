import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const updates = typeof window !== 'undefined' ? window.quantbotLocal?.updates : null;

// Desktop only: installed build vs the newest GitHub release, plus the token a private repo needs
export default function UpdatesCard() {
  const [status, setStatus] = useState(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (updates) updates('check').then(setStatus); }, []);
  if (!updates) return null;

  const run = async (method, arg) => {
    setBusy(true);
    setStatus(await updates(method, arg));
    setBusy(false);
  };
  const newer = status && status.latest > status.build;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Updates from GitHub</h3>
          <p className="text-xs text-muted-foreground">
            {!status ? 'Checking…' : `Build ${status.build} installed${status.latest ? ` · newest is build ${status.latest}` : ''}`}
          </p>
        </div>
        {newer
          ? <Button size="sm" onClick={() => updates('restart')}>Restart to update</Button>
          : <Button size="sm" variant="outline" disabled={busy} onClick={() => run('check')}>Check now</Button>}
      </div>
      {status?.error && <p className="text-xs text-red-400">{status.error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); run('setToken', token.trim()).then(() => setToken('')); }} className="flex gap-2">
        <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off"
          placeholder={status?.hasToken ? 'Token saved on this PC' : 'GitHub token with read access to the repo'} />
        <Button type="submit" variant="outline" disabled={!token.trim() || busy}>Save</Button>
      </form>
      <p className="text-[11px] text-muted-foreground">
        Needed while the repo is private: a fine-grained GitHub token with read-only Contents access to it. Stored encrypted on this PC.
      </p>
    </div>
  );
}