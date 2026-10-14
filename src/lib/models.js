export const PROVIDERS = {
  anthropic: { name: 'Anthropic (Claude)', short: 'Anthropic', family: 'Claude', prefix: 'sk-ant-' },
  google: { name: 'Google (Gemini)', short: 'Google Gemini', family: 'Gemini', prefix: 'AIza' },
};

export const MODELS = [
  { id: 'builtin', label: 'QuantBot (built-in)', provider: null },
  { id: 'claude-opus-5', label: 'Claude Opus 5', provider: 'anthropic' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-opus-4-1', label: 'Claude Opus 4.1', provider: 'anthropic' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon', provider: 'google' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', provider: 'google' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', provider: 'google' },
];

// Provider whose key the chosen model needs but isn't linked yet (null when ready or still loading)
export function missingKey(modelId, status) {
  const provider = MODELS.find((m) => m.id === modelId)?.provider;
  return provider && status && !status[provider]?.linked ? provider : null;
}

export const GROUPS = [
  { value: 'MT5', label: 'MT5' },
  { value: 'Pine', label: 'Pine' },
];