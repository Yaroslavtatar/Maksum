import React from 'react';
import { Badge } from '../ui/badge';

const LABELS = { online: 'В сети', inactive: 'Неактивен', offline: 'Офлайн' };

const StatusBadge = ({ status = 'offline', className = '' }) => {
  const s = status === 'online' ? 'online' : status === 'inactive' ? 'inactive' : 'offline';
  const label = LABELS[s];
  const variant =
    s === 'online'
      ? 'text-green-600 border-green-600 dark:text-green-400 dark:border-green-400'
      : s === 'inactive'
        ? 'text-amber-600 border-amber-600 dark:text-amber-400 dark:border-amber-400'
        : 'text-muted-foreground border-muted-foreground';
  return (
    <Badge variant="outline" className={`${variant} ${className}`}>
      {label}
    </Badge>
  );
};

export default StatusBadge;
