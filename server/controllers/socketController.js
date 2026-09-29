const { getRoomCode, setRoomCode, deleteRoomCode } = require("../models/roomModel");
const { deleteHistory } = require("../models/Message");
const { clearRateLimit } = require("./codeController");
const { USER_COLORS } = require("../config/constants");

const socketMeta = new Map();
const roomColorIndex = new Map();
const roomLanguage = new Map();

function getSocketMeta() { return Object.fromEntries(socketMeta); }

function setRoomLanguage(roomId, language) {
  roomLanguage.set(roomId, language);
}

function getNextColor(roomId) {
  if (!roomColorIndex.has(roomId)) roomColorIndex.set(roomId, 0);
  const color = USER_COLORS[roomColorIndex.get(roomId) % USER_COLORS.length];
  roomColorIndex.set(roomId, roomColorIndex.get(roomId) + 1);
  return color;
}

function handleJoinRoom(io, socket, { roomId, username }) {
  if (typeof roomId !== 'string' || roomId.length > 50) return;
  if (typeof username !== 'string' || username.length > 50) return;

  socket.join(roomId);

  const color = getNextColor(roomId);
  socketMeta.set(socket.id, { roomId, username, color });

  const code = getRoomCode(roomId);
  if (code) socket.emit("receive_code", code);

  if (roomLanguage.has(roomId)) {
    socket.emit("language:changed", { language: roomLanguage.get(roomId) });
  }

  socket.emit("assigned_color", { color });

  socket.to(roomId).emit("user_joined", { socketId: socket.id, username, color });

  const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
  const users = clients
    .filter((id) => id !== socket.id && socketMeta.has(id))
    .map((id) => ({
      socketId: id,
      username: socketMeta.get(id).username,
      color: socketMeta.get(id).color,
    }));
  socket.emit("room_users", users);
}

function handleSendCode(socket, { roomId, code }) {
  if (typeof code !== 'string' || code.length > 200000) return;
  setRoomCode(roomId, code);
  socket.to(roomId).emit("receive_code", code);
}

function handleCursorMove(socket, { roomId, line, column, selection }) {
  const meta = socketMeta.get(socket.id);
  if (!meta) return;
  socket.to(roomId).emit("remote_cursor", {
    socketId: socket.id,
    username: meta.username,
    color: meta.color,
    line,
    column,
    selection: selection || null,
  });
}

function handleDisconnect(io, socket) {
  const meta = socketMeta.get(socket.id);
  if (meta) {
    const { roomId } = meta;
    socket.to(roomId).emit("user_left", { socketId: socket.id });
    socketMeta.delete(socket.id);

    // Check if room is empty
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (!clients || clients.size === 0) {
      console.log(`[Cleanup] Room ${roomId} is empty. Cleaning up memory.`);
      deleteRoomCode(roomId);
      deleteHistory(roomId);
      clearRateLimit(roomId);
      roomLanguage.delete(roomId);
      roomColorIndex.delete(roomId);
    }
  }
  console.log("User disconnected:", socket.id);
}

module.exports = {
  handleJoinRoom,
  handleSendCode,
  handleCursorMove,
  handleDisconnect,
  getSocketMeta,
  setRoomLanguage
};