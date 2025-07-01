 import { createSelector } from '@reduxjs/toolkit';

   export const selectPostViews = createSelector(
     [
       (state) => state.postInteraction.views,
       (state, postId) => postId,
     ],
     (views, postId) => views[postId] || { views: 0 }
   );