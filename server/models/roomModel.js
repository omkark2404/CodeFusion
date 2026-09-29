// Model: in-memory room state
const rooms = new Map();

function getRoomCode(roomId) {
  return rooms.get(roomId) || "";
}

function setRoomCode(roomId, code) {
  rooms.set(roomId, code);
}

function deleteRoomCode(roomId) {
  rooms.delete(roomId);
}

module.exports = { getRoomCode, setRoomCode, deleteRoomCode };
