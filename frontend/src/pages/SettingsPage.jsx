import React, { useEffect, useState } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import axios from 'axios';
import { useTheme } from '../hooks/useTheme';
import {
  User,
  Lock,
  Bell,
  Globe,
  Shield,
  Smartphone,
  Palette,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  Camera,
  Save,
  Trash2,
  LogOut,
  Key,
  CheckCircle2,
  Sun,
  Moon,
  Circle
} from 'lucide-react';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { theme, changeTheme } = useTheme();
  const [settings, setSettings] = useState({
    username: '',
    email: '',
    avatar_url: '',
    
    // Privacy
    profileVisibility: 'all',
    messagesFrom: 'all',
    showOnlineStatus: true,
    showBirthDate: true,
    allowFriendsRequests: true,
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    friendRequestsNotifications: true,
    messagesNotifications: true,
    commentsNotifications: true,
    likesNotifications: true,
    
    // Language & Region
    language: 'ru',
    timezone: 'Europe/Moscow',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    
    // Security
    twoFactorAuth: false,
    loginAlerts: true,
    
    // Theme
    theme: 'light',
    
    // Applications
    connectedApps: []
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/users/me');
        setSettings((prev) => ({
          ...prev,
          username: res.data.username || '',
          email: res.data.email || '',
          avatar_url: res.data.avatar_url || ''
        }));
      } catch (e) {}
    })();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        username: settings.username,
        email: settings.email,
        avatar_url: settings.avatar_url,
      };
      const res = await axios.put('/api/users/me', payload);
      setSettings((prev) => ({ ...prev, ...res.data }));
      alert('Настройки сохранены');
    } catch (e) {
      alert('Не удалось сохранить');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 animate-slide-down">
          <h1 className="text-3xl font-bold mb-2">Настройки</h1>
          <p className="text-gray-600">Управляйте своими настройками и предпочтениями</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Приватность
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Уведомления
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Язык
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Тема
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Безопасность
            </TabsTrigger>
            <TabsTrigger value="apps" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Приложения
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Информация профиля</CardTitle>
                <CardDescription>Обновите информацию о себе</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center space-x-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={settings.avatar_url || undefined} alt={settings.username} />
                    <AvatarFallback className="text-2xl">
                      {(settings.username || 'U')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" className="mb-2">
                      <Camera className="w-4 h-4 mr-2" />
                      Изменить фото
                    </Button>
                    <p className="text-xs text-gray-500">JPG, PNG до 10 МБ</p>
                  </div>
                </div>

                <Separator />

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Имя пользователя</Label>
                  <Input
                    id="username"
                    value={settings.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">О себе</Label>
                  <Textarea
                    id="bio"
                    value={settings.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder="Расскажите о себе..."
                    rows={3}
                  />
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar_url" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Ссылка на аватар
                    </Label>
                    <Input
                      id="avatar_url"
                      value={settings.avatar_url}
                      onChange={(e) => handleChange('avatar_url', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Местоположение
                    </Label>
                    <Input
                      id="location"
                      value={settings.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Дата рождения
                    </Label>
                    <Input
                      id="birthDate"
                      value={settings.birthDate}
                      onChange={(e) => handleChange('birthDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить изменения
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Настройки приватности</CardTitle>
                <CardDescription>Кто может видеть ваш профиль и контактировать с вами</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Кто может видеть ваш профиль</Label>
                  <Select value={settings.profileVisibility} onValueChange={(value) => handleChange('profileVisibility', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все пользователи</SelectItem>
                      <SelectItem value="friends">Только друзья</SelectItem>
                      <SelectItem value="friends-of-friends">Друзья друзей</SelectItem>
                      <SelectItem value="nobody">Никто</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Кто может отправлять вам сообщения</Label>
                  <Select value={settings.messagesFrom} onValueChange={(value) => handleChange('messagesFrom', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все пользователи</SelectItem>
                      <SelectItem value="friends">Только друзья</SelectItem>
                      <SelectItem value="nobody">Никто</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Показывать статус "В сети"</Label>
                    <p className="text-sm text-gray-500">Друзья будут видеть, когда вы онлайн</p>
                  </div>
                  <Switch
                    checked={settings.showOnlineStatus}
                    onCheckedChange={(checked) => handleChange('showOnlineStatus', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Показывать дату рождения</Label>
                    <p className="text-sm text-gray-500">Разрешить показывать дату рождения в профиле</p>
                  </div>
                  <Switch
                    checked={settings.showBirthDate}
                    onCheckedChange={(checked) => handleChange('showBirthDate', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Разрешить заявки в друзья</Label>
                    <p className="text-sm text-gray-500">Другие пользователи могут отправлять вам заявки в друзья</p>
                  </div>
                  <Switch
                    checked={settings.allowFriendsRequests}
                    onCheckedChange={(checked) => handleChange('allowFriendsRequests', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Уведомления</CardTitle>
                <CardDescription>Настройте, какие уведомления вы хотите получать</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email уведомления</Label>
                    <p className="text-sm text-gray-500">Получать уведомления на почту</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => handleChange('emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push уведомления</Label>
                    <p className="text-sm text-gray-500">Показывать уведомления в браузере</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => handleChange('pushNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Детальные настройки уведомлений</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Заявки в друзья</Label>
                      <p className="text-sm text-gray-500">Уведомлять о новых заявках в друзья</p>
                    </div>
                    <Switch
                      checked={settings.friendRequestsNotifications}
                      onCheckedChange={(checked) => handleChange('friendRequestsNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Сообщения</Label>
                      <p className="text-sm text-gray-500">Уведомлять о новых сообщениях</p>
                    </div>
                    <Switch
                      checked={settings.messagesNotifications}
                      onCheckedChange={(checked) => handleChange('messagesNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Комментарии</Label>
                      <p className="text-sm text-gray-500">Уведомлять о комментариях к вашим записям</p>
                    </div>
                    <Switch
                      checked={settings.commentsNotifications}
                      onCheckedChange={(checked) => handleChange('commentsNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Лайки</Label>
                      <p className="text-sm text-gray-500">Уведомлять о лайках к вашим записям</p>
                    </div>
                    <Switch
                      checked={settings.likesNotifications}
                      onCheckedChange={(checked) => handleChange('likesNotifications', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Language & Region Settings */}
          <TabsContent value="language" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Язык и регион</CardTitle>
                <CardDescription>Настройте язык интерфейса и региональные параметры</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Язык интерфейса</Label>
                  <Select value={settings.language} onValueChange={(value) => handleChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="uk">Українська</SelectItem>
                      <SelectItem value="kz">Қазақша</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Часовой пояс</Label>
                  <Select value={settings.timezone} onValueChange={(value) => handleChange('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Moscow">Москва (GMT+3)</SelectItem>
                      <SelectItem value="Europe/Kiev">Киев (GMT+2)</SelectItem>
                      <SelectItem value="Asia/Almaty">Алматы (GMT+6)</SelectItem>
                      <SelectItem value="Europe/London">Лондон (GMT+0)</SelectItem>
                      <SelectItem value="America/New_York">Нью-Йорк (GMT-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Формат даты</Label>
                    <Select value={settings.dateFormat} onValueChange={(value) => handleChange('dateFormat', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD.MM.YYYY">DD.MM.YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Формат времени</Label>
                    <Select value={settings.timeFormat} onValueChange={(value) => handleChange('timeFormat', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 часа</SelectItem>
                        <SelectItem value="12h">12 часов (AM/PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theme Settings */}
          <TabsContent value="theme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Внешний вид
                </CardTitle>
                <CardDescription>Выберите режим и цветовую палитру для интерфейса</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Mode */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Режим темы</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => changeTheme('light', theme.palette)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        theme.mode === 'light'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Sun className={`w-6 h-6 mx-auto mb-2 ${theme.mode === 'light' ? 'text-primary' : 'text-gray-400'}`} />
                      <p className={`font-medium ${theme.mode === 'light' ? 'text-primary' : 'text-gray-600'}`}>Светлая</p>
                      {theme.mode === 'light' && (
                        <CheckCircle2 className="w-5 h-5 text-primary mx-auto mt-2" />
                      )}
                    </button>
                    <button
                      onClick={() => changeTheme('dark', theme.palette)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        theme.mode === 'dark'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Moon className={`w-6 h-6 mx-auto mb-2 ${theme.mode === 'dark' ? 'text-primary' : 'text-gray-400'}`} />
                      <p className={`font-medium ${theme.mode === 'dark' ? 'text-primary' : 'text-gray-600'}`}>Тёмная</p>
                      {theme.mode === 'dark' && (
                        <CheckCircle2 className="w-5 h-5 text-primary mx-auto mt-2" />
                      )}
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Color Palettes */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Цветовая палитра</Label>
                  
                  {/* Light Theme Palettes */}
                  {theme.mode === 'light' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Blue Palette */}
                      <button
                        onClick={() => changeTheme('light', 'blue')}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          theme.palette === 'blue'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shadow-md"></div>
                          <div>
                            <p className={`font-medium ${theme.palette === 'blue' ? 'text-primary' : 'text-gray-700'}`}>Синяя</p>
                            <p className="text-xs text-gray-500">Классическая палитра</p>
                          </div>
                          {theme.palette === 'blue' && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                        <div className="flex gap-1">
                          <div className="w-full h-8 bg-blue-500 rounded"></div>
                          <div className="w-full h-8 bg-blue-400 rounded"></div>
                          <div className="w-full h-8 bg-blue-300 rounded"></div>
                        </div>
                      </button>

                      {/* Green Palette */}
                      <button
                        onClick={() => changeTheme('light', 'green')}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          theme.palette === 'green'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 shadow-md"></div>
                          <div>
                            <p className={`font-medium ${theme.palette === 'green' ? 'text-primary' : 'text-gray-700'}`}>Зелёная</p>
                            <p className="text-xs text-gray-500">Природная палитра</p>
                          </div>
                          {theme.palette === 'green' && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                        <div className="flex gap-1">
                          <div className="w-full h-8 bg-green-500 rounded"></div>
                          <div className="w-full h-8 bg-green-400 rounded"></div>
                          <div className="w-full h-8 bg-green-300 rounded"></div>
                        </div>
                      </button>

                      {/* Purple Palette */}
                      <button
                        onClick={() => changeTheme('light', 'purple')}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          theme.palette === 'purple'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 shadow-md"></div>
                          <div>
                            <p className={`font-medium ${theme.palette === 'purple' ? 'text-primary' : 'text-gray-700'}`}>Фиолетовая</p>
                            <p className="text-xs text-gray-500">Яркая палитра</p>
                          </div>
                          {theme.palette === 'purple' && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                        <div className="flex gap-1">
                          <div className="w-full h-8 bg-purple-500 rounded"></div>
                          <div className="w-full h-8 bg-purple-400 rounded"></div>
                          <div className="w-full h-8 bg-purple-300 rounded"></div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    /* Dark Theme Palettes */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Dark Blue Palette */}
                      <button
                        onClick={() => changeTheme('dark', 'dark-blue')}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          theme.palette === 'dark-blue'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 shadow-md"></div>
                          <div>
                            <p className={`font-medium ${theme.palette === 'dark-blue' ? 'text-primary' : 'text-gray-300'}`}>Синяя</p>
                            <p className="text-xs text-gray-500">Классическая тёмная</p>
                          </div>
                          {theme.palette === 'dark-blue' && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                        <div className="flex gap-1">
                          <div className="w-full h-8 bg-blue-700 rounded"></div>
                          <div className="w-full h-8 bg-blue-600 rounded"></div>
                          <div className="w-full h-8 bg-blue-500 rounded"></div>
                        </div>
                      </button>

                      {/* Dark Green Palette */}
                      <button
                        onClick={() => changeTheme('dark', 'dark-green')}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          theme.palette === 'dark-green'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 shadow-md"></div>
                          <div>
                            <p className={`font-medium ${theme.palette === 'dark-green' ? 'text-primary' : 'text-gray-300'}`}>Зелёная</p>
                            <p className="text-xs text-gray-500">Природная тёмная</p>
                          </div>
                          {theme.palette === 'dark-green' && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                        <div className="flex gap-1">
                          <div className="w-full h-8 bg-green-700 rounded"></div>
                          <div className="w-full h-8 bg-green-600 rounded"></div>
                          <div className="w-full h-8 bg-green-500 rounded"></div>
                        </div>
                      </button>

                      {/* Dark Purple Palette */}
                      <button
                        onClick={() => changeTheme('dark', 'dark-purple')}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          theme.palette === 'dark-purple'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 shadow-md"></div>
                          <div>
                            <p className={`font-medium ${theme.palette === 'dark-purple' ? 'text-primary' : 'text-gray-300'}`}>Фиолетовая</p>
                            <p className="text-xs text-gray-500">Яркая тёмная</p>
                          </div>
                          {theme.palette === 'dark-purple' && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                        <div className="flex gap-1">
                          <div className="w-full h-8 bg-purple-700 rounded"></div>
                          <div className="w-full h-8 bg-purple-600 rounded"></div>
                          <div className="w-full h-8 bg-purple-500 rounded"></div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Предпросмотр</Label>
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Circle className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Пример карточки</p>
                        <p className="text-sm text-muted-foreground">Текущая тема применена</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Основная кнопка
                      </Button>
                      <Button size="sm" variant="outline">Вторичная</Button>
                      <Button size="sm" variant="secondary">Дополнительная</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Безопасность</CardTitle>
                <CardDescription>Управляйте безопасностью вашего аккаунта</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Пароль
                      </Label>
                      <p className="text-sm text-gray-500">Последнее изменение: 15 дней назад</p>
                    </div>
                    <Button variant="outline">Изменить пароль</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Двухфакторная аутентификация
                      </Label>
                      <p className="text-sm text-gray-500">Дополнительная защита вашего аккаунта</p>
                    </div>
                    <Switch
                      checked={settings.twoFactorAuth}
                      onCheckedChange={(checked) => handleChange('twoFactorAuth', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Уведомления о входе
                      </Label>
                      <p className="text-sm text-gray-500">Получать уведомления о входах с новых устройств</p>
                    </div>
                    <Switch
                      checked={settings.loginAlerts}
                      onCheckedChange={(checked) => handleChange('loginAlerts', checked)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Опасная зона</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Эти действия нельзя отменить. Будьте осторожны.
                  </p>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить аккаунт
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Settings */}
          <TabsContent value="apps" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Подключенные приложения</CardTitle>
                <CardDescription>Приложения, имеющие доступ к вашему аккаунту</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.connectedApps.length === 0 ? (
                  <div className="text-center py-12">
                    <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Нет подключенных приложений</p>
                    <p className="text-sm text-gray-500">
                      Подключите приложения для расширения функциональности
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settings.connectedApps.map((app, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{app.name}</p>
                            <p className="text-sm text-gray-500">Подключено {app.date}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">Отключить</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Разрешения</CardTitle>
                <CardDescription>Управляйте разрешениями для приложений</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Разрешить доступ к профилю</Label>
                      <p className="text-sm text-gray-500">Приложения могут видеть вашу публичную информацию</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Разрешить доступ к друзьям</Label>
                      <p className="text-sm text-gray-500">Приложения могут видеть список ваших друзей</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;

