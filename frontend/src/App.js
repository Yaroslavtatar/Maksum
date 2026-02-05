import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { ThemeProvider } from "./hooks/useTheme";
import { UserProvider } from "./context/UserContext";

// Components
import LoginPage from "./components/Auth/LoginPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import ProfileByUsernamePage from "./pages/ProfileByUsernamePage";
import ProfileRedirect from "./components/Profile/ProfileRedirect";
import MessagesPage from "./pages/MessagesPage";
import FriendsPage from "./pages/FriendsPage";
import NotificationsPage from "./pages/NotificationsPage";
import MusicPage from "./pages/MusicPage";
import SettingsPage from "./pages/SettingsPage";
import UserProfile from "./pages/UserProfile";
import UsersPage from "./pages/UsersPage";
import MediaPage from "./pages/MediaPage";
import CryAdminPage from "./pages/CryAdminPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";

const BACKEND_URL = '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return !token ? children : <Navigate to="/" />;
};

function App() {
  const [isLoading, setIsLoading] = useState(true);

  const helloWorldApi = async () => {
    try {
      const response = await axios.get('/');
      console.log(response.data.message);
    } catch (e) {
      console.error(e, `errored out requesting / api`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    helloWorldApi();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce-gentle">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 animate-pulse-gentle">Загрузка MAKSUM...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <UserProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/verify-email" element={
            <PublicRoute>
              <VerifyEmailPage />
            </PublicRoute>
          } />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfileRedirect />
            </ProtectedRoute>
          } />
          <Route path="/profile/:username" element={
            <ProtectedRoute>
              <ProfileByUsernamePage />
            </ProtectedRoute>
          } />
          <Route path="/users/:id" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
          
          <Route path="/messages" element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          } />
          
          <Route path="/friends" element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          } />
          <Route path="/find-friends" element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          } />
          
          <Route path="/notifications" element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          } />

          <Route path="/music" element={
            <ProtectedRoute>
              <MusicPage />
            </ProtectedRoute>
          } />

          <Route path="/media" element={
            <ProtectedRoute>
              <MediaPage />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />

          <Route path="/cryadmin" element={
            <ProtectedRoute>
              <CryAdminPage />
            </ProtectedRoute>
          } />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;