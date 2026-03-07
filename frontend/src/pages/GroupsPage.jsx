import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import MainLayout from '../components/Layout/MainLayout';
import GroupCard from '../components/Groups/GroupCard';
import CreateGroupModal from '../components/Groups/CreateGroupModal';
import api from '../api/axios';

const GroupsPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups]         = useState([]);
  const [myGroups, setMyGroups]     = useState([]);
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab]               = useState('all'); // all | my

  const loadGroups = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get('/groups', { params: q ? { q } : {} });
      const all = res.data?.groups || [];
      setGroups(all);
      setMyGroups(all.filter(g => !!g.my_role));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadGroups(query);
  };

  const handleJoin = async (slug) => {
    try {
      const res = await api.post(`/groups/${slug}/join`);
      if (res.data.status === 'pending') {
        alert('Заявка отправлена! Ожидайте подтверждения.');
      }
      loadGroups(query);
    } catch (e) {
      alert(e?.response?.data?.detail || 'Ошибка');
    }
  };

  const handleLeave = async (slug) => {
    if (!window.confirm('Покинуть группу?')) return;
    try {
      await api.delete(`/groups/${slug}/leave`);
      loadGroups(query);
    } catch (e) {
      alert(e?.response?.data?.detail || 'Ошибка');
    }
  };

  const displayed = tab === 'my' ? myGroups : groups;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6" /> Группы
          </h1>
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Создать
          </Button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Поиск групп..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </form>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {[{ id: 'all', label: 'Все группы' }, { id: 'my', label: `Мои (${myGroups.length})` }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{tab === 'my' ? 'Вы не состоите в группах' : 'Групп не найдено'}</p>
            {tab === 'my' && (
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                Создать первую группу
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(g => (
              <GroupCard key={g.id} group={g} onJoin={handleJoin} onLeave={handleLeave} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => { setShowCreate(false); loadGroups(query); }} />}
    </MainLayout>
  );
};

export default GroupsPage;
