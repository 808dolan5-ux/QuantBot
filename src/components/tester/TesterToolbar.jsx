import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MODELS, GROUPS } from '@/lib/models';

export default function TesterToolbar({ target, onTarget, model, onModel, onRun, running, disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-border p-0.5">
        {GROUPS.map((g) => (
          <button
            key={g.value} onClick={() => onTarget(g.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${target === g.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <Select value={model} onValueChange={onModel}>
        <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button onClick={onRun} disabled={disabled || running} className="ml-auto">
        <Play className="w-4 h-4" />{running ? 'Converting & testing...' : 'Convert & test'}
      </Button>
    </div>
  );
}