import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Square, Play } from 'lucide-react';
import { runningModels } from '@/lib/localAi';
import { runAgent } from '@/lib/agentLoop';
import AgentLog from '@/components/localai/AgentLog';

// Runs several copies of a local model, each writing, backtesting and fixing scripts in its own folder
export default function AgentTeamCard() {
  const [models, setModels] = useState([]);
  const [cfg, setCfg] = useState({ model: '', count: '2', language: 'MT5', idea: '', steps: '30' });
  const [logs, setLogs] = useState({});
  const [running, setRunning] = useState(false);
  const stop = useRef(false);
  const set = (k) => (v) => setCfg((c) => ({ ...c, [k]: v }));

  useEffect(() => { runningModels().then((m) => { setModels(m); if (m[0]) set('model')(m[0]); }).catch(() => {}); }, []);

  const start = async () => {
    stop.current = false; setRunning(true); setLogs({});
    const add = (n) => (line) => setLogs((l) => ({ ...l, [n]: [...(l[n] || []), line].slice(-40) }));
    await Promise.all(Array.from({ length: Number(cfg.count) }, (_, k) => runAgent({
      model: cfg.model, n: k + 1, language: cfg.language, idea: cfg.idea, steps: Number(cfg.steps),
      onLog: add(k + 1), stopped: () => stop.current,
    }).catch((e) => add(k + 1)(`Error: ${e.message}`))));
    setRunning(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4 text-primary" /> Agent team</div>
      <p className="text-sm text-muted-foreground">Each agent gets its own folder, writes and deletes files, backtests its script and keeps fixing it.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Select value={cfg.model} onValueChange={set('model')}><SelectTrigger><SelectValue placeholder="Running model" /></SelectTrigger>
          <SelectContent>{models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        <Select value={cfg.count} onValueChange={set('count')}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{['1', '2', '3', '4'].map((c) => <SelectItem key={c} value={c}>{c} agent{c > 1 ? 's' : ''}</SelectItem>)}</SelectContent></Select>
        <Select value={cfg.language} onValueChange={set('language')}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="MT5">MQL5</SelectItem><SelectItem value="Pine">Pine</SelectItem></SelectContent></Select>
        <Input type="number" min="5" max="200" value={cfg.steps} onChange={(e) => set('steps')(e.target.value)} placeholder="Max steps" />
      </div>
      <Input value={cfg.idea} onChange={(e) => set('idea')(e.target.value)} placeholder="Strategy idea (optional)" autoComplete="off" />
      {running
        ? <Button variant="outline" onClick={() => { stop.current = true; }}><Square className="h-4 w-4 mr-2" />Stop after current step</Button>
        : <Button disabled={!cfg.model} onClick={start}><Play className="h-4 w-4 mr-2" />Start agents</Button>}
      {!models.length && <p className="text-xs text-muted-foreground">No running model found. Start one in Ollama first.</p>}
      <AgentLog logs={logs} />
    </div>
  );
}