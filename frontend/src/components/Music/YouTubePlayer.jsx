import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Slider } from '../ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  Heart
} from 'lucide-react';

const YouTubePlayer = ({ track, onNext, onPrevious, isPlaying, setIsPlaying }) => {
  const [volume, setVolume] = useState([50]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const playerRef = useRef(null);

  // Генерируем YouTube поисковый запрос и URL
  const getYouTubeSearchUrl = (artist, songName) => {
    const query = encodeURIComponent(`${artist} ${songName} official`);
    return `https://www.youtube.com/results?search_query=${query}`;
  };

  // Для демонстрации используем популярные треки с известными YouTube ID
  const getYouTubeVideoId = (artist, songName) => {
    // Простой маппинг для демонстрации
    const trackMap = {
      'coldplay yellow': 'yKNxeF4KMsY',
      'coldplay fix you': 'k4V3Mo61fJM', 
      'coldplay viva la vida': 'dvgZkm1xWPE',
      'ed sheeran shape of you': 'JGwWNGJdvx8',
      'adele someone like you': 'hLQl3WQQoQ0',
      'imagine dragons radioactive': 'ktvTqknDobU',
      'the weeknd blinding lights': '4NRXx6U8ABQ',
      'dua lipa levitating': 'TUVcZfQe-Kw',
      'billie eilish bad guy': 'DyDfgMOUjCI',
      'ariana grande positions': 'tcYodQoapMg'
    };

    const key = `${artist.toLowerCase()} ${songName.toLowerCase()}`;
    
    // Поиск точного совпадения
    if (trackMap[key]) {
      return trackMap[key];
    }

    // Поиск по частичному совпадению
    for (const [mapKey, videoId] of Object.entries(trackMap)) {
      if (mapKey.includes(artist.toLowerCase()) || mapKey.includes(songName.toLowerCase())) {
        return videoId;
      }
    }

    // Генерируем ID на основе хеша (для демонстрации)
    // В реальном приложении здесь был бы вызов к YouTube API или сервису поиска
    const hash = (artist + songName).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Возвращаем один из популярных видео для демонстрации
    const demoVideos = ['yKNxeF4KMsY', 'k4V3Mo61fJM', 'dvgZkm1xWPE', 'JGwWNGJdvx8'];
    return demoVideos[Math.abs(hash) % demoVideos.length];
  };

  const videoId = track ? getYouTubeVideoId(track.artist, track.name) : null;
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=${isPlaying ? 1 : 0}&controls=0&modestbranding=1&rel=0` : null;

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value) => {
    setVolume(value);
    // В реальном YouTube API можно управлять громкостью
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  if (!track) {
    return (
      <Card className="bg-gradient-to-r from-gray-600 to-gray-700 text-white">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse-gentle">
            <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Выберите трек для воспроизведения</p>
            <p className="text-sm text-gray-300">Музыка будет воспроизводиться через YouTube</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-r from-purple-600 to-pink-600 text-white animate-fade-in transition-all duration-500 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarImage src={track.image} alt={track.name} />
                <AvatarFallback>{track.artist[0]}</AvatarFallback>
              </Avatar>
              <div className={`absolute inset-0 rounded-full border-2 border-white ${isPlaying ? 'animate-spin-slow' : ''}`}></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl truncate">{track.name}</h3>
              <p className="text-white/80 truncate">{track.artist}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs bg-white/20 px-2 py-1 rounded">YouTube</span>
                <span className="text-xs text-white/60">HD Качество</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLike}
              className={`text-white hover:bg-white/20 ${isLiked ? 'text-red-300' : ''}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleToggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* YouTube Player */}
        {embedUrl && (
          <div className={`relative bg-black rounded-lg overflow-hidden mb-4 ${isFullscreen ? 'h-96' : 'h-64'}`}>
            <iframe
              ref={playerRef}
              src={embedUrl}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`${track.artist} - ${track.name}`}
            />
            
            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Button 
                onClick={handlePlayPause}
                className="bg-white/90 text-black hover:bg-white w-16 h-16 rounded-full"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </Button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onPrevious}
              className="text-white hover:bg-white/20 animate-scale-hover"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            
            <Button 
              onClick={handlePlayPause}
              className="bg-white text-purple-600 hover:bg-white/90 w-12 h-12 rounded-full animate-pulse-gentle"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onNext}
              className="text-white hover:bg-white/20 animate-scale-hover"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleToggleMute}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider 
              value={volume} 
              onValueChange={handleVolumeChange}
              max={100} 
              step={1}
              className="w-24"
            />
            <span className="text-xs text-white/60 w-8">{volume[0]}%</span>
          </div>
        </div>

        {/* Track Info */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex justify-between text-sm text-white/80">
            <span>Воспроизводится из YouTube</span>
            <span>Качество: HD</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default YouTubePlayer;