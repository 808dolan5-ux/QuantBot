import { Download, Trash2, Menu, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ChatHeader({ session, groups, onGroupChange, onExport, onDelete, onMenu }) {
  const groupNames = Array.from(new Set(['General', ...groups.map((g) => g.name)]));
  return (
    <header className="h-14 shrink-0 border-b border-border flex items-center justify-between gap-3 px-3 md:px-4">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenu} className="md:hidden p-2 rounded-md hover:bg-accent"><Menu className="w-5 h-5" /></button>
        {session && (
          <>
            <span className="truncate text-sm font-medium">{session.title}</span>
            <Select value={session.group || 'General'} onValueChange={onGroupChange}>
              <SelectTrigger className="h-7 w-auto gap-1.5 border-border bg-transparent text-xs text-muted-foreground">
                <Folder className="w-3 h-3" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      {session && (
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onExport} className="h-8 bg-transparent">
            <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export .md</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="h-8 bg-transparent text-destructive border-destructive/40 hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      )}
    </header>
  );
}