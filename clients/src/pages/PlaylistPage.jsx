// clients/src/pages/PlaylistPage.jsx

import { useParams } from "react-router-dom";
import PlaylistDetail from "../components/Playlist/PlaylistDetail";
import { usePlaylistSocket } from "../hooks/usePlaylistSocket";

/**
 * Page component for viewing a single playlist
 * Route: /playlist/:id
 */
const PlaylistPage = () => {
  const { id } = useParams();

  // Initialize playlist socket listeners
  usePlaylistSocket();

  return <PlaylistDetail playlistId={id} />;
};

export default PlaylistPage;
