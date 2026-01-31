import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '../ui/dropdown-menu';
import { useUser } from '../../context/UserContext';
import api from '../../api/axios';
import { 
  Search, 
  Bell, 
  MessageCircle, 
  Settings, 
  LogOut, 
  User,
  Plus
} from 'lucide-react';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useUser();

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // Обновляем каждые 30 секунд
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadNotifications(res.data.count || 0);
    } catch (e) {
      // Игнорируем ошибки
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/find-friends?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/find-friends');
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-card border-b border-border fixed top-0 left-64 right-0 z-40 h-16">
      <div className="flex items-center justify-between h-full px-6">
        {/* Search Bar */}
        <div className="flex-1 max-w-lg">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Поиск людей, сообществ, записей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-0 focus:bg-background focus:ring-2 focus:ring-primary"
            />
          </form>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Create Post Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Фокус на поле создания поста на главной странице
              if (window.location.pathname === '/') {
                document.querySelector('textarea')?.focus();
              } else {
                navigate('/');
                setTimeout(() => document.querySelector('textarea')?.focus(), 100);
              }
            }}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Создать</span>
          </Button>

          {/* Notifications */}
          <Link to="/notifications" className="relative">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Button>
          </Link>

          {/* Messages */}
          <Link to="/messages">
            <Button variant="ghost" size="sm">
              <MessageCircle className="w-5 h-5" />
            </Button>
          </Link>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url} alt={user?.username} />
                  <AvatarFallback>{(user?.username || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">{user?.username || 'Пользователь'}</p>
                  <p className="w-[200px] truncate text-xs text-muted-foreground">
                    {user?.email || ''}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={user ? `/profile/@${user.username}` : '/profile'} className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Профиль</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Настройки</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Выйти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;