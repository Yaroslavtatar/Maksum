import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Lock, Globe, Settings, ArrowLeft, Plus, Trash2, UserX, Shield, ChevronDown, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import MainLayout from '../components/Layout/MainLayout';
import api from '../api/axios';
import { useUser } from '../context/UserContext';

// ── Утилиты ──────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtFull = (d) => d ? new Date(d).toLocaleString('ru-RU') : '';

// ── Пост группы ──────────────────────────────────────────────────────────────
const GroupPost = ({ post, canDelete, onDelete }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {post.author_username?.[0]?.toUpperCase()}
        </div>
        <div>
          <span className="font-medium text-sm text-gray-900 dark:text-white">{post.author_username}</span>
          <p className="text-xs text-gray-400">{fmtFull(post.created_at)}</p>
        </div>
      </div>
      {canDelete && (
        <button onClick={() => onDelete(post.id)} className="text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
    {post.content && <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{post.content}</p>}
    {post.media_url && (
      <img src={post.media_url} alt="" className="mt-2 rounded-lg max-h-80 object-cover w-full" />
    )}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const GroupPage = () => {
  const { slug }  = useParams();
  const navigate  = useNavigate();
  const { user }  = useUser();

  const [group, setGroup]         = useState(null);
  const [posts, setPosts]         = useState([]);
  const [members, setMembers]     = useState([]);
  const [requests, setRequests]   = useState([]);
  const [tab, setTab]             = useState('posts'); // posts | members | requests | settings
  const [loading, setLoading]     = useState(true);
  const [postText, setPostText]   = useState('');
  const [posting, setPosting]     = useState(false);
  const [error, setError]         = useState('');

  // settings state
  const [settName, setSettName]       = useState('');
  const [settDesc, setSettDesc]       = useState('');
  const [settPrivate, setSettPrivate] = useState(false);
  const [settSaving, setSettSaving]   = useState(false);

  const loadGroup = async () => {
    try {
      const res = await api.get(`/groups/${slug}`);
      setGroup(res.data);
      setSettName(res.data.name);
      setSettDesc(res.data.description || '');
      setSettPrivate(res.data.is_private);
    } catch {
      setError('Группа не найдена');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const res = await api.get(`/groups/${slug}/posts`);
      setPosts(res.data?.posts || []);
    } catch { /* ignore */ }
  };

  const loadMembers = async () => {
    try {
      const res = await api.get(`/groups/${slug}/members`);
      setMembers(res.data?.members || []);
    } catch { /* ignore */ }
  };

  const loadRequests = async () => {
    try {
      const res = await api.get(`/groups/${slug}/requests`);
      setRequests(res.data?.requests || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadGroup(); loadPosts(); }, [slug]);

  useEffect(() => {
    if (tab === 'members') loadMembers();
    if (tab === 'requests') loadRequests();
  }, [tab]);

  const myRole = group?.my_role;
  const isOwner = myRole === 'owner';
  const isMod   = myRole === 'moderator';
  const isMember = !!myRole;

  const handleJoin = async () => {
    try {
      const res = await api.post(`/groups/${slug}/join`);
      if (res.data.status === 'pending') alert('Заявка отправлена!');
      loadGroup();
    } catch (e) { setError(e?.response?.data?.detail || 'Ошибка'); }
  };

  const handleLeave = async () => {
    if (!window.confirm('Покинуть группу?')) return;
    try {
      await api.delete(`/groups/${slug}/leave`);
      loadGroup();
    } catch (e) { setError(e?.response?.data?.detail || 'Ошибка'); }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Удалить группу? Это необратимо!')) return;
    try {
      await api.delete(`/groups/${slug}`);
      navigate('/groups');
    } catch (e) { setError(e?.response?.data?.detail || 'Ошибка'); }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!postText.trim()) return;
    setPosting(true);
    try {
      await api.post(`/groups/${slug}/posts`, { content: postText.trim() });
      setPostText('');
      loadPosts();
    } catch (e) { setError(e?.response?.data?.detail || 'Ошибка'); }
    finally { setPosting(false); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Удалить пост?')) return;
    try {
      await api.delete(`/groups/${slug}/posts/${postId}`);
      loadPosts();
    } catch (e) { setError(e?.response?.data?.detail || 'Ошибка'); }
  };

  const handleKick = async (uid, uname) => {
    if (!window.confirm(`Исключить @${uname}?`)) return;
    try {
      await api.delete(`/groups/${slug}/members/${uid}`);
      loadMembers();
    } catch (e) { setError(e?.response?.data?.detail || 'Ошибка'); }
  };

  const handleSetRole = async (uid, role) => {
    try {
      await api.patch(`/groups/${slug}/members/${uid}`, null, { params: { role } });
      loadMembers();
    } catch (e) { setError(e?.response?.data?.detail || 'Ошибка'); }
  };

  const handleRequest = async (reqId, action) => {
    try {
      await api.patch(`/groups/${slug}/requests/${reqId}`, { action });
      loadRequests(); loadMembers();
    } catch (e) { setError(e?.response?.data?.detail || 'Ошибка'); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettSaving(true);
    try {
      await api.patch(`/groups/${slug}`, {
        name: settName.trim() || undefined,
        description: settDesc.trim() || null,
        is_private: settPrivate,
      });
      loadGroup();
    } catch (e) { setError(e?.response?.data?.detail || 'Ошибка'); }
    finally { setSettSaving(false); }
  };

  if (loading) return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    </MainLayout>
  );

  if (error && !group) return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500">{error}</div>
    </MainLayout>
  );

  const TABS = [
    { id: 'posts',    label: 'Записи' },
    { id: 'members',  label: `Участники (${group?.members_count ?? 0})` },
    ...(isOwner || isMod ? [{ id: 'requests', label: `Заявки (${requests.length})` }] : []),
    ...(isOwner || isMod ? [{ id: 'settings', label: 'Управление' }] : []),
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Back */}
        <button onClick={() => navigate('/groups')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Все группы
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
          {/* Cover */}
          {group?.cover_url
            ? <img src={group.cover_url} alt="" className="w-full h-32 object-cover" />
            : <div className="w-full h-24 bg-gradient-to-br from-blue-500 to-purple-600" />
          }
          <div className="p-4 -mt-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 border-4 border-white dark:border-gray-800 flex items-center justify-center text-white text-2xl font-bold overflow-hidden mb-3">
              {group?.avatar_url
                ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover" />
                : group?.name?.[0]?.toUpperCase()
              }
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{group?.name}</h1>
                  {group?.is_private
                    ? <Lock className="w-4 h-4 text-gray-400" />
                    : <Globe className="w-4 h-4 text-gray-400" />
                  }
                </div>
                {group?.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
                )}
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{group?.members_count} участников</span>
                  <span className="mx-1">·</span>
                  <span>с {fmt(group?.created_at)}</span>
                </div>
              </div>
              <div className="shrink-0">
                {isMember
                  ? (myRole !== 'owner' && (
                      <Button size="sm" variant="outline" onClick={handleLeave}>Выйти</Button>
                    ))
                  : <Button size="sm" onClick={handleJoin}>
                      {group?.is_private ? 'Подать заявку' : 'Вступить'}
                    </Button>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {tab === 'posts' && (
          <div className="space-y-4">
            {isMember && (
              <form onSubmit={handlePost} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <textarea
                  placeholder="Написать в группу..."
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent resize-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" disabled={!postText.trim() || posting}>
                    {posting ? 'Отправка...' : 'Опубликовать'}
                  </Button>
                </div>
              </form>
            )}
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>Записей пока нет</p>
                {isMember && <p className="text-sm mt-1">Станьте первым!</p>}
              </div>
            ) : posts.map(p => (
              <GroupPost
                key={p.id}
                post={p}
                canDelete={p.author_id === user?.id || isOwner || isMod}
                onDelete={handleDeletePost}
              />
            ))}
          </div>
        )}

        {/* Members tab */}
        {tab === 'members' && (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.user_id || m.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      : m.username?.[0]?.toUpperCase()
                    }
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{m.username}</p>
                    <p className="text-xs text-gray-400">
                      {m.role === 'owner' ? 'Владелец' : m.role === 'moderator' ? 'Модератор' : 'Участник'}
                    </p>
                  </div>
                </div>
                {isOwner && m.user_id !== user?.id && m.role !== 'owner' && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost"
                      onClick={() => handleSetRole(m.user_id, m.role === 'moderator' ? 'member' : 'moderator')}
                      title={m.role === 'moderator' ? 'Снять модератора' : 'Назначить модератором'}>
                      <Shield className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600"
                      onClick={() => handleKick(m.user_id, m.username)}>
                      <UserX className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Requests tab */}
        {tab === 'requests' && (
          <div className="space-y-2">
            {requests.length === 0
              ? <p className="text-center py-8 text-gray-400">Нет заявок</p>
              : requests.map(r => (
                <div key={r.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {r.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{r.username}</p>
                      <p className="text-xs text-gray-400">{fmtFull(r.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleRequest(r.id, 'accept')}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Принять
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRequest(r.id, 'reject')}>
                      Отклонить
                    </Button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Settings tab */}
        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Настройки группы</h3>
              <form onSubmit={handleSaveSettings} className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Название</label>
                  <Input value={settName} onChange={e => setSettName(e.target.value)} maxLength={100} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Описание</label>
                  <textarea
                    value={settDesc} onChange={e => setSettDesc(e.target.value)} rows={3}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={settPrivate} onChange={e => setSettPrivate(e.target.checked)}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm">Закрытая группа (вступление по заявкам)</span>
                </label>
                <Button type="submit" disabled={settSaving}>
                  {settSaving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </form>
            </div>

            {isOwner && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">Опасная зона</h3>
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">Удаление группы необратимо. Все посты и участники будут удалены.</p>
                <Button variant="destructive" size="sm" onClick={handleDeleteGroup}>
                  <Trash2 className="w-4 h-4 mr-1" /> Удалить группу
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default GroupPage;
