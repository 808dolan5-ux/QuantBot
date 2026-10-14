import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import * as api from '@/lib/quantApi';
import { MODELS } from '@/lib/models';
import { useToast } from '@/components/ui/use-toast';
import TesterToolbar from '@/components/tester/TesterToolbar';
import StrategyForm from '@/components/tester/StrategyForm';
import CodeOutput from '@/components/tester/CodeOutput';
import RuleResults from '@/components/tester/RuleResults';
import NoKeyBanner from '@/components/quant/NoKeyBanner';
import ChartLoader from '@/components/quant/ChartLoader';

export default function StrategyTester() {
  const { toast } = useToast();
  const [strategy, setStrategy] = useState('');
  const [rules, setRules] = useState('');
  const [target, setTarget] = useState('MT5');
  const [model, setModel] = useState('claude-opus-5');
  const [keyStatus, setKeyStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { api.getKeyStatus().then(setKeyStatus); }, []);

  const needsKey = MODELS.find((m) => m.id === model)?.needsKey && keyStatus && !keyStatus.linked;

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('strategyTester', { strategy, rules, target, model });
      setResult({ ...res.data, target });
    } catch (e) {
      toast({ title: 'Conversion failed', description: e.response?.data?.error || e.message, variant: 'destructive' });
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-14 border-b border-border flex items-center gap-3 px-4">
        <Link to="/" className="p-2 rounded-md hover:bg-accent"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="font-heading text-lg font-semibold">Strategy Converter & Tester</h1>
      </header>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <TesterToolbar
          target={target} onTarget={setTarget} model={model} onModel={setModel}
          onRun={run} running={running} disabled={!strategy.trim() || needsKey}
        />
        {needsKey && <div className="-mx-4 md:-mx-6"><NoKeyBanner onSaved={setKeyStatus} /></div>}
        <StrategyForm strategy={strategy} onStrategy={setStrategy} rules={rules} onRules={setRules} />
        {running && (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <ChartLoader className="w-20 h-12" />Converting to {target} and testing your rules...
          </div>
        )}
        {result && (
          <div className="space-y-4">
            <RuleResults summary={result.summary} results={result.results} />
            <CodeOutput code={result.code} target={result.target} />
          </div>
        )}
      </div>
    </div>
  );
}