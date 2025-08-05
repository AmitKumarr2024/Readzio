export const fetchPostsSequentially = async ({
  dispatch,
  posts,
  getThunk,
  delayMs = 200,
}) => {
  const results = [];
  for (const post of posts) {
    try {
      const res = await dispatch(getThunk(post)).unwrap();
      results.push(res);
      await new Promise((r) => setTimeout(r, delayMs)); // optional delay
    } catch (e) {
      console.error("❌ Failed to fetch post:", post, e);
    }
  }
  return results;
};
