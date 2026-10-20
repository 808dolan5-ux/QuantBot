// Desktop app only. Talks to AI models running on this PC: Ollama, or any OpenAI-compatible
// local server (LM Studio, llama.cpp, Jan). Nothing leaves the machine.
const base = (url) => String(url || '').replace(/\/+$/, '');

async function json(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`Local AI server ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export const localAi = {
  // Models currently loaded / served
  async models({ kind, url }) {
    if (kind === 'ollama') return (await json(`${base(url)}/api/ps`)).models.map((m) => m.name);
    return (await json(`${base(url)}/v1/models`)).data.map((m) => m.id);
  },
  async chat({ kind, url }, model, messages) {
    if (kind === 'ollama') {
      const r = await json(`${base(url)}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, stream: false }) });
      return r.message.content;
    }
    const r = await json(`${base(url)}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages }) });
    return r.choices[0].message.content;
  },
};