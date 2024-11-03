// src/components/BlogList.js
import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import Introduction from "./Introduction";
import { Search, ArrowUpDown } from "lucide-react";

// Background SVG Components
const BackgroundDecoration = () => (
    <div className="header-decoration">
        <svg className="header-svg left" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M44.9,-76.8C59.7,-69.8,74.3,-60.3,83.4,-46.7C92.6,-33.1,96.2,-16.5,94.6,-1C93,14.6,86.2,29.1,77.4,42.3C68.6,55.5,57.8,67.3,44.4,74.7C31,82.1,15.5,85.1,0.2,84.7C-15,84.4,-30.1,80.7,-43.5,73.3C-56.9,65.9,-68.6,54.8,-77.7,41.3C-86.8,27.8,-93.2,14,-92.8,0.2C-92.3,-13.5,-84.9,-27,-76.1,-39.2C-67.3,-51.4,-57.2,-62.3,-44.6,-70.4C-32.1,-78.5,-16,-83.8,-0.3,-83.3C15.5,-82.8,30.9,-76.5,44.9,-76.8Z" transform="translate(100 100)" />
        </svg>
        <svg className="header-svg right" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M38.9,-64.7C51.1,-57.8,62.3,-48.1,70.8,-35.8C79.2,-23.4,84.9,-8.3,83.7,6.3C82.4,20.9,74.1,35,64.1,46.8C54.1,58.6,42.3,68,28.8,73.1C15.2,78.3,-0.2,79.1,-15.6,76.3C-31,73.4,-46.5,66.9,-58.6,56.3C-70.7,45.7,-79.5,31.1,-83.6,14.7C-87.7,-1.7,-87.1,-19.8,-80.4,-34.8C-73.7,-49.8,-60.9,-61.6,-46.3,-67.5C-31.7,-73.4,-15.8,-73.4,-0.3,-72.9C15.3,-72.4,30.5,-71.4,38.9,-64.7Z" transform="translate(100 100)" />
        </svg>
        <div className="particles"></div>
    </div>
);

const BlogList = ({ filters, setFilters }) => {
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [sortLabel, setSortLabel] = useState("Latest");
    const [headerIndex, setHeaderIndex] = useState(0);
    
    const location = useLocation();
    const navigate = useNavigate();

    const HEADERS = [
        "🚀 Solution Stories",
        "📡 Digital Drift",
        "🏕️ Travel Tales",
        "🎼 Music Memoirs",
        "🪴 Life Unfolded",
    ];
    
    const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    const POSTS_PER_PAGE = 5;

    useEffect(() => {
        const interval = setInterval(() => {
            setHeaderIndex((prev) => (prev + 1) % HEADERS.length);
        }, 3000);
    
        return () => clearInterval(interval);
    }, [HEADERS.length]);

    // Fetch Posts
    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${REACT_APP_API_URL}/posts`);
            if (!response.ok) throw new Error("Failed to fetch posts");
            const data = await response.json();
            setPosts(data.posts);
            filterAndPaginatePosts(data.posts, filters.category, filters.sortOrder, 1);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    }, [filters, REACT_APP_API_URL]);

    const filterAndPaginatePosts = (allPosts, category, sortOrder, page) => {
        let filtered = [...allPosts];

        if (category) {
            filtered = filtered.filter(
                (post) => post.Category && post.Category.name === category
            );
        }

        filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / POSTS_PER_PAGE);
        const start = (page - 1) * POSTS_PER_PAGE;
        const paginatedPosts = filtered.slice(start, start + POSTS_PER_PAGE);

        setFilteredPosts(paginatedPosts);
        setTotalPages(totalPages);
    };

    const getPostUrl = (post) => {
        return post.customUrl ? `/post/${post.customUrl}` : `/post/id/${post.id}`;
    };

    const searchPosts = (term) => {
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }

        const searchTermLower = term.toLowerCase();
        const results = posts.filter((post) => {
            const titleMatch = post.title.toLowerCase().includes(searchTermLower);
            const contentMatch = post.content.toLowerCase().includes(searchTermLower);
            return titleMatch || contentMatch;
        });

        setSearchResults(results);
    };

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    useEffect(() => {
        fetch(`${REACT_APP_API_URL}/categories`)
            .then((response) => response.json())
            .then((data) => setCategories(data))
            .catch((err) => console.error("Failed to fetch categories:", err));
    }, [REACT_APP_API_URL]);

    useEffect(() => {
        if (posts.length > 0) {
            filterAndPaginatePosts(
                posts,
                filters.category,
                filters.sortOrder,
                currentPage
            );
        }
    }, [filters.category, filters.sortOrder, currentPage, posts]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        searchPosts(searchTerm);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const handleCategoryClick = (categoryName) => {
        setFilters((prev) => ({
            ...prev,
            category: categoryName === prev.category ? "" : categoryName,
        }));
        setCurrentPage(1);
        setIsSearchActive(false);
        setSearchTerm("");
        setSearchResults([]);
    };

    const handleSortClick = () => {
        const newSortOrder = filters.sortOrder === "desc" ? "asc" : "desc";
        setFilters((prev) => ({
            ...prev,
            sortOrder: newSortOrder,
        }));
        setSortLabel(newSortOrder === "desc" ? "Latest" : "Oldest");
        setCurrentPage(1);
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const truncateHTML = (html, maxLength) => {
        const strippedString = html.replace(/(<([^>]+)>)/gi, "");
        if (strippedString.length <= maxLength) return html;
        const truncated = strippedString.substr(0, maxLength);
        return truncated.substr(0, truncated.lastIndexOf(" ")) + "...";
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="blog-list-container">
            <Introduction />
            <div className="blog-list">
                <div className="header-wrapper">
                    <BackgroundDecoration />
                    <div className="animated-header-container">
                        <div className="header-content">
                            <h1 className="animated-header">
                                <span key={headerIndex} className="header-text">
                                    {HEADERS[headerIndex]}
                                </span>
                            </h1>
                            <div className="header-underline"></div>
                        </div>
                    </div>
                </div>

                <div className="blog-controls-bento">
                    <div className="controls-row">
                        <button
                            className="control-icon"
                            onClick={() => setIsSearchActive(!isSearchActive)}
                            aria-label="Search"
                        >
                            <Search size={18} />
                        </button>

                        <div className="categories-row">
                            <button
                                className={`category-pill ${!filters.category ? "active" : ""}`}
                                onClick={() => handleCategoryClick("")}
                            >
                                All Posts
                            </button>
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    className={`category-pill ${
                                        filters.category === category.name ? "active" : ""
                                    }`}
                                    onClick={() => handleCategoryClick(category.name)}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>

                        <button
                            className="control-icon sort-button"
                            onClick={handleSortClick}
                            aria-label={`Sort by ${sortLabel}`}
                        >
                            <span className="sort-label">{sortLabel}</span>
                            <ArrowUpDown size={18} />
                        </button>
                    </div>
                </div>

                {isSearchActive && (
                    <div className="search-overlay">
                        <div className="search-modal">
                            <form onSubmit={handleSearchSubmit} className="search-form">
                                <div className="search-input-group">
                                    <Search className="search-icon" size={20} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            searchPosts(e.target.value);
                                        }}
                                        placeholder="Search posts..."
                                        className="search-input"
                                        autoFocus
                                    />
                                </div>
                            </form>

                            <div className="search-results">
                                {searchResults.length > 0 ? (
                                    searchResults.map((post) => (
                                        <Link
                                            key={post.id}
                                            to={getPostUrl(post)}
                                            className="search-result-item"
                                            onClick={() => setIsSearchActive(false)}
                                        >
                                            <h3>{post.title}</h3>
                                            <div className="search-meta">
                                                <span className="search-date">
                                                    {formatDate(post.createdAt)}
                                                </span>
                                                {post.Category && (
                                                    <span
                                                        className="category-pill"
                                                        style={{
                                                            backgroundColor:
                                                                post.Category.backgroundColor ||
                                                                "#e0e0e0",
                                                            color:
                                                                post.Category.fontColor || "#000000",
                                                        }}
                                                    >
                                                        {post.Category.name}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    ))
                                ) : searchTerm ? (
                                    <div className="no-results">No posts found</div>
                                ) : null}
                            </div>

                            <button
                                className="close-search"
                                onClick={() => {
                                    setIsSearchActive(false);
                                    setSearchTerm("");
                                    setSearchResults([]);
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                <div className="blog-posts">
                    {filteredPosts.length === 0 ? (
                        <div className="no-posts">No posts found</div>
                    ) : (
                        filteredPosts.map((post) => (
                            <div key={post.id} className="blog-item">
                                <h2>
                                    <Link to={getPostUrl(post)}>{post.title}</Link>
                                </h2>
                                <div className="post-meta">
                                    <span className="post-date">
                                        {formatDate(post.createdAt)}
                                    </span>
                                    {post.Category && (
                                        <span
                                            className="category-pill"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleCategoryClick(post.Category.name);
                                            }}
                                            style={{
                                                backgroundColor:
                                                    post.Category.backgroundColor || "#e0e0e0",
                                                color: post.Category.fontColor || "#000000",
                                            }}
                                        >
                                            {post.Category.name}
                                        </span>
                                    )}
                                </div>
                                <div
                                    className="blog-content"
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(
                                            truncateHTML(post.content, 150)
                                        ),
                                    }}
                                />
                                <Link to={getPostUrl(post)} className="read-more">
                                    Read more
                                </Link>
                            </div>
                        ))
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            ←
                        </button>
                        {[...Array(totalPages)].map((_, index) => {
                            const pageNumber = index + 1;
                            if (
                                pageNumber === 1 ||
                                pageNumber === totalPages ||
                                (pageNumber >= currentPage - 1 &&
                                    pageNumber <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={pageNumber}
                                        onClick={() => handlePageChange(pageNumber)}
                                        className={`page-number ${
                                            currentPage === pageNumber ? "active" : ""
                                        }`}
                                    >
                                        {pageNumber}
                                    </button>
                                );
                            } else if (
                                pageNumber === currentPage - 2 ||
                                pageNumber === currentPage + 2
                            ) {
                                return (
                                    <span key={pageNumber} className="pagination-ellipsis">
                                        ...
                                    </span>
                                );
                            }
                            return null;
                        })}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlogList;