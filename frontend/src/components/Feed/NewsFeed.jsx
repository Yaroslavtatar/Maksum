import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { mockUser, mockPosts, mockCreatePost } from '../../mock/mockData';
import { Heart, MessageCircle, Share, Image, Video, Smile, Plus } from 'lucide-react';
import PostCard from './PostCard';

const NewsFeed = () => {
  const [posts, setPosts] = useState(mockPosts);
  const [newPost, setNewPost] = useState('');

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (newPost.trim()) {
      const post = mockCreatePost(newPost);
      setPosts([post, ...posts]);
      setNewPost('');
    }
  };

  const handleLikePost = (postId) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          liked: !p.liked,
          likes: p.liked ? p.likes - 1 : p.likes + 1
        };
      }
      return p;
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post */}
      <Card className="animate-slide-down">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <Avatar className="animate-scale-hover">
              <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
              <AvatarFallback>{mockUser.firstName[0]}</AvatarFallback>
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
              disabled={!newPost.trim()}
              className="bg-blue-500 hover:bg-blue-600 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:scale-100"
            >
              Опубликовать
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {posts.length === 0 && (
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
                onClick={() => document.querySelector('textarea').focus()}
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
        {posts.map((post, index) => (
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
      {posts.length > 0 && (
        <div className="text-center py-8 animate-fade-in">
          <Button variant="outline" className="w-full animate-scale-hover">
            Загрузить еще записи
          </Button>
        </div>
      )}
    </div>
  );
};

export default NewsFeed;