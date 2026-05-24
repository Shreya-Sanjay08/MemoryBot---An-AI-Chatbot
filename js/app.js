/**
 * MemoryBot v2 — app.js
 * Multi-provider AI Chatbot with conversation memory
 *
 * Supported providers:
 *  - Ollama       (free, local, infinite — recommended)
 *  - Anthropic    (paid, cloud)
 *  - OpenAI       (paid, cloud — free tier available)
 *  - Groq         (free tier, very fast, cloud)
 *  - OpenRouter   (free models available, cloud)
 */

// ── STATE ────────────────────────────────────────────────────────────
let config = {
  provider: 'ollama',
  apiKey:   '',
  model:    'llama3.2',
  baseUrl:  'http://localhost:11434'
};

let history  = [];
let memories = [];
let persona  = { name: 'assistant', prompt: 'A helpful, professional AI assistant.' };
let apiCalls    = 0;
let sidebarOpen = true;

// ── PROVIDER DEFINITIONS ─────────────────────────────────────────────
const PROVIDERS = {
  ollama: {
    label:       'Ollama (Local)',
    needsKey:    false,
    needsUrl:    true,
    defaultUrl:  'http://localhost:11434',
    defaultModel:'llama3.2',
    modelHint:   'e.g. llama3.2, mistral, gemma2, phi3',
    free:        true,
    badge:       '∞ Free & Local'
  },
  groq: {
    label:       'Groq (Free Tier)',
    needsKey:    true,
    needsUrl:    false,
    defaultUrl:  'https://api.groq.com',
    defaultModel:'llama-3.3-70b-versatile',
    modelHint:   'e.g. llama-3.3-70b-versatile, mixtral-8x7b-32768',
    free:        true,
    badge:       'Free tier available'
  },
  openrouter: {
    label:       'OpenRouter (Free Models)',
    needsKey:    true,
    needsUrl:    false,
    defaultUrl:  'https://openrouter.ai',
    defaultModel:'meta-llama/llama-3.3-70b-instruct:free',
    modelHint:   'e.g. meta-llama/llama-3.3-70b-instruct:free',
    free:        true,
    badge:       'Has free models'
  },
  anthropic: {
    label:       'Anthropic Claude',
    needsKey:    true,
    needsUrl:    false,
    defaultUrl:  'https://api.anthropic.com',
    defaultModel:'claude-haiku-4-5-20251001',
    modelHint:   'e.g. claude-haiku-4-5-20251001, claude-sonnet-4-6',
    free:        false,
    badge:       'Paid'
  },
  openai: {
    label:       'OpenAI',
    needsKey:    true,
    needsUrl:    false,
    defaultUrl:  'https://api.openai.com',
    defaultModel:'gpt-4o-mini',
    modelHint:   'e.g. gpt-4o-mini, gpt-4o',
    free:        false,
    badge:       'Paid'
  }
};

// ── HELPERS ──────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function updateStats() {
  const turns = Math.floor(history.length / 2);
  $('stat-msgs').textContent    = history.length;
  $('stat-persona').textContent = persona.name;
  $('stat-ctx').textContent     = turns + ' turn' + (turns !== 1 ? 's' : '');
  $('stat-calls').textContent   = apiCalls;
  $('ctx-chip').textContent     = history.length + ' msg' + (history.length !== 1 ? 's' : '') + ' in context';
  $('persona-chip').textContent = '🤖 ' + persona.name;
  $('provider-chip').textContent = '⚡ ' + PROVIDERS[config.provider].label;
}

function updateMemoryList() {
  const ml = $('memory-list');
  if (memories.length === 0) {
    ml.innerHTML = '<div class="no-memory">No memories yet</div>';
    return;
  }
  ml.innerHTML = memories.map(m => `<div class="memory-item" title="${m}">${m}</div>`).join('');
}

// ── NOTIFICATIONS ────────────────────────────────────────────────────
function notify(text, icon = '✓', duration = 2800) {
  const n = $('notif');
  $('notif-icon').textContent = icon;
  $('notif-text').textContent = text;
  n.classList.remove('hidden');
  clearTimeout(n._timer);
  n._timer = setTimeout(() => n.classList.add('hidden'), duration);
}

// ── CONFIG PANEL ─────────────────────────────────────────────────────
function toggleConfig() {
  $('config-panel').classList.toggle('hidden');
}

function onProviderChange() {
  const sel = $('provider-select').value;
  const p   = PROVIDERS[sel];

  $('key-group').style.display    = p.needsKey ? 'block' : 'none';
  $('url-group').style.display    = p.needsUrl ? 'block' : 'none';
  $('model-input').value          = p.defaultModel;
  $('model-hint').textContent     = p.modelHint;
  $('provider-badge').textContent = p.badge;
  $('provider-badge').className   = 'provider-badge ' + (p.free ? 'free' : 'paid');

  if (p.needsUrl) $('url-input').value = p.defaultUrl;
}

function saveConfig() {
  const sel = $('provider-select').value;
  const p   = PROVIDERS[sel];

  if (p.needsKey && !$('key-input').value.trim()) {
    notify('API key required for ' + p.label, '✗');
    return;
  }

  config.provider = sel;
  config.apiKey   = $('key-input').value.trim();
  config.model    = $('model-input').value.trim() || p.defaultModel;
  config.baseUrl  = p.needsUrl ? $('url-input').value.trim() : p.defaultUrl;

  $('status-dot').style.background  = 'var(--green)';
  $('status-text').textContent       = p.label + ' ready';
  $('send-btn').disabled             = false;
  $('config-panel').classList.add('hidden');
  updateStats();
  notify('Connected via ' + p.label + ' · ' + config.model, '✓');
}

// ── API ADAPTERS ─────────────────────────────────────────────────────
// Each provider has a different API shape — these adapters normalise them
// into a single { reply, error } response.

async function callOllama(systemPrompt, messages) {
  const url = config.baseUrl.replace(/\/$/, '') + '/api/chat';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:    config.model,
      stream:   false,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })
  });
  if (!res.ok) {
    const t = await res.text();
    return { error: 'Ollama error ' + res.status + ': ' + t };
  }
  const data = await res.json();
  return { reply: data.message?.content || '(empty response)' };
}

async function callOpenAICompat(systemPrompt, messages, endpoint) {
  // Works for OpenAI, Groq, and OpenRouter — all use the same /v1/chat/completions shape
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + config.apiKey
    },
    body: JSON.stringify({
      model:    config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })
  });
  if (!res.ok) {
    const err = await res.json();
    return { error: err.error?.message || 'HTTP ' + res.status };
  }
  const data = await res.json();
  return { reply: data.choices?.[0]?.message?.content || '(empty response)' };
}

async function callAnthropic(systemPrompt, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model:      config.model,
      max_tokens: 1024,
      system:     systemPrompt,
      messages
    })
  });
  if (!res.ok) {
    const err = await res.json();
    return { error: err.error?.message || 'HTTP ' + res.status };
  }
  const data = await res.json();
  return { reply: data.content?.[0]?.text || '(empty response)' };
}

async function callAPI(systemPrompt, messages) {
  switch (config.provider) {
    case 'ollama':
      return callOllama(systemPrompt, messages);
    case 'groq':
      return callOpenAICompat(systemPrompt, messages, 'https://api.groq.com/openai/v1/chat/completions');
    case 'openrouter':
      return callOpenAICompat(systemPrompt, messages, 'https://openrouter.ai/api/v1/chat/completions');
    case 'openai':
      return callOpenAICompat(systemPrompt, messages, 'https://api.openai.com/v1/chat/completions');
    case 'anthropic':
      return callAnthropic(systemPrompt, messages);
    default:
      return { error: 'Unknown provider: ' + config.provider };
  }
}

// ── SIDEBAR ──────────────────────────────────────────────────────────
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  $('sidebar').classList.toggle('collapsed', !sidebarOpen);
}

// ── PERSONA ──────────────────────────────────────────────────────────
function setPersona(btn, name, prompt) {
  document.querySelectorAll('.persona-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  persona = { name, prompt };
  updateStats();
  notify('Persona: ' + name, '🎭');
}

// ── MEMORY ───────────────────────────────────────────────────────────
function pinMemory() {
  const val = $('memory-input').value.trim();
  if (!val) return;
  memories.push(val);
  $('memory-input').value = '';
  updateMemoryList();
  notify('Memory pinned!', '📌');
}

// ── RENDER ───────────────────────────────────────────────────────────
function renderMessage(role, content, time) {
  const empty = $('empty-state');
  if (empty) empty.remove();

  const msgs = $('messages');
  const div  = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = `
    <div class="avatar ${role}">${role === 'ai' ? 'AI' : 'ME'}</div>
    <div>
      <div class="bubble">${content.replace(/\n/g, '<br>')}</div>
      <div class="msg-meta">${time}</div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function renderTyping() {
  const empty = $('empty-state');
  if (empty) empty.remove();
  const msgs = $('messages');
  const div  = document.createElement('div');
  div.className = 'msg ai';
  div.id        = 'typing-indicator';
  div.innerHTML = `
    <div class="avatar ai">AI</div>
    <div>
      <div class="bubble" style="padding:14px 16px;">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// ── SEND ─────────────────────────────────────────────────────────────
async function sendMessage(text) {
  const input   = $('msg-input');
  const content = (text || input.value).trim();
  if (!content) return;

  if (!$('send-btn') || $('send-btn').disabled) return;

  // If no provider configured yet, open config
  if (config.provider === 'ollama' && !$('status-text').textContent.includes('ready')) {
    // Ollama needs no key — auto-enable
    $('status-dot').style.background = 'var(--green)';
    $('status-text').textContent      = 'Ollama (Local) ready';
    $('send-btn').disabled            = false;
  }

  input.value = '';
  autoResize(input);
  $('send-btn').disabled = true;

  renderMessage('user', content, now());
  history.push({ role: 'user', content });
  updateStats();
  renderTyping();

  let systemPrompt = `You are MemoryBot — ${persona.prompt} Keep responses concise and helpful.`;
  if (memories.length > 0) {
    systemPrompt += `\n\nUser's pinned memories:\n${memories.map(m => '• ' + m).join('\n')}`;
  }

  try {
    const { reply, error } = await callAPI(systemPrompt, history);
    const typing = $('typing-indicator');
    if (typing) typing.remove();

    if (error) {
      renderMessage('ai', '⚠ ' + error, now());
    } else {
      apiCalls++;
      history.push({ role: 'assistant', content: reply });
      renderMessage('ai', reply, now());
      updateStats();
    }
  } catch (err) {
    const typing = $('typing-indicator');
    if (typing) typing.remove();
    renderMessage('ai', '⚠ Could not reach ' + PROVIDERS[config.provider].label + '. ' +
      (config.provider === 'ollama' ? 'Is Ollama running? Run: ollama serve' : 'Check your API key.'), now());
    console.error(err);
  }

  $('send-btn').disabled = false;
}

function sendStarter(el) { sendMessage(el.textContent); }

// ── EXPORT ───────────────────────────────────────────────────────────
function exportChat() {
  if (!history.length) { notify('No messages to export', '⚠'); return; }
  const header = [
    'MemoryBot Chat Log',
    'Provider  : ' + PROVIDERS[config.provider].label,
    'Model     : ' + config.model,
    'Persona   : ' + persona.name,
    'Exported  : ' + new Date().toLocaleString(),
    'Memories  : ' + (memories.join(', ') || 'none'),
    '='.repeat(50), ''
  ].join('\n');
  const body = history.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n');
  downloadFile(header + '\n' + body, `memorybot-chat-${Date.now()}.txt`, 'text/plain');
  notify('Exported as .txt!', '📄');
}

function exportJSON() {
  if (!history.length) { notify('No messages to export', '⚠'); return; }
  downloadFile(
    JSON.stringify({ exported: new Date().toISOString(), provider: config.provider,
      model: config.model, persona: persona.name, memories, messages: history }, null, 2),
    `memorybot-chat-${Date.now()}.json`, 'application/json'
  );
  notify('Exported as .json!', '💾');
}

function downloadFile(content, filename, mime) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], { type: mime })),
    download: filename
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function clearChat() {
  if (!confirm('Clear all messages?')) return;
  history = [];
  $('messages').innerHTML = `
    <div class="empty-state" id="empty-state">
      <div class="empty-icon">💬</div>
      <div class="empty-title">Start a conversation</div>
      <div class="empty-sub">MemoryBot remembers your full conversation history</div>
      <div class="starter-grid">
        <div class="starter" onclick="sendStarter(this)">Explain neural networks</div>
        <div class="starter" onclick="sendStarter(this)">Help me debug Python code</div>
        <div class="starter" onclick="sendStarter(this)">What should I learn next in AI?</div>
        <div class="starter" onclick="sendStarter(this)">Tell me a fun fact</div>
      </div>
    </div>`;
  updateStats();
  notify('Conversation cleared', '🗑');
}

// ── INPUT ────────────────────────────────────────────────────────────
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── INIT ─────────────────────────────────────────────────────────────
// Default to Ollama — no key needed, just run `ollama serve`
$('status-dot').style.background = 'var(--amber)';
$('status-text').textContent     = 'Select provider (⚙)';
$('send-btn').disabled           = false; // allow Ollama without config
updateStats();
updateMemoryList();

// Pre-fill config panel for Ollama
window.addEventListener('DOMContentLoaded', () => {
  onProviderChange(); // set defaults based on initial provider selection
});
