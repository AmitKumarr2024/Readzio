import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PlaylistList from "../components/Playlist/PlaylistList";

const UserPlaylistsPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return <PlaylistList userId={user._id} isOwnProfile={true} />;
};

export default UserPlaylistsPage;