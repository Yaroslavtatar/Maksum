import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useUser } from '../../context/UserContext';
import { Heart, MessageCircle, Share, Image, Video, Smile, Plus, Loader2 } from 'lucide-react';
import PostCard from './PostCard';

const NewsFeed = () => {
  const { user, feedPosts, fetchFeed, createPost, likePost } = useUser();
  const [newPost, setNewPost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    if (newPost.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await createPost(newPost);
        setNewPost('');
        // Обновляем ленту после создания поста
        await fetchFeed();
      } catch (error) {
        console.error('Error creating post:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
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
      <Card className="animate-slide-down">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <Avatar className="animate-scale-hover">
              <AvatarImage src={user?.avatar_url} alt={user?.username} />
              <AvatarFallback>{(user?.username || 'U')[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <form onSubmit={handleCreatePost}>
                <Textarea
                  placeholder="Что у вас нового?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="resize-none border-0 p-0 focus:ring-0 text-base transition-all duration-300 focus:scale-105"
                  rows={3}
                />
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 animate-scale-hover">
                <Image className="w-4 h-4 mr-2" />
                Фото
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 animate-scale-hover">
                <Video className="w-4 h-4 mr-2" />
                Видео
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 animate-scale-hover">
                <Smile className="w-4 h-4 mr-2" />
                Эмоция
              </Button>
            </div>
            <Button 
              onClick={handleCreatePost}
              disabled={!newPost.trim() || isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Публикация...
                </>
              ) : (
                'Опубликовать'
              )}
            </Button>
          </div>
        </CardContent>
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
            />
          </div>
        ))}
      </div>

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
