import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

/**
 * Редирект с /profile на /profile/@username текущего пользователя (как в Telegram).
 */
const ProfileRedirect = () => {
  const { user } = useUser();

  if (!user?.username) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/profile/@${user.username}`} replace />;
};

export default ProfileRedirect;
