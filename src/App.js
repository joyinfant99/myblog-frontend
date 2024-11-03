import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
import Navigation from './components/Navigation';
import BlogList from './components/BlogList';
import BlogPost from './components/BlogPost';
import CreatePost from './components/CreatePost';
import SearchResults from './components/SearchResults';
import Login from './components/Login';
import CategoryManagement from './components/CategoryManagement';
import ProtectedRoute from './components/ProtectedRoute';
import About from './components/About';
import ConnectWithMe from './components/ConnectWithMe';
import DefaultSEO from './components/DefaultSEO';
import './App.css';

function AppContent() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    category: '',
    sortOrder: 'desc',
    searchQuery: ''
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const resetFilters = () => {
    setFilters({
      category: '',
      sortOrder: 'desc',
      searchQuery: ''
    });
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
    document.body.classList.toggle('dark-mode', newMode);
  };

  React.useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);
  
  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>
      <DefaultSEO />
      <header className="header">
        <Navigation resetFilters={resetFilters} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      </header>
      <div className="content-wrapper">
        <main className="main-content">
          <Routes>
            {/* Static Routes */}
            <Route 
              path="/admin-login" 
              element={user ? <Navigate to="/" replace /> : <Login />} 
            />
            <Route path="/about" element={<About />} />
            <Route path="/connect" element={<ConnectWithMe />} />
            <Route path="/search" element={<SearchResults />} />
            
            {/* Protected Routes */}
            <Route 
              path="/create" 
              element={
                <ProtectedRoute>
                  <CreatePost />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/categories" 
              element={
                <ProtectedRoute adminOnly={true}>
                  <CategoryManagement />
                </ProtectedRoute>
              } 
            />

            {/* Blog Post Routes - Order matters here */}
            <Route path="/post/id/:id" element={<BlogPost />} /> {/* Legacy ID-based URLs */}
            <Route path="/post/:slug" element={<BlogPost />} /> {/* Custom URL with prefix */}
            
            {/* Home Route */}
            <Route path="/" element={<BlogList filters={filters} setFilters={setFilters} />} />
            
            {/* Direct Custom URL Route - Must be after specific routes */}
            <Route path="/:slug" element={<BlogPost />} />

            {/* Catch-all route - must be last */}
            <Route 
              path="*" 
              element={
                <Navigate 
                  to="/" 
                  replace 
                  state={{ error: 'Page not found' }}
                />
              } 
            />
          </Routes>
        </main>
      </div>
      <footer className="footer" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '10px 20px',
        textAlign: 'center'
      }}>
        <p>© 2024 Joy Infant. All rights reserved. 🌟</p>
      </footer>
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