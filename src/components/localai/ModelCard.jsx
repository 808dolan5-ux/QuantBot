import { useState } from 'react';
import { Loader2, FolderCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { writeScript, modelDir, ensureModelFolder } from '@/lib/localAi';

export default function ModelCard({ model, folder }) {
  const [language, setLanguage] = useState('MT5');
  const [idea, setIdea] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const run = async () => {
    setBusy(true); setMsg('');
    try {
      await ensureModelFolder(model);
      const file = await writeScript(model, language, idea);
      setMsg(`Saved ${file}. Backtesting now, results replace it in the inbox.`);
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div>
        <h3 className="font-medium">{model}</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1"><FolderCheck className="w-3.5 h-3.5 text-primary" />{folder}\{modelDir(model).replace(/\//g, '\\')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-36 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="MT5">MT5</SelectItem><SelectItem value="Pine">TradingView</SelectItem></SelectContent>
        </Select>
        <Input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Strategy idea (optional)" className="flex-1 min-w-48 bg-background" />
        <Button onClick={run} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Write & test script'}</Button>
      </div>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}