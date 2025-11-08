# 🎙️ Multi-Node Discord TTS Bot

A scalable **Discord Text-to-Speech bot** system that supports **multiple voice channels simultaneously**.
The bot uses a **Master–Worker architecture**, where a single **master node** coordinates multiple **worker nodes** to join and speak in different voice channels.

---

## 🚀 Features

- 🎧 **Multi-channel support** — run multiple TTS bots (workers) at once.
- 🧠 **Master-controlled workers** — all commands go through the master node.
- 🔄 **Dynamic allocation** — summon and release workers as needed.
- 🔊 **Join notifications** — play a customizable audio message when a user joins a channel.
- 🌐 **Configurable language** — set the speech language (e.g., `en-US`).

---

## ⚙️ Architecture Overview

- **Master Node** — the command interface (via Discord slash commands).
- **Worker Nodes** — independent bots that join voice channels and handle text-to-speech playback.

Each worker runs its own Discord client and can only be managed by the master node.

### Command Flow

| Command    | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| `/summon`  | Add an available worker node to the specified voice channel. |
| `/quit`    | Release the worker node currently in the voice channel.      |
| `/quitall` | Release all worker nodes back to the free node list.         |
| `/list`    | Display available free worker nodes.                         |

---

## 🧩 Environment Setup

Create a `.env` file based on `env.example`:

```bash
MASTER_BOT_TOKEN=
MASTER_APP_ID=

CHILD_TOKEN_PATH="./child_token.json"
NOTICE_MESSAGE="{user} joined the channel"
LANG="en-US"
```

### Explanation

| Variable           | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `MASTER_BOT_TOKEN` | Discord bot token for the master node.                   |
| `MASTER_APP_ID`    | Discord application ID for the master node.              |
| `CHILD_TOKEN_PATH` | Path to the JSON file containing worker bot credentials. |
| `NOTICE_MESSAGE`   | Message played when a user joins a voice channel (TTS).  |
| `LANG`             | TTS language code (e.g., `en-US`, `ja-JP`, etc.).        |

---

## 🧱 Worker Configuration

`child_token.json` defines all available worker bots:

```json
[
  {
    "token": "",
    "app_id": "",
    "identifier": "worker 1"
  },
  {
    "token": "",
    "app_id": "",
    "identifier": "worker 2"
  }
]
```

Each worker runs independently and connects to Discord using its own token.
The master node automatically manages which workers are assigned or freed.

---

## 🏁 Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment**

   Copy `.env.example` to `.env` and fill in the required fields.

3. **Create `child_token.json`**

   Add your worker bots’ credentials.

4. **Run**

   ```bash
   npm run start
   ```

---

## 🧠 Notes

- Workers cannot be commanded directly — only through the master bot.
- You can add as many workers as needed for multiple voice channels. Just add more bot credentials in `child_token.json`
- Ensure each worker bot is invited to your server with **voice permissions**.
- Master bot needs **Presence Intent**, **Message Content Intent** and **Read message history** permission.

---

## 💡 Example Use Case

Want to run a community voice chat where each channel gets live TTS?
Deploy one master bot and several worker bots — each worker handles a different channel seamlessly.
