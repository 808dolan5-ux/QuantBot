import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import * as api from '@/lib/quantApi';
import { MODELS } from '@/lib/models';
import { useToast } from '@/components/ui/use-toast';
import QuantSidebar from '@/components/quant/QuantSidebar';
import ChatHeader from '@/components/quant/ChatHeader';
import HomeGreeting from '@/components/quant/HomeGreeting';
import MessageList from '@/components/quant/MessageList';
import Composer from '@/components/quant/Composer';
import NoKeyBanner from '@/components/quant/NoKeyBanner';

export default function QuantChat() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [style, setStyle] = useState('Normal');
  const [model, setModel] = useState(() => localStorage.getItem('quant_model') || 'builtin');
  const [keyStatus, setKeyStatus] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser); api.getKeyStatus().then(setKeyStatus); }, []);

  const refreshSessions = useCallback(async () => {
    if (user) setSessions(await api.loadSessions(user.id, activeGroup));
  }, [user, activeGroup]);

  useEffect(() => { refreshSessions(); }, [refreshSessions]);

  const session = sessions.find((s) => s.id === activeId) || null;
  const needsKey = MODELS.find((m) => m.id === model)?.needsKey && keyStatus && !keyStatus.linked;

  const changeModel = (m) => { setModel(m); localStorage.setItem('quant_model', m); };

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
    try {
      const reply = await api.askQuantAI(id, style, model);
      setMessages((m) => [...m, reply]);
    } catch (e) {
      toast({ title: 'Message failed', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setThinking(false);
    refreshSessions();
  };

  const changeGroup = async (group) => {
    await api.setSessionGroup(activeId, group);
    refreshSessions();
  };

  const deleteChat = async (id) => {
    await api.deleteSession(id);
    if (id === activeId) newChat();
    refreshSessions();
  };

  const removeChat = async () => {
    if (!window.confirm('Delete this conversation?')) return;
    deleteChat(activeId);
  };

  const renameChat = async (id, title) => { await api.renameSession(id, title); refreshSessions(); };
  const moveChat = async (id, group) => { await api.setSessionGroup(id, group); refreshSessions(); };

  const firstName = (user?.full_name || 'Trader').split(' ')[0];
  const hasChat = activeId && (messages.length > 0 || thinking);

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">
      <QuantSidebar
        user={user} sessions={sessions} activeId={activeId} activeGroup={activeGroup}
        onSelect={openSession} onNew={newChat} onGroup={setActiveGroup}
        onRename={renameChat} onMove={moveChat} onDelete={deleteChat}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          session={session} onGroupChange={changeGroup}
          onExport={() => api.exportMarkdown(session.title, messages)} onDelete={removeChat}
          onMenu={() => setSidebarOpen(true)}
        />
        {hasChat ? <MessageList messages={messages} thinking={thinking} /> : <HomeGreeting name={firstName} />}
        {needsKey && <NoKeyBanner onSaved={setKeyStatus} />}
        <Composer
          onSend={send} disabled={thinking || needsKey}
          style={style} onStyleChange={setStyle} model={model} onModelChange={changeModel}
        />
      </main>
    </div>
  );
}