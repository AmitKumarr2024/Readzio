// commentSlice.js (updated for better error handling)
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../connection/axiosInstance';

const initialState = {
  comments: [],
  commentCounts: {},
  failedCountFetches: {},
  loading: false,
  error: null,
};

const normalizeCommentTree = (comments) => {
  console.log('[CommentSlice:normalizeCommentTree] Normalizing:', { commentIds: comments.map(c => c._id) });
  const normalized = comments.map(comment => ({
    ...comment,
    id: comment._id,
    replies: comment.replies ? normalizeCommentTree(comment.replies) : [],
    repliesCount: comment.repliesCount || comment.replies?.length || 0,
  }));
  console.log('[CommentSlice:normalizeCommentTree] Normalized:', { commentIds: normalized.map(c => c.id) });
  return normalized;
};

export const addComment = createAsyncThunk(
  'comment/addComment',
  async ({ postId, content, parentId, tempId }, { rejectWithValue }) => {
    console.log('[CommentSlice:addComment] Starting', { postId, contentLength: content.length, parentId, tempId });
    try {
      console.log('[CommentSlice:addComment] Sending request to:', { url: `/comment/add-comment/${postId}` });
      const res = await axiosInstance.post(`/comment/add-comment/${postId}`, { content, parentId });
      console.log('[CommentSlice:addComment] Success:', { commentId: res.data.comment._id, status: res.status });
      return { comment: res.data.comment, tempId, postId };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to add comment';
      console.error('[CommentSlice:addComment] Error:', {
        errorMsg,
        status: err.response?.status,
        response: err.response?.data,
      });
      return rejectWithValue({ message: errorMsg, status: err.response?.status });
    }
  }
);

export const fetchComments = createAsyncThunk(
  'comment/fetchAll',
  async (postId, { rejectWithValue }) => {
    console.log('[CommentSlice:fetchComments] Fetching for post:', { postId });
    try {
      const response = await axiosInstance.get(`/comment/all-comments/${postId}`);
      console.log('[CommentSlice:fetchComments] Success:', { count: response.data.comments.length });
      return { comments: response.data.comments, postId };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch comments';
      console.error('[CommentSlice:fetchComments] Error:', { errorMsg, status: error.response?.status });
      return rejectWithValue(errorMsg);
    }
  }
);

export const fetchCommentCount = createAsyncThunk(
  'comment/fetchCount',
  async (postId, { rejectWithValue }) => {
    console.log('[CommentSlice:fetchCommentCount] Fetching count for:', { postId });
    try {
      const response = await axiosInstance.get(`/comment/all-comments/${postId}`);
      const count = response.data.comments.reduce((sum, c) => sum + (c.repliesCount || c.replies?.length || 0) + 1, 0);
      console.log('[CommentSlice:fetchCommentCount] Success:', { postId, count });
      return { postId, count };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch comment count';
      console.error('[CommentSlice:fetchCommentCount] Error:', { errorMsg, status: error.response?.status });
      return rejectWithValue(errorMsg);
    }
  }
);

export const toggleReaction = createAsyncThunk(
  'comment/toggleReaction',
  async ({ commentId, reactionType }, { rejectWithValue }) => {
    console.log('[CommentSlice:toggleReaction] Starting:', { commentId, reactionType });
    try {
      const response = await axiosInstance.post(`/comment/reaction/${commentId}`, { reactionType });
      console.log('[CommentSlice:toggleReaction] Success:', { commentId, reactions: response.data.reactions });
      return { commentId, reactions: response.data.reactions };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to toggle reaction';
      console.error('[CommentSlice:toggleReaction] Error:', { errorMsg, status: error.response?.status });
      return rejectWithValue(errorMsg);
    }
  }
);

export const editComment = createAsyncThunk(
  'comment/edit',
  async ({ commentId, content }, { rejectWithValue }) => {
    console.log('[CommentSlice:editComment] Starting:', { commentId, content });
    try {
      const response = await axiosInstance.put(`/comment/edit/${commentId}`, { content });
      console.log('[CommentSlice:editComment] Success:', { commentId: response.data.comment._id });
      return response.data.comment;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to edit comment';
      console.error('[CommentSlice:editComment] Error:', { errorMsg, status: error.response?.status });
      return rejectWithValue(errorMsg);
    }
  }
);

export const blockComment = createAsyncThunk(
  'comment/block',
  async (commentId, { rejectWithValue }) => {
    console.log('[CommentSlice:blockComment] Starting:', { commentId });
    try {
      await axiosInstance.put(`/comment/block/${commentId}`);
      console.log('[CommentSlice:blockComment] Success:', { commentId });
      return commentId;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to block comment';
      console.error('[CommentSlice:blockComment] Error:', { errorMsg, status: error.response?.status });
      return rejectWithValue(errorMsg);
    }
  }
);

export const deleteComment = createAsyncThunk(
  'comment/delete',
  async (commentId, { rejectWithValue }) => {
    console.log('[CommentSlice:deleteComment] Starting:', { commentId });
    try {
      const response = await axiosInstance.delete(`/comment/delete/${commentId}`);
      console.log('[CommentSlice:deleteComment] Success:', { commentId, postId: response.data.postId });
      return { commentId, postId: response.data.postId };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to delete comment';
      console.error('[CommentSlice:deleteComment] Error:', { errorMsg, status: error.response?.status });
      return rejectWithValue(errorMsg);
    }
  }
);

const commentSlice = createSlice({
  name: 'comment',
  initialState,
  reducers: {
    optimisticAddComment: (state, action) => {
      const { tempId, postId, content, parentId, user } = action.payload;
      console.log('[CommentSlice:optimisticAddComment] Adding:', { tempId, postId, content, parentId, userId: user._id });
      const newComment = {
        id: tempId,
        _id: tempId,
        post: postId,
        content,
        parent: parentId || null,
        user: user._id,
        userData: { name: user.name, avatar: user.avatar, _id: user._id },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reactions: { like: [] },
        replies: [],
        repliesCount: 0,
        isFlagged: false,
        blocked: false,
        edited: false,
      };
      if (parentId) {
        const findAndAddReply = (comments) => {
          return comments.map(c => {
            if (c.id === parentId) {
              return { ...c, replies: [...(c.replies || []), newComment], repliesCount: (c.repliesCount || 0) + 1 };
            }
            if (c.replies?.length) {
              return { ...c, replies: findAndAddReply(c.replies) };
            }
            return c;
          });
        };
        state.comments = findAndAddReply(state.comments);
      } else {
        state.comments.unshift(newComment);
      }
      state.commentCounts[postId] = (state.commentCounts[postId] || 0) + 1;
    },
    clearError: (state) => {
      console.log('[CommentSlice:clearError] Clearing error');
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addComment.pending, (state) => {
        console.log('[CommentSlice:addComment] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        console.log('[CommentSlice:addComment] Fulfilled:', { commentId: action.payload.comment._id });
        state.loading = false;
        const { comment, tempId, postId } = action.payload;
        const removeOptimistic = (comments) => {
          return comments.filter(c => {
            if (c.id === tempId) return false;
            if (c.replies?.length) c.replies = removeOptimistic(c.replies);
            return true;
          });
        };
        state.comments = removeOptimistic(state.comments);
        const newComment = { ...comment, id: comment._id, replies: comment.replies || [] };
        if (newComment.parent) {
          const findAndAddReply = (comments) => {
            return comments.map(c => {
              if (c.id === newComment.parent) {
                return { ...c, replies: [...c.replies, newComment], repliesCount: (c.repliesCount || 0) + 1 };
              }
              if (c.replies?.length) {
                return { ...c, replies: findAndAddReply(c.replies) };
              }
              return c;
            });
          };
          state.comments = findAndAddReply(state.comments);
        } else {
          state.comments.unshift(newComment);
        }
        state.commentCounts[postId] = (state.commentCounts[postId] || 0) + 1;
      })
      .addCase(addComment.rejected, (state, action) => {
        console.error('[CommentSlice:addComment] Rejected:', { error: action.payload });
        state.loading = false;
        state.error = action.payload.message;
        const removeOptimistic = (comments) => {
          return comments.filter(c => {
            if (c.id === action.meta.arg.tempId) return false;
            if (c.replies?.length) c.replies = removeOptimistic(c.replies);
            return true;
          });
        };
        state.comments = removeOptimistic(state.comments);
        const postId = action.meta.arg.postId;
        state.commentCounts[postId] = Math.max((state.commentCounts[postId] || 0) - 1, 0);
      })
      .addCase(fetchComments.pending, (state) => {
        console.log('[CommentSlice:fetchComments] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        console.log('[CommentSlice:fetchComments] Fulfilled:', { count: action.payload.comments.length });
        state.loading = false;
        const { comments, postId } = action.payload;
        state.comments = normalizeCommentTree(comments || []);
        state.commentCounts[postId] = comments.reduce((sum, c) => sum + (c.repliesCount || c.replies?.length || 0) + 1, 0);
      })
      .addCase(fetchComments.rejected, (state, action) => {
        console.error('[CommentSlice:fetchComments] Rejected:', { error: action.payload });
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCommentCount.pending, (state) => {
        console.log('[CommentSlice:fetchCommentCount] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommentCount.fulfilled, (state, action) => {
        console.log('[CommentSlice:fetchCommentCount] Fulfilled:', action.payload);
        state.loading = false;
        const { postId, count } = action.payload;
        state.commentCounts[postId] = count;
        delete state.failedCountFetches[postId];
      })
      .addCase(fetchCommentCount.rejected, (state, action) => {
        console.error('[CommentSlice:fetchCommentCount] Rejected:', { error: action.payload });
        state.loading = false;
        state.error = action.payload;
        const postId = action.meta.arg;
        state.failedCountFetches[postId] = true;
      })
      .addCase(toggleReaction.pending, (state) => {
        console.log('[CommentSlice:toggleReaction] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleReaction.fulfilled, (state, action) => {
        console.log('[CommentSlice:toggleReaction] Fulfilled:', action.payload);
        state.loading = false;
        const findAndUpdateComment = (comments) => {
          return comments.map((c) => {
            if (c.id === action.payload.commentId) {
              return { ...c, reactions: action.payload.reactions };
            }
            if (c.replies?.length) {
              return { ...c, replies: findAndUpdateComment(c.replies) };
            }
            return c;
          });
        };
        state.comments = findAndUpdateComment(state.comments);
      })
      .addCase(toggleReaction.rejected, (state, action) => {
        console.error('[CommentSlice:toggleReaction] Rejected:', { error: action.payload });
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editComment.pending, (state) => {
        console.log('[CommentSlice:editComment] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(editComment.fulfilled, (state, action) => {
        console.log('[CommentSlice:editComment] Fulfilled:', action.payload);
        state.loading = false;
        const findAndUpdateComment = (comments) => {
          return comments.map((c) => {
            if (c.id === action.payload._id) {
              return { ...action.payload, id: action.payload._id, replies: c.replies };
            }
            if (c.replies?.length) {
              return { ...c, replies: findAndUpdateComment(c.replies) };
            }
            return c;
          });
        };
        state.comments = findAndUpdateComment(state.comments);
      })
      .addCase(editComment.rejected, (state, action) => {
        console.error('[CommentSlice:editComment] Rejected:', { error: action.payload });
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(blockComment.pending, (state) => {
        console.log('[CommentSlice:blockComment] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(blockComment.fulfilled, (state, action) => {
        console.log('[CommentSlice:blockComment] Fulfilled:', action.payload);
        state.loading = false;
        const comment = state.comments.find(c => c.id === action.payload);
        const findAndUpdateComment = (comments) => {
          return comments.map((c) => {
            if (c.id === action.payload) {
              return { ...c, isFlagged: true, blocked: true };
            }
            if (c.replies?.length) {
              return { ...c, replies: findAndUpdateComment(c.replies) };
            }
            return c;
          });
        };
        state.comments = findAndUpdateComment(state.comments);
        if (comment && !comment.parent && comment.post) {
          state.commentCounts[comment.post] = Math.max((state.commentCounts[comment.post] || 0) - 1, 0);
        }
      })
      .addCase(blockComment.rejected, (state, action) => {
        console.error('[CommentSlice:blockComment] Rejected:', { error: action.payload });
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteComment.pending, (state) => {
        console.log('[CommentSlice:deleteComment] Pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        console.log('[CommentSlice:deleteComment] Fulfilled:', action.payload);
        state.loading = false;
        const { commentId, postId } = action.payload;
        const comment = state.comments.find(c => c.id === commentId);
        const findAndUpdateComment = (comments) => {
          return comments.filter((c) => {
            if (c.id === commentId) return false;
            if (c.replies?.length) c.replies = findAndUpdateComment(c.replies);
            return true;
          });
        };
        state.comments = findAndUpdateComment(state.comments);
        if (comment && !comment.parent && (postId || comment.post)) {
          const postIdToUse = postId || comment.post;
          state.commentCounts[postIdToUse] = Math.max((state.commentCounts[postIdToUse] || 0) - 1, 0);
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        console.error('[CommentSlice:deleteComment] Rejected:', { error: action.payload });
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { optimisticAddComment, clearError } = commentSlice.actions;
export default commentSlice.reducer;
