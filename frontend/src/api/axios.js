import axios from 'axios';

// Относительный /api — запросы идут на тот же хост (IP:3000), dev-сервер проксирует на 127.0.0.1:8001
const BACKEND_URL = '';
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Создаём глобальный axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Токен недействителен - разлогиниваем
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export { BACKEND_URL };
