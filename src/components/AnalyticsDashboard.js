import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, Eye, Clock, Globe, Share2,
  BarChart3, Activity, RefreshCw, Calendar
} from 'lucide-react';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const { getIdToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('7days');
  const [refreshing, setRefreshing] = useState(false);

  const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'https://myblog-cold-night-118.fly.dev';

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = await getIdToken();
      const response = await axios.get(
        `${REACT_APP_API_URL}/admin/analytics?range=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-error">
        <p>No analytics data available yet</p>
        <p className="help-text">Data will appear once visitors start reading your blog posts</p>
        <button onClick={fetchAnalytics} className="retry-button">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="header-content">
          <h1>Analytics Dashboard</h1>
          <p className="subtitle">Track your blog's performance and engagement</p>
        </div>
        <div className="header-actions">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={handleRefresh}
            className="refresh-button"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#dbeafe' }}>
            <Eye size={24} color="#3b82f6" />
          </div>
          <div className="metric-content">
            <h3>{analytics.totalViews?.toLocaleString() || 0}</h3>
            <p>Total Views</p>
            {analytics.viewsChange && (
              <span className={`metric-change ${analytics.viewsChange > 0 ? 'positive' : 'negative'}`}>
                <TrendingUp size={14} />
                {analytics.viewsChange > 0 ? '+' : ''}{analytics.viewsChange}%
              </span>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#d1fae5' }}>
            <Users size={24} color="#10b981" />
          </div>
          <div className="metric-content">
            <h3>{analytics.totalVisitors?.toLocaleString() || 0}</h3>
            <p>Unique Visitors</p>
            {analytics.visitorsChange && (
              <span className={`metric-change ${analytics.visitorsChange > 0 ? 'positive' : 'negative'}`}>
                <TrendingUp size={14} />
                {analytics.visitorsChange > 0 ? '+' : ''}{analytics.visitorsChange}%
              </span>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fef3c7' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div className="metric-content">
            <h3>{analytics.avgTimeOnPage || '0:00'}</h3>
            <p>Avg. Time on Page</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fee2e2' }}>
            <Activity size={24} color="#ef4444" />
          </div>
          <div className="metric-content">
            <h3>{analytics.bounceRate || '0'}%</h3>
            <p>Bounce Rate</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Views Over Time */}
        <div className="chart-card full-width">
          <h3 className="chart-title">
            <BarChart3 size={20} />
            Views Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.viewsOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Posts */}
        <div className="chart-card">
          <h3 className="chart-title">
            <TrendingUp size={20} />
            Top Performing Posts
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.topPosts || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="views" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic Sources */}
        <div className="chart-card">
          <h3 className="chart-title">
            <Globe size={20} />
            Traffic Sources
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.trafficSources || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {(analytics.trafficSources || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Popular Posts Table */}
      <div className="popular-posts-section">
        <h3 className="section-title">
          <Share2 size={20} />
          Most Popular Posts
        </h3>
        <div className="posts-table-container">
          <table className="posts-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Post Title</th>
                <th>Views</th>
                <th>Avg. Time</th>
                <th>Shares</th>
              </tr>
            </thead>
            <tbody>
              {(analytics.popularPosts || []).map((post, index) => (
                <tr key={post.id}>
                  <td className="rank-cell">#{index + 1}</td>
                  <td className="title-cell">{post.title}</td>
                  <td>{post.views?.toLocaleString() || 0}</td>
                  <td>{post.avgTime || '0:00'}</td>
                  <td>{post.shares || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEO Metrics */}
      <div className="seo-section">
        <h3 className="section-title">
          <Calendar size={20} />
          SEO Performance
        </h3>
        <div className="seo-metrics-grid">
          <div className="seo-metric">
            <label>Total Indexed Pages</label>
            <span className="seo-value">{analytics.seo?.indexedPages || 0}</span>
          </div>
          <div className="seo-metric">
            <label>Avg. Page Load Time</label>
            <span className="seo-value">{analytics.seo?.avgLoadTime || '0'}s</span>
          </div>
          <div className="seo-metric">
            <label>Mobile Friendly Score</label>
            <span className="seo-value">{analytics.seo?.mobileScore || 0}/100</span>
          </div>
          <div className="seo-metric">
            <label>SEO Score</label>
            <span className="seo-value">{analytics.seo?.seoScore || 0}/100</span>
          </div>
        </div>
      </div>

      {/* Google Analytics Note */}
      <div className="ga-note">
        <p>
          📊 <strong>Note:</strong> This dashboard shows data from your blog analytics. 
          For detailed Google Analytics reports, visit{' '}
          <a 
            href="https://analytics.google.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ga-link"
          >
            Google Analytics Dashboard
          </a>
        </p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
