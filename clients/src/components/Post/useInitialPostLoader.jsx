import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPublicPosts } from "../../store/guestSlice";
import { getAllPosts } from "../../store/postSlice";
import { checkAuth } from "../../store/authSlice";

export const useInitialPostLoader = ({ page = 1, limit = 12 } = {}) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        if (isAuthenticated === undefined) {
          console.log("[useInitialPostLoader] Checking auth...");
          await dispatch(checkAuth()).unwrap();
        }

        if (isAuthenticated) {
          console.log("[useInitialPostLoader] Fetching all posts for user");
          dispatch(getAllPosts({ page, limit }));
        } else {
          console.log("[useInitialPostLoader] Fetching guest posts");
          dispatch(fetchPublicPosts({ page, limit }));
        }
      } catch (err) {
        console.error("[useInitialPostLoader] Error:", err);
        dispatch(fetchPublicPosts({ page, limit })); // fallback for failed auth
      }
    };

    fetchPosts();
  }, [dispatch, isAuthenticated, page, limit]);
};
