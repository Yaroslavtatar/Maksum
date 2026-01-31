import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import ProfilePage from './ProfilePage';
import UserProfile from './UserProfile';

/**
 * Маршрут /profile/:username (например /profile/@ilya или /profile/ilya).
 * Если username совпадает с текущим пользователем — показываем свой профиль (ProfilePage).
 * Иначе — чужой профиль (UserProfile по username).
 */
const ProfileByUsernamePage = () => {
  const { username: usernameParam } = useParams();
  const { user: currentUser } = useUser();

  const normalizedUsername = (usernameParam || '').replace(/^@+/, '').trim();

  if (!normalizedUsername) {
    return <Navigate to="/" replace />;
  }

  if (currentUser?.username === normalizedUsername) {
    return <ProfilePage />;
  }

  return <UserProfile username={normalizedUsername} />;
};

export default ProfileByUsernamePage;
