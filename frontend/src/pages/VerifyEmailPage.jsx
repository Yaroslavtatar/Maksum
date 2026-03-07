import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, KeyRound, AlertCircle, CheckCircle2, ArrowLeft, Send, Loader2 } from 'lucide-react';
import api from '../api/axios';

// --- вспомогательные ---

const Alert = ({ type, children }) => {
  const isError = type === 'error';
  return (
    <div className={`p-3 rounded-lg flex items-center gap-2 text-sm border
      ${isError
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'}`}>
      {isError
        ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
        : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
      <span>{children}</span>
    </div>
  );
};

// ===================== EMAIL TAB =====================
const EmailTab = ({ initialEmail }) => {
  const navigate = useNavigate();
  const [email, setEmail]           = useState(initialEmail || '');
  const [code, setCode]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(
    initialEmail ? 'На вашу почту отправлен код. Введите его ниже.' : ''
  );

  const handleSendCode = async (e) => {
    e?.preventDefault();
    setError(''); setSuccess('');
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) { setError('Введите адрес почты'); return; }
    setSendLoading(true);
    try {
      await api.post('/auth/send-verification-code', { email: trimmed });
      setSuccess('Код отправлен на почту. Проверьте почту и введите код.');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Не удалось отправить код. Попробуйте позже.');
    } finally {
      setSendLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedCode  = (code  || '').trim();
    if (!trimmedEmail || !trimmedCode) { setError('Введите почту и код из письма'); return; }
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-email', { email: trimmedEmail, code: trimmedCode });
      if (response.data?.access_token) {
        localStorage.setItem('token', response.data.access_token);
        if (response.data.device_id != null)
          localStorage.setItem('device_id', String(response.data.device_id));
        window.dispatchEvent(new Event('maksum:token-set'));
        setSuccess('Почта подтверждена. Вход выполнен.');
        setTimeout(() => navigate('/'), 600);
        return;
      }
      setError('Неверный ответ сервера');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Неверный код или почта. Запросите новый код.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error   && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verify-email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Электронная почта
          </Label>
          <Input
            id="verify-email" type="email" placeholder="example@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            disabled={loading} className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="verify-code">Код из письма</Label>
          <Input
            id="verify-code" type="text" inputMode="numeric"
            autoComplete="one-time-code" placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6} disabled={loading}
            className="h-11 text-center text-lg tracking-widest font-mono"
          />
        </div>
        <Button
          type="submit"
          className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
          disabled={loading}
        >
          {loading ? 'Проверка...' : 'Подтвердить и войти'}
        </Button>
      </form>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Не пришёл код?{' '}
        <Button type="button" variant="link"
          className="h-auto p-0 text-blue-600 dark:text-blue-400"
          disabled={sendLoading} onClick={handleSendCode}>
          {sendLoading ? 'Отправка...' : 'Отправить повторно'}
        </Button>
      </div>
    </div>
  );
};

// ===================== TELEGRAM TAB =====================
const TelegramTab = () => {
  const navigate = useNavigate();
  const [step, setStep]         = useState('idle'); // idle | waiting | done | error
  const [botLink, setBotLink]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const pollRef                 = useRef(null);
  const token                   = localStorage.getItem('token');

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get('/auth/telegram-verify-check');
        if (res.data?.verified) {
          stopPolling();
          setStep('done');
          setTimeout(() => navigate('/'), 1500);
        }
      } catch {
        // продолжаем опрос
      }
    }, 3000);
  }, [navigate]);

  const handleStart = async () => {
    if (!token) {
      setError('Для верификации через Telegram сначала войдите в аккаунт.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/telegram-verify-start');
      const { token: vToken, bot_username } = res.data;
      const link = `https://t.me/${bot_username}?start=${vToken}`;
      setBotLink(link);
      setStep('waiting');
      startPolling();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Не удалось получить ссылку. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      <p className="text-green-700 dark:text-green-400 font-semibold text-center">
        Telegram подтверждён! Перенаправление…
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}

      {step === 'idle' && (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Нажмите кнопку — откроется Telegram‑бот. Напишите ему&nbsp;любое&nbsp;сообщение, и аккаунт будет подтверждён.
          </p>
          <Button
            className="w-full h-11 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold flex items-center justify-center gap-2"
            onClick={handleStart} disabled={loading}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Получение ссылки…</>
              : <><Send className="w-4 h-4" /> Подтвердить через Telegram</>}
          </Button>
        </>
      )}

      {step === 'waiting' && (
        <>
          <Alert type="success">
            Ссылка готова! Перейдите в бот, отправьте любое сообщение. Страница обновится автоматически.
          </Alert>
          <a
            href={botLink} target="_blank" rel="noopener noreferrer"
            className="block w-full"
          >
            <Button className="w-full h-11 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Открыть Telegram‑бот
            </Button>
          </a>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Ожидание подтверждения…
          </div>
          <Button type="button" variant="ghost" className="w-full text-sm"
            onClick={() => { stopPolling(); setStep('idle'); setBotLink(''); }}>
            Отмена
          </Button>
        </>
      )}
    </div>
  );
};

// ===================== PAGE =====================
const TABS = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'email',    label: 'Почта' },
];

const VerifyEmailPage = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [tab, setTab] = useState('telegram');

  const initialEmail = location.state?.email || '';

  // Если пришли со страницы регистрации (с email) — покажем вкладку почты
  useEffect(() => {
    if (initialEmail) setTab('email');
  }, [initialEmail]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 safe-area-inset-bottom">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-4 space-y-4">
            <div className="mx-auto mb-2 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Подтверждение аккаунта
              </CardTitle>
              <CardDescription className="mt-2">
                Выберите способ подтверждения
              </CardDescription>
            </div>

            {/* вкладки */}
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1 gap-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${tab === t.id
                      ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {tab === 'telegram' && <TelegramTab />}
            {tab === 'email'    && <EmailTab initialEmail={initialEmail} />}

            <Button type="button" variant="ghost" className="w-full gap-2 mt-2"
              onClick={() => navigate('/login')}>
              <ArrowLeft className="w-4 h-4" /> Вернуться к входу
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
