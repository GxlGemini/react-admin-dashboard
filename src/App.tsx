
import React, { PropsWithChildren } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UsersPage } from './pages/Users';
import { LoginHistoryPage } from './pages/LoginHistory';
import { WeatherPage } from './pages/Weather';
import { MapPage } from './pages/Map';
import { ProfilePage } from './pages/Profile';
import { AiAssistant } from './pages/AiAssistant';
import { GalleryPage } from './pages/Gallery';
import { MusicPlayer } from './pages/MusicPlayer';
import { GuidePage } from './pages/Guide';
import { NewYearCountdown } from './pages/NewYearCountdown';
import { SnippetsPage } from './pages/Snippets';
import { GoldenFlowerPage } from './pages/GoldenFlower';
import { RoutePath } from './types';
import { AppProvider } from './contexts/AppContext';
import { MusicProvider } from './contexts/MusicContext';
import { authService } from './services/authService';

// Higher-Order Component for Route Protection
const ProtectedRoute = ({ children }: PropsWithChildren) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to={RoutePath.LOGIN} replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <AppProvider>
      <MusicProvider>
        <HashRouter>
            <Routes>
            <Route path={RoutePath.LOGIN} element={<Login />} />
            
            {/* Main Layout wrapper */}
            <Route 
                path="/" 
                element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
                }
            >
                {/* Dashboard is the DEFAULT landing page */}
                <Route index element={<Dashboard />} />
                
                {/* Other specific modules */}
                <Route path={RoutePath.GUIDE} element={<GuidePage />} />
                <Route path={RoutePath.NEW_YEAR} element={<NewYearCountdown />} />
                <Route path={RoutePath.GOLDEN_FLOWER} element={<GoldenFlowerPage />} />
                <Route path={RoutePath.USERS} element={<UsersPage />} />
                <Route path={RoutePath.LOGIN_HISTORY} element={<LoginHistoryPage />} />
                <Route path={RoutePath.SNIPPETS} element={<SnippetsPage />} />
                <Route path={RoutePath.GALLERY} element={<GalleryPage />} />
                <Route path={RoutePath.MUSIC} element={<MusicPlayer />} />
                <Route path={RoutePath.WEATHER} element={<WeatherPage />} />
                <Route path={RoutePath.MAP} element={<MapPage />} />
                <Route path={RoutePath.PROFILE} element={<ProfilePage />} />
                <Route path={RoutePath.AI_ASSISTANT} element={<AiAssistant />} />
            </Route>
            
            {/* Explicitly redirect unknown routes to Login to enforce entry policy */}
            <Route path="*" element={<Navigate to={RoutePath.LOGIN} replace />} />
            </Routes>
        </HashRouter>
      </MusicProvider>
    </AppProvider>
  );
}

export default App;
