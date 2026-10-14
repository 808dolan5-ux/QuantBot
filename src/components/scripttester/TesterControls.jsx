import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TesterControls({ chats, datasets, chatId, datasetId, onChat, onDataset, onRun, running }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-3">
      <label className="space-y-1 flex-1 min-w-[220px]">
        <span className="text-xs text-muted-foreground">Chat with the script</span>
        <Select value={chatId} onValueChange={onChat}>
          <SelectTrigger className="h-10"><SelectValue placeholder={chats.length ? 'Pick a chat' : 'No chats yet'} /></SelectTrigger>
          <SelectContent>
            {chats.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <label className="space-y-1 w-full sm:w-60">
        <span className="text-xs text-muted-foreground">Timeframe</span>
        <Select value={datasetId} onValueChange={onDataset}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Pick market data" /></SelectTrigger>
          <SelectContent>
            {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.symbol} {d.timeframe} ({d.source})</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <Button onClick={onRun} disabled={running || !chatId || !datasetId} className="h-10">
        <Play className="w-4 h-4 mr-2" />Run test
      </Button>
    </div>
  );
}