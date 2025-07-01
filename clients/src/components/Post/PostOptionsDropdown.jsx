import React, { useState, useEffect, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import ReportModal from "./ReportModal";

const PostOptionsDropdown = ({ isAuthor, post, setIsDeleteModalOpen }) => {
  const [open, setOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Post options"
      >
        <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-md bg-white dark:bg-zinc-900 shadow-lg ring-1 ring-black ring-opacity-5">
          <ul className="py-1 text-sm text-gray-700 dark:text-gray-200">
            {isAuthor ? (
              <>
                <li>
                  {post?.slug && (
                    <Link
                      to={`/edit-post/${post.slug}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      ✏️ Edit Post
                    </Link>
                  )}
                </li>
                <li>
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(true);
                      setOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    🗑️ Delete Post
                  </button>
                </li>
              </>
            ) : (
              <li>
                <button
                  onClick={() => {
                    setShowReportModal(true);
                    setOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  🚩 Report Post
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {showReportModal && (
        <ReportModal
          postId={post._id}
          slug={post.slug}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default PostOptionsDropdown;
