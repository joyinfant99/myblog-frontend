import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../contexts/AuthContext';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import { 
  Twitter, 
  Facebook,
  Share2,
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Edit,
  Trash2,
  X,
  Link as LinkIcon,
  Copy,
  CheckCheck,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Youtube,
  Linkedin
} from 'lucide-react';
import 'react-quill/dist/quill.snow.css';
import './BlogPost.css';

const BlogPost = () => {
  const [post, setPost] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedPost, setEditedPost] = useState({ 
    title: '', 
    content: '', 
    CategoryId: '',
    bannerImage: null,
    customUrl: '',
    youtubeUrl: '',
    publishDate: '',
    metaDescription: '',
    socialTitle: '',
    socialDescription: '',
    socialImage: null
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const { id, slug } = useParams();
  const { user, getIdToken } = useAuth();
  const navigate = useNavigate();

  const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'https://myblog-cold-night-118.fly.dev';
  const SITE_URL = process.env.REACT_APP_SITE_URL || window.location.origin;

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
      ['link', 'image', 'video'],
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
      getUrl: (url, text) => `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
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

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPost();
    fetchCategories();
  }, [slug, id]);

  const fetchPost = async () => {
    try {
      let url;
      // Determine which API endpoint to use based on available parameters
      if (slug) {
        url = `${REACT_APP_API_URL}/posts/url/${slug}`;
      } else if (id) {
        url = `${REACT_APP_API_URL}/posts/id/${id}`;
      } else {
        throw new Error('No identifier provided');
      }

      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          navigate('/');
          return;
        }
        throw new Error('Failed to fetch post');
      }

      const data = await response.json();
      
      // If found by ID and has customUrl, redirect
      if (id && data.customUrl && !window.location.pathname.includes(data.customUrl)) {
        navigate(`/post/${data.customUrl}`, { replace: true });
        return;
      }

      setPost(data);
      setEditedPost({
        title: data.title,
        content: data.content,
        CategoryId: data.CategoryId,
        customUrl: data.customUrl || '',
        publishDate: data.publishDate,
        youtubeUrl: data.youtubeUrl || '',
        metaDescription: data.metaDescription || '',
        socialTitle: data.socialTitle || data.title,
        socialDescription: data.socialDescription || data.metaDescription,
        socialImage: data.socialImage || data.bannerImage
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching post:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${REACT_APP_API_URL}/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const token = await getIdToken();
        const response = await fetch(`${REACT_APP_API_URL}/posts/${post.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to delete post');
        }
        navigate('/');
      } catch (error) {
        console.error('Error deleting post:', error);
        setError(error.message);
      }
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleChange = (e) => {
    const value = e.target.type === 'file' 
      ? e.target.files[0]
      : e.target.value;
    setEditedPost({ ...editedPost, [e.target.name]: value });
  };

  const handleContentChange = (content) => {
    setEditedPost({ ...editedPost, content });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('title', editedPost.title.trim());
      formData.append('content', editedPost.content.trim());
      formData.append('CategoryId', editedPost.CategoryId);
      formData.append('customUrl', editedPost.customUrl);
      formData.append('publishDate', editedPost.publishDate);
      formData.append('youtubeUrl', editedPost.youtubeUrl || '');
      formData.append('metaDescription', editedPost.metaDescription || '');
      formData.append('socialTitle', editedPost.socialTitle || '');
      formData.append('socialDescription', editedPost.socialDescription || '');

      if (editedPost.bannerImage instanceof File) {
        formData.append('bannerImage', editedPost.bannerImage);
      }

      if (editedPost.socialImage instanceof File) {
        formData.append('socialImage', editedPost.socialImage);
      }

      const response = await fetch(`${REACT_APP_API_URL}/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update post');
      }

      const updatedPost = await response.json();
      setPost(updatedPost);
      setEditMode(false);

      // Redirect to new URL if custom URL was changed
      if (updatedPost.customUrl && updatedPost.customUrl !== post.customUrl) {
        navigate(`/post/${updatedPost.customUrl}`, { replace: true });
      }
    } catch (error) {
      console.error('Error updating post:', error);
      setError(`Failed to update post: ${error.message}`);
    }
  };

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsShareModalOpen(false);
    setCopySuccess(false);
  };

  const handleShare = (platform) => {
    const url = encodeURIComponent(`${SITE_URL}/post/${post.customUrl || post.id}`);
    const text = encodeURIComponent(post.socialTitle || post.title);
    const shareUrl = platform.getUrl(url, text);
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleCopyLink = async () => {
    try {
      const url = `${SITE_URL}/post/${post.customUrl || post.id}`;
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      setError('Failed to copy link to clipboard');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const extractVideoId = (url) => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const sanitizeContent = (content) => {
    const config = {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'src'],
    };
    return {
      __html: DOMPurify.sanitize(content, config)
    };
  };

  // Strip HTML and get excerpt for meta description
  const getExcerpt = (content, length = 160) => {
    const strippedContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return strippedContent.length > length 
      ? strippedContent.substring(0, length - 3) + '...'
      : strippedContent;
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!post) return <div className="no-post">Post not found.</div>;

  const videoId = extractVideoId(post.youtubeUrl);
  const currentUrl = `${SITE_URL}/post/${post.customUrl || post.id}`;
  const imageUrl = post.socialImage 
    ? `${SITE_URL}/${post.socialImage}`
    : post.bannerImage 
      ? `${SITE_URL}/${post.bannerImage}`
      : `${SITE_URL}/default-social-image.jpg`;

  return (
    <>
      <Helmet>
        {/* Basic Meta Tags */}
        <title>{post.socialTitle || post.title}</title>
        <meta name="description" content={post.metaDescription || getExcerpt(post.content)} />
        <link rel="canonical" href={currentUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={post.socialTitle || post.title} />
        <meta property="og:description" content={post.socialDescription || post.metaDescription || getExcerpt(post.content)} />
        <meta property="og:image" content={imageUrl} />
        <meta property="article:published_time" content={post.publishDate} />
        {post.Category && <meta property="article:section" content={post.Category.name} />}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.socialTitle || post.title} />
        <meta name="twitter:description" content={post.socialDescription || post.metaDescription || getExcerpt(post.content)} />
        <meta name="twitter:image" content={imageUrl} />

        {/* LinkedIn */}
        <meta name="linkedin:card" content="summary_large_image" />
        <meta name="linkedin:title" content={post.socialTitle || post.title} />
        <meta name="linkedin:description" content={post.socialDescription || post.metaDescription || getExcerpt(post.content)} />
        <meta name="linkedin:image" content={imageUrl} />

        {/* Article Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.metaDescription || getExcerpt(post.content),
            "image": imageUrl,
            "datePublished": post.publishDate,
            "dateModified": post.updatedAt,
            "author": {
              "@type": "Person",
              "name": "Joy Infant"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Joy's Blog",
              "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/logo.png`
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": currentUrl
            }
          })}
        </script>
      </Helmet>

      <div className="blog-post">
        <Link to="/" className="back-button">
          <ArrowLeft className="icon" size={20} />
          Back to Blog List
        </Link>

        {editMode ? (
          <form onSubmit={handleSubmit} className="edit-form">
            <input
              type="text"
              name="title"
              value={editedPost.title}
              onChange={handleChange}
              required
              className="edit-title"
              placeholder="Post Title"
            />

            <input
              type="file"
              name="bannerImage"
              onChange={handleChange}
              accept="image/*"
              className="edit-banner-image"
            />

            <input
              type="file"
              name="socialImage"
              onChange={handleChange}
              accept="image/*"
              className="edit-social-image"
            />

            <input
              type="text"
              name="customUrl"
              value={editedPost.customUrl}
              onChange={handleChange}
              className="edit-custom-url"
              placeholder="Custom URL (optional)"
            />

            <input
              type="date"
              name="publishDate"
              value={editedPost.publishDate}
              onChange={handleChange}
              required
              className="edit-date"
            />

            <input
              type="text"
              name="youtubeUrl"
              value={editedPost.youtubeUrl}
              onChange={handleChange}
              placeholder="YouTube Video URL (optional)"
              className="edit-youtube-url"
            />

            <textarea
              name="metaDescription"
              value={editedPost.metaDescription}
              onChange={handleChange}
              placeholder="Meta description for SEO (max 160 characters)"
              maxLength={160}
              className="edit-meta-description"
            />

            <input
              type="text"
              name="socialTitle"
              value={editedPost.socialTitle}
              onChange={handleChange}
              placeholder="Social media title (optional)"
              className="edit-social-title"
            />

            <textarea
              name="socialDescription"
              value={editedPost.socialDescription}
              onChange={handleChange}
              placeholder="Social media description (optional)"
              className="edit-social-description"
            />

            <select
              name="CategoryId"
              value={editedPost.CategoryId}
              onChange={handleChange}
              required
              className="edit-category"
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <ReactQuill
              theme="snow"
              value={editedPost.content}
              onChange={handleContentChange}
              modules={modules}
              className="edit-content"
            />

            <div className="edit-actions">
              <button type="submit" className="save-button">Save Changes</button>
              <button type="button" onClick={handleEditToggle} className="cancel-button">Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="blog-post-header">
              <h1 className="blog-post-title">{post.title}</h1>
              {user && (
                <div className="post-actions">
                  <button onClick={handleEditToggle} className="edit-button">
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
                <div className="property-item">
                  <span className="category-pill">{post.Category.name}</span>
                </div>
              )}
              
              <div className="property-item">
                <Calendar className="icon" size={18} />
                <span>{formatDate(post.publishDate)}</span>
              </div>
              
              <button onClick={handleShareClick} className="share-trigger">
                <Share2 size={18} />
                Share
              </button>
            </div>

            {videoId && (
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
                      src={`https://www.youtube.com/embed/${videoId}`}
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
              className="blog-post-content"
              dangerouslySetInnerHTML={sanitizeContent(post.content)}
            />

            <div className="blog-footer">
              <p className="footer-text">
                Thanks for reading! If you have any comments or feedback on this article, 
                I'd love to hear from you. The best way to reach me is on{' '}
                <a 
                  href="https://twitter.com/joyinfant" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="twitter-link"
                >
                  Twitter <Twitter className="icon" size={16} />
                </a>.
              </p>
            </div>

            {isShareModalOpen && (
              <div className="share-modal-overlay" onClick={handleCloseModal}>
                <div className="share-modal" onClick={e => e.stopPropagation()}>
                  <div className="share-modal-header">
                    <h3 className="share-modal-title">Share this post</h3>
                    <button className="close-modal" onClick={handleCloseModal}>
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
                      value={currentUrl}
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
          </>
        )}
      </div>
    </>
  );
};

export default BlogPost;