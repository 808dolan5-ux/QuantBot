import { Plus, X } from 'lucide-react';
import GroupPills from './GroupPills';
import ProfileFooter from './ProfileFooter';

export default function QuantSidebar({ user, sessions, groups, activeId, activeGroup, onSelect, onNew, onGroup, onAddGroup, open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} />}
      <aside className={`fixed md:static z-40 inset-y-0 left-0 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="h-14 flex items-center justify-between px-4">
          <span className="font-heading text-lg font-semibold">Quant AI</span>
          <button onClick={onClose} className="md:hidden p-1 rounded hover:bg-sidebar-accent"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-3">
          <button onClick={onNew} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent text-sm font-medium">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Plus className="w-4 h-4" /></span>
            New chat
          </button>
        </div>
        <GroupPills groups={groups} active={activeGroup} onSelect={onGroup} onAdd={onAddGroup} />
        <div className="px-4 pt-3 pb-1 text-xs text-muted-foreground">Recents</div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {sessions.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">No conversations yet.</p>}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left truncate px-2 py-1.5 rounded-md text-sm ${s.id === activeId ? 'bg-sidebar-accent text-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent'}`}
            >
              {s.title}
            </button>
          ))}
        </div>
        <ProfileFooter user={user} />
      </aside>
    </>
  );
}