# MemoryBot 🤖
### Multi-provider AI Chatbot with Conversation Memory
 
> Portfolio project — BEng Computer Science & Engineering · Middlesex University Dubai
 
![Version](https://img.shields.io/badge/version-2.0-7c6af7)
![License](https://img.shields.io/badge/license-MIT-34d399)
![Providers](https://img.shields.io/badge/providers-5-a78bfa)
 
---
 
## 🖥 Live Demo
🔗 [memorybot.vercel.app](https://memorybot.vercel.app) <!-- update this after deploying -->
 
---
 
## 📌 What is MemoryBot?
 
MemoryBot is an AI chatbot that remembers your entire conversation. Unlike basic chatbots that forget context between messages, MemoryBot maintains a full conversation history and sends it with every API request — the same pattern used in production LLM applications like ChatGPT.
 
It supports 5 different AI providers including **Ollama** for completely free, local, offline inference.
 
---
 
## ✨ Features
 
- 💬 **Conversation memory** — full history sent with every request so the AI never loses context
- ⚡ **Multi-provider support** — swap between 5 AI backends from one config panel
- 🎭 **6 personality presets** — Assistant, Tutor, Friend, Expert, Coach, Creative
- 📌 **Pinned memories** — manually inject facts the AI should always remember
- 📄 **Export chat logs** — download conversations as `.txt` or `.json`
- 📊 **Session stats** — live message count, API call counter, context depth tracker
- 🖥 **No build step** — pure HTML, CSS, and JavaScript
---
 
## 🤖 Supported Providers
 
| Provider | Cost | Speed | Notes |
|---|---|---|---|
| [Ollama](https://ollama.com) | ✅ Free & local | Fast | Runs 100% offline on your machine |
| [Groq](https://groq.com) | ✅ Free tier | Very fast | Cloud inference, generous free limits |
| [OpenRouter](https://openrouter.ai) | ✅ Free models | Fast | Access to many free open-source models |
| [Anthropic](https://anthropic.com) | 💳 Paid | Fast | Claude models |
| [OpenAI](https://openai.com) | 💳 Paid | Fast | GPT models |
 
---
 
## 🚀 Quick Start
 
### Option 1 — Ollama (Free, Local, Recommended)
 
```bash
# 1. Install Ollama from https://ollama.com
 
# 2. Pull a model
ollama pull llama3.2:1b      # lightweight — works on any machine
# or
ollama pull llama3.2         # full model — needs 8GB+ VRAM
 
# 3. Start the server
ollama serve
```
 
Then open the app, click **⚙**, select **Ollama**, and hit **Connect** — no API key needed.
 
### Option 2 — Groq (Free Cloud)
 
1. Sign up at [console.groq.com](https://console.groq.com) and grab a free API key
2. Open the app, click **⚙**, select **Groq**
3. Paste your key and click **Connect**
### Option 3 — Run locally with VS Code
 
1. Clone the repo
   ```bash
   git clone https://github.com/YOUR_USERNAME/memorybot.git
   cd memorybot
   ```
2. Open the folder in VS Code (`File → Open Folder`)
3. Install the **Live Server** extension
4. Right-click `index.html` → **Open with Live Server**
5. App opens at `http://127.0.0.1:5500`
---
 
## 📁 Project Structure
 
```
memorybot/
├── index.html        ← App shell and UI markup
├── css/
│   └── style.css     ← Dark theme, layout, all component styles
├── js/
│   └── app.js        ← API adapters, state management, chat logic
├── .gitignore
└── README.md
```
 
---
 
## 🧠 How the Memory Works
 
The "memory" is simply the full conversation history sent to the API with every request:
 
```js
// Every message is appended to history
history.push({ role: 'user', content: userMessage });
 
// Full history is sent with each API call
body: JSON.stringify({
  model: 'llama3.2:1b',
  system: systemPrompt,   // personality + pinned memories
  messages: history       // ← this is the memory
})
 
// Reply is added back to history
history.push({ role: 'assistant', content: reply });
```
 
This is the standard **context window memory** pattern used in all major LLM applications.
 
---
 
## 🔌 Provider Architecture
 
Each AI provider has a different API shape. MemoryBot uses an adapter pattern to normalise them:
 
```js
async function callAPI(systemPrompt, messages) {
  switch (config.provider) {
    case 'ollama':     return callOllama(systemPrompt, messages);
    case 'groq':       return callOpenAICompat(systemPrompt, messages, GROQ_URL);
    case 'openrouter': return callOpenAICompat(systemPrompt, messages, OR_URL);
    case 'openai':     return callOpenAICompat(systemPrompt, messages, OAI_URL);
    case 'anthropic':  return callAnthropic(systemPrompt, messages);
  }
}
```
 
---
 
## 🛠 Tech Stack
 
| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES2020) |
| AI (local) | Ollama — `llama3.2`, `mistral`, `gemma2`, `phi3` |
| AI (cloud) | Anthropic, OpenAI, Groq, OpenRouter |
| Fonts | Syne + JetBrains Mono via Google Fonts |
| Hosting | Vercel / GitHub Pages |
 
---
 
## 🗺 Roadmap
 
- [ ] Python/Flask backend with SQLite for persistent chat history across sessions
- [ ] LangChain `ConversationSummaryMemory` for smarter long-context handling
- [ ] Streaming responses via Server-Sent Events
- [ ] Named conversation sessions
- [ ] Dark/light theme toggle
---
 
## 📄 License
 
MIT — free to use, modify, and build on.
 
---
 
> Built by Shreya Sanjay (https://github.com/Shreya-Sanjay08) · BEng CSE · Middlesex University Dubai
