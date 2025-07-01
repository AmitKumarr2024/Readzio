import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchSuggestedPosts } from '../../store/suggestedPostsSlice';
import AdCard from '../../Utils/AdCard';
import Skeleton from '../ui/Skeleton';
import toast from 'react-hot-toast';

const SuggestedPosts = () => {
  const dispatch = useDispatch();
  const { posts, status, error } = useSelector((state) => state.suggestedPosts || {});

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchSuggestedPosts({ limit: 10 }));
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (status === 'failed' && error) {
      toast.error(error || 'Failed to load suggested posts');
    }
  }, [status, error]);

  const getAdPositions = (postCount) => {
    const positions = [];
    let currentPos = 0;
    while (currentPos < postCount) {
      const gap = Math.floor(Math.random() * 3) + 2;
      currentPos += gap;
      if (currentPos < postCount) {
        positions.push(currentPos);
      }
    }
    return positions;
  };

  const adPositions = useMemo(() => getAdPositions(posts.length), [posts.length]);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4">Suggested Posts</h2>
      {status === 'loading' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-md">
              <Skeleton width="w-full" height="h-40" className="mb-4" />
              <Skeleton width="w-3/4" height="h-6" className="mb-2" />
              <Skeleton width="w-1/2" height="h-4" />
            </div>
          ))}
        </div>
      )}
      {status === 'failed' && (
        <p className="text-lg text-center text-red-100 bg-red-600 py-3 rounded">{error || 'Failed to load posts'}</p>
      )}
      {status === 'succeeded' && posts.length === 0 && (
        <p className="text-lg text-center text-gray-600 bg-white py-6 rounded">No suggested posts found.</p>
      )}
      {status === 'succeeded' && posts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, index) => (
            <React.Fragment key={post._id}>
              <Link
                to={`/post/${post.slug}`}
                className="bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-200 hover:shadow-xl"
              >
                {post.thumbnail && (
                  <img
                    src={post.thumbnail}
                    alt={post.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h4 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                    {post.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    By {post.author.name} • <TimeAgo date={post.createdAt} />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
              {adPositions.includes(index + 1) && (
                <AdCard
                  key={`ad-${index}`}
                  adIndex={index}
                  adContent="Sponsored Content"
                  adImage="https://placehold.co/150x100?text=Ad+Failed"
                  postId={post._id}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestedPosts;