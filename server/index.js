// Entry point — creates server, attaches Socket.IO, starts listening
require('dotenv').config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const setupSocket = require("./socket");
const { PORT } = require("./config/constants");

const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',') 
  : ["http://localhost:3000", "https://codesync-clients.onrender.com"];

const io = new Server(server, {
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  },
});

setupSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});