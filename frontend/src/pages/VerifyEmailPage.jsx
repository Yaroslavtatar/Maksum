import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, KeyRound, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import api from '../api/axios';

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const stateEmail = location.state?.email;
    if (stateEmail) {
      setEmail(stateEmail);
      setSuccess('На вашу почту отправлен код. Введите его ниже.');
    }
  }, [location.state]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) {
      setError('Введите адрес почты');
      return;
    }
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
    setError('');
    setSuccess('');
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedCode = (code || '').trim();
    if (!trimmedEmail || !trimmedCode) {
      setError('Введите почту и код из письма');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-email', {
        email: trimmedEmail,
        code: trimmedCode,
      });
      if (response.data?.access_token) {
        localStorage.setItem('token', response.data.access_token);
        if (response.data.device_id != null) {
          localStorage.setItem('device_id', String(response.data.device_id));
        }
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
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 safe-area-inset-bottom">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-4 space-y-4">
            <div className="mx-auto mb-2 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Подтверждение почты
              </CardTitle>
              <CardDescription className="mt-2">
                Введите почту и код из письма. После подтверждения вы будете авторизованы.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Электронная почта
                </Label>
                <Input
                  id="verify-email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="verify-code">Код из письма</Label>
                <Input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  disabled={loading}
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
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-blue-600 dark:text-blue-400"
                disabled={sendLoading}
                onClick={handleSendCode}
              >
                {sendLoading ? 'Отправка...' : 'Отправить повторно'}
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full gap-2"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться к входу
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
