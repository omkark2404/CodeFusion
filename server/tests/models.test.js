const { getRoomCode, setRoomCode, deleteRoomCode } = require('../models/roomModel');
const { createMessage, addMessage, getHistory, deleteHistory } = require('../models/Message');

describe('Room Model', () => {
  it('should set, get, and delete room code', () => {
    setRoomCode('room1', 'console.log(1)');
    expect(getRoomCode('room1')).toBe('console.log(1)');
    deleteRoomCode('room1');
    expect(getRoomCode('room1')).toBe('');
  });
});

describe('Message Model', () => {
  it('should create, add, retrieve, and delete history', () => {
    const msg = createMessage({ roomId: 'room1', userId: 'u1', username: 'test', text: 'hi' });
    expect(msg.roomId).toBe('room1');
    addMessage(msg);
    expect(getHistory('room1').length).toBe(1);
    deleteHistory('room1');
    expect(getHistory('room1').length).toBe(0);
  });
});