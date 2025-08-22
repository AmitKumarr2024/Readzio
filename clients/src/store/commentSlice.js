import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../connection/axiosInstance";

const initialState = {
  comments: [],
  commentCounts: {},
  failedCountFetches: {},
  loading: false,
  error: null,
};

const normalizeCommentTree = (comments) => {
  const normalized = comments.map((comment) => ({
    ...comment,
    id: comment._id,
    replies: comment.replies ? normalizeCommentTree(comment.replies) : [],
    repliesCount: comment.repliesCount || comment.replies?.length || 0,
  }));
  return normalized;
};

export const addComment = createAsyncThunk(
  "comment/addComment",
  async ({ postId, content, parentId, tempId }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`/comment/add-comment/${postId}`, {
        content,
        parentId,
      });
      return { comment: res.data.comment, tempId, postId };
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to add comment";
      return rejectWithValue({
        message: errorMsg,
        status: err.response?.status,
      });
    }
  }
);

export const fetchComments = createAsyncThunk(
  "comment/fetchAll",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/comment/all-comments/${postId}`
      );
      return { comments: response.data.comments, postId };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch comments";
      return rejectWithValue(errorMsg);
    }
  }
);

export const fetchCommentCount = createAsyncThunk(
  "comment/fetchCount",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `/comment/all-comments/${postId}`
      );
      const count = response.data.comments.reduce(
        (sum, c) => sum + (c.repliesCount || c.replies?.length || 0) + 1,
        0
      );
      return { postId, count };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch comment count";
      return rejectWithValue(errorMsg);
    }
  }
);

export const toggleReaction = createAsyncThunk(
  "comment/toggleReaction",
  async ({ commentId, reactionType }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        `/comment/reaction/${commentId}`,
        { reactionType }
      );
      return { commentId, reactions: response.data.reactions };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to toggle reaction";
      return rejectWithValue(errorMsg);
    }
  }
);

export const editComment = createAsyncThunk(
  "comment/edit",
  async ({ commentId, content }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/comment/edit/${commentId}`, {
        content,
      });
      return response.data.comment;
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to edit comment";
      return rejectWithValue(errorMsg);
    }
  }
);

export const blockComment = createAsyncThunk(
  "comment/block",
  async (commentId, { rejectWithValue }) => {
    try {
      await axiosInstance.put(`/comment/block/${commentId}`);
      return commentId;
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to block comment";
      return rejectWithValue(errorMsg);
    }
  }
);

export const deleteComment = createAsyncThunk(
  "comment/delete",
  async (commentId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(
        `/comment/delete/${commentId}`
      );
      return { commentId, postId: response.data.postId };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete comment";
      return rejectWithValue(errorMsg);
    }
  }
);

const commentSlice = createSlice({
  name: "comment",
  initialState,
  reducers: {
    optimisticAddComment: (state, action) => {
      const { tempId, postId, content, parentId, user } = action.payload;
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
          return comments.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment],
                repliesCount: (c.repliesCount || 0) + 1,
              };
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
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.loading = false;
        const { comment, tempId, postId } = action.payload;
        const removeOptimistic = (comments) => {
          return comments.filter((c) => {
            if (c.id === tempId) return false;
            if (c.replies?.length) c.replies = removeOptimistic(c.replies);
            return true;
          });
        };
        state.comments = removeOptimistic(state.comments);
        const newComment = {
          ...comment,
          id: comment._id,
          replies: comment.replies || [],
        };
        if (newComment.parent) {
          const findAndAddReply = (comments) => {
            return comments.map((c) => {
              if (c.id === newComment.parent) {
                return {
                  ...c,
                  replies: [...c.replies, newComment],
                  repliesCount: (c.repliesCount || 0) + 1,
                };
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
        state.loading = false;
        state.error = action.payload.message;
        const removeOptimistic = (comments) => {
          return comments.filter((c) => {
            if (c.id === action.meta.arg.tempId) return false;
            if (c.replies?.length) c.replies = removeOptimistic(c.replies);
            return true;
          });
        };
        state.comments = removeOptimistic(state.comments);
        const postId = action.meta.arg.postId;
        state.commentCounts[postId] = Math.max(
          (state.commentCounts[postId] || 0) - 1,
          0
        );
      })
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        const { comments, postId } = action.payload;
        state.comments = normalizeCommentTree(comments || []);
        state.commentCounts[postId] = comments.reduce(
          (sum, c) => sum + (c.repliesCount || c.replies?.length || 0) + 1,
          0
        );
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCommentCount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommentCount.fulfilled, (state, action) => {
        state.loading = false;
        const { postId, count } = action.payload;
        state.commentCounts[postId] = count;
        delete state.failedCountFetches[postId];
      })
      .addCase(fetchCommentCount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        const postId = action.meta.arg;
        state.failedCountFetches[postId] = true;
      })
      .addCase(toggleReaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleReaction.fulfilled, (state, action) => {
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
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editComment.fulfilled, (state, action) => {
        state.loading = false;
        const findAndUpdateComment = (comments) => {
          return comments.map((c) => {
            if (c.id === action.payload._id) {
              return {
                ...action.payload,
                id: action.payload._id,
                replies: c.replies,
              };
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
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(blockComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(blockComment.fulfilled, (state, action) => {
        state.loading = false;
        const comment = state.comments.find((c) => c.id === action.payload);
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
          state.commentCounts[comment.post] = Math.max(
            (state.commentCounts[comment.post] || 0) - 1,
            0
          );
        }
      })
      .addCase(blockComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.loading = false;
        const { commentId, postId } = action.payload;
        const comment = state.comments.find((c) => c.id === commentId);
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
          state.commentCounts[postIdToUse] = Math.max(
            (state.commentCounts[postIdToUse] || 0) - 1,
            0
          );
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { optimisticAddComment, clearError } = commentSlice.actions;
export default commentSlice.reducer;
