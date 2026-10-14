import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import * as api from '@/lib/quantApi';
import QuantSidebar from '@/components/quant/QuantSidebar';
import ChatHeader from '@/components/quant/ChatHeader';
import HomeGreeting from '@/components/quant/HomeGreeting';
import MessageList from '@/components/quant/MessageList';
import Composer from '@/components/quant/Composer';
import NewGroupDialog from '@/components/quant/NewGroupDialog';

export default function QuantChat() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [style, setStyle] = useState('Normal');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const refreshSessions = useCallback(async () => {
    if (user) setSessions(await api.loadSessions(user.id, activeGroup));
  }, [user, activeGroup]);

  useEffect(() => { refreshSessions(); }, [refreshSessions]);
  useEffect(() => { if (user) api.loadGroups(user.id).then(setGroups); }, [user]);

  const session = sessions.find((s) => s.id === activeId) || null;

  const openSession = async (id) => {
    setActiveId(id);
    setSidebarOpen(false);
    setMessages(await api.loadMessages(id));
  };

  const newChat = () => { setActiveId(null); setMessages([]); setSidebarOpen(false); };

  const send = async (text) => {
    let id = activeId;
    if (!id) {
      const s = await api.createSession(text.slice(0, 60), activeGroup);
      id = s.id;
      setActiveId(id);
      refreshSessions();
    }
    const userMsg = await api.addUserMessage(id, text);
    setMessages((m) => [...m, userMsg]);
    setThinking(true);
    const reply = await api.askQuantAI(id, style).finally(() => setThinking(false));
    setMessages((m) => [...m, reply]);
    refreshSessions();
  };

  const changeGroup = async (group) => {
    await api.setSessionGroup(activeId, group);
    refreshSessions();
  };

  const removeChat = async () => {
    if (!window.confirm('Delete this conversation?')) return;
    await api.deleteSession(activeId);
    newChat();
    refreshSessions();
  };

  const addGroup = async (name) => {
    await api.createGroup(name);
    setGroups(await api.loadGroups(user.id));
  };

  const firstName = (user?.full_name || 'Trader').split(' ')[0];
  const hasChat = activeId && (messages.length > 0 || thinking);

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      <QuantSidebar
        user={user} sessions={sessions} groups={groups} activeId={activeId} activeGroup={activeGroup}
        onSelect={openSession} onNew={newChat} onGroup={setActiveGroup} onAddGroup={() => setGroupDialog(true)}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          session={session} groups={groups} onGroupChange={changeGroup}
          onExport={() => api.exportMarkdown(session.title, messages)} onDelete={removeChat}
          onMenu={() => setSidebarOpen(true)}
        />
        {hasChat ? <MessageList messages={messages} thinking={thinking} /> : <HomeGreeting name={firstName} />}
        <Composer onSend={send} disabled={thinking} style={style} onStyleChange={setStyle} />
      </main>
      <NewGroupDialog open={groupDialog} onOpenChange={setGroupDialog} onCreate={addGroup} />
    </div>
  );
}