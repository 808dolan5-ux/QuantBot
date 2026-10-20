import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { IS_LOCAL } from '@/desktop/isLocal';
import { ws } from '@/lib/workspace';
import { runningModels } from '@/lib/localAi';
import ServerCard from '@/components/localai/ServerCard';
import ModelCard from '@/components/localai/ModelCard';

export default function LocalAi() {
  const [folder, setFolder] = useState('');
  const [models, setModels] = useState([]);
  const [error, setError] = useState('');

  const detect = async () => {
    setError('');
    try { setModels(await runningModels()); } catch { setModels([]); setError('No local AI server found at that address. Start Ollama or LM Studio and load a model.'); }
  };
  useEffect(() => {
    if (!IS_LOCAL) return;
    ws('get').then((c) => setFolder(c.folder));
    detect();
    const t = setInterval(detect, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-md hover:bg-accent"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="font-heading text-xl font-semibold">Local AI</h1>
        </div>
        <p className="text-xs text-muted-foreground">Every model running on this PC gets its own folder with all market data, stats and heatmaps. Scripts it writes are backtested on every market automatically.</p>
        {!IS_LOCAL ? <p className="text-sm text-primary">Available in the QuantBot desktop app.</p> : !folder ? (
          <p className="text-sm">Set the agent project folder in <Link to="/settings" className="text-primary underline">Settings</Link> first.</p>
        ) : (
          <>
            <ServerCard onSaved={detect} />
            {error && <p className="text-sm text-muted-foreground">{error}</p>}
            {!error && !models.length && <p className="text-sm text-muted-foreground">No model is running. Load one and it will appear here.</p>}
            {models.map((m) => <ModelCard key={m} model={m} folder={folder} />)}
          </>
        )}
      </div>
    </div>
  );
}