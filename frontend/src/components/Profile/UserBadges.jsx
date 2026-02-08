import React from 'react';
import { BadgeCheck, Wrench } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

/**
 * Бейджи рядом с именем: галочка — официальный профиль, ключ — модератор.
 * Выдаются из админ-панели.
 */
const UserBadges = ({ isOfficial, isModerator, className = '' }) => {
  if (!isOfficial && !isModerator) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <span className={`inline-flex items-center gap-0.5 ${className}`}>
        {isOfficial && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-primary" aria-label="Официальный профиль">
                <BadgeCheck className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Официальный профиль</p>
            </TooltipContent>
          </Tooltip>
        )}
        {isModerator && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground" aria-label="Модератор">
                <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Модератор</p>
            </TooltipContent>
          </Tooltip>
        )}
      </span>
    </TooltipProvider>
  );
};

export default UserBadges;
