import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNavBar from './MobileNavBar';
import { Sheet, SheetContent } from '../ui/sheet';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background min-w-0">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[min(20rem,85vw)] p-0 overflow-y-auto flex flex-col">
          <div className="pt-14 flex-1 overflow-y-auto">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Header */}
      <Header onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content: на ПК ширина = экран минус сайдбар, чтобы не вылезало за край */}
      <main className="lg:ml-64 lg:w-[calc(100vw-16rem)] pt-14 sm:pt-16 pb-16 sm:pb-0 min-h-screen min-w-0 w-full max-w-[100vw] overflow-x-hidden">
        <div className="w-full max-w-full min-w-0 px-3 sm:px-6 py-4 sm:py-6 lg:px-6">
          {children}
        </div>
      </main>

      {/* Bottom navigation for mobile */}
      <MobileNavBar />
    </div>
  );
};

export default MainLayout;
