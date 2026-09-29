# CodeFusion
![CI Status](https://github.com/omkark2404/CodeFusion/actions/workflows/ci.yml/badge.svg)

> A real-time collaborative coding platform designed for seamless pair programming and remote interviews.

## 🚀 The Problem & Solution
While many collaborative editors exist (like Google Docs), they lack robust developer tools. CodeFusion bridges this gap by offering a fully synced Monaco editor, integrated WebRTC voice chat, and secure, sandboxed Remote Code Execution (RCE) in a single browser window. This eliminates the need for separate screen-sharing, communication, and execution tools during pair programming sessions.

## ✨ Key Features
- **Real-time Code Sync:** Millisecond-latency code broadcasting via Socket.IO.
- **Multi-User Cursors:** See exactly where your team members are typing with live cursor tracking.
- **Remote Code Execution (RCE):** Safely compile and run JS, Python, Java, C++, and C with standard input (stdin) support. Execution is heavily sandboxed using Docker (Judge0) with fallbacks to Piston and Wandbox APIs.
- **Integrated Voice & Text Chat:** WebRTC-powered peer-to-peer audio and a persistent room text chat (no external tools required).

## 🛠 Tech Stack
- **Frontend:** React 18, Monaco Editor, Socket.IO Client, WebRTC
- **Backend:** Node.js, Express, Socket.IO
- **Execution Engine:** Judge0 (Dockerized self-hosted) + Piston/Wandbox API fallbacks
- **CI/CD:** GitHub Actions (Linting & Testing)

## 🏗 Architecture
```mermaid
graph TD
    Client[React Client (Browser)]
    Backend[Node.js / Express Server]
    Judge0[Judge0 Sandbox / Docker]
    Wandbox[Wandbox API]
    Piston[Piston API]
    
    Client <-->|Socket.IO (Code, Chat, Cursors)| Backend
    Client <-->|WebRTC (P2P Voice)| Client
    Backend -->|Execute Code| Judge0
    Backend -->|Fallback| Piston
    Backend -->|Fallback| Wandbox
```
- **`client/`**: React SPA handling the editor (Monaco), WebRTC signaling, and socket events.
- **`server/`**: Express API & Socket.IO server. Handles room state, memory-leak-safe cleanup on disconnect, payload validation, and routes execution requests.

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+
- Docker & Docker Compose (for local Judge0 execution)

### 1. Clone & Install
```bash
git clone https://github.com/omkark2404/CodeFusion.git
cd CodeFusion

# Install Server dependencies
cd server
npm install

# Install Client dependencies
cd ../client
npm install
```

### 2. Environment Variables
In the `server` directory, copy the example env file:
```bash
cd server
cp .env.example .env
```
*(Optionally, update `.env` with your desired configuration).*

### 3. Run the Services
**Start the local Judge0 Engine (Docker):**
```bash
cd server
docker-compose up -d
```

**Start the Backend:**
```bash
cd server
npm run dev
```

**Start the Frontend:**
```bash
cd client
npm start
```
The app will open at `http://localhost:3000`.

## 📸 Preview / Demo
- **Live Demo:** [https://codesync-clients.onrender.com](https://codesync-clients.onrender.com)

## 🧪 Running Tests
The server includes a Jest test suite for the data models and core logic.
```bash
cd server
npm test
```

## 🧠 Design Decisions & Trade-offs
- **In-Memory State:** Room state and chat history are currently stored in memory (`Map` objects). This ensures blazing-fast read/writes for real-time collaboration. The trade-off is that server restarts clear all active rooms. A future improvement would be backing this with Redis.
- **WebRTC over SFU:** Voice chat uses a mesh P2P WebRTC topology. This keeps infrastructure costs to zero and works flawlessly for small teams (2-5 people), but would not scale to 50+ users in a single room (which would require an SFU like mediasoup).
- **Security:** We completely removed local `child_process` execution in favor of strictly using isolated Docker containers (Judge0) or external sandboxed APIs (Piston) to prevent RCE vulnerabilities.

## 👤 Author
**Shashank**
- GitHub: [@omkark2404](https://github.com/omkark2404)