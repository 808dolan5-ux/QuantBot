import React from 'react';

export default function AgentLog({ logs }) {
  const ids = Object.keys(logs);
  if (!ids.length) return null;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {ids.map((n) => (
        <div key={n} className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs font-semibold mb-2">Agent {n}</div>
          <div className="max-h-64 overflow-y-auto space-y-2 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap">
            {logs[n].map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}