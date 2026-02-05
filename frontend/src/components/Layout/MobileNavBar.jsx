import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Users, Bell, User } from 'lucide-react';

const MobileNavBar = () => {
  const location = useLocation();

  const items = [
    { to: '/', icon: Home, label: 'Лента' },
    { to: '/messages', icon: MessageCircle, label: 'Чаты' },
    { to: '/friends', icon: Users, label: 'Друзья' },
    { to: '/notifications', icon: Bell, label: 'Сигналы' },
    { to: '/profile', icon: User, label: 'Профиль' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-area-inset-bottom lg:hidden">
      <div className="flex justify-around items-stretch h-14 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex-1 flex flex-col items-center justify-center text-[11px] leading-tight"
            >
              <div
                className={`flex flex-col items-center justify-center rounded-full px-3 py-1 ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className={active ? 'font-semibold' : ''}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavBar;

