import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Sun, Moon, LayoutDashboard, FileText, Settings, LogOut, BarChart3 } from 'lucide-react';
import './Navigation.css';

function Navigation({ isDarkMode, toggleDarkMode }) {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const NavLinks = () => (
    <>
      <li>
        <Link to="/dashboard" className="nav-link">
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
      </li>
      <li>
        <Link to="/create" className="nav-link">
          <FileText size={18} />
          <span>Create Post</span>
        </Link>
      </li>
      <li>
        <Link to="/analytics" className="nav-link">
          <BarChart3 size={18} />
          <span>Analytics</span>
        </Link>
      </li>
      {user?.isAdmin && (
        <li>
          <Link to="/categories" className="nav-link">
            <Settings size={18} />
            <span>Categories</span>
          </Link>
        </li>
      )}
      <li>
        <button onClick={handleLogout} className="nav-link logout">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </li>
      <li>
        <button onClick={toggleDarkMode} className="theme-toggle">
          {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </li>
    </>
  );

  return (
    <nav className="admin-nav">
      <div className="nav-container">
        <div className="nav-brand">
          <img 
            src="https://i.ibb.co/MM2FrPL/Joy.png" 
            alt="Joy Infant" 
            className="brand-image"
          />
          <span className="brand-name">Admin Dashboard</span>
        </div>

        <button className="mobile-menu-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <ul className="nav-links desktop-menu">
          <NavLinks />
        </ul>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
        <ul className="nav-links">
          <NavLinks />
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;