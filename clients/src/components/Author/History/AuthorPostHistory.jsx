import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllPosts, deletePost } from "../../../store/postSlice";
import { Button } from "../../../Utils/Button";
import EditPostModal from "./EditPostModal";
import toast from "react-hot-toast";
import { Pencil, Trash } from "lucide-react";
import Pagination from "../../../Utils/Pagination";

function AuthorPostHistory({ userId }) {
  const dispatch = useDispatch();
  const { posts, loading, error, updateError, deleteLoading, deleteError } =
    useSelector((state) => state.post);

  const [editPost, setEditPost] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 15;

  useEffect(() => {
    dispatch(getAllPosts());
  }, [dispatch]);

  const userPosts = posts.filter((post) => post.author._id === userId);
  const totalPages = Math.ceil(userPosts.length / postsPerPage);

  const paginatedPosts = userPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  const handleEditClick = (post) => {
    setEditPost(post);
  };

  const handleRefresh = async () => {
    try {
      await dispatch(getAllPosts()).unwrap();
      toast.success("Posts refreshed!");
    } catch (error) {
      toast.error("Failed to refresh posts!");
    }
  };

  const handleDelete = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await dispatch(deletePost(postId)).unwrap();
        toast.success("Post deleted!");
        dispatch(getAllPosts());
      } catch (error) {
        toast.error("Failed to delete post!");
      }
    }
  };

  const formatDate = (dateString) => {
    return dateString
      ? new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";
  };

  return (
    <div className="p-4 bg-background rounded-lg shadow-sm border border-border animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">Post History</h2>
        <Button
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Refresh
        </Button>
      </div>

      {loading && (
        <p className="text-center text-muted-foreground">Loading posts...</p>
      )}
      {(error || updateError || deleteError) && (
        <p className="text-center text-destructive">
          {error?.message || updateError?.message || deleteError?.message || "Something went wrong."}
        </p>
      )}

      {userPosts.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full table-auto border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium max-w-xs truncate">Title</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Featured</th>
                  <th className="px-4 py-2 text-left font-medium">Pinned</th>
                  <th className="px-4 py-2 text-left font-medium">Published</th>
                  <th className="px-4 py-2 text-left font-medium">Comments</th>
                  <th className="px-4 py-2 text-left font-medium">Tags</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.map((post, index) => (
                  <tr
                    key={post._id}
                    className={`border-b border-border ${index % 2 === 0 ? "bg-muted/30" : ""} hover:bg-muted/50`}
                  >
                    <td className="px-4 py-2 max-w-xs truncate" title={post.title}>{post.title}</td>
                    <td className="px-4 py-2">{post.status}</td>
                    <td className="px-4 py-2">{post.isFeatured ? "Yes" : "No"}</td>
                    <td className="px-4 py-2">{post.isPinned ? "Yes" : "No"}</td>
                    <td className="px-4 py-2">{post.isPublished ? "Yes" : "No"}</td>
                    <td className="px-4 py-2">{post.allowComments ? "Yes" : "No"}</td>
                    <td className="px-4 py-2">{post.tags?.join(", ") || "None"}</td>
                    <td className="px-4 py-2">
                      {post.status === "draft"
                        ? formatDate(post.updatedAt)
                        : formatDate(post.createdAt)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleEditClick(post)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(post._id)}
                          disabled={deleteLoading}
                          className="bg-destructive text-destructive-foreground"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {paginatedPosts.map((post) => (
              <div
                key={post._id}
                className="p-4 border border-border rounded-lg bg-muted shadow hover:shadow-md transition-all duration-300"
              >
                <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Status:</strong> {post.status}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Published:</strong> {post.isPublished ? "Yes" : "No"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Featured:</strong> {post.isFeatured ? "Yes" : "No"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Tags:</strong> {post.tags?.join(", ") || "None"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Date:</strong>{" "}
                  {post.status === "draft"
                    ? formatDate(post.updatedAt)
                    : formatDate(post.createdAt)}
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handleEditClick(post)}
                    className="text-sm"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(post._id)}
                    disabled={deleteLoading}
                    className="text-sm bg-destructive text-destructive-foreground"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-center">
          Koi post history nahi hai! 📝
        </p>
      )}

      <EditPostModal
        post={editPost}
        isOpen={!!editPost}
        onClose={() => setEditPost(null)}
        onSave={() => dispatch(getAllPosts())}
      />
    </div>
  );
}

export default AuthorPostHistory;
