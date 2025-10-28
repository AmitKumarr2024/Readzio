// clients/src/pages/PlaylistCreatePage.jsx
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PlaylistCreate from "../components/Playlist/PlaylistCreate";

/**
 * Page component for creating a playlist
 * Route: /playlists/create
 */
const PlaylistCreatePage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return null; // Redirect handling
  }

  return <PlaylistCreate />;
};

export default PlaylistCreatePage;
