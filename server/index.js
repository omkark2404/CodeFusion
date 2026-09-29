// Entry point — creates server, attaches Socket.IO, starts listening
require('dotenv').config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const setupSocket = require("./socket");
const { PORT } = require("./config/constants");

const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_ORIGIN 
  ? process.env.CLIENT_ORIGIN.split(',') 
  : ["http://localhost:3000", "https://codesync-clients.onrender.com"];

const io = new Server(server, {
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  },
});

const logger = require("./utils/logger");

setupSocket(io);

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});