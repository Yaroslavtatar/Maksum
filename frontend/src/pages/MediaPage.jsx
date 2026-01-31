import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { useUser } from '../context/UserContext';
import { Image as ImageIcon, Loader2, User } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Собирает все фото из постов в один массив с метаданными
 */
function collectMediaFromPosts(myPosts, feedPosts, currentUserId) {
  const items = [];
  const addFromPost = (post, source) => {
    const images = Array.isArray(post.images) ? post.images : [];
    images.forEach((url) => {
      if (url && typeof url === 'string') {
        items.push({
          url,
          postId: post.id,
          author_username: post.author_username || post.author?.username,
          author_avatar: post.author_avatar || post.author?.avatar,
          author_id: post.author_id || post.author?.id,
          content: post.content,
          source,
        });
      }
    });
  };
  (myPosts || []).forEach((p) => addFromPost(p, 'my'));
  (feedPosts || []).forEach((p) => {
    if (p.author_id !== currentUserId) addFromPost(p, 'feed');
  });
  return items;
}

const MediaPage = () => {
  const { user, posts, feedPosts, fetchMyPosts, fetchFeed } = useUser();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | my | feed

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchMyPosts(), fetchFeed()]);
      setLoading(false);
    };
    load();
  }, [fetchMyPosts, fetchFeed]);

  const allMedia = collectMediaFromPosts(posts, feedPosts, user?.id);
  const myMedia = allMedia.filter((m) => m.source === 'my');
  const feedMedia = allMedia.filter((m) => m.source === 'feed');

  const getDisplayList = () => {
    if (filter === 'my') return myMedia;
    if (filter === 'feed') return feedMedia;
    return allMedia;
  };

  const displayList = getDisplayList();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Медиа</h1>
        <p className="text-muted-foreground mt-1">
          Фото из ваших записей и из ленты друзей
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">Все ({allMedia.length})</TabsTrigger>
          <TabsTrigger value="my">Мои фото ({myMedia.length})</TabsTrigger>
          <TabsTrigger value="feed">Лента ({feedMedia.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {displayList.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {filter === 'my' && 'В ваших записях пока нет фото'}
                  {filter === 'feed' && 'В ленте пока нет фото от друзей'}
                  {filter === 'all' && 'Пока нет ни одного фото. Добавьте фото в записи или подождите посты от друзей.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {displayList.map((item, index) => (
                <Link
                  key={`${item.postId}-${index}-${item.url}`}
                  to="/"
                  className="block group"
                >
                  <Card className="overflow-hidden aspect-square">
                    <div className="relative w-full h-full bg-muted">
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                        <div className="flex items-center gap-2 text-white text-xs">
                          {item.author_avatar ? (
                            <img
                              src={item.author_avatar}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                          <span className="truncate">{item.author_username || 'Автор'}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MediaPage;
