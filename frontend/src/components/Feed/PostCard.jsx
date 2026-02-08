import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  MoreHorizontal,
  Bookmark,
  Flag,
  Send
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import api from '../../api/axios';
import { useUser } from '../../context/UserContext';
import UserBadges from '../Profile/UserBadges';

const PostCard = ({ post, onLike, onAuthorClick, onCommentAdded }) => {
  const { user } = useUser();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!showComments || !post?.id) return;
    let cancelled = false;
    setCommentsLoading(true);
    api.get(`/posts/${post.id}/comments`)
      .then((res) => { if (!cancelled) setComments(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setCommentsLoading(false); });
    return () => { cancelled = true; };
  }, [showComments, post?.id]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || sendingComment || !post?.id) return;
    setSendingComment(true);
    try {
      await api.post(`/posts/${post.id}/comments`, { content: commentText.trim() });
      setCommentText('');
      const res = await api.get(`/posts/${post.id}/comments`);
      setComments(Array.isArray(res.data) ? res.data : []);
      onCommentAdded?.();
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSendingComment(false);
    }
  };

  // Поддержка обоих форматов (старый mock и новый API)
  const authorName = post.author?.name || post.author_username || 'Пользователь';
  const authorAvatar = post.author?.avatar || post.author_avatar;
  const authorId = post.author_id ?? post.author?.id;
  const authorIsOfficial = post.author_is_official ?? post.author?.is_official ?? false;
  const authorIsModerator = post.author_is_moderator ?? post.author?.is_moderator ?? false;
  const timestamp = post.timestamp || (post.created_at ? new Date(post.created_at).toLocaleString('ru-RU') : '');

  const authorBlock = (
    <div className="flex items-center space-x-3">
      <Avatar className={onAuthorClick && authorId ? 'cursor-pointer ring-2 ring-transparent hover:ring-primary/50 transition-all' : ''}>
        <AvatarImage src={authorAvatar} alt={authorName} />
        <AvatarFallback>{(authorName || 'U')[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
        <p className={`font-medium text-sm flex items-center gap-1 ${onAuthorClick && authorId ? 'cursor-pointer hover:text-primary' : ''}`}>
          {authorName}
          <UserBadges isOfficial={authorIsOfficial} isModerator={authorIsModerator} />
        </p>
        <p className="text-xs text-muted-foreground">{timestamp}</p>
      </div>
    </div>
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {onAuthorClick && authorId ? (
            <button
              type="button"
              className="text-left flex items-center space-x-3 focus:outline-none focus:ring-0"
              onClick={() => onAuthorClick(authorId)}
            >
              {authorBlock}
            </button>
          ) : (
            authorBlock
          )}
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
          <p className="text-foreground leading-relaxed">{post.content}</p>
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
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
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
            disabled={liking}
            onClick={async () => {
              if (!onLike || liking) return;
              setLiking(true);
              try {
                await onLike();
              } catch (_) { /* ошибка уже залогирована в контексте */ }
              finally {
                setLiking(false);
              }
            }}
            className={`flex items-center space-x-2 ${post.liked ? 'text-red-500' : 'text-muted-foreground'} hover:text-red-500`}
          >
            <Heart className={`w-4 h-4 ${post.liked ? 'fill-current' : ''}`} />
            <span>{liking ? '...' : 'Нравится'}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-muted-foreground hover:text-blue-500"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Комментировать</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center space-x-2 text-muted-foreground hover:text-green-500"
          >
            <Share className="w-4 h-4" />
            <span>Поделиться</span>
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {commentsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-2">Загрузка комментариев...</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-2 items-start text-sm">
                      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                        <AvatarImage src={c.avatar_url} />
                        <AvatarFallback className="text-xs">{(c.username || 'U')[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">{c.username}</span>
                        <span className="text-muted-foreground ml-1">{c.content}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.created_at ? new Date(c.created_at).toLocaleString('ru-RU') : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {user && (
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Input
                      placeholder="Написать комментарий..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1"
                      disabled={sendingComment}
                    />
                    <Button type="submit" size="sm" disabled={sendingComment || !commentText.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PostCard;