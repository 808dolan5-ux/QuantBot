import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadDatasets, loadBars } from '@/lib/backtest/data';
import { quantHeatmaps } from '@/lib/backtest/quantHeatmaps';
import Heatmap from '@/components/quantdata/Heatmap';
import ChartLoader from '@/components/quant/ChartLoader';

export default function QuantData() {
  const [datasets, setDatasets] = useState([]);
  const [id, setId] = useState('');
  const [maps, setMaps] = useState(null);

  useEffect(() => { loadDatasets().then((d) => { setDatasets(d); setId(d[0]?.id || ''); }); }, []);
  useEffect(() => {
    const ds = datasets.find((d) => d.id === id);
    if (!ds) return;
    setMaps(null);
    loadBars(ds).then((bars) => setMaps(quantHeatmaps(bars)));
  }, [id, datasets]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="p-2 rounded-md hover:bg-accent"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="font-heading text-xl font-semibold flex-1">Quant data</h1>
          <Select value={id} onValueChange={setId}>
            <SelectTrigger className="w-56 bg-card"><SelectValue placeholder="Pick a market" /></SelectTrigger>
            <SelectContent>
              {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.symbol} {d.timeframe}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Calculated automatically from every candle file. The script-writing AI gets the strongest and weakest cells of each map with every conversion.</p>
        {!maps ? <div className="flex justify-center py-20"><ChartLoader /></div> : (
          <div className="grid gap-4">{maps.map((m) => <Heatmap key={m.key} map={m} />)}</div>
        )}
      </div>
    </div>
  );
}