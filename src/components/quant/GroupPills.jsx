import { Plus } from 'lucide-react';

export default function GroupPills({ groups, active, onSelect, onAdd }) {
  const pill = (label, value) => (
    <button
      key={label}
      onClick={() => onSelect(value)}
      className={`px-2.5 py-1 rounded-full text-xs border transition ${
        active === value
          ? 'bg-primary/15 border-primary/50 text-primary'
          : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between px-1 mb-2 text-xs text-muted-foreground">
        <span>Groups &amp; Projects</span>
        <button onClick={onAdd} className="p-1 rounded hover:bg-accent hover:text-foreground"><Plus className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pill('All', null)}
        {pill('General', 'General')}
        {groups.filter((g) => g.name !== 'General').map((g) => pill(g.name, g.name))}
      </div>
    </div>
  );
}