import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useUser } from '../../context/UserContext';
import { 
  Home, 
  MessageCircle, 
  Users, 
  Bell, 
  Music, 
  Image as ImageIcon, 
  Bookmark,
  Settings,
  HelpCircle,
  UserPlus,
  Shield
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useUser();

  const menuItems = [
    { icon: Home, label: 'Моя страница', path: '/profile' },
    { icon: Home, label: 'Новости', path: '/' },
    { icon: MessageCircle, label: 'Сообщения', path: '/messages' },
    { icon: Users, label: 'Друзья', path: '/friends' },
    { icon: UserPlus, label: 'Найти друзей', path: '/find-friends' },
    { icon: Bell, label: 'Уведомления', path: '/notifications' },
    { icon: Music, label: 'Музыка', path: '/music' },
    { icon: ImageIcon, label: 'Медиа', path: '/media' },
    { icon: Bookmark, label: 'Закладки', path: '/bookmarks' },
    { icon: Settings, label: 'Настройки', path: '/settings' },
    { icon: HelpCircle, label: 'Помощь', path: '/help' },
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-screen fixed left-0 top-0 pt-4 px-4 overflow-y-auto">
      {/* Logo */}
      <div className="mb-8">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          <span className="text-xl font-bold text-foreground">MAKSUM</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="mb-6 p-3 bg-muted rounded-lg">
        <Link to={user ? `/profile/@${user.username}` : '/profile'} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.avatar_url} alt={user?.username} />
            <AvatarFallback>{(user?.username || 'U')[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.username || 'Пользователь'}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.status === 'online' ? (
                <span className="text-green-500">В сети</span>
              ) : user?.status === 'inactive' ? (
                <span className="text-amber-500">Неактивен</span>
              ) : (
                <span className="text-muted-foreground">Офлайн</span>
              )}
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isProfile = item.path === '/profile';
          const href = isProfile && user ? `/profile/@${user.username}` : item.path;
          const isActive = isProfile && user ? location.pathname === `/profile/@${user.username}` : location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={href}
              className={`
                flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-primary/10 text-primary border-r-2 border-primary' 
                  : 'text-foreground/80 hover:bg-muted'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
        {user?.is_admin && (
          <Link
            to="/cryadmin"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-2
              ${location.pathname === '/cryadmin' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-foreground/80 hover:bg-muted'}
            `}
          >
            <Shield className="w-5 h-5" />
            <span className="flex-1">Админ-панель</span>
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-4 left-4 right-4 text-xs text-muted-foreground">
        <p>© 2025 MAKSUM</p>
        <p>Версия 1.0</p>
      </div>
    </div>
  );
};

export default Sidebar;