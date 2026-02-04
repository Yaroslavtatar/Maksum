import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import api from '../api/axios';
import { useUser } from '../context/UserContext';
import { 
  Search, 
  MessageCircle, 
  Plus,
  Users,
  Send,
  Loader2,
  Mic,
  Square,
  Play,
  Pause
} from 'lucide-react';

// Формат длительности в минутах:секундах
const formatDuration = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Голосовое сообщение как в Telegram: play, длительность, прогресс, транскрипция
const VoiceBubble = ({ src, isOwn, time, durationSeconds: propDuration, transcription }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration != null ? propDuration : null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => {
      if (duration == null) setDuration(el.duration);
    };
    el.addEventListener('ended', onEnded);
    el.addEventListener('pause', onPause);
    el.addEventListener('play', onPlay);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [src, duration]);

  useEffect(() => {
    if (propDuration != null) setDuration(propDuration);
  }, [propDuration]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  };

  const totalSec = duration != null && !isNaN(duration) ? duration : 0;
  const durStr = formatDuration(totalSec);
  const progress = totalSec > 0 ? Math.min(1, currentTime / totalSec) : 0;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-90 ${
          isOwn ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/20 text-foreground'
        }`}
      >
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Голосовое</span>
          <span className={`text-[11px] shrink-0 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {formatDuration(currentTime)} / {durStr} · {time}
          </span>
        </div>
        <div className="h-1 rounded-full bg-black/10 mt-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOwn ? 'bg-primary-foreground/40' : 'bg-muted-foreground/40'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {transcription && (
          <div className="mt-2 pt-2 border-t border-black/10">
            <p className="text-xs opacity-90 whitespace-pre-wrap break-words">{transcription}</p>
          </div>
        )}
        {!transcription && (
          <p className="mt-1.5 text-[11px] opacity-70 flex items-center gap-1">
            <span className="font-medium">&gt;A</span> Транскрипция (скоро)
          </p>
        )}
      </div>
    </div>
  );
};

const MessagesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const openConversationId = location.state?.openConversationId;
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingStopping, setRecordingStopping] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const { user } = useUser();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!openConversationId || !conversations.length) return;
    const conv = conversations.find(c => c.id === openConversationId);
    if (conv) {
      setSelectedConversation(conv);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [openConversationId, conversations, navigate, location.pathname]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      // Автообновление сообщений каждые 3 секунды
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/conversations');
      setConversations(res.data || []);
    } catch (e) {
      console.error('Error fetching conversations:', e);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(`/conversations/${conversationId}/messages`);
      setMessages(res.data || []);
    } catch (e) {
      console.error('Error fetching messages:', e);
      setMessages([]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      await api.post('/messages/send', {
        conversation_id: selectedConversation.id,
        content: newMessage.trim()
      });
      setNewMessage('');
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (!selectedConversation || sending || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = async () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingSeconds(0);
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length === 0) {
          setRecordingStopping(false);
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onloadedmetadata = async () => {
          const durationSec = audio.duration;
          URL.revokeObjectURL(url);
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result;
            setSending(true);
            try {
              await api.post('/messages/send', {
                conversation_id: selectedConversation.id,
                content: '[Голосовое сообщение]',
                voice_base64: base64,
                voice_duration_seconds: Math.round(durationSec * 10) / 10
              });
              await fetchMessages(selectedConversation.id);
              await fetchConversations();
            } catch (err) {
              console.error('Error sending voice:', err);
            } finally {
              setSending(false);
              setRecordingStopping(false);
            }
          };
          reader.readAsDataURL(blob);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setRecordingStopping(false);
        };
        audio.load();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Нет доступа к микрофону');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    setRecordingStopping(true);
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const handleStartChat = async (userId) => {
    try {
      setSending(true);
      const res = await api.post('/messages/send', {
        to_user_id: userId,
        content: 'Привет!'
      });
      // Обновляем список диалогов
      await fetchConversations();
      // Находим и открываем новый диалог
      const updatedConvs = await api.get('/conversations');
      const conv = updatedConvs.data.find(c => c.id === res.data.conversation_id);
      if (conv) {
        setSelectedConversation(conv);
        await fetchMessages(conv.id);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert(error.response?.data?.detail || 'Не удалось начать чат');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Время в пузыре сообщения — только часы:минуты (как в Telegram)
  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Время в списке диалогов: сегодня — "14:32", вчера — "вчера 14:32", иначе дата
  const formatListTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const now = new Date();
    const today = now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.getDate() === d.getDate() && yesterday.getMonth() === d.getMonth() && yesterday.getFullYear() === d.getFullYear();
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (today) return time;
    if (isYesterday) return `вчера ${time}`;
    if (now.getFullYear() === d.getFullYear()) return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return conv.other_username?.toLowerCase().includes(search) ||
           conv.last_message?.toLowerCase().includes(search);
  });

  return (
    <MainLayout>
      <div className="h-[calc(100vh-6rem)] flex min-h-0 max-w-full">
        {/* Chat List */}
        <Card className="w-80 shrink-0 mr-4 flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Сообщения</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск диалогов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 transition-all duration-300 focus:scale-105"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-4">
                <div className="animate-bounce-gentle mb-6">
                  <MessageCircle className="w-16 h-16 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Нет сообщений</h3>
                <p className="text-muted-foreground text-center text-sm mb-6">
                  Начните общение с друзьями или найдите новых собеседников
                </p>
                <Button className="animate-scale-hover" onClick={() => window.location.href = '/find-friends'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Найти друзей
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conv.other_avatar} alt={conv.other_username} />
                        <AvatarFallback>{(conv.other_username || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{conv.other_username || 'Группа'}</p>
                        {conv.last_message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message_sender_id === user?.id ? 'Вы: ' : ''}
                            {conv.last_message === '[Голосовое сообщение]' ? (
                              <span className="inline-flex items-center gap-1">
                                <Mic className="w-3 h-3 shrink-0" />
                                Голосовое
                              </span>
                            ) : (
                              conv.last_message
                            )}
                          </p>
                        )}
                        {conv.last_message_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatListTime(conv.last_message_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Window */}
        {selectedConversation ? (
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
            <CardHeader className="pb-3 border-b shrink-0">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={selectedConversation.other_avatar} alt={selectedConversation.other_username} />
                  <AvatarFallback>{(selectedConversation.other_username || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedConversation.other_username || 'Группа'}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 min-h-0 w-full"
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Начните общение!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'} shrink-0 animate-fade-in`}
                    >
                      <div
                        className={`max-w-[75%] min-w-0 rounded-2xl px-3 py-2 shadow-sm ${
                          msg.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        {msg.voice_url ? (
                          <VoiceBubble
                            src={msg.voice_url}
                            isOwn={msg.sender_id === user?.id}
                            time={formatMessageTime(msg.created_at)}
                            durationSeconds={msg.voice_duration_seconds}
                            transcription={msg.voice_transcription}
                          />
                        ) : (
                          <>
                            <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-[11px] mt-1 text-right ${
                              msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {formatMessageTime(msg.created_at)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center gap-2 shrink-0">
                {recording ? (
                  <>
                    <Button type="button" variant="destructive" size="icon" onClick={stopRecording} disabled={recordingStopping} title="Остановить запись">
                      <Square className="w-4 h-4 fill-current" />
                    </Button>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                    </span>
                  </>
                ) : (
                  <Button type="button" variant="outline" size="icon" onClick={startRecording} disabled={sending} title="Голосовое сообщение">
                    <Mic className="w-4 h-4" />
                  </Button>
                )}
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={recording ? 'Идёт запись...' : 'Напишите сообщение...'}
                  className="flex-1"
                  disabled={sending || recording}
                />
                <Button type="submit" disabled={sending || recording || !newMessage.trim()}>
                  {sending && !recording ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex flex-col animate-slide-left">
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-pulse-gentle mb-6">
                  <Users className="w-20 h-20 text-muted-foreground mx-auto" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Добро пожаловать в сообщения!</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Выберите диалог из списка или начните новую беседу с друзьями
                </p>
                <div className="space-y-3">
                  <Button className="animate-scale-hover" onClick={() => window.location.href = '/find-friends'}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Найти друзей для общения
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    <p>Все ваши сообщения будут отображаться здесь</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default MessagesPage;
