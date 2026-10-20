import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SERVERS, getServer, setServer } from '@/lib/localAi';

export default function ServerCard({ onSaved }) {
  const [s, setS] = useState(getServer());
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-2">
      <Select value={s.kind} onValueChange={(kind) => setS({ kind, url: SERVERS[kind].url })}>
        <SelectTrigger className="w-60 bg-background"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(SERVERS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
      </Select>
      <Input value={s.url} onChange={(e) => setS({ ...s, url: e.target.value })} className="flex-1 min-w-48 bg-background" />
      <Button onClick={() => { setServer(s); onSaved(); }}>Save & detect</Button>
    </div>
  );
}