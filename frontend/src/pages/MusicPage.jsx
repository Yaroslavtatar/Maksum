import React from 'react';
import MainLayout from '../components/Layout/MainLayout';
import MusicPlayer from '../components/Music/MusicPlayer';

const MusicPage = () => {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 animate-slide-down">
          <h1 className="text-2xl font-bold mb-2">Музыка</h1>
          <p className="text-gray-600">Открой для себя новую музыку и создавай плейлисты</p>
        </div>
        
        <MusicPlayer />
      </div>
    </MainLayout>
  );
};

export default MusicPage;