# 🛰️ LocalBeam

**LocalBeam** is a lightweight, zero-config **peer-to-peer communication library** built on top of **WebRTC**, enabling real-time data, file, and message transfer between devices on the same local network — without any external servers.  

It combines a **local signaling server** (using WebSockets + Bonjour/mDNS discovery) with a **simple client SDK** that works seamlessly in **React, Node, or browser environments**.

---

## ⚡ Key Features

- 🧭 **Automatic peer discovery** via Bonjour (mDNS)
- 🔗 **Peer-to-peer connections** using WebRTC
- 💬 **Real-time messaging** and **binary data transfer**
- 📦 **File sharing support** (with metadata & auto-downloads)
- 🧱 **Pluggable transfer strategies** (direct, chunked, etc.)
- 🪶 **Lightweight** — built for LAN & local-first apps
- 🧩 **Framework-agnostic** (works with any JS framework)

---

## 🧰 Installation

```bash
npm install localbeam
# or
yarn add localbeam
```

If running locally for development:

```bash
git clone https://github.com/<your-username>/localbeam.git
cd localbeam
npm install
```

## 🧠 Quick Start

### 1️⃣ Start the LocalBeam signaling server

```bash
node server.js
```

You should see logs like:
```
[INFO] LocalBeam server running on port 3001
[INFO] Bonjour service published: LocalBeam Signaling Server
```

### 2️⃣ Use the LocalBeam client SDK in your app

Example (React):

```jsx
import React, { useEffect, useState } from "react";
import { PeerManager, SignalingClient } from "localbeam";

export default function App() {
  const [clientId] = useState("client-" + Math.floor(Math.random() * 1000));
  const [manager, setManager] = useState(null);
  const [peers, setPeers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const signaling = new SignalingClient(clientId, { baseUrl: "http://localhost:3001" });
    const peerManager = new PeerManager(signaling, clientId);
    setManager(peerManager);

    signaling.connect();
    peerManager.on("peer-list", (list) => setPeers(list.filter(p => p !== clientId)));
    peerManager.on("peer-connected", (pid) => setMessages(m => [...m, `✅ Connected to ${pid}`]));
    peerManager.on("data", (_from, data) => setMessages(m => [...m, `📩 ${data}`]));

    return () => peerManager.closeAll();
  }, [clientId]);

  const send = () => {
    if (!manager) return;
    peers.forEach(p => manager.send(p, input));
    setMessages(m => [...m, `📤 ${input}`]);
    setInput("");
  };

  return (
    <div>
      <h3>LocalBeam Demo</h3>
      <p>Client ID: {clientId}</p>
      <p>Peers: {peers.join(", ") || "none"}</p>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={send}>Send</button>
      <pre>{messages.join("\n")}</pre>
    </div>
  );
}
```

✅ Open the app in two browsers or devices on the same LAN — they'll auto-discover and connect.

### 📤 Sending Files

```javascript
const sendFile = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !manager) return;

  const arrayBuffer = await file.arrayBuffer();
  const payload = {
    type: "file",
    name: file.name,
    mime: file.type,
    size: file.size,
    data: Array.from(new Uint8Array(arrayBuffer)),
  };

  peers.forEach(p => manager.send(p, payload));
};
```

Receiving peers will automatically reconstruct and download the file.

## 🧩 Architecture

```
LocalBeam
├── server/                # Signaling + discovery (WebSocket + Bonjour)
│   └── server.js
├── src/core/
│   ├── signalingClient.ts # WebSocket signaling logic
│   ├── peerManager.ts     # WebRTC peer lifecycle management
│   └── strategies/
│       ├── directTransfer.ts   # Simple direct send
│       ├── chunkedTransfer.ts  # (optional) large files
│       └── ...
└── examples/react-demo/   # Example React app
```

## 📦 Example Implementations

| Project | Type | Status | Repo |
|--------|------|:------:|------|
| `localbeam-react` | React example app demonstrating peer discovery & file transfer | ✅ Done | [localbeam-react](https://github.com/Oneiros8/localbeam-react) |

## ⚙️ Configuration

| Option | Default | Description |
|--------|---------|-------------|
| baseUrl | http://localhost:3001 | Signaling server URL |
| bonjourService | LocalBeam Signaling Server | Bonjour (mDNS) name |
| port | 3001 | WebSocket server port |

## 📚 API Reference

### SignalingClient

| Method | Description |
|--------|-------------|
| connect() | Connect to signaling server |
| on(event, handler) | Listen to "open", "close", "peer-list" |

### PeerManager

| Method | Description |
|--------|-------------|
| createConnection(peerId) | Initiate WebRTC connection |
| send(peerId, data) | Send text, buffer, or file |
| closeAll() | Close all active connections |
| on(event, handler) | Listen to "peer-connected", "data", "peer-list" |

## 🧪 Example Logs

```
[INFO] WebSocket connected to ws://192.168.1.21:3001
[INFO] Peer registered: react-client-217
[INFO] ✅ Connected to peer react-client-634
[INFO] 📦 Received file: sample.pdf (128KB)
```

## 💡 Use Cases

- LAN chat or collaboration tools
- Classroom / office file sharing
- IoT or local device communication
- Offline-first syncing
- Local multiplayer games

## 🗺️ Roadmap

Here's what's coming next in LocalBeam:

### 📱 Reference Applications
- **React File Transfer App**: A polished, production-ready example showcasing real-time file sharing and chat
- **Electron Desktop Client**: Cross-platform desktop application demonstrating native integration capabilities
- Both applications will serve as comprehensive implementation guides for the community

### 🌍 Global Connectivity
- **Cloud Signaling Infrastructure**: Optional hosted signaling service for beyond-LAN connections
- **Secure Remote Discovery**: Encrypted peer discovery without mDNS dependency
- **Authentication & Authorization**: Built-in support for secure peer verification
- **NAT Traversal**: Improved STUN/TURN support for reliable connections across networks

### ⚡ Performance Enhancements
- **Streaming Transfer Strategy**: Efficient handling of large files (100MB+)
- **Chunked File Protocol**: Resume support and progress tracking
- **Compression Options**: Smart compression based on file types
- **Multi-Connection Transfer**: Parallel chunk transfer for faster speeds

### 🎯 Future Features
- Enhanced encryption and security features
- Connection quality metrics and diagnostics
- Plugin system for custom transfer strategies
- Mobile platform support (React Native)
- And more coming soon...

Follow the [GitHub repository](https://github.com/Oneiros8/localbeam) for updates!

## 🤝 Contributing

Contributions are welcome!
To start hacking:

```bash
git clone https://github.com/<your-username>/localbeam.git
cd localbeam
npm install
npm run dev
```

Submit PRs or open issues for bugs, features, or documentation.

## 📜 License

MIT License © 2025 Oneiros8 
Use freely, modify, and share.

## 🌟 Acknowledgments

- simple-peer
- bonjour
- ws
