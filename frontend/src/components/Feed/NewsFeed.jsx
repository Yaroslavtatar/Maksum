import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useUser } from '../../context/UserContext';
import { Image, Video, Smile, Plus, Loader2, X } from 'lucide-react';
import PostCard from './PostCard';
import UserPreviewModal from '../Profile/UserPreviewModal';

const EMOJI_LIST = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😎','🥳','👍','❤️','🔥','✨','👏','🙌','😭','🤔'];

const NewsFeed = () => {
  const { user, feedPosts, fetchFeed, createPost, likePost } = useUser();
  const [newPost, setNewPost] = useState('');
  const [postImages, setPostImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewUserId, setPreviewUserId] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadFeed = async () => {
      setIsLoading(true);
      await fetchFeed();
      setIsLoading(false);
    };
    loadFeed();
  }, [fetchFeed]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if ((!newPost.trim() && postImages.length === 0) || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createPost(newPost.trim() || ' ', postImages);
      setNewPost('');
      setPostImages([]);
      await fetchFeed();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPhotoClick = () => fileInputRef.current?.click();
  const onPhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    const max = 5;
    const allowed = files.slice(0, max - postImages.length).filter(f => f.type.startsWith('image/'));
    if (allowed.length === 0) return;
    const readers = allowed.map(f => {
      const r = new FileReader();
      r.readAsDataURL(f);
      return new Promise(res => { r.onload = () => res(r.result); });
    });
    Promise.all(readers).then(dataUrls => setPostImages(prev => [...prev, ...dataUrls].slice(0, max)));
    e.target.value = '';
  };
  const removeImage = (i) => setPostImages(prev => prev.filter((_, j) => j !== i));

  const insertEmoji = (emoji) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? newPost.length;
    const end = ta.selectionEnd ?? start;
    const before = newPost.slice(0, start);
    const after = newPost.slice(end);
    setNewPost(before + emoji + after);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
  };

  const handleLikePost = async (postId) => {
    try {
      await likePost(postId);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="animate-pulse">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="mt-4 text-gray-500">Загрузка ленты...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post */}
      <Card className="overflow-hidden border-border bg-card">
        <form onSubmit={handleCreatePost}>
          <div className="p-4 flex gap-3">
            <Avatar className="h-10 w-10 shrink-0 border-2 border-border">
              <AvatarImage src={user?.avatar_url} alt={user?.username} />
              <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                {(user?.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Textarea
              ref={textareaRef}
              placeholder="Что у вас нового?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[88px] resize-none border-0 bg-transparent px-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={3}
            />
            {postImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {postImages.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl" aria-label="Удалить">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={onPhotoChange} />
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted" title="Прикрепить фото" onClick={onPhotoClick}>
                <Image className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted" title="Видео (скоро)" disabled>
                <Video className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted" title="Смайл">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_LIST.map((emoji, i) => (
                      <button key={i} type="button" className="w-8 h-8 text-lg hover:bg-muted rounded" onClick={() => insertEmoji(emoji)}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Button
              type="submit"
              disabled={(!newPost.trim() && postImages.length === 0) || isSubmitting}
              size="sm"
              className="rounded-full px-5 font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Публикация...
                </>
              ) : (
                'Опубликовать'
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Empty State */}
      {feedPosts.length === 0 && (
        <Card className="animate-fade-in">
          <CardContent className="text-center py-12">
            <div className="animate-bounce-gentle">
              <Plus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Лента пуста</h3>
            <p className="text-gray-500 mb-6">
              Создайте свою первую запись или добавьте друзей, чтобы видеть их посты
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => document.querySelector('textarea')?.focus()}
                className="animate-pulse-gentle hover:animate-none"
              >
                Создать первую запись
              </Button>
              <div className="text-sm text-gray-400">
                <p>Или найдите друзей в разделе "Друзья"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        {feedPosts.map((post, index) => (
          <div 
            key={post.id} 
            className="animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <PostCard 
              post={post} 
              onLike={() => handleLikePost(post.id)}
              onAuthorClick={post.author_id !== user?.id ? setPreviewUserId : undefined}
              onCommentAdded={fetchFeed}
            />
          </div>
        ))}
      </div>

      <UserPreviewModal
        userId={previewUserId}
        open={!!previewUserId}
        onClose={() => setPreviewUserId(null)}
      />

      {/* Load More (if there are posts) */}
      {feedPosts.length > 0 && (
        <div className="text-center py-8 animate-fade-in">
          <Button variant="outline" className="w-full animate-scale-hover" onClick={fetchFeed}>
            Обновить ленту
          </Button>
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
