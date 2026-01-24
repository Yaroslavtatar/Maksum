import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { mockUser } from '../../mock/mockData';
import { 
  Home, 
  MessageCircle, 
  Users, 
  Bell, 
  Music, 
  Image, 
  Video, 
  Bookmark,
  Settings,
  HelpCircle
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Моя страница', path: '/profile' },
    { icon: Home, label: 'Новости', path: '/' },
    { icon: MessageCircle, label: 'Сообщения', path: '/messages', badge: 3 },
    { icon: Users, label: 'Друзья', path: '/friends' },
    { icon: Bell, label: 'Уведомления', path: '/notifications', badge: 5 },
    { icon: Music, label: 'Музыка', path: '/music' },
    { icon: Image, label: 'Фотографии', path: '/photos' },
    { icon: Video, label: 'Видео', path: '/videos' },
    { icon: Bookmark, label: 'Закладки', path: '/bookmarks' },
    { icon: Settings, label: 'Настройки', path: '/settings' },
    { icon: HelpCircle, label: 'Помощь', path: '/help' },
  ];

  const [avatarSrc, setAvatarSrc] = useState('');

  useEffect(() => {
    let mounted = true;
    import('axios').then(({ default: axios }) => {
      axios.get('/api/users/me/avatar', { responseType: 'blob' })
        .then((res) => {
          const url = URL.createObjectURL(res.data);
          if (mounted) setAvatarSrc(url);
        })
        .catch(() => {});
    });
    return () => { mounted = false; };
  }, []);

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
        <Link to="/profile" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <Avatar className="w-10 h-10">
            <AvatarImage src={avatarSrc || undefined} alt={mockUser.name} />
            <AvatarFallback>{mockUser.firstName[0]}{mockUser.lastName[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {mockUser.name}
            </p>
            <p className="text-xs text-green-500">В сети</p>
          </div>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
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