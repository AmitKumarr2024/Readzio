import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye } from "lucide-react";
import { useParams } from "react-router-dom";
import {
  incrementPostView,
  trackTimeSpent,
} from "../../store/PostInteractions";
import { selectPostViews } from "../../Utils/postSelectors";

const TotalView = ({ postId, slug: propSlug, authorId }) => {
  const dispatch = useDispatch();
  const { slug: routeSlug } = useParams();
  const slug = propSlug || routeSlug;
  const { user } = useSelector((state) => state.auth);
  const { views, message, error } = useSelector((state) =>
    selectPostViews(state, slug)
  );

  const [hasIncremented, setHasIncremented] = useState(false);

  const isAuthor = user && authorId && user._id === authorId;

  // Track time spent — only if postId is valid
  useEffect(() => {
    if (!slug || !authorId || isAuthor || !postId) return;
    const start = Date.now();

    return () => {
      const duration = Math.round((Date.now() - start) / 1000);
      if (/^[a-f\d]{24}$/i.test(postId)) {
        dispatch(trackTimeSpent({ postId, duration }));
      } else {
        console.warn("❌ Skipping time tracking: invalid postId", postId);
      }
    };
  }, [dispatch, slug, postId, authorId, isAuthor]);

  // Increment view count (by slug)
  useEffect(() => {
    if (!slug || !authorId || hasIncremented || isAuthor) return;

    dispatch(incrementPostView(slug))
      .then(() => setHasIncremented(true))
      .catch(() => setHasIncremented(true));
  }, [dispatch, slug, authorId, hasIncremented, isAuthor]);

  const errorMessage = error
    ? typeof error === "string"
      ? error
      : error.message || "View count failed"
    : null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Eye size={16} className="text-blue-500" />
      <span>{views} views</span>
      {isAuthor && (
        <span className="text-gray-400 ml-2">(Author views not counted)</span>
      )}
      {message === "Author views not counted" && !isAuthor && (
        <span className="text-gray-400 ml-2">(Author views not counted)</span>
      )}
      {errorMessage && !message && (
        <span className="text-red-400 ml-2">(Error: {errorMessage})</span>
      )}
    </div>
  );
};

export default TotalView;
