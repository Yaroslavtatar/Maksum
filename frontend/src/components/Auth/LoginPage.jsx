import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Eye, EyeOff, Sun, Moon, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../hooks/useTheme';

const BACKEND_URL = '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { theme, changeTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Имя устройства для механики «устройства безопасности» (список сессий в настройках)
      const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 100) : '';
      const deviceName = ua || 'Браузер';
      const response = await axios.post('/auth/login', {
        username_or_email: loginData.email,
        password: loginData.password,
        device_name: deviceName,
      });
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        if (response.data.device_id != null) {
          localStorage.setItem('device_id', String(response.data.device_id));
        }
        window.dispatchEvent(new Event('maksum:token-set'));
        setSuccess('Успешный вход! Перенаправление...');
        setTimeout(() => {
          navigate('/');
        }, 500);
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Ошибка входа. Проверьте данные.';
      setError(errorMsg);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Валидация
    if (registerData.password !== registerData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    if (registerData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!registerData.username || !usernameRegex.test(registerData.username.trim())) {
      setError('Логин: только латиница, цифры и _; от 3 до 30 символов');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!registerData.email || !emailRegex.test(registerData.email.trim())) {
      setError('Введите корректный адрес электронной почты');
      return;
    }

    setLoading(true);

    try {
      const registerResponse = await axios.post('/auth/register', {
        username: registerData.username.trim(),
        email: registerData.email.trim().toLowerCase(),
        password: registerData.password,
      });
      
      if (registerResponse.data) {
        setSuccess('Регистрация успешна! Выполняется вход...');
        
        // Автоматический вход после регистрации
        setTimeout(async () => {
          try {
            const loginResponse = await axios.post('/auth/login', {
              username_or_email: registerData.email,
              password: registerData.password,
            });
            
            if (loginResponse.data.access_token) {
              localStorage.setItem('token', loginResponse.data.access_token);
              // Отправляем событие для обновления данных пользователя
              window.dispatchEvent(new Event('maksum:token-set'));
              navigate('/');
            }
          } catch (loginErr) {
            setError('Регистрация успешна, но вход не удался. Попробуйте войти вручную.');
            setLoading(false);
          }
        }, 1000);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const errorMsg = Array.isArray(detail)
        ? (detail[0]?.msg || detail[0]?.loc?.join(' ') || String(detail))
        : (detail || err?.message || 'Ошибка регистрации. Попробуйте позже.');
      setError(errorMsg);
      console.error('Register error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 safe-area-inset-bottom">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle,var(--tw-ring)/0.2_10%,transparent_10%)]"></div>
      </div>

      {/* Theme Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => changeTheme('light', theme.palette)}
            className="h-8 w-8 p-0"
          >
            <Sun className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => changeTheme('dark', theme.palette)}
            className="h-8 w-8 p-0"
          >
            <Moon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10">
        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-4 space-y-4">
            <div className="mx-auto mb-2 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
              <span className="text-white font-bold text-3xl">M</span>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Добро пожаловать в MAKSUM
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Социальная сеть для общения с друзьями
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700">
                <TabsTrigger value="login" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600">
                  Вход
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600">
                  Регистрация
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Электронная почта или телефон
                    </Label>
                    <Input
                      id="login-email"
                      type="text"
                      placeholder="example@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Пароль
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Введите пароль"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        required
                        disabled={loading}
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
                    disabled={loading}
                  >
                    {loading ? 'Вход...' : 'Войти'}
                  </Button>
                  
                  <div className="text-center">
                    <Button variant="link" className="text-sm text-gray-600 dark:text-gray-400">
                      Забыли пароль?
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4 mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Логин (только латиница, цифры и _)
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="my_username"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                      required
                      disabled={loading}
                      minLength={3}
                      maxLength={30}
                      className="h-11"
                      autoComplete="username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="regEmail" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Электронная почта
                    </Label>
                    <Input
                      id="regEmail"
                      type="email"
                      placeholder="example@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="regPassword" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Пароль
                    </Label>
                    <Input
                      id="regPassword"
                      type="password"
                      placeholder="Минимум 6 символов"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      required
                      disabled={loading}
                      minLength={6}
                      className="h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Повторите пароль"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                        required
                        disabled={loading}
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
                    disabled={loading}
                  >
                    {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center mt-6 space-y-2">
          <Button variant="link" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
            Узнать больше о MAKSUM ID
          </Button>
          <div className="flex justify-center items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>MAKSUM © 2006-2025</span>
            <span>•</span>
            <Button variant="link" className="h-auto p-0 text-sm">Условия</Button>
            <span>•</span>
            <Button variant="link" className="h-auto p-0 text-sm">Политика конфиденциальности</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
