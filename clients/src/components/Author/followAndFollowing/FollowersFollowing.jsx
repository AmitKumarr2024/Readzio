import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ToggleFollowButton from "../Subscribe/ToggleFollowButton";
import { fetchFollowers, fetchFollowing, unfollowUser } from "../../../store/subscribeSlice";

function FollowersFollowing() {
  const dispatch = useDispatch();
  const [selectedUsers, setSelectedUsers] = useState([]); // Track selected users for bulk unfollow
  const [selectAll, setSelectAll] = useState(false); // Track select all checkbox state

  // Assuming your slice remains subscribe with followers and following keys:
  const { list: followersList = [], count: followersCount = 0, loading: followersLoading, error: followersError } = useSelector(
    (state) => state.subscribe.followers || {}
  );
  const { list: followingList = [], count: followingCount = 0, loading: followingLoading, error: followingError } = useSelector(
    (state) => state.subscribe.following || {}
  );

  // Refresh lists after follow/unfollow action
  const handleFollowSuccess = () => {
    dispatch(fetchFollowers());
    dispatch(fetchFollowing());
    setSelectedUsers([]);
    setSelectAll(false);
  };

  // Select all toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(followingList.map(user => user._id));
    }
    setSelectAll(!selectAll);
  };

  // Individual user select/deselect
  const handleUserSelect = (userId) => {
    let newSelected;
    if (selectedUsers.includes(userId)) {
      newSelected = selectedUsers.filter(id => id !== userId);
    } else {
      newSelected = [...selectedUsers, userId];
    }
    setSelectedUsers(newSelected);
    setSelectAll(followingList.length > 0 && newSelected.length === followingList.length);
  };

  // Bulk unfollow all selected users
  const handleBulkUnfollow = async () => {
    try {
      for (const userId of selectedUsers) {
        const result = await dispatch(unfollowUser(userId)).unwrap();
        if (!unfollowUser.fulfilled.match(result)) {
          toast.error(`Failed to unfollow user ${userId}`);
        }
      }
      toast.success(`Successfully unfollowed ${selectedUsers.length} user(s)!`);
      handleFollowSuccess();
    } catch (err) {
      console.error("[BulkUnfollow] Error:", err);
      toast.error("An error occurred while unfollowing users.");
    }
  };

  // On mount, fetch lists
  useEffect(() => {
    dispatch(fetchFollowers());
    dispatch(fetchFollowing());
  }, [dispatch]);

  // Render user list (followers or following)
  const renderUserList = (users, isFollowingList = false) => (
    <ul className="space-y-2">
      {users.map(user => (
        <li key={user._id} className="py-2 flex items-center gap-3 border-b last:border-b-0">
          {isFollowingList && (
            <input
              type="checkbox"
              checked={selectedUsers.includes(user._id)}
              onChange={() => handleUserSelect(user._id)}
              className="h-4 w-4 text-blue-600 rounded"
            />
          )}
          <img
            src={user?.avatar || "https://via.placeholder.com/40"}
            alt={user?.name || "User"}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-800">{user?.name || "Unnamed"}</p>
            <p className="text-sm text-gray-500">@{user?.username || user?.email || "unknown"}</p>
          </div>
          <div className="w-24">
            <ToggleFollowButton
              followUserId={user._id}
              onFollowSuccess={handleFollowSuccess}
              isFollowing={isFollowingList || followingList.some(fu => fu._id === user._id)}
            />
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid md:grid-cols-2 gap-6 p-4">
      {/* Followers Section */}
      <section className="bg-white rounded-lg shadow p-4">
        <h3 className="text-xl font-semibold mb-2">Followers ({followersCount})</h3>
        {followersLoading ? (
          <p className="text-gray-500">Loading followers...</p>
        ) : followersError ? (
          <p className="text-red-500">{followersError}</p>
        ) : followersList.length === 0 ? (
          <p className="text-gray-500">No followers yet! 😞</p>
        ) : (
          renderUserList(followersList, false)
        )}
      </section>

      {/* Following Section */}
      <section className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold">Following ({followingCount})</h3>
          {followingList.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-600">Select All</span>
              {selectedUsers.length > 0 && (
                <button
                  onClick={handleBulkUnfollow}
                  className="ml-2 px-3 py-1 text-sm bg-red-500 text-white rounded-md font-semibold hover:bg-red-600 transition duration-200"
                >
                  Unfollow Selected ({selectedUsers.length})
                </button>
              )}
            </div>
          )}
        </div>
        {followingLoading ? (
          <p className="text-gray-500">Loading following...</p>
        ) : followingError ? (
          <p className="text-red-500">{followingError}</p>
        ) : followingList.length === 0 ? (
          <p className="text-gray-500">You're not following anyone yet! 🤷‍♂️</p>
        ) : (
          renderUserList(followingList, true)
        )}
      </section>
    </div>
  );
}

export default FollowersFollowing;
