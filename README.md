# CodeFusion
![CI Status](https://github.com/omkark2404/CodeFusion/actions/workflows/ci.yml/badge.svg)

> A real-time collaborative coding platform designed for seamless pair programming and remote interviews.

## 🚀 The Problem & Solution
While many collaborative editors exist, they lack robust developer tools out of the box. CodeFusion bridges this gap by offering a fully synced Monaco editor, integrated WebRTC voice chat, and secure Remote Code Execution (RCE) in a single browser window. This eliminates the need for juggling separate screen-sharing, communication, and execution tools during pair programming sessions.

## ✨ Key Features
- **Real-time Code Sync:** Millisecond-latency code broadcasting via Socket.IO.
- **Multi-User Cursors:** See exactly where your team members are typing with live cursor tracking.
- **Remote Code Execution (RCE):** Safely compile and run JS, Python, Java, C++, and C with standard input (stdin) support. Execution is heavily sandboxed using Judge0 (powered by the `isolate` sandboxing tool) with fallbacks to Piston and Wandbox APIs.
- **Integrated Voice & Text Chat:** WebRTC-powered peer-to-peer audio and a persistent room text chat (no external tools required).

## 📸 Preview / Demo
- **Live Demo:** [https://codesync-clients.onrender.com](https://codesync-clients.onrender.com)
- **Screenshot:** ![CodeFusion Demo](docs/demo.gif) *(TODO: Upload docs/demo.gif)*

## 🛠 Tech Stack
- **Frontend:** React 18, Monaco Editor, Socket.IO Client, WebRTC
- **Backend:** Node.js, Express, Socket.IO, Helmet
- **Execution Engine:** Judge0 (`isolate` sandbox) + Piston/Wandbox API fallbacks
- **CI/CD:** GitHub Actions (Linting & Testing), Docker Compose

## 🏗 Architecture
```mermaid
graph TD
    Client[React Client (Browser)]
    Backend[Node.js / Express Server]
    Judge0[Judge0 Sandbox / isolate]
    Wandbox[Wandbox API]
    Piston[Piston API]
    
    Client <-->|Socket.IO (Code, Chat, Cursors)| Backend
    Client <-->|WebRTC (P2P Voice)| Client
    Backend -->|Execute Code| Judge0
    Backend -->|Fallback| Piston
    Backend -->|Fallback| Wandbox
```

## ⚙️ Environment Variables
### Server (`server/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Backend listening port |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `JUDGE0_URL` | `http://judge0-server:2358` | URL of the Judge0 execution engine |
| `POSTGRES_USER` | `judge0` | Judge0 database username |
| `POSTGRES_PASSWORD` | | Judge0 database password |
| `POSTGRES_DB` | `judge0` | Judge0 database name |

### Client (`client/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_SERVER_URL` | `http://localhost:5000` | URL of the Node.js backend |
| `REACT_APP_STUN_SERVER` | `stun:stun.l.google.com:19302` | WebRTC STUN/TURN server URL |

## 📡 Socket Events API
| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | Client ➔ Server | Join a room with username |
| `room_users` | Server ➔ Client | Receive list of active users in room |
| `code:sync` | Client ➔ Server | Send code updates |
| `receive_code` | Server ➔ Client | Receive code updates from peers |
| `cursor_move` | Client ➔ Server | Send cursor position |
| `remote_cursor` | Server ➔ Client | Receive peer cursor positions |
| `code:run` | Client ➔ Server | Trigger code execution |
| `code:output` | Server ➔ Client | Receive execution stdout/stderr |
| `chat:send` | Client ➔ Server | Send text chat message |
| `chat:receive`| Server ➔ Client | Receive text chat message |
| `voice:offer` / `voice:answer` | Client ➔ Server ➔ Client | WebRTC SDP signaling |
| `voice:ice-candidate` | Client ➔ Server ➔ Client | WebRTC ICE candidate signaling |

## 🚀 Setup & Deployment
### Local Setup with Docker
You can run the entire stack (React, Node, Judge0, Postgres, Redis) with one command:
```bash
git clone https://github.com/omkark2404/CodeFusion.git
cd CodeFusion
cp server/.env.example server/.env
cp client/.env.example client/.env
docker-compose up -d
```

### Deployment (Render)
Due to Judge0 requiring a privileged container (for `isolate` sandboxing features), Judge0 cannot be deployed natively on Render's standard web services. 
- **Production Flow:** The frontend and Node.js backend are hosted on Render. Code execution gracefully falls back to the Piston and Wandbox APIs when a dedicated self-hosted Judge0 instance isn't available.

## 🔒 Security Notes
- **Payload Limits:** Strict 100KB limits on code payloads and 10KB limits on standard input to prevent DOS attacks.
- **Rate Limiting:** Users are rate-limited to 10 execution requests per minute to prevent abuse.
- **Execution:** User code is strictly executed via the `isolate` Linux sandbox tool or isolated third-party APIs. No local host execution (`child_process.spawn`) is permitted.
- **CORS:** Origins are strictly controlled via `CLIENT_ORIGIN` environment variables.

## 🧠 Design Decisions & Trade-offs
- **In-Memory State:** Room state and chat history are currently stored in memory (`Map` objects). This ensures blazing-fast read/writes for real-time collaboration. The trade-off is that server restarts clear all active rooms. A future improvement would be backing this with Redis.
- **WebRTC over SFU:** Voice chat uses a mesh P2P WebRTC topology. This keeps infrastructure costs to zero and works flawlessly for small teams (2-5 people), but would not scale to 50+ users in a single room (which would require an SFU like mediasoup).

## 👤 Author
**Shashank**
- GitHub: [@omkark2404](https://github.com/omkark2404)