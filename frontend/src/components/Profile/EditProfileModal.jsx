import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Camera, X, Loader2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';

const EditProfileModal = ({ open, onClose, user, onUpdate }) => {
  const { updateProfile } = useUser();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    birth_date: user?.birth_date || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [coverPreview, setCoverPreview] = useState(user?.cover_photo || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Обновляем форму при изменении user
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        location: user.location || '',
        birth_date: user.birth_date || '',
      });
      setAvatarPreview(user.avatar_url || '');
      setCoverPreview(user.cover_photo || '');
    }
  }, [user]);

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

    try {
      // Обновляем профиль
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
