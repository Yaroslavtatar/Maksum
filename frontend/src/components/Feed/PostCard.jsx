import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  MoreHorizontal,
  Bookmark,
  Flag
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const PostCard = ({ post, onLike }) => {
  const [showComments, setShowComments] = useState(false);

  // Поддержка обоих форматов (старый mock и новый API)
  const authorName = post.author?.name || post.author_username || 'Пользователь';
  const authorAvatar = post.author?.avatar || post.author_avatar;
  const timestamp = post.timestamp || (post.created_at ? new Date(post.created_at).toLocaleString('ru-RU') : '');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={authorAvatar} alt={authorName} />
              <AvatarFallback>{(authorName || 'U')[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{authorName}</p>
              <p className="text-xs text-gray-500">{timestamp}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Bookmark className="w-4 h-4 mr-2" />
                Сохранить
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Flag className="w-4 h-4 mr-2" />
                Пожаловаться
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Post Content */}
        <div className="mb-4">
          <p className="text-gray-900 leading-relaxed">{post.content}</p>
        </div>

        {/* Post Images */}
        {post.images && post.images.length > 0 && (
          <div className="mb-4">
            {post.images.length === 1 ? (
              <img 
                src={post.images[0]} 
                alt="Post image"
                className="w-full rounded-lg max-h-96 object-cover"
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {post.images.map((image, index) => (
                  <img 
                    key={index}
                    src={image} 
                    alt={`Post image ${index + 1}`}
                    className="w-full rounded-lg h-48 object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Post Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center space-x-4">
            <span>{post.likes || 0} нравится</span>
            <span>{post.comments || 0} комментариев</span>
          </div>
          {post.shares !== undefined && <span>{post.shares} поделились</span>}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t pt-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLike}
            className={`flex items-center space-x-2 ${post.liked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500`}
          >
            <Heart className={`w-4 h-4 ${post.liked ? 'fill-current' : ''}`} />
            <span>Нравится</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-500"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Комментировать</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center space-x-2 text-gray-600 hover:text-green-500"
          >
            <Share className="w-4 h-4" />
            <span>Поделиться</span>
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500 text-center py-4">
              Здесь будут отображаться комментарии...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PostCard;