import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
import Navigation from './components/Navigation';
import BlogList from './components/BlogList';
import BlogPost from './components/BlogPost';
import CreatePost from './components/CreatePost';
import CategoryManagement from './components/CategoryManagement';
import AudioManager from './components/AudioManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {user && <Navigation />}
      <div className="content-wrapper">
        <main className="main-content">
          <Routes>
            {/* Public Authentication Route */}
            <Route 
              path="/login" 
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login />
                )
              } 
            />

            {/* Protected Admin Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <BlogList />
                </ProtectedRoute>
              } 
            />

            {/* Create New Post */}
            <Route 
              path="/create" 
              element={
                <ProtectedRoute>
                  <CreatePost />
                </ProtectedRoute>
              } 
            />

            {/* View Post Routes */}
            <Route 
              path="/post/:slug" 
              element={
                <ProtectedRoute>
                  <BlogPost />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/post/id/:id" 
              element={
                <ProtectedRoute>
                  <BlogPost />
                </ProtectedRoute>
              } 
            />

            {/* Edit Post Routes */}
            <Route 
              path="/edit/:slug" 
              element={
                <ProtectedRoute>
                  <BlogPost editMode={true} />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/edit/id/:id" 
              element={
                <ProtectedRoute>
                  <BlogPost editMode={true} />
                </ProtectedRoute>
              } 
            />

            {/* Category Management */}
            <Route 
              path="/categories" 
              element={
                <ProtectedRoute adminOnly={true}>
                  <CategoryManagement />
                </ProtectedRoute>
              } 
            />

            {/* Audio Manager */}
            <Route 
              path="/audio-manager" 
              element={
                <ProtectedRoute>
                  <AudioManager />
                </ProtectedRoute>
              } 
            />

            {/* Analytics Dashboard */}
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <AnalyticsDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Root Route */}
            <Route 
              path="/" 
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            {/* Catch-all route */}
            <Route 
              path="*" 
              element={
                <Navigate 
                  to={user ? "/dashboard" : "/login"} 
                  replace 
                  state={{ error: 'Page not found' }}
                />
              } 
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;