// One heatmap grid: green/red around a center for signed metrics, primary shade for magnitudes
export default function Heatmap({ map }) {
  const center = map.center || 0;
  const all = map.values.flat().filter((v) => v !== null);
  const span = Math.max(...all.map((v) => Math.abs(v - center)), 1e-9);
  const color = (v) => {
    if (v === null) return 'hsl(var(--muted))';
    const a = Math.min(Math.abs(v - center) / span, 1) * 0.9 + 0.08;
    if (!map.diverging) return `hsl(var(--primary) / ${a})`;
    return v >= center ? `hsl(142 70% 45% / ${a})` : `hsl(0 72% 51% / ${a})`;
  };
  const cols = `3rem repeat(${map.cols.length}, minmax(1.6rem, 1fr))`;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">{map.title}{map.unit && <span className="text-muted-foreground font-normal"> ({map.unit})</span>}</h3>
      <div className="overflow-x-auto">
        <div className="grid gap-0.5 min-w-max text-[10px]" style={{ gridTemplateColumns: cols }}>
          <div />
          {map.cols.map((c) => <div key={c} className="text-center text-muted-foreground">{c}</div>)}
          {map.rows.map((r, i) => [
            <div key={r} className="text-muted-foreground pr-1 flex items-center">{r}</div>,
            ...map.values[i].map((v, j) => (
              <div key={`${r}-${j}`} title={`${r} ${map.cols[j]}: ${v ?? 'no data'}`} className="h-6 rounded-sm flex items-center justify-center text-foreground" style={{ background: color(v) }}>
                {map.cols.length <= 12 && v !== null ? v : ''}
              </div>
            )),
          ])}
        </div>
      </div>
    </div>
  );
}