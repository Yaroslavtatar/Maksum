import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Lock } from 'lucide-react';
import { Button } from '../ui/button';

const GroupCard = ({ group, onJoin, onLeave, compact = false }) => {
  const navigate = useNavigate();
  const { id, name, slug, description, avatar_url, is_private, members_count, my_role } = group;

  const isMember = !!my_role;

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex gap-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/groups/${slug}`)}
    >
      {/* Avatar */}
      <div className="shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
        {avatar_url
          ? <img src={avatar_url} alt={name} className="w-full h-full object-cover" />
          : <span className="text-white text-xl font-bold">{name[0]?.toUpperCase()}</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold truncate text-gray-900 dark:text-white">{name}</h3>
          {is_private && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
        </div>
        {!compact && description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{description}</p>
        )}
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <Users className="w-3.5 h-3.5" />
          <span>{members_count ?? 0} участников</span>
          {my_role === 'owner' && <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">владелец</span>}
          {my_role === 'moderator' && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">модератор</span>}
          {my_role === 'member' && <span className="ml-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">участник</span>}
        </div>
      </div>

      {/* Action */}
      {(onJoin || onLeave) && (
        <div className="shrink-0 flex items-center" onClick={e => e.stopPropagation()}>
          {isMember
            ? (my_role !== 'owner' && onLeave && (
                <Button size="sm" variant="outline" onClick={() => onLeave(slug)}>Выйти</Button>
              ))
            : (onJoin && (
                <Button size="sm" onClick={() => onJoin(slug)}>
                  {is_private ? 'Подать заявку' : 'Вступить'}
                </Button>
              ))
          }
        </div>
      )}
    </div>
  );
};

export default GroupCard;
