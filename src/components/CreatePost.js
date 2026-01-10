import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ReactQuill from 'react-quill';
import VoiceAudioGenerator from './VoiceAudioGenerator';
import { 
  Edit, 
  Trash2, 
  Check, 
  X as Close, 
  AlertCircle,
  Save,
  Loader
} from 'lucide-react';
import 'react-quill/dist/quill.snow.css';
import './CreatePost.css';

function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryBackgroundColor, setEditCategoryBackgroundColor] = useState('');
  const [editCategoryFontColor, setEditCategoryFontColor] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [createdPostId, setCreatedPostId] = useState(null);

  // SEO and Social Media Fields
  const [metaDescription, setMetaDescription] = useState('');
  const [socialTitle, setSocialTitle] = useState('');
  const [socialDescription, setSocialDescription] = useState('');
  const [socialImage, setSocialImage] = useState(null);
  const [socialImagePreview, setSocialImagePreview] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');

  const { user } = useAuth();

  const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'https://myblog-cold-night-118.fly.dev';

  const fetchCategories = useCallback(async () => {
    try {
      console.log('Fetching categories from:', REACT_APP_API_URL);
      const response = await axios.get(`${REACT_APP_API_URL}/categories`, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      console.log('Categories response:', response.data);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories. Please try again.');
    }
  }, [REACT_APP_API_URL]);

  useEffect(() => {
    const setupInitialData = async () => {
      setIsLoading(true);
      try {
        await fetchCategories();
        const today = new Date().toISOString().split('T')[0];
        setPublishDate(today);
      } catch (error) {
        console.error('Setup error:', error);
        setError('Failed to load initial data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    setupInitialData();
  }, [fetchCategories]);

  // Update social title when main title changes
  useEffect(() => {
    if (title && !socialTitle) {
      setSocialTitle(title);
    }
  }, [title, socialTitle]);

  // Update meta description when content changes
  useEffect(() => {
    if (content && !metaDescription) {
      const strippedContent = content.replace(/<[^>]+>/g, '');
      const desc = strippedContent.substring(0, 160);
      setMetaDescription(desc);
    }
  }, [content, metaDescription]);

  // Update custom URL when title changes
  useEffect(() => {
    if (title) {
      const formattedUrl = formatCustomUrl(title);
      setCustomUrl(formattedUrl);
    }
  }, [title]);

  const handleBannerImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        setError('Please upload only JPEG or PNG images.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB.');
        return;
      }
      setBannerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImagePreview(reader.result);
        // If no social image is set, use banner image for social preview
        if (!socialImage) {
          setSocialImage(file);
          setSocialImagePreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSocialImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        setError('Please upload only JPEG or PNG images for social preview.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Social preview image size should be less than 5MB.');
        return;
      }

      // Create an image element to check dimensions
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        // Check if image meets minimum dimensions for social sharing
        if (img.width < 1200 || img.height < 630) {
          setError('Social preview image should be at least 1200x630 pixels.');
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setSocialImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setSocialImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
        URL.revokeObjectURL(objectUrl);
      };

      img.src = objectUrl;
    }
  };

  const formatCustomUrl = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCustomUrlChange = (e) => {
    const rawUrl = e.target.value;
    const formattedUrl = formatCustomUrl(rawUrl);
    setCustomUrl(formattedUrl);
  };

  const extractYoutubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleYoutubeUrlChange = (e) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    
    const videoId = extractYoutubeVideoId(url);
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      setYoutubeEmbedUrl(embedUrl);
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
    if (!title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!content.trim()) {
      setError('Content is required');
      return false;
    }
    if (!categoryId) {
      setError('Category is required');
      return false;
    }
    if (!user?.email) {
      setError('User email is required. Please log in again.');
      return false;
    }
    if (youtubeUrl && !youtubeEmbedUrl) {
      setError('Please enter a valid YouTube URL');
      return false;
    }
    if (!metaDescription.trim()) {
      setError('Meta description is required for SEO');
      return false;
    }
    return true;
  };

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
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) {
      setError('Category name is required');
      return;
    }

    setIsCategorySubmitting(true);
    try {
      const response = await axios.post(
        `${REACT_APP_API_URL}/categories`,
        {
          name: newCategory.trim(),
          backgroundColor: '#e0e0e0',
          fontColor: '#000000'
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );
      
      setCategories([...categories, response.data]);
      setNewCategory('');
      setSuccess('Category created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating category:', error);
      setError(error.response?.data?.error || 'Failed to create category. Please try again.');
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryBackgroundColor(category.backgroundColor);
    setEditCategoryFontColor(category.fontColor);
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setIsCategorySubmitting(true);
    try {
      const response = await axios.put(
        `${REACT_APP_API_URL}/categories/${editCategoryId}`,
        {
          name: editCategoryName.trim(),
          backgroundColor: editCategoryBackgroundColor,
          fontColor: editCategoryFontColor
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );

      setCategories(categories.map(cat => 
        cat.id === editCategoryId ? response.data : cat
      ));
      setEditCategoryId(null);
      setEditCategoryName('');
      setEditCategoryBackgroundColor('');
      setEditCategoryFontColor('');
      setSuccess('Category updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating category:', error);
      setError(error.response?.data?.error || 'Failed to update category. Please try again.');
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    setIsCategorySubmitting(true);
    try {
      await axios.delete(`${REACT_APP_API_URL}/categories/${id}`, {
        withCredentials: true
      });
      setCategories(categories.filter(cat => cat.id !== id));
      setSuccess('Category deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error.response?.data?.error || 'Failed to delete category. Please try again.');
    } finally {
      setIsCategorySubmitting(false);
    }
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
      const formData = new FormData();
      
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      formData.append('authorEmail', user.email);
      formData.append('CategoryId', categoryId);
      formData.append('customUrl', customUrl);
      formData.append('publishDate', publishDate);
      formData.append('youtubeUrl', youtubeEmbedUrl || '');
      formData.append('metaDescription', metaDescription.trim());
      formData.append('socialTitle', socialTitle.trim() || title.trim());
      formData.append('socialDescription', socialDescription.trim() || metaDescription.trim());
      formData.append('seoKeywords', seoKeywords.trim());

      if (bannerImage) {
        formData.append('bannerImage', bannerImage);
      }

      if (socialImage) {
        formData.append('socialImage', socialImage);
      }

      const response = await axios.post(`${REACT_APP_API_URL}/posts`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });

      console.log('Post created:', response.data);
      setCreatedPostId(response.data.id);
      setSuccess('Post created successfully! You can now generate audio for this post.');
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.response?.data?.error || 'Failed to create post. Please try again.');
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <p>Please log in to create a post.</p>;
  }

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="create-post">
      <h2 className="create-post-title">Create New Post</h2>
      
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

      <form onSubmit={handleSubmit} className="create-post-form" encType="multipart/form-data">
        {/* Main Content Section */}
        <div className="form-section">
          <h3 className="section-title">Content</h3>
          <div className="form-group">
            <label htmlFor="category">Category: *</label>
            <select 
              id="category"
              value={categoryId} 
              onChange={(e) => setCategoryId(e.target.value)}
              className="category-select"
              required
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="title">Title: *</label>
            <input 
              id="title"
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
              className="title-input"
              placeholder="Enter post title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="customUrl">Custom URL:</label>
            <input 
              id="customUrl"
              type="text" 
              value={customUrl} 
              onChange={handleCustomUrlChange}
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
              value={content}
              onChange={setContent}
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
              Meta Description: * ({metaDescription.length}/160)
            </label>
            <textarea
              id="metaDescription"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
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
              type="text"
              value={socialTitle}
              onChange={(e) => setSocialTitle(e.target.value)}
              className="social-title-input"
              placeholder="Custom title for social media (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="socialDescription">Social Media Description:</label>
            <textarea
              id="socialDescription"
              value={socialDescription}
              onChange={(e) => setSocialDescription(e.target.value)}
              className="social-description-input"
              placeholder="Custom description for social media (optional)"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="seoKeywords">SEO Keywords:</label>
            <input
              id="seoKeywords"
              type="text"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
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
              type="file" 
              accept="image/jpeg,image/png"
              onChange={handleBannerImageChange}
              className="banner-image-input"
            />
            {bannerImagePreview && (
              <div className="banner-preview">
                <img 
                  src={bannerImagePreview} 
                  alt="Banner preview" 
                  style={{ maxWidth: '100%', marginTop: '10px' }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="socialImage">Social Preview Image: (1200x630px recommended)</label>
            <input 
              id="socialImage"
              type="file" 
              accept="image/jpeg,image/png"
              onChange={handleSocialImageChange}
              className="social-image-input"
            />
            {socialImagePreview && (
              <div className="social-preview">
                <img 
                  src={socialImagePreview} 
                  alt="Social preview" 
                  style={{ maxWidth: '100%', marginTop: '10px' }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="youtubeUrl">YouTube Video URL: (optional)</label>
            <input 
              id="youtubeUrl"
              type="text" 
              value={youtubeUrl} 
              onChange={handleYoutubeUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              className="youtube-url-input"
            />
            {youtubeEmbedUrl && (
              <div className="youtube-preview">
                <h4>Video Preview:</h4>
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

          <div className="form-group">
            <label htmlFor="publishDate">Publish Date: *</label>
            <input 
              id="publishDate"
              type="date" 
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              required
              className="date-input"
            />
          </div>
        </div>

        {/* Voice Audio Generation Section */}
        {createdPostId && (
          <div className="form-section">
            <h3 className="section-title">Voice Audio</h3>
            <VoiceAudioGenerator
              postId={createdPostId}
              postTitle={title}
              onAudioGenerated={(audioData) => {
                console.log('Audio generated:', audioData);
              }}
            />
          </div>
        )}

        <button 
          type="submit" 
          className="submit-button" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin" size={20} />
              Creating Post...
            </>
          ) : (
            'Create Post'
          )}
        </button>
      </form>

      {/* Category Management Section */}
      <div className="category-management">
        <h3 className="category-management-title">Manage Categories</h3>
        <div className="new-category">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="new-category-input"
          />
          <button 
            onClick={handleCreateCategory} 
            className="add-category-button"
            disabled={isCategorySubmitting || !newCategory.trim()}
          >
            {isCategorySubmitting ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              'Add Category'
            )}
          </button>
        </div>

        <ul className="category-list">
          {categories.map(category => (
            <li key={category.id} className="category-item">
              {editCategoryId === category.id ? (
                <div className="edit-category">
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="edit-category-input"
                  />
                  <input
                    type="color"
                    value={editCategoryBackgroundColor}
                    onChange={(e) => setEditCategoryBackgroundColor(e.target.value)}
                    title="Background Color"
                    className="color-picker"
                  />
                  <input
                    type="color"
                    value={editCategoryFontColor}
                    onChange={(e) => setEditCategoryFontColor(e.target.value)}
                    title="Font Color"
                    className="color-picker"
                  />
                  <button 
                    onClick={handleUpdateCategory} 
                    className="save-button"
                    disabled={isCategorySubmitting || !editCategoryName.trim()}
                  >
                    {isCategorySubmitting ? <Loader size={16} /> : <Save size={16} />}
                  </button>
                  <button 
                    onClick={() => setEditCategoryId(null)} 
                    className="cancel-button"
                  >
                    <Close size={16} />
                  </button>
                </div>
              ) : (
                <div className="category-display">
                  <span 
                    className="category-pill"
                    style={{
                      backgroundColor: category.backgroundColor,
                      color: category.fontColor,
                    }}
                  >
                    {category.name}
                  </span>
                  <div className="category-actions">
                    <button 
                      onClick={() => handleEditCategory(category)} 
                      className="edit-button"
                      title="Edit Category"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(category.id)} 
                      className="delete-button"
                      title="Delete Category"
                      disabled={isCategorySubmitting}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CreatePost;