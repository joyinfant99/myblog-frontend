import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactQuill from 'react-quill';
import { 
  Edit, 
  AlertCircle,
  Save,
  Loader,
  Check,
  Youtube,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import axios from 'axios';
import 'react-quill/dist/quill.snow.css';
import './EditPost.css';

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getIdToken } = useAuth();
  const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'https://myblog-cold-night-118.fly.dev';

  // Form state
  const [postData, setPostData] = useState({
    title: '',              // matches database field
    content: '',            // matches database field
    CategoryId: '',         // matches database field
    customUrl: '',          // matches database field
    bannerImage: null,      // matches database field
    socialImage: null,      // matches database field
    youtubeUrl: '',         // matches database field
    publishDate: '',        // matches database field
    metaDescription: '',    // matches database field
    socialTitle: '',        // matches database field
    socialDescription: '',  // matches database field
    seoKeywords: '',        // matches database field
    category: ''            // for category name display
  });

  // UI state
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState('');
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);

  // Image preview state
  const [bannerImagePreview, setBannerImagePreview] = useState('');
  const [socialImagePreview, setSocialImagePreview] = useState('');
  const [existingBannerImage, setExistingBannerImage] = useState('');
  const [existingSocialImage, setExistingSocialImage] = useState('');

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
    ]
  };

  // Fetch post data on component mount
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await axios.get(`${REACT_APP_API_URL}/posts/${id}`);
        const data = response.data;
        
        // Set basic post data
        setPostData({
          title: data.title || '',
          content: data.content || '',
          CategoryId: data.CategoryId || '',
          customUrl: data.customUrl || '',
          youtubeUrl: data.youtubeUrl || '',
          publishDate: data.publishDate ? new Date(data.publishDate).toISOString().split('T')[0] : '',
          metaDescription: data.metaDescription || '',
          socialTitle: data.socialTitle || '',
          socialDescription: data.socialDescription || '',
          seoKeywords: Array.isArray(data.seoKeywords) ? data.seoKeywords.join(', ') : (data.seoKeywords || ''),
          category: data.Category?.name || ''
        });

        // Set image previews for existing images
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
            setYoutubeEmbedUrl(`https://www.youtube.com/embed/${videoId}`);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post. Please try again.');
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id, REACT_APP_API_URL]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${REACT_APP_API_URL}/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setError('Failed to load categories. Please try again.');
      }
    };

    fetchCategories();
  }, [REACT_APP_API_URL]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      handleFileChange(name, files[0]);
    } else {
      setPostData(prev => ({ ...prev, [name]: value }));
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
        setBannerImagePreview(reader.result);
      } else if (fieldName === 'socialImage') {
        setSocialImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);

    setPostData(prev => ({
      ...prev,
      [fieldName]: file
    }));
  };

  const handleContentChange = (content) => {
    setPostData(prev => ({ ...prev, content }));
  };

  const extractYoutubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleYoutubeUrlChange = (e) => {
    const url = e.target.value;
    setPostData(prev => ({ ...prev, youtubeUrl: url }));
    
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

  const validateForm = () => {
    if (!postData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!postData.content.trim()) {
      setError('Content is required');
      return false;
    }
    if (!postData.CategoryId) {
      setError('Category is required');
      return false;
    }
    if (!postData.metaDescription?.trim()) {
      setError('Meta description is required for SEO');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      
      // Append all text fields
      Object.keys(postData).forEach(key => {
        if (key !== 'bannerImage' && key !== 'socialImage' && postData[key] != null) {
          formData.append(key, postData[key]);
        }
      });

      // Append files only if new ones were selected
      if (postData.bannerImage instanceof File) {
        formData.append('bannerImage', postData.bannerImage);
      }
      if (postData.socialImage instanceof File) {
        formData.append('socialImage', postData.socialImage);
      }

      const response = await axios.put(
        `${REACT_APP_API_URL}/posts/${id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setSuccess('Post updated successfully!');
      setTimeout(() => {
        navigate(`/post/${response.data.customUrl || id}`);
      }, 1000);
    } catch (error) {
      console.error('Error updating post:', error);
      setError(error.response?.data?.error || 'Failed to update post. Please try again.');
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <p>Please log in to edit this post.</p>;
  }

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="edit-post">
      <h2 className="edit-post-title">Edit Post</h2>
      
      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          <Check size={20} />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="edit-form" encType="multipart/form-data">
        {/* Main Content Section */}
        <div className="form-section">
          <h3 className="section-title">Content</h3>
          
          <div className="form-group">
            <label htmlFor="category">Category: *</label>
            <select 
              id="category"
              name="CategoryId"
              value={postData.CategoryId}
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
              value={postData.title}
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
              value={postData.customUrl}
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
              value={postData.content}
              onChange={handleContentChange}
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
              Meta Description: * ({postData.metaDescription?.length || 0}/160)
            </label>
            <textarea
              id="metaDescription"
              name="metaDescription"
              value={postData.metaDescription}
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
              value={postData.socialTitle}
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
              value={postData.socialDescription}
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
              value={postData.seoKeywords}
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
            <label htmlFor="socialImage">Social Preview Image: (1200x630px recommended)</label>
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
              value={postData.youtubeUrl}
              onChange={handleYoutubeUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              className="youtube-url-input"
            />
            {youtubeEmbedUrl && (
              <div className="video-section">
                <button 
                  type="button"
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
                      title="YouTube video preview"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="publishDate">Publish Date: *</label>
            <input 
              id="publishDate"
              name="publishDate"
              type="date" 
              value={postData.publishDate}
              onChange={handleChange}
              required
              className="date-input"
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="submit-button" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin" size={20} />
              Updating Post...
            </>
          ) : (
            'Update Post'
          )}
        </button>
      </form>
    </div>
  );
};

export default EditPost;