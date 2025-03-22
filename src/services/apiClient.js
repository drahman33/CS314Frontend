import axios from 'axios';

const baseURL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5173';

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

export default apiClient;

