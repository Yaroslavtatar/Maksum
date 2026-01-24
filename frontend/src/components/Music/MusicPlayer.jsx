import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Music, AlertCircle } from 'lucide-react';

const MusicPlayer = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 animate-fade-in">
        <CardContent className="p-12">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-lg opacity-50"></div>
                <div className="relative bg-white rounded-full p-6">
                  <AlertCircle className="w-16 h-16 text-orange-500" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
              <Music className="w-8 h-8 text-gray-600" />
              Музыкальный плеер временно не работает
            </h2>
            
            <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
              В данный момент музыкальный плеер находится на техническом обслуживании. 
              Мы работаем над улучшением функционала и скоро вернемся!
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span>Ожидается обновление</span>
            </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MusicPlayer;