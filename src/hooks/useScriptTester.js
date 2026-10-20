import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import * as api from '@/lib/quantApi';
import { defaultModel } from '@/lib/models';
import { loadDatasets } from '@/lib/backtest/data';
import { latestScript } from '@/lib/chatScript';
import { testScript } from '@/lib/backtest/testScript';

export default function useScriptTester() {
  const [chats, setChats] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [model, setModel] = useState('builtin');
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    Promise.all([base44.auth.me(), api.getKeyStatus(), loadDatasets()]).then(async ([user, status, ds]) => {
      // Default model from Settings when a key is linked, otherwise the built-in model
      setModel(status?.anthropic?.linked || status?.google?.linked ? defaultModel(status, user) : 'builtin');
      setDatasets(ds);
      setChats(await api.loadSessions(user.id));
      setReady(true);
    });
  }, []);

  async function run(chatId, datasetIds) {
    setError('');
    setResults([]);
    for (const ds of datasets.filter((d) => datasetIds.includes(d.id))) {
      const r = await runOne(chatId, ds);
      if (!r) break;
      setResults((xs) => [...xs, r]);
    }
    setPhase('');
  }

  async function runOne(chatId, ds) {
    const chat = chats.find((c) => c.id === chatId);
    try {
      setPhase('Pulling the newest script from the chat...');
      const script = await latestScript(chatId);
      if (!script) throw new Error(`No MT5 or Pine script in "${chat.title}" yet. Ask QuantBot to write one in that chat first.`);
      return await testScript({ name: chat.title, script, ds, model, onPhase: setPhase });
    } catch (e) {
      setError(`${ds.symbol}: ${e.response?.data?.error || e.message}`);
      return null;
    }
  }

  return { chats, datasets, model, ready, phase, error, results, running: !!phase, run };
}