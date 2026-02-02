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
  Square
} from 'lucide-react';

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
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length === 0) {
          setRecordingStopping(false);
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result;
          setSending(true);
          try {
            await api.post('/messages/send', {
              conversation_id: selectedConversation.id,
              content: '[Голосовое сообщение]',
              voice_base64: base64
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
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
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

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return conv.other_username?.toLowerCase().includes(search) ||
           conv.last_message?.toLowerCase().includes(search);
  });

  return (
    <MainLayout>
      <div className="h-[calc(100vh-7rem)] flex">
        {/* Chat List */}
        <Card className="w-80 mr-4 flex flex-col animate-slide-right">
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
                            {conv.last_message}
                          </p>
                        )}
                        {conv.last_message_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(conv.last_message_at)}
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
          <Card className="flex-1 flex flex-col animate-slide-left">
            <CardHeader className="pb-3 border-b">
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
            <CardContent className="flex-1 flex flex-col p-0">
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Начните общение!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {msg.voice_url ? (
                          <div className="space-y-1">
                            <audio controls src={msg.voice_url} className="max-w-full h-9" />
                            <p className="text-xs opacity-80">Голосовое сообщение</p>
                          </div>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center gap-2">
                {recording ? (
                  <Button type="button" variant="destructive" size="icon" onClick={stopRecording} disabled={recordingStopping} title="Остановить запись">
                    <Square className="w-4 h-4 fill-current" />
                  </Button>
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
