import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5173';

const socket = io(SERVER_URL, {
  withCredentials: true,
  extraHeaders: {
    'ngrok-skip-browser-warning': 'true',
  },
});

export default socket;

