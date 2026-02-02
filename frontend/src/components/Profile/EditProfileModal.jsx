import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Camera, X, Loader2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';

/** Оставить только цифры из строки телефона (и ведущий + не сохраняем в цифрах) */
function getPhoneDigits(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

/** Форматирование телефона при вводе: +7 999 123 45 67 (РФ) или +X XXX XXX XX XX */
function formatPhoneInput(value) {
  const digits = getPhoneDigits(value);
  if (digits.length === 0) return '';
  if (digits.startsWith('8')) {
    const rest = digits.slice(1).slice(0, 10);
    if (rest.length <= 3) return '+7 ' + rest;
    if (rest.length <= 6) return '+7 ' + rest.slice(0, 3) + ' ' + rest.slice(3);
    if (rest.length <= 8) return '+7 ' + rest.slice(0, 3) + ' ' + rest.slice(3, 6) + ' ' + rest.slice(6);
    return '+7 ' + rest.slice(0, 3) + ' ' + rest.slice(3, 6) + ' ' + rest.slice(6, 8) + ' ' + rest.slice(8, 10);
  }
  if (digits.startsWith('7')) {
    const rest = digits.slice(1).slice(0, 10);
    if (rest.length <= 3) return '+7 ' + rest;
    if (rest.length <= 6) return '+7 ' + rest.slice(0, 3) + ' ' + rest.slice(3);
    if (rest.length <= 8) return '+7 ' + rest.slice(0, 3) + ' ' + rest.slice(3, 6) + ' ' + rest.slice(6);
    return '+7 ' + rest.slice(0, 3) + ' ' + rest.slice(3, 6) + ' ' + rest.slice(6, 8) + ' ' + rest.slice(8, 10);
  }
  const rest = digits.slice(0, 15);
  return '+' + rest.replace(/(\d{1,3})(?=\d)/g, (m, g) => g + ' ').trim();
}

/** Проверка: похож ли номер на реальный (не набор цифр подряд, не одни единицы и т.д.) */
function isPhoneLikelyValid(phoneValue) {
  const digits = getPhoneDigits(phoneValue);
  if (digits.length < 10) return false;
  if (digits.length > 15) return false;
  const d = digits;
  if (/^(\d)\1+$/.test(d)) return false;
  if (/^1234567890$/.test(d) || /^0987654321$/.test(d)) return false;
  if (/^0123456789$/.test(d) || /^9876543210$/.test(d)) return false;
  if (d.length >= 10 && /^(\d)\1{9,}$/.test(d)) return false;
  return true;
}

const EditProfileModal = ({ open, onClose, user, onUpdate }) => {
  const { updateProfile } = useUser();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    birth_date: user?.birth_date || '',
    phone: user?.phone || '',
    work_hours: user?.work_hours || '',
    profile_accent: user?.profile_accent || 'blue',
    community_name: user?.community_name || '',
    community_description: user?.community_description || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [coverPreview, setCoverPreview] = useState(user?.cover_photo || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const wasOpenRef = useRef(false);

  // Подставляем данные в форму только при открытии модалки; пока редактируешь — не перезаписываем ввод
  useEffect(() => {
    if (open && user) {
      if (!wasOpenRef.current) {
        wasOpenRef.current = true;
        setFormData({
          username: user.username || '',
          email: user.email || '',
          bio: user.bio || '',
          location: user.location || '',
          birth_date: user.birth_date || '',
          phone: user.phone || '',
          work_hours: user.work_hours || '',
          profile_accent: user.profile_accent || 'blue',
          community_name: user.community_name || '',
          community_description: user.community_description || '',
        });
        setAvatarPreview(user.avatar_url || '');
        setCoverPreview(user.cover_photo || '');
      }
    } else {
      wasOpenRef.current = false;
    }
  }, [open, user]);

  const handleImageUpload = async (file, type) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }

    try {
      const base64 = await handleImageUpload(file, 'avatar');
      setAvatarPreview(base64);
    } catch (err) {
      setError('Ошибка загрузки изображения');
    }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10MB');
      return;
    }

    try {
      const base64 = await handleImageUpload(file, 'cover');
      setCoverPreview(base64);
    } catch (err) {
      setError('Ошибка загрузки изображения');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPhoneError('');

    if (formData.phone && formData.phone.trim()) {
      const digits = getPhoneDigits(formData.phone);
      if (digits.length < 10) {
        setPhoneError('В номере должно быть не менее 10 цифр');
        setLoading(false);
        return;
      }
      if (!isPhoneLikelyValid(formData.phone)) {
        setPhoneError('Похоже на случайный набор цифр. Введите реальный номер.');
        setLoading(false);
        return;
      }
    }

    try {
      const updateData = { ...formData };
      if (avatarPreview && avatarPreview !== user?.avatar_url) {
        updateData.avatar_url = avatarPreview;
      }
      if (coverPreview && coverPreview !== user?.cover_photo) {
        updateData.cover_photo = coverPreview;
      }

      // Используем updateProfile из контекста
      const updatedUser = await updateProfile(updateData);
      if (onUpdate) {
        onUpdate(updatedUser);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать профиль</DialogTitle>
          <DialogDescription>
            Настройте внешний вид вашего профиля
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Photo */}
          <div>
            <Label>Обложка профиля</Label>
            <div className="relative mt-2 h-48 rounded-lg overflow-hidden bg-gradient-to-r from-blue-400 to-purple-500">
              {coverPreview && (
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  className="bg-background/95 hover:bg-background text-foreground border-2 border-border shadow-xl backdrop-blur-md font-medium"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {coverPreview ? 'Изменить' : 'Загрузить обложку'}
                </Button>
              </div>
              {coverPreview && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setCoverPreview('');
                    if (coverInputRef.current) coverInputRef.current.value = '';
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Avatar */}
          <div>
            <Label>Аватар</Label>
            <div className="flex items-center space-x-4 mt-2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                      {(formData.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg border-2 border-background"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="w-5 h-5" />
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Изменить аватар
                </Button>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      setAvatarPreview('');
                      if (avatarInputRef.current) avatarInputRef.current.value = '';
                    }}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <Label htmlFor="username">Имя пользователя</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">О себе</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              placeholder="Расскажите о себе..."
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Город</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Москва, Россия"
            />
          </div>

          {/* Birth Date */}
          <div>
            <Label htmlFor="birth_date">Дата рождения</Label>
            <Input
              id="birth_date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              placeholder="15 мая 1995"
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={formData.phone}
              onChange={(e) => {
                const formatted = formatPhoneInput(e.target.value);
                setFormData({ ...formData, phone: formatted });
                setPhoneError('');
              }}
              onBlur={() => {
                if (formData.phone && formData.phone.trim() && !isPhoneLikelyValid(formData.phone) && getPhoneDigits(formData.phone).length >= 10) {
                  setPhoneError('Похоже на случайный набор цифр');
                }
              }}
              placeholder="+7 999 123 45 67"
              className={phoneError ? 'border-red-500' : ''}
            />
            {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}
          </div>

          {/* Work Hours */}
          <div>
            <Label htmlFor="work_hours">Часы работы</Label>
            <Input
              id="work_hours"
              value={formData.work_hours}
              onChange={(e) => setFormData({ ...formData, work_hours: e.target.value })}
              placeholder="10:00 - 23:00 или Открыто"
            />
          </div>

          {/* Смена цвета профиля отключена — баннер только обложка или нейтральный фон */}

          {/* Привязка сообщества */}
          <div>
            <Label htmlFor="community_name">Сообщество / канал</Label>
            <Input
              id="community_name"
              value={formData.community_name}
              onChange={(e) => setFormData({ ...formData, community_name: e.target.value })}
              placeholder="Название сообщества"
            />
            <Input
              className="mt-2"
              value={formData.community_description}
              onChange={(e) => setFormData({ ...formData, community_description: e.target.value })}
              placeholder="Описание (например: Канал • 40 подписчиков)"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;
