import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import api from '../../api/axios';
import StatusBadge from './StatusBadge';
import UserBadges from './UserBadges';
import {
  Phone,
  Calendar,
  User,
  ExternalLink,
  Loader2,
} from 'lucide-react';

const UserPreviewModal = ({ userId, open, onClose }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) {
      setUser(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get(`/users/${userId}`)
      .then((res) => {
        if (!cancelled) setUser(res.data);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, open]);

  const handleOpenFull = () => {
    onClose();
    if (user?.username) {
      navigate(`/profile/@${user.username}`);
    } else {
      navigate(`/users/${userId}`);
    }
  };

  const bannerStyle = user?.cover_photo
    ? { backgroundImage: `url(${user.cover_photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, #475569 0%, #334155 100%)' };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 bg-card border-border">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : user ? (
          <>
            <div className="h-20 relative" style={bannerStyle} />
            <div className="px-4 pb-4 -mt-12 relative z-10">
              <Avatar className="w-24 h-24 border-4 border-background shadow-xl ring-2 ring-background">
                <AvatarImage src={user.avatar_url} alt={user.username} />
                <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                  {(user.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-1">
                  {user.username}
                  <UserBadges isOfficial={user.is_official} isModerator={user.is_moderator} />
                </h2>
                <StatusBadge status={user.status} className="text-xs" />
              </div>

              <div className="mt-5 space-y-4 text-sm">
                {user.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Телефон</p>
                    <p className="text-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                      {user.phone}
                    </p>
                  </div>
                )}
                {user.bio && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">О себе</p>
                    <p className="text-foreground">{user.bio}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Имя пользователя</p>
                  <p className="text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                    @{user.username}
                  </p>
                </div>
                {user.birth_date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">День рождения</p>
                    <p className="text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 shrink-0 text-muted-foreground" />
                      {user.birth_date}
                    </p>
                  </div>
                )}
                {user.work_hours && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Часы работы</p>
                    <p className="text-foreground">{user.work_hours}</p>
                  </div>
                )}
                {user.community_name && (
                  <div className="rounded-lg border border-border p-3 bg-muted/40">
                    <p className="font-medium text-foreground">{user.community_name}</p>
                    {user.community_description && (
                      <p className="text-xs text-muted-foreground mt-1">{user.community_description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Канал • сообщество</p>
                  </div>
                )}
              </div>

              <Button
                className="w-full mt-5 rounded-lg"
                onClick={handleOpenFull}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Открыть полностью
              </Button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Пользователь не найден
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserPreviewModal;
