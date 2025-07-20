import { createSelector } from '@reduxjs/toolkit';

// Selects post views from Redux store
export const selectPostViews = createSelector(
  [
    (state) => state.postInteraction.views,
    (state, postId) => postId,
  ],
  (views, postId) => views[postId] || { views: 0 } // Return views or default
);