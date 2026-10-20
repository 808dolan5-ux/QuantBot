import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

// Typing stays local so the heavy page doesn't re-render on every key; the value is sent up after a short pause
function LazyTextarea({ value, onCommit, ...props }) {
  const [text, setText] = useState(value);
  const timer = useRef();
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const commit = (v) => { clearTimeout(timer.current); if (v !== value) onCommit(v); };
  return (
    <Textarea
      {...props} value={text}
      onChange={(e) => { const v = e.target.value; setText(v); clearTimeout(timer.current); timer.current = setTimeout(() => commit(v), 300); }}
      onBlur={() => commit(text)}
    />
  );
}

export default function StrategyForm({ strategy, onStrategy, rules, onRules }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Strategy</label>
        <LazyTextarea
          value={strategy} onCommit={onStrategy}
          placeholder="Paste your strategy here: plain-English rules, MQL4/MQL5, Pine Script, Python, or any other code."
          className="min-h-[260px] font-mono text-xs bg-card"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Rules to test against</label>
        <LazyTextarea
          value={rules} onCommit={onRules}
          placeholder={'One rule per line, e.g.\nMax risk 1% per trade\nEvery trade has a stop loss\nNo martingale or grid\nMax daily loss 4%\nOnly trade London and NY sessions'}
          className="min-h-[140px] text-sm bg-card"
        />
      </div>
    </div>
  );
}