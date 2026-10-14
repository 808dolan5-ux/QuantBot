import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { getKeyStatus } from '@/lib/quantApi';
import AnthropicKeyCard from '@/components/quant/AnthropicKeyCard';

export default function Settings() {
  const [status, setStatus] = useState(null);

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
          <AnthropicKeyCard status={status} onChange={setStatus} />
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Keys are encrypted with AES-256 on the server before being saved, can't be read back by the browser,
            and are only decrypted on the server when your message is sent to Claude.
          </p>
        </section>
      </div>
    </div>
  );
}