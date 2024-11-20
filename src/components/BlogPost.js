import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../contexts/AuthContext';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import axios from 'axios';
import { 
    Twitter, 
    Facebook,
    Share2,
    Calendar,
    ArrowLeft,
    Edit,
    Trash2,
    X,
    Copy,
    CheckCheck,
    MessageCircle,
    ChevronDown,
    ChevronUp,
    Youtube,
    Linkedin,
    Save,
    AlertCircle,
    Loader} from 'lucide-react';
import 'react-quill/dist/quill.snow.css';
import './BlogPost.css';

const BlogPost = ({ editMode: initialEditMode = false }) => {
    const { id, slug } = useParams();
    const navigate = useNavigate();
    const { user, getIdToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(initialEditMode);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isVideoExpanded, setIsVideoExpanded] = useState(false);
    const [categories, setCategories] = useState([]);
    const [success, setSuccess] = useState('');

    // Post Data State
    const [post, setPost] = useState(null);
    const [editedPost, setEditedPost] = useState({
        title: '',
        content: '',
        CategoryId: '',
        customUrl: '',
        publishDate: '',
        youtubeUrl: '',
        metaDescription: '',
        socialTitle: '',
        socialDescription: '',
        seoKeywords: ''
    });

    // Image States
    const [bannerImage, setBannerImage] = useState(null);
    const [socialImage, setSocialImage] = useState(null);
    const [bannerImagePreview, setBannerImagePreview] = useState('');
    const [socialImagePreview, setSocialImagePreview] = useState('');
    const [existingBannerImage, setExistingBannerImage] = useState('');
    const [existingSocialImage, setExistingSocialImage] = useState('');

    const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'https://myblog-cold-night-118.fly.dev';
    const SITE_URL = process.env.REACT_APP_SITE_URL || window.location.origin.replace(/\/$/, '');

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['blockquote', 'code-block'],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link', 'image'],
            ['clean']
        ],
        clipboard: {
            matchVisual: false
        }
    };

    const socialPlatforms = [
        {
            name: 'LinkedIn',
            icon: <Linkedin size={24} />,
            getUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
        },
        {
            name: 'Twitter',
            icon: <Twitter size={24} />,
            getUrl: (url, text) => `https://twitter.com/intent/tweet?url=${url}&text=${text}`
        },
        {
            name: 'Facebook',
            icon: <Facebook size={24} />,
            getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`
        },
        {
            name: 'WhatsApp',
            icon: <MessageCircle size={24} />,
            getUrl: (url, text) => `https://api.whatsapp.com/send?text=${text} ${url}`
        }
    ];

    const fetchPost = useCallback(async () => {
        try {
            let response;
            
            if (slug) {
                response = await axios.get(`${REACT_APP_API_URL}/posts/url/${slug}`);
            } else if (id) {
                response = await axios.get(`${REACT_APP_API_URL}/posts/id/${id}`);
            } else {
                // eslint-disable-next-line no-restricted-globals
                const pathSlug = location.pathname.split('/').pop();
                response = await axios.get(`${REACT_APP_API_URL}/posts/url/${pathSlug}`);
            }

            const data = response.data;
            setPost(data);

            // Set edited post data if in edit mode
            setEditedPost({
                title: data.title || '',
                content: data.content || '',
                CategoryId: data.CategoryId || '',
                customUrl: data.customUrl || '',
                publishDate: data.publishDate ? new Date(data.publishDate).toISOString().split('T')[0] : '',
                youtubeUrl: data.youtubeUrl || '',
                metaDescription: data.metaDescription || '',
                socialTitle: data.socialTitle || data.title || '',
                socialDescription: data.socialDescription || data.metaDescription || '',
                seoKeywords: Array.isArray(data.seoKeywords) ? data.seoKeywords.join(', ') : (data.seoKeywords || '')
            });

            // Handle images
            if (data.bannerImage) {
                setExistingBannerImage(`${REACT_APP_API_URL}/${data.bannerImage}`);
                setBannerImagePreview(`${REACT_APP_API_URL}/${data.bannerImage}`);
            }
            
            if (data.socialImage) {
                setExistingSocialImage(`${REACT_APP_API_URL}/${data.socialImage}`);
                setSocialImagePreview(`${REACT_APP_API_URL}/${data.socialImage}`);
            }

            // Handle YouTube URL
            if (data.youtubeUrl) {
                const videoId = extractYoutubeVideoId(data.youtubeUrl);
                if (videoId) {
                    setEditedPost(prev => ({
                        ...prev,
                        youtubeEmbedUrl: `https://www.youtube.com/embed/${videoId}`
                    }));
                }
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching post:', error);
            setError('Failed to load post. Please try again.');
            setLoading(false);
        }
    }, [id, slug, REACT_APP_API_URL]);

    const fetchCategories = useCallback(async () => {
        try {
            const response = await axios.get(`${REACT_APP_API_URL}/categories`);
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError('Failed to load categories. Please try again.');
        }
    }, [REACT_APP_API_URL]);

    useEffect(() => {
        fetchPost();
        fetchCategories();
    }, [fetchPost, fetchCategories]);

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post?')) {
            return;
        }

        try {
            const token = await getIdToken();
            await axios.delete(`${REACT_APP_API_URL}/posts/${post.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/dashboard', { replace: true });
        } catch (error) {
            console.error('Error deleting post:', error);
            setError('Failed to delete post. Please try again.');
        }
    };

    const handleFileChange = (fieldName, file) => {
        if (!file) return;

        if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
            setError('Please upload only JPEG or PNG images.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image size should be less than 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (fieldName === 'bannerImage') {
                setBannerImage(file);
                setBannerImagePreview(reader.result);
            } else if (fieldName === 'socialImage') {
                setSocialImage(file);
                setSocialImagePreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        
        if (type === 'file') {
            handleFileChange(name, files[0]);
        } else {
            setEditedPost(prev => ({ ...prev, [name]: value }));
        }
    };

    const extractYoutubeVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleYoutubeUrlChange = (e) => {
        const url = e.target.value;
        setEditedPost(prev => ({ ...prev, youtubeUrl: url }));
        
        const videoId = extractYoutubeVideoId(url);
        if (videoId) {
            setEditedPost(prev => ({
                ...prev,
                youtubeEmbedUrl: `https://www.youtube.com/embed/${videoId}`
            }));
            setError('');
        } else if (url && !videoId) {
            setEditedPost(prev => ({ ...prev, youtubeEmbedUrl: '' }));
            setError('Please enter a valid YouTube URL');
        } else {
            setEditedPost(prev => ({ ...prev, youtubeEmbedUrl: '' }));
            setError('');
        }
    };

    const validateForm = () => {
        if (!editedPost.title.trim()) {
            setError('Title is required');
            return false;
        }
        if (!editedPost.content.trim()) {
            setError('Content is required');
            return false;
        }
        if (!editedPost.CategoryId) {
            setError('Category is required');
            return false;
        }
        if (!editedPost.metaDescription?.trim()) {
            setError('Meta description is required for SEO');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const token = await getIdToken();
            const formData = new FormData();
            
            Object.keys(editedPost).forEach(key => {
                if (key !== 'bannerImage' && key !== 'socialImage' && editedPost[key] != null) {
                    formData.append(key, editedPost[key]);
                }
            });

            if (bannerImage instanceof File) {
                formData.append('bannerImage', bannerImage);
            }
            if (socialImage instanceof File) {
                formData.append('socialImage', socialImage);
            }

            const response = await axios.put(
                `${REACT_APP_API_URL}/posts/${post.id}`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setPost(response.data);
            setEditMode(false);
            setSuccess('Post updated successfully!');

            // Redirect if custom URL changed
            if (response.data.customUrl && response.data.customUrl !== post.customUrl) {
                navigate(`/post/${response.data.customUrl}`, { replace: true });
            }
        } catch (error) {
            console.error('Error updating post:', error);
            setError(error.response?.data?.message || 'Failed to update post');
        }
    };

    // Share functionality
    const handleShare = (platform) => {
        const url = encodeURIComponent(`${SITE_URL}/#/post/${post.customUrl || post.id}`);
        const text = encodeURIComponent(post.socialTitle || post.title);
        const shareUrl = platform.getUrl(url, text);
        
        window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    const handleCopyLink = async () => {
        try {
            const url = `${SITE_URL}/#/post/${post.customUrl || post.id}`;
            await navigator.clipboard.writeText(url);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
            setError('Failed to copy link to clipboard');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };
    // Sanitize content for security
    const sanitizeContent = (content) => {
        const config = {
            ADD_TAGS: ['iframe'],
            ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'src'],
        };
        return {
            __html: DOMPurify.sanitize(content, config)
        };
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (!post) return <div className="no-post">Post not found.</div>;

    const postUrl = `${SITE_URL}/#/post/${post.customUrl || post.id}`;
    const imageUrl = post.bannerImage ? `${REACT_APP_API_URL}/${post.bannerImage}` : null;
    const metaDescription = post.metaDescription || post.content.replace(/<[^>]+>/g, '').substring(0, 160);

    return (
        <>
            <Helmet>
                <title>{post.title}</title>
                <meta name="description" content={metaDescription} />
                <link rel="canonical" href={postUrl} />

                {/* Open Graph */}
                <meta property="og:title" content={post.socialTitle || post.title} />
                <meta property="og:description" content={post.socialDescription || metaDescription} />
                {imageUrl && <meta property="og:image" content={imageUrl} />}
                <meta property="og:url" content={postUrl} />
                <meta property="og:type" content="article" />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={post.socialTitle || post.title} />
                <meta name="twitter:description" content={post.socialDescription || metaDescription} />
                {imageUrl && <meta name="twitter:image" content={imageUrl} />}

                {/* Article Metadata */}
                <meta property="article:published_time" content={post.publishDate} />
                <meta property="article:modified_time" content={post.updatedAt} />
                {post.seoKeywords && <meta name="keywords" content={post.seoKeywords} />}
            </Helmet>

            <div className="blog-post">
                <Link to="/dashboard" className="back-button">
                    <ArrowLeft className="icon" size={20} />
                    Back to Dashboard
                </Link>

                {editMode ? (
                    <form onSubmit={handleSubmit} className="edit-form">
                        {error && (
                            <div className="error-message">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="success-message">
                                <CheckCheck size={20} />
                                {success}
                            </div>
                        )}

                        {/* Main Content Section */}
                        <div className="form-section">
                            <h3 className="section-title">Content</h3>
                            
                            <div className="form-group">
                                <label htmlFor="category">Category: *</label>
                                <select 
                                    id="category"
                                    name="CategoryId"
                                    value={editedPost.CategoryId}
                                    onChange={handleChange}
                                    className="category-select"
                                    required
                                >
                                    <option value="">Select a category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="title">Title: *</label>
                                <input 
                                    id="title"
                                    name="title"
                                    type="text" 
                                    value={editedPost.title}
                                    onChange={handleChange}
                                    required 
                                    className="title-input"
                                    placeholder="Enter post title"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="customUrl">Custom URL:</label>
                                <input 
                                    id="customUrl"
                                    name="customUrl"
                                    type="text" 
                                    value={editedPost.customUrl}
                                    onChange={handleChange}
                                    className="custom-url-input"
                                    placeholder="custom-url-for-post"
                                />
                                <small className="help-text">Only lowercase letters, numbers, and hyphens allowed</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="content">Content: *</label>
                                <ReactQuill 
                                    id="content"
                                    theme="snow"
                                    value={editedPost.content}
                                    onChange={(content) => setEditedPost(prev => ({ ...prev, content }))}
                                    modules={modules}
                                    className="content-editor"
                                />
                            </div>
                        </div>

                        {/* SEO Section */}
                        <div className="form-section">
                            <h3 className="section-title">SEO & Social Sharing</h3>
                            
                            <div className="form-group">
                                <label htmlFor="metaDescription">
                                    Meta Description: * ({editedPost.metaDescription?.length || 0}/160)
                                </label>
                                <textarea
                                    id="metaDescription"
                                    name="metaDescription"
                                    value={editedPost.metaDescription}
                                    onChange={handleChange}
                                    maxLength={160}
                                    className="meta-description-input"
                                    placeholder="Brief description for search engines..."
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="socialTitle">Social Media Title:</label>
                                <input
                                    id="socialTitle"
                                    name="socialTitle"
                                    type="text"
                                    value={editedPost.socialTitle}
                                    onChange={handleChange}
                                    className="social-title-input"
                                    placeholder="Custom title for social media (optional)"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="socialDescription">Social Media Description:</label>
                                <textarea
                                    id="socialDescription"
                                    name="socialDescription"
                                    value={editedPost.socialDescription}
                                    onChange={handleChange}
                                    className="social-description-input"
                                    placeholder="Custom description for social media (optional)"
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="seoKeywords">SEO Keywords:</label>
                                <input
                                    id="seoKeywords"
                                    name="seoKeywords"
                                    type="text"
                                    value={editedPost.seoKeywords}
                                    onChange={handleChange}
                                    className="seo-keywords-input"
                                    placeholder="Comma-separated keywords"
                                />
                            </div>
                        </div>

                        {/* Media Section */}
                        <div className="form-section">
                            <h3 className="section-title">Media</h3>
                            
                            <div className="form-group">
                                <label htmlFor="bannerImage">Banner Image: (PNG or JPEG only, max 5MB)</label>
                                <input 
                                    id="bannerImage"
                                    name="bannerImage"
                                    type="file" 
                                    accept="image/jpeg,image/png"
                                    onChange={handleChange}
                                    className="banner-image-input"
                                />
                                {(bannerImagePreview || existingBannerImage) && (
                                    <div className="banner-preview">
                                        <img 
                                            src={bannerImagePreview || existingBannerImage} 
                                            alt="Banner preview" 
                                            className="preview-image"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="socialImage">
                                    Social Preview Image: (1200x630px recommended)
                                </label>
                                <input 
                                    id="socialImage"
                                    name="socialImage"
                                    type="file" 
                                    accept="image/jpeg,image/png"
                                    onChange={handleChange}
                                    className="social-image-input"
                                />
                                {(socialImagePreview || existingSocialImage) && (
                                    <div className="social-preview">
                                        <img 
                                            src={socialImagePreview || existingSocialImage} 
                                            alt="Social preview" 
                                            className="preview-image"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="youtubeUrl">YouTube Video URL: (optional)</label>
                                <input 
                                    id="youtubeUrl"
                                    name="youtubeUrl"
                                    type="text" 
                                    value={editedPost.youtubeUrl}
                                    onChange={handleYoutubeUrlChange}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="youtube-url-input"
                                />
                                {editedPost.youtubeEmbedUrl && (
                                    <div className="video-preview">
                                        <iframe
                                            width="560"
                                            height="315"
                                            src={editedPost.youtubeEmbedUrl}
                                            title="YouTube video preview"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="publishDate">Publish Date: *</label>
                                <input 
                                    id="publishDate"
                                    name="publishDate"
                                    type="date" 
                                    value={editedPost.publishDate}
                                    onChange={handleChange}
                                    required
                                    className="date-input"
                                />
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="form-actions">
                            <button 
                                type="button" 
                                onClick={() => setEditMode(false)} 
                                className="cancel-button"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="save-button"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <div className="blog-post-header">
                            <h1 className="blog-post-title">{post.title}</h1>
                            {user && (
                                <div className="post-actions">
                                    <button onClick={() => setEditMode(true)} className="edit-button">
                                        <Edit size={18} /> Edit
                                    </button>
                                    <button onClick={handleDelete} className="delete-button">
                                        <Trash2 size={18} /> Delete
                                    </button>
                                </div>
                            )}
                        </div>

                        {post.bannerImage && (
                            <div className="banner-container">
                                <img 
                                    src={`${REACT_APP_API_URL}/${post.bannerImage}`} 
                                    alt={post.title}
                                    className="banner-image"
                                />
                            </div>
                        )}

                        <div className="blog-properties">
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
                            
                            <div className="property-item">
                                <Calendar className="icon" size={18} />
                                <span>{formatDate(post.publishDate)}</span>
                            </div>
                            
                            <button onClick={() => setIsShareModalOpen(true)} className="share-button">
                                <Share2 size={18} />
                                Share
                            </button>
                        </div>

                        {editedPost.youtubeEmbedUrl && (
                            <div className="video-section">
                                <button 
                                    className="video-toggle"
                                    onClick={() => setIsVideoExpanded(!isVideoExpanded)}
                                >
                                    <Youtube size={20} />
                                    {isVideoExpanded ? 'Hide Video' : 'Show Video'}
                                    {isVideoExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                
                                {isVideoExpanded && (
                                    <div className="video-container">
                                        <iframe
                                            width="560"
                                            height="315"
                                            src={editedPost.youtubeEmbedUrl}
                                            title="YouTube video"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                )}
                            </div>
                        )}

                        <div 
                            className="blog-content"
                            dangerouslySetInnerHTML={sanitizeContent(post.content)}
                        />

                        {isShareModalOpen && (
                            <div className="share-modal-overlay" onClick={() => setIsShareModalOpen(false)}>
                                <div className="share-modal" onClick={e => e.stopPropagation()}>
                                    <div className="share-modal-header">
                                        <h3>Share this post</h3>
                                        <button 
                                            className="close-modal" 
                                            onClick={() => setIsShareModalOpen(false)}
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <div className="share-options">
                                        {socialPlatforms.map((platform) => (
                                            <button 
                                                key={platform.name}
                                                className="share-button"
                                                onClick={() => handleShare(platform)}
                                            >
                                                {platform.icon}
                                                <span>{platform.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="url-copy-container">
                                        <input 
                                            type="text" 
                                            value={postUrl}
                                            readOnly 
                                            className="url-input" 
                                        />
                                        <button 
                                            className="copy-button"
                                            onClick={handleCopyLink}
                                        >
                                            {copySuccess ? <CheckCheck size={20} /> : <Copy size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="blog-footer">
                            <p className="footer-text">
                                Thanks for reading! If you found this article helpful, feel free to share it.
                            </p>
                            <div className="footer-actions">
                                <button 
                                    className="share-button"
                                    onClick={() => setIsShareModalOpen(true)}
                                >
                                    <Share2 size={18} />
                                    Share this post
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default BlogPost;