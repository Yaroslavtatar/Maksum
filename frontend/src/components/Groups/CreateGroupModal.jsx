import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Lock, Globe } from 'lucide-react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const CreateGroupModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Введите название группы'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/groups', {
        name: trimmed,
        description: description.trim() || null,
        is_private: isPrivate,
      });
      onClose?.();
      navigate(`/groups/${res.data.slug}`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Не удалось создать группу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Создать группу</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="group-name">Название *</Label>
            <Input
              id="group-name"
              placeholder="Название группы"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              disabled={loading}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-desc">Описание</Label>
            <textarea
              id="group-desc"
              placeholder="Расскажите о группе..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Тип группы */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                !isPrivate
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <Globe className={`w-6 h-6 ${!isPrivate ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="text-sm font-medium">Открытая</span>
              <span className="text-xs text-gray-500 text-center">Все могут вступить</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                isPrivate
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              <Lock className={`w-6 h-6 ${isPrivate ? 'text-purple-600' : 'text-gray-400'}`} />
              <span className="text-sm font-medium">Закрытая</span>
              <span className="text-xs text-gray-500 text-center">По заявкам</span>
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 h-11" disabled={loading || !name.trim()}>
              {loading ? 'Создание...' : 'Создать группу'}
            </Button>
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose}>
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
