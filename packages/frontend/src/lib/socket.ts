import { io } from 'socket.io-client';
import { getStoredToken } from './canisters';

export const socket = io('http://localhost:5000', {
  auth: {
    token: getStoredToken()
  },
  autoConnect: false
});

// Reconnect with new token when it changes
export function updateSocketAuth(token: string) {
  socket.auth = { token };
  if (socket.connected) {
    socket.disconnect().connect();
  }
} 