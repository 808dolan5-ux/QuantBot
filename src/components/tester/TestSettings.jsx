import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fmt = (iso) => (iso ? iso.slice(0, 10) : '?');

export default function TestSettings({ cfg, set, datasets }) {
  const ds = datasets.find((d) => d.id === cfg.datasetId);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Bot name (tracks unseen data)</span>
          <Input value={cfg.botName} onChange={(e) => set('botName', e.target.value)} placeholder="e.g. Gold EMA Scalper" className="bg-card" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Market data</span>
          <Select value={cfg.datasetId || undefined} onValueChange={(v) => set('datasetId', v)}>
            <SelectTrigger className="bg-card"><SelectValue placeholder={datasets.length ? 'Pick a market' : 'Loading...'} /></SelectTrigger>
            <SelectContent>
              {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.symbol} {d.timeframe} ({d.source})</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Starting balance ($)</span>
          <Input type="number" min={100} value={cfg.balance} onChange={(e) => set('balance', Number(e.target.value) || 0)} className="bg-card" />
        </label>
      </div>
      {cfg.windowId === 'custom' && (
        <div className="flex flex-wrap items-center gap-3">
          <Input type="date" min="2024-01-01" value={cfg.customFrom} onChange={(e) => set('customFrom', e.target.value)} className="w-44 bg-card" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" min="2024-01-01" value={cfg.customTo} onChange={(e) => set('customTo', e.target.value)} className="w-44 bg-card" />
        </div>
      )}
      {ds && <p className="text-xs text-muted-foreground">{ds.symbol} data available {fmt(ds.start)} to {fmt(ds.end)} ({ds.bars?.toLocaleString()} bars). Unseen windows never go before 2024.</p>}
    </div>
  );
}