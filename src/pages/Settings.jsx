import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { getKeyStatus } from '@/lib/quantApi';
import ProviderKeyCard from '@/components/quant/ProviderKeyCard';
import DefaultModelsCard from '@/components/settings/DefaultModelsCard';
import MarketDataCard from '@/components/settings/MarketDataCard';
import WorkspaceCard from '@/components/settings/WorkspaceCard';
import UpdatesCard from '@/components/settings/UpdatesCard';
import ServerCard from '@/components/localai/ServerCard';
import LocalModelsList from '@/components/localai/LocalModelsList';
import { IS_LOCAL } from '@/desktop/isLocal';

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [detectKey, setDetectKey] = useState(0);

  useEffect(() => { getKeyStatus().then(setStatus); }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to chat
        </Link>
        <h1 className="font-heading text-3xl mt-6">Settings</h1>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">API Keys</h2>
          <ProviderKeyCard provider="anthropic" status={status} onChange={setStatus} />
          <ProviderKeyCard provider="google" status={status} onChange={setStatus} />
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {IS_LOCAL
              ? 'Keys are encrypted by Windows and stored only on this PC. They are only sent to Claude or Gemini when you use them.'
              : "Keys are encrypted with AES-256 on the server before being saved, can't be read back by the browser, and are only decrypted on the server when your request is sent to Claude or Gemini."}
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Models</h2>
          <DefaultModelsCard />
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Local AI</h2>
          <ServerCard onSaved={() => setDetectKey((k) => k + 1)} />
          <LocalModelsList refresh={detectKey} />
          <p className="text-xs text-muted-foreground">Connect Ollama or LM Studio running on this PC. Its models show up in the chat's model list.</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Market data</h2>
          <MarketDataCard />
          <WorkspaceCard />
        </section>

        {IS_LOCAL && (
          <section className="mt-8 space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Updates</h2>
            <UpdatesCard />
          </section>
        )}
      </div>
    </div>
  );
}