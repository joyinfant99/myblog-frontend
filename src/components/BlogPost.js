import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
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
import axios from 'axios';
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
    socialImage: null,
    seoKeywords: ''
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState('');

  const { id, slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, getIdToken } = useAuth();

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
    const fetchPost = async () => {
      try {
        let response;
        
        if (slug) {
          response = await axios.get(`${REACT_APP_API_URL}/posts/url/${slug}`);
        } else if (id) {
          response = await axios.get(`${REACT_APP_API_URL}/posts/id/${id}`);
        } else {
          const pathSlug = location.pathname.split('/').pop();
          response = await axios.get(`${REACT_APP_API_URL}/posts/url/${pathSlug}`);
        }

        const data = response.data;
        document.title = data.title;

        if (data.customUrl) {
          const currentPath = location.pathname;
          const expectedPath = `/post/${data.customUrl}`;
          
          if (currentPath !== expectedPath && !currentPath.endsWith(data.customUrl)) {
            navigate(expectedPath, { replace: true });
            return;
          }
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
          seoKeywords: Array.isArray(data.seoKeywords) ? data.seoKeywords.join(', ') : data.seoKeywords || ''
        });

        if (data.youtubeUrl) {
          const videoId = extractYoutubeVideoId(data.youtubeUrl);
          if (videoId) {
            setYoutubeEmbedUrl(`https://www.youtube.com/embed/${videoId}`);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching post:', error);
        if (error.response?.status === 404) {
          navigate('/', { replace: true });
        } else {
          setError('Failed to load post. Please try again.');
        }
        setLoading(false);
      }
    };

    fetchPost();
    fetchCategories();
  }, [id, slug, location.pathname, navigate]);

  // Function to get absolute URL for images
  const getAbsoluteImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${REACT_APP_API_URL}/${imagePath}`;
  };

  // Function to get clean meta description
  const getMetaDescription = (content) => {
    const strippedContent = content.replace(/<[^>]+>/g, ' ').trim();
    return strippedContent.length > 160 ? 
      strippedContent.substring(0, 157) + '...' : 
      strippedContent;
  };

  const getFullImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${REACT_APP_API_URL}/${path}`;
  };

  const getCanonicalUrl = () => {
    return `${SITE_URL}/#/post/${post?.customUrl || post?.id}`;
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${REACT_APP_API_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = await getIdToken();
      await axios.delete(`${REACT_APP_API_URL}/posts/${post.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post. Please try again.');
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      handleFileChange(name, files[0]);
    } else {
      setEditedPost(prev => ({ ...prev, [name]: value }));
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
      setEditedPost(prev => ({
        ...prev,
        [fieldName]: file
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleContentChange = (content) => {
    setEditedPost(prev => ({ ...prev, content }));
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
      setYoutubeEmbedUrl(`https://www.youtube.com/embed/${videoId}`);
      setError('');
    } else if (url && !videoId) {
      setYoutubeEmbedUrl('');
      setError('Please enter a valid YouTube URL');
    } else {
      setYoutubeEmbedUrl('');
      setError('');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsShareModalOpen(false);
    setCopySuccess(false);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await getIdToken();
      const formData = new FormData();
      
      Object.keys(editedPost).forEach(key => {
        if (key === 'bannerImage' || key === 'socialImage') {
          if (editedPost[key] instanceof File) {
            formData.append(key, editedPost[key]);
          }
        } else if (editedPost[key] != null) {
          formData.append(key, editedPost[key]);
        }
      });

      const response = await axios.put(
        `${REACT_APP_API_URL}/posts/${post.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      const updatedPost = response.data;
      setPost(updatedPost);
      setEditMode(false);

      // Redirect if custom URL changed
      if (updatedPost.customUrl && updatedPost.customUrl !== post.customUrl) {
        navigate(`/post/${updatedPost.customUrl}`, { replace: true });
      }
    } catch (error) {
      console.error('Error updating post:', error);
      setError(error.response?.data?.error || 'Failed to update post');
    }
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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!post) return <div className="no-post">Post not found.</div>;

  const videoId = extractYoutubeVideoId(post.youtubeUrl);

  const postUrl = `${SITE_URL}/post/${post.customUrl || post.id}`;
  const bannerImageUrl = getFullImageUrl(post.bannerImage);
  const socialImageUrl = getFullImageUrl(post.socialImage) || bannerImageUrl;
  const imageUrl = getAbsoluteImageUrl(post.bannerImage);
  const metaDescription = post.metaDescription || getMetaDescription(post.content);
  
  return (
    <>
      <Helmet>
        {/* Essential Meta Tags */}
        <title>{post.title}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={postUrl} />

        {/* Facebook */}
        <meta property="og:site_name" content="Joy's Blog" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={postUrl} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={metaDescription} />
        {imageUrl && <meta property="og:image" content={imageUrl} />}
        {imageUrl && <meta property="og:image:secure_url" content={imageUrl} />}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@joyinfant" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={metaDescription} />
        {imageUrl && <meta name="twitter:image" content={imageUrl} />}

        {/* Article Specific */}
        <meta property="article:published_time" content={post.publishDate} />
        <meta property="article:modified_time" content={post.updatedAt} />
        <meta property="article:author" content="Joy Infant" />
        {post.Category && (
          <meta property="article:section" content={post.Category.name} />
        )}

        {/* Schema.org BlogPosting */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": postUrl
            },
            "headline": post.title,
            "description": metaDescription,
            "image": imageUrl,
            "datePublished": post.publishDate,
            "dateModified": post.updatedAt,
            "author": {
              "@type": "Person",
              "name": "Joy Infant",
              "url": SITE_URL
            },
            "publisher": {
              "@type": "Organization",
              "name": "Joy's Blog",
              "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/logo.png`
              }
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
              onChange={handleYoutubeUrlChange}
              placeholder="YouTube Video URL (optional)"
              className="edit-youtube-url"
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
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
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
                      width="560"
                      height="315"
                      src={youtubeEmbedUrl}
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
          </>
        )}
      </div>
    </>
  );
};

export default BlogPost;