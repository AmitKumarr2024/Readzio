/**
 * Fetch posts one by one, with retries and slow network handling.
 * @param {Object} options
 * @param {Function} options.dispatch - Redux dispatch function
 * @param {Array} options.posts - List of post IDs or objects
 * @param {Function} options.getThunk - Redux thunk to fetch a single post
 * @param {number} options.delayMs - Delay between requests (default 200ms)
 * @param {number} options.maxRetries - Retry attempts per post (default 3)
 * @param {number} options.timeoutMs - Per request timeout in ms (default 8000ms)
 */
export const fetchPostsSequentially = async ({
  dispatch,
  posts,
  getThunk,
  delayMs = 200,
  maxRetries = 3,
  timeoutMs = 8000,
}) => {
  const results = [];

  for (const post of posts) {
    let attempt = 0;
    let success = false;
    let lastError = null;

    while (attempt < maxRetries && !success) {
      attempt++;
      try {
        const result = await Promise.race([
          dispatch(getThunk(post)).unwrap(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("⏳ Request timed out")),
              timeoutMs
            )
          ),
        ]);

        results.push({ post, data: result, error: null });
        success = true;
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ Attempt ${attempt} failed for post ${post}:`, err);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs * 2)); // extra delay before retry
        }
      }
    }

    if (!success) {
      results.push({ post, data: null, error: lastError });
    }

    // Delay before next request to avoid flooding slow networks
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return results;
};
