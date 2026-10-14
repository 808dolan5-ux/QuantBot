export default function VersionPills({ runs, activeIdx, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {runs.map((r, k) => (
        <button
          key={r.id} onClick={() => onSelect(k)}
          className={`px-3 py-1.5 rounded-lg border text-xs ${k === activeIdx ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
        >
          <span className="font-semibold">v{r.version}</span>
          <span className={`ml-2 ${r.metrics.net >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
            {r.metrics.net >= 0 ? '+' : ''}{r.metrics.net.toFixed(0)}$
          </span>
          <span className="ml-2 text-muted-foreground">{r.metrics.trades} trades</span>
        </button>
      ))}
    </div>
  );
}