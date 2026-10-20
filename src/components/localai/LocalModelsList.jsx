import { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { IS_LOCAL } from '@/desktop/isLocal';
import { runningModels } from '@/lib/localAi';

// Models currently running on the connected local AI server
export default function LocalModelsList({ refresh }) {
  const [models, setModels] = useState(IS_LOCAL ? [] : ['qwen3:8b']);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!IS_LOCAL) return;
    const detect = () => runningModels()
      .then((m) => { setModels(m); setError(''); })
      .catch(() => { setModels([]); setError('No local AI server found. Start Ollama or LM Studio and load a model.'); });
    detect();
    const t = setInterval(detect, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  if (error) return <p className="text-xs text-muted-foreground">{error}</p>;
  if (!models.length) return <p className="text-xs text-muted-foreground">No model is running. Load one and it will appear here.</p>;
  return (
    <div className="bg-card border border-border rounded-2xl divide-y divide-border">
      {models.map((m) => (
        <div key={m} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <Cpu className="w-4 h-4 text-primary" />
          <span className="flex-1 truncate">{m}</span>
          <span className="text-xs text-primary">Connected</span>
        </div>
      ))}
    </div>
  );
}