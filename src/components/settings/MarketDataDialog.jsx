import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Field from '@/components/accounts/Field';
import { parseCandles } from '@/lib/backtest/data';

// XAUUSD_M15_2024.csv -> XAUUSD / M15
function guess(name) {
  const m = name.toUpperCase().match(/^([A-Z0-9.]+?)[_\- ]+(M\d+|H\d+|D1|W1|MN1)\b/);
  return m ? { symbol: m[1], timeframe: m[2] } : { symbol: name.replace(/\.[^.]+$/, '').toUpperCase(), timeframe: '' };
}

export default function MarketDataDialog({ onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({ symbol: '', timeframe: '', contract_size: '100', point: '0.01' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const bars = parseCandles(text);
    const n = bars.time.length;
    const ok = n > 0 && !Number.isNaN(bars.time[0]) && !Number.isNaN(bars.time[n - 1]);
    setError(ok ? '' : 'Could not read candles from this file. Use an MT5 or TradingView CSV export.');
    setFile(ok ? f : null);
    setInfo(ok ? { source: text.slice(0, 200).includes('<DATE>') ? 'MT5' : 'TradingView', bars: n, start: new Date(bars.time[0]).toISOString(), end: new Date(bars.time[n - 1]).toISOString() } : null);
    if (ok) setForm((s) => ({ ...s, ...guess(f.name) }));
  };

  const save = async () => {
    setBusy(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await base44.entities.MarketData.create({
        ...info, file_uri, symbol: form.symbol.trim().toUpperCase(), timeframe: form.timeframe.trim().toUpperCase(),
        contract_size: Number(form.contract_size) || 100, point: Number(form.point) || 0.01,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add candle file</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="MT5 or TradingView CSV export"><Input type="file" accept=".csv,.txt" onChange={pick} /></Field>
          {info && <p className="text-xs text-muted-foreground">{info.source} · {info.bars.toLocaleString()} bars · {info.start.slice(0, 10)} to {info.end.slice(0, 10)}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Symbol"><Input value={form.symbol} onChange={set('symbol')} placeholder="XAUUSD" /></Field>
            <Field label="Timeframe"><Input value={form.timeframe} onChange={set('timeframe')} placeholder="M15" /></Field>
            <Field label="Contract size" hint="Units per 1.0 lot"><Input value={form.contract_size} onChange={set('contract_size')} /></Field>
            <Field label="Point" hint="Price of 1 point"><Input value={form.point} onChange={set('point')} /></Field>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={!file || !form.symbol.trim() || !form.timeframe.trim() || busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}