import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye } from "lucide-react";
import { useParams } from "react-router-dom";
import { incrementPostView } from "../../store/Post interactions";

const TotalView = ({ postId: propPostId }) => {
  const dispatch = useDispatch();
  const { postId: routePostId } = useParams();
  const postId = propPostId || routePostId;

  // Select views count for this postId from redux state
  const { views } = useSelector(
    (state) => state.postInteraction.views[postId] || { views: 0 }
  );

  // Debug log to check views on each render
  console.log("Rendered views for post", postId, views);

  useEffect(() => {
    if (!postId) return;

    // Wait 10 seconds before dispatching increment view
    const timer = setTimeout(() => {
      dispatch(incrementPostView(postId));
    }, 5000); // 5 seconds

    // Cleanup if component unmounts or postId changes before timer fires
    return () => clearTimeout(timer);
  }, [dispatch, postId]);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Eye size={16} className="text-blue-500" />
      <span>{views} views</span>
    </div>
  );
};

export default TotalView;
