import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PlaylistList from "../components/Playlist/PlaylistList";

const UserPlaylistsPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    console.log("[UserPlaylistsPage] User from Redux:", user);
    if (!user) {
      console.warn("[UserPlaylistsPage] No user found, redirecting...");
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  console.log("[UserPlaylistsPage] Rendering PlaylistList for user:", user._id);
  return <PlaylistList userId={user._id} isOwnProfile={true} />;
};

export default UserPlaylistsPage;
