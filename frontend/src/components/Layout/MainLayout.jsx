import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="ml-64 pt-16 min-h-screen">
        <div className="container mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;