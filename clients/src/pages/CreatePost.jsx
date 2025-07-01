// File: pages/CreatePost.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import CategorySelector from '../components/CreatePost/CategorySelector';
import PostTypeSelector from '../components/CreatePost/PostTypeSelector';
import PostEditor from '../components/CreatePost/PostEditor';
import PostPreviewList from '../components/CreatePost/PostPreviewList';
import LoadingBar from '../Utils/LoadingBar';
import { createPosts, deletePost } from '../store/postSlice';
import { fetchCategories } from '../store/categorySlice';
import { setCategory, setPostType, resetPostMeta } from '../store/Post/postMetaSlice';

const CreatePost = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showPostTypeModal, setShowPostTypeModal] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [postMeta, setPostMeta] = useState({
    isFeatured: true,
    isPinned: true,
    isPublished: true,
    language: 'en',
    status: 'published',
    tags: [],
    thumbnail: '',
  });

  const { post, createLoading, createError } = useSelector((state) => state.post);
  const { postType, category: selectedCategoryId } = useSelector((state) => state.postMeta);
  const { categories } = useSelector((state) => state.categories);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      map[cat._id] = cat.name;
    });
    return map;
  }, [categories]);

  const posts = post ? [post] : [];
  const filteredPosts = selectedCategoryId ? posts.filter((p) => p.category === selectedCategoryId) : posts;

  const handleCategoryContinue = (selectedCategory) => {
    if (!selectedCategory?.id) return toast.error('Please select a category');
    dispatch(setCategory(selectedCategory.id));
    setShowCategoryModal(false);
  };

  const handleCreatePost = async (metaData = {}) => {
    if (!title.trim()) return toast.error('Please enter a title');
    if (!blocks.length) return toast.error('Please add content blocks');
    if (!postType) return toast.error('Please select a post type');
    if (!selectedCategoryId) return toast.error('Please select a category');
    if (!metaData.tags?.length) return toast.error('Please provide at least one tag');
    if (!/^[a-z]{2}$/i.test(metaData.language)) return toast.error('Invalid language code');
    if (!['draft', 'review', 'published', 'archived'].includes(metaData.status)) return toast.error('Invalid status');

    const updatedBlocks = blocks.map((block) => ({ ...block, status: block.status || 'draft' }));

    const postData = {
      postType,
      category: selectedCategoryId,
      title,
      blocks: updatedBlocks,
      ...postMeta,
      ...metaData,
    };

    try {
      const resultAction = await dispatch(createPosts(postData));
      if (createPosts.fulfilled.match(resultAction)) {
        toast.success('Post created successfully!');
        setTitle('');
        setBlocks([]);
        setPostMeta({ isFeatured: true, isPinned: true, isPublished: true, language: 'en', status: 'published', tags: [], thumbnail: '' });
        dispatch(resetPostMeta());
        navigate(`/post/${resultAction.payload.post.slug}`);
      } else {
        toast.error(resultAction.error?.message || 'Post creation failed');
      }
    } catch (err) {
      toast.error('An error occurred during post creation');
    }
  };

  const handleDeletePost = (id) => {
    dispatch(deletePost(id))
      .unwrap()
      .then(() => toast.success('Post deleted'))
      .catch((err) => toast.error(err.message || 'Failed to delete post'));
  };

  const handleUpdateDraft = (draft) => {
    setTitle(draft.title || '');
    setBlocks(draft.blocks || []);
  };

  return (
    <div className="flex flex-col md:flex-row">
      <Toaster position="top-right" />
      <LoadingBar loading={createLoading} />

      {showPostTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <PostTypeSelector
            postType={postType}
            setPostType={(value) => dispatch(setPostType(value))}
            onContinue={() => { setShowPostTypeModal(false); setShowCategoryModal(true); }}
            onClose={() => navigate('/')}
          />
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <CategorySelector
            onBack={() => { setShowCategoryModal(false); setShowPostTypeModal(true); }}
            onContinue={handleCategoryContinue}
            onClose={() => navigate('/')}
          />
        </div>
      )}

      {!showPostTypeModal && !showCategoryModal && (
        <div className="min-w-full flex container justify-around items-center flex-col flex-wrap md:flex-row">
          <div className="w-full md:w-3/5 mb-4">
            <PostEditor
              size={55}
              title={title}
              setTitle={setTitle}
              blocks={blocks}
              setBlocks={setBlocks}
              postType={postType}
              category={selectedCategoryId}
              categoryName={categoryMap[selectedCategoryId] || selectedCategoryId}
            />
          </div>

          <div className="w-full md:w-2/5 md:pl-1">
            <PostPreviewList
              currentDraftPost={{ title, blocks }}
              onUpdateDraft={handleUpdateDraft}
              postType={postType}
              category={selectedCategoryId}
              categoryName={categoryMap[selectedCategoryId] || selectedCategoryId}
              allPosts={filteredPosts}
              deletePost={handleDeletePost}
              createLoading={createLoading}
              createError={createError}
              onCreatePost={handleCreatePost}
            />

            
          </div>
        </div>
      )}

    </div>
  );
};

export default CreatePost;