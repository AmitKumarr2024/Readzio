import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import postlistList from "../components/postlist/postlistList";

const UserpostlistsPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    console.log("[UserpostlistsPage] User from Redux:", user);
    if (!user) {
      console.warn("[UserpostlistsPage] No user found, redirecting...");
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  console.log("[UserpostlistsPage] Rendering postlistList for user:", user._id);
  return <postlistList userId={user._id} isOwnProfile={true} />;
};

export default UserpostlistsPage;
