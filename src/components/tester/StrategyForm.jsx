import { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import LazyField from './LazyField';

function StrategyForm({ strategy, onStrategy, rules, onRules }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Strategy</label>
        <LazyField
          as={Textarea} value={strategy} onCommit={onStrategy}
          placeholder="Paste your strategy here: plain-English rules, MQL4/MQL5, Pine Script, Python, or any other code."
          className="min-h-[260px] font-mono text-xs bg-card"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Rules to test against</label>
        <LazyField
          as={Textarea} value={rules} onCommit={onRules}
          placeholder={'One rule per line, e.g.\nMax risk 1% per trade\nEvery trade has a stop loss\nNo martingale or grid\nMax daily loss 4%\nOnly trade London and NY sessions'}
          className="min-h-[140px] text-sm bg-card"
        />
      </div>
    </div>
  );
}

export default memo(StrategyForm);