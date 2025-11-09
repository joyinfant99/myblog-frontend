import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
    Plus, 
    Edit2, 
    Trash2,
    AlertCircle,
    FileText,
    RefreshCw,
    ExternalLink,
    Search,
    X as XIcon,
    Calendar,
    Clock,
    SortAsc,
    SortDesc
} from "lucide-react";
import './BlogList.css';

const POSTS_PER_PAGE = 7;

const BlogList = () => {
    const { getIdToken } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [categories, setCategories] = useState([]);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

    const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'https://myblog-cold-night-118.fly.dev';

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getIdToken();
            const response = await axios.get(`${REACT_APP_API_URL}/posts?limit=0`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && Array.isArray(response.data.posts)) {
                const sortedPosts = response.data.posts.sort((a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
                setPosts(sortedPosts);

                const uniqueCategories = [...new Set(sortedPosts
                    .filter(post => post.Category)
                    .map(post => post.Category.name))];
                setCategories(uniqueCategories);

                setTotalPages(Math.ceil(sortedPosts.length / POSTS_PER_PAGE));
            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to fetch posts');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [REACT_APP_API_URL]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchPosts();
        setRefreshing(false);
    };

    const handleDeletePosts = async () => {
        if (!selectedPosts.length) return;

        try {
            const token = await getIdToken();
            await Promise.all(
                selectedPosts.map(postId =>
                    axios.delete(`${REACT_APP_API_URL}/posts/${postId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                )
            );
            await fetchPosts();
            setShowDeleteModal(false);
            setSelectedPosts([]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete posts');
        }
    };

    const getPostViewUrl = (post) => {
        return post.customUrl ? `/post/${post.customUrl}` : `/post/id/${post.id}`;
    };

    const getPostEditUrl = (post) => {
        return post.customUrl ? `/edit/${post.customUrl}` : `/edit/id/${post.id}`;
    };

    const calculateStats = () => {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const postsThisMonth = posts.filter(post => {
            const postDate = new Date(post.createdAt);
            return postDate.getMonth() === currentMonth && 
                   postDate.getFullYear() === currentYear;
        }).length;

        if (posts.length < 2) return { postsThisMonth, frequency: "Not enough data" };

        const oldestPost = new Date(Math.min(...posts.map(post => new Date(post.createdAt))));
        const newestPost = new Date(Math.max(...posts.map(post => new Date(post.createdAt))));
        const totalDays = (newestPost - oldestPost) / (1000 * 60 * 60 * 24);
        const postsPerDay = posts.length / totalDays;
        
        let frequency;
        if (postsPerDay >= 1) {
            frequency = `${Math.round(postsPerDay)} per day`;
        } else if (postsPerDay * 7 >= 1) {
            frequency = `${Math.round(postsPerDay * 7)} per week`;
        } else {
            frequency = `${Math.round(postsPerDay * 30)} per month`;
        }

        return { postsThisMonth, frequency };
    };

    const stats = calculateStats();

    const getSortedAndFilteredPosts = () => {
        let filteredPosts = posts;

        if (selectedCategory) {
            filteredPosts = filteredPosts.filter(post => 
                post.Category?.name === selectedCategory
            );
        }

        if (searchTerm) {
            filteredPosts = filteredPosts.filter(post => 
                post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (post.Category?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filteredPosts.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    };

    const getCurrentPosts = () => {
        const sortedAndFilteredPosts = getSortedAndFilteredPosts();
        const indexOfLastPost = currentPage * POSTS_PER_PAGE;
        const indexOfFirstPost = indexOfLastPost - POSTS_PER_PAGE;
        return sortedAndFilteredPosts.slice(indexOfFirstPost, indexOfLastPost);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    };

    useEffect(() => {
        fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const sortedAndFilteredPosts = getSortedAndFilteredPosts();
        const newTotalPages = Math.ceil(sortedAndFilteredPosts.length / POSTS_PER_PAGE);
        setTotalPages(newTotalPages);

        // Reset to page 1 if current page exceeds total pages
        if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [posts, selectedCategory, searchTerm, sortOrder]);

    if (loading && !refreshing) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <span>Loading posts...</span>
            </div>
        );
    }
    return (
        <div className="dashboard">
            {error && (
                <div className="error-banner">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                    <button onClick={handleRefresh} className="refresh-button">
                        <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                        Retry
                    </button>
                </div>
            )}

            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Blog Posts</h1>
                    <Link to="/create" className="create-button">
                        <Plus size={18} />
                        New Post
                    </Link>
                </div>

                <div className="stats-cards-wrapper">
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <FileText size={20} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{posts.length}</span>
                                <span className="stat-label">Total Posts</span>
                            </div>
                        </div>
                        
                        <div className="stat-card">
                            <div className="stat-icon">
                                <Calendar size={20} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.postsThisMonth}</span>
                                <span className="stat-label">Posts This Month</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">
                                <Clock size={20} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.frequency}</span>
                                <span className="stat-label">Publishing Frequency</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-actions">
                    <div className="table-actions-left">
                        <button 
                            className="search-button"
                            onClick={() => setShowSearch(!showSearch)}
                        >
                            <Search size={16} />
                            Search
                        </button>

                        <select 
                            className="category-filter"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(category => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>

                        <button 
                            className="sort-button"
                            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                        >
                            {sortOrder === 'newest' ? <SortDesc size={16} /> : <SortAsc size={16} />}
                            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                        </button>
                    </div>
                    
                    <div className="table-actions-right">
                        {selectedPosts.length > 0 && (
                            <button 
                                className="delete-selected"
                                onClick={() => setShowDeleteModal(true)}
                            >
                                <Trash2 size={16} />
                                Delete Selected ({selectedPosts.length})
                            </button>
                        )}
                    </div>
                </div>

                {showSearch && (
                    <div className="search-bar">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search posts by title or category..."
                            className="search-input"
                            autoFocus
                        />
                        <button 
                            className="clear-search"
                            onClick={() => {
                                setSearchTerm('');
                                setShowSearch(false);
                            }}
                        >
                            <XIcon size={16} />
                        </button>
                    </div>
                )}

                <div className="table-wrapper">
                    {isMobileView ? (
                        <div className="mobile-posts-list">
                            {getCurrentPosts().map((post) => (
                                <div key={post.id} className="mobile-post-card">
                                    <div className="mobile-post-header">
                                        <input 
                                            type="checkbox"
                                            checked={selectedPosts.includes(post.id)}
                                            onChange={() => {
                                                setSelectedPosts(prev => 
                                                    prev.includes(post.id)
                                                        ? prev.filter(id => id !== post.id)
                                                        : [...prev, post.id]
                                                );
                                            }}
                                        />
                                        <Link to={getPostViewUrl(post)} className="post-title">
                                            {post.title}
                                        </Link>
                                    </div>
                                    <div className="mobile-post-content">
                                        {post.Category && (
                                            <span 
                                                className="category-badge"
                                                style={{
                                                    backgroundColor: post.Category.backgroundColor,
                                                    color: post.Category.fontColor
                                                }}
                                            >
                                                {post.Category.name}
                                            </span>
                                        )}
                                        <span className="mobile-post-date">
                                            {formatDate(post.createdAt)}
                                        </span>
                                        <div className="mobile-post-actions">
                                            <Link 
                                                to={getPostEditUrl(post)}
                                                className="action-button"
                                            >
                                                <Edit2 size={16} />
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    setSelectedPosts([post.id]);
                                                    setShowDeleteModal(true);
                                                }}
                                                className="action-button delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <table className="posts-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input 
                                            type="checkbox"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedPosts(getCurrentPosts().map(post => post.id));
                                                } else {
                                                    setSelectedPosts([]);
                                                }
                                            }}
                                            checked={
                                                getCurrentPosts().length > 0 && 
                                                selectedPosts.length === getCurrentPosts().length
                                            }
                                        />
                                    </th>
                                    <th>Title</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getCurrentPosts().map((post) => (
                                    <tr key={post.id}>
                                        <td>
                                            <input 
                                                type="checkbox"
                                                checked={selectedPosts.includes(post.id)}
                                                onChange={() => {
                                                    setSelectedPosts(prev => 
                                                        prev.includes(post.id)
                                                            ? prev.filter(id => id !== post.id)
                                                            : [...prev, post.id]
                                                    );
                                                }}
                                            />
                                        </td>
                                        <td className="title-cell">
                                            <div className="post-title-wrapper">
                                                <Link to={getPostViewUrl(post)} className="post-title">
                                                    {post.title}
                                                    <ExternalLink size={14} className="external-link-icon" />
                                                </Link>
                                                <span className="post-url">{post.customUrl || post.id}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {post.Category && (
                                                <span 
                                                    className="category-badge"
                                                    style={{
                                                        backgroundColor: post.Category.backgroundColor,
                                                        color: post.Category.fontColor
                                                    }}
                                                >
                                                    {post.Category.name}
                                                </span>
                                            )}
                                        </td>
                                        <td>{formatDate(post.createdAt)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <Link 
                                                    to={getPostEditUrl(post)}
                                                    className="action-button"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setSelectedPosts([post.id]);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="action-button delete"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="pagination-button"
                        >
                            Previous
                        </button>
                        <span className="pagination-info">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="pagination-button"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Delete Posts</h3>
                        <p>Are you sure you want to delete {selectedPosts.length} post(s)?</p>
                        <p className="modal-warning">This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeletePosts}
                                className="delete-button"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlogList;