import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const UserContext = createContext(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [posts, setPosts] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);

  // Загрузка данных текущего пользователя
  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setUser(null);
      return null;
    }

    try {
      const response = await api.get('/users/me');
      setUser(response.data);
      // Сохраняем в localStorage для быстрого доступа
      localStorage.setItem('maksum-user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      // Если ошибка авторизации, очищаем localStorage
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('maksum-user');
      }
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка друзей
  const fetchFriends = useCallback(async () => {
    try {
      const response = await api.get('/friends');
      setFriends(response.data || []);
      return response.data;
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
      return [];
    }
  }, []);

  // Загрузка постов пользователя
  const fetchMyPosts = useCallback(async () => {
    try {
      const response = await api.get('/posts/my');
      setPosts(response.data || []);
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
      return [];
    }
  }, []);

  // Загрузка ленты
  const fetchFeed = useCallback(async () => {
    try {
      const response = await api.get('/feed');
      setFeedPosts(response.data || []);
      return response.data;
    } catch (error) {
      console.error('Error fetching feed:', error);
      setFeedPosts([]);
      return [];
    }
  }, []);

  // Обновление профиля
  const updateProfile = useCallback(async (data) => {
    try {
      const response = await api.put('/users/me', data);
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, []);

  // Создание поста
  const createPost = useCallback(async (content, images = []) => {
    try {
      const response = await api.post('/posts', { content, images });
      const newPost = response.data;
      setPosts((prev) => [newPost, ...prev]);
      return newPost;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }, []);

  // Лайк поста (id поста — число или строка, сравниваем по значению)
  const likePost = useCallback(async (postId) => {
    const id = Number(postId);
    if (!Number.isInteger(id)) return;
    try {
      const response = await api.post(`/posts/${id}/like`);
      const { liked, likes } = response.data;
      const upd = (post) =>
        Number(post.id) === id ? { ...post, liked, likes } : post;
      setPosts((prev) => prev.map(upd));
      setFeedPosts((prev) => prev.map(upd));
      return response.data;
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }, []);

  // Добавление в друзья
  const sendFriendRequest = useCallback(async (userId) => {
    try {
      const response = await api.post('/friends/request', { user_id: userId });
      return response.data;
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }, []);

  // Выход из аккаунта
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('device_id');
    setUser(null);
    setFriends([]);
    setPosts([]);
    setFeedPosts([]);
    window.location.href = '/login';
  }, []);

  // Инициализация при загрузке - сначала загружаем из localStorage для мгновенного отображения
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Пытаемся загрузить из localStorage для мгновенного отображения
      const cachedUser = localStorage.getItem('maksum-user');
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          setUser(parsed);
        } catch (e) {
          console.error('Error parsing cached user:', e);
        }
      }
      // Затем загружаем свежие данные с сервера
      fetchUser();
    } else {
      setLoading(false);
      setUser(null);
      localStorage.removeItem('maksum-user');
    }
  }, [fetchUser]);

  // Слушаем кастомное событие для обновления данных после входа
  useEffect(() => {
    const handleTokenSet = () => {
      const token = localStorage.getItem('token');
      if (token) {
        fetchUser();
      }
    };

    window.addEventListener('maksum:token-set', handleTokenSet);
    return () => {
      window.removeEventListener('maksum:token-set', handleTokenSet);
    };
  }, [fetchUser]);

  // Пинг активности для статуса «В сети» (обновление last_seen каждые 60 сек)
  useEffect(() => {
    if (!user) return;
    const ping = () => api.post('/users/me/ping').catch(() => {});
    ping();
    const id = setInterval(ping, 60000);
    return () => clearInterval(id);
  }, [user]);

  const value = {
    user,
    loading,
    friends,
    posts,
    feedPosts,
    fetchUser,
    fetchFriends,
    fetchMyPosts,
    fetchFeed,
    updateProfile,
    createPost,
    likePost,
    sendFriendRequest,
    logout,
    isAuthenticated: !!user,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;
