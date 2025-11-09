import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactQuill from 'react-quill';
import VoiceAudioGenerator from './VoiceAudioGenerator';
import axios from 'axios';
import { 
    AlertCircle, 
    Check, 
    Loader, 
    Save,
    Youtube,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Image as ImageIcon,
    Link as LinkIcon
} from 'lucide-react';
import 'react-quill/dist/quill.snow.css';
import './EditPost.css';

const EditPost = () => {
    const { id, slug } = useParams();
    const navigate = useNavigate();
    const { user, getIdToken } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'https://myblog-cold-night-118.fly.dev';

    // Form State
    const [postData, setPostData] = useState({
        title: '',
        content: '',
        CategoryId: '',
        customUrl: '',
        publishDate: '',
        youtubeUrl: '',
        metaDescription: '',
        seoKeywords: '',
        socialTitle: '',
        socialDescription: '',
        isPublished: false
    });

    // Image States
    const [bannerImage, setBannerImage] = useState(null);
    const [socialImage, setSocialImage] = useState(null);
    const [bannerImagePreview, setBannerImagePreview] = useState('');
    const [socialImagePreview, setSocialImagePreview] = useState('');
    const [existingBannerImage, setExistingBannerImage] = useState('');
    const [existingSocialImage, setExistingSocialImage] = useState('');

    // Categories State
    const [categories, setCategories] = useState([]);
    const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState('');
    const [isVideoExpanded, setIsVideoExpanded] = useState(false);
    const [currentPostId, setCurrentPostId] = useState(null);

    // Editor Configuration
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

    // Fetch post data
    const fetchPost = useCallback(async () => {
        try {
            const token = await getIdToken();
            let postId = id;
            
            // If we have a slug, first fetch the post ID
            if (slug) {
                const slugResponse = await axios.get(`${REACT_APP_API_URL}/posts/by-url/${slug}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                postId = slugResponse.data.id;
            }

            const response = await axios.get(`${REACT_APP_API_URL}/posts/${postId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const post = response.data;
            setCurrentPostId(postId);

            setPostData({
                title: post.title || '',
                content: post.content || '',
                CategoryId: post.CategoryId || '',
                customUrl: post.customUrl || '',
                publishDate: post.publishDate ? new Date(post.publishDate).toISOString().split('T')[0] : '',
                youtubeUrl: post.youtubeUrl || '',
                metaDescription: post.metaDescription || '',
                seoKeywords: Array.isArray(post.seoKeywords) ? post.seoKeywords.join(', ') : (post.seoKeywords || ''),
                socialTitle: post.socialTitle || '',
                socialDescription: post.socialDescription || '',
                isPublished: post.published || false
            });

            // Handle images
            if (post.bannerImage) {
                setExistingBannerImage(`${REACT_APP_API_URL}/${post.bannerImage}`);
                setBannerImagePreview(`${REACT_APP_API_URL}/${post.bannerImage}`);
            }
            
            if (post.socialImage) {
                setExistingSocialImage(`${REACT_APP_API_URL}/${post.socialImage}`);
                setSocialImagePreview(`${REACT_APP_API_URL}/${post.socialImage}`);
            }

            // Handle YouTube URL
            if (post.youtubeUrl) {
                const videoId = extractYoutubeVideoId(post.youtubeUrl);
                if (videoId) {
                    setYoutubeEmbedUrl(`https://www.youtube.com/embed/${videoId}`);
                }
            }

            setIsLoading(false);
        } catch (err) {
            console.error('Error fetching post:', err);
            setError('Failed to load post. Please try again.');
            setIsLoading(false);
        }
    }, [id, slug, getIdToken, REACT_APP_API_URL]);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const response = await axios.get(`${REACT_APP_API_URL}/categories`);
            setCategories(response.data);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Failed to load categories. Please try again.');
        }
    }, [REACT_APP_API_URL]);

    useEffect(() => {
        fetchPost();
        fetchCategories();
    }, [fetchPost, fetchCategories]);

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
                setBannerImage(file);
                setBannerImagePreview(reader.result);
            } else if (fieldName === 'socialImage') {
                setSocialImage(file);
                setSocialImagePreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
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
            const formData = new FormData();

            // Append all text fields
            Object.keys(postData).forEach(key => {
                if (key !== 'bannerImage' && key !== 'socialImage' && postData[key] != null) {
                    formData.append(key, postData[key]);
                }
            });

            // Append new files if selected
            if (bannerImage instanceof File) {
                formData.append('bannerImage', bannerImage);
            }
            if (socialImage instanceof File) {
                formData.append('socialImage', socialImage);
            }

            const postId = id || (slug ? await getPostIdFromSlug(slug) : null);
            
            const response = await axios.put(
                `${REACT_APP_API_URL}/posts/${postId}`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setSuccess('Post updated successfully!');
            setTimeout(() => {
                navigate(`/post/${response.data.customUrl || response.data.id}`);
            }, 1000);
        } catch (err) {
            console.error('Error updating post:', err);
            setError(err.response?.data?.message || 'Failed to update post. Please try again.');
            window.scrollTo(0, 0);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getPostIdFromSlug = async (slug) => {
        const token = await getIdToken();
        const response = await axios.get(`${REACT_APP_API_URL}/posts/by-url/${slug}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data.id;
    };

    if (!user) {
        return <div className="unauthorized">Please log in to edit posts.</div>;
    }

    if (isLoading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
                <span>Loading post...</span>
            </div>
        );
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
                            onChange={(content) => setPostData(prev => ({ ...prev, content }))}
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

                {/* Voice Audio Generation Section */}
                <div className="form-section">
                    <h3 className="section-title">Voice Audio</h3>
                    <VoiceAudioGenerator
                        postId={currentPostId}
                        postTitle={postData.title}
                        onAudioGenerated={(audioData) => {
                            console.log('Audio generated:', audioData);
                        }}
                    />
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
                        <>
                            <Save size={20} />
                            Update Post
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default EditPost;