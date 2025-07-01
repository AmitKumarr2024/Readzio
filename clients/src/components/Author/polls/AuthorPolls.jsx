import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getAllPosts } from "../../../store/postSlice";
import Pagination from "../../../Utils/Pagination";
import { motion } from "framer-motion";
import { FaPoll ,FaSpinner} from "react-icons/fa";

function AuthorPolls({ authorId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { posts, loading } = useSelector((state) => state.post);
  const [currentPage, setCurrentPage] = useState(1);
  const pollsPerPage = 20;

  useEffect(() => {
    if (!posts.length) {
      dispatch(getAllPosts());
    }
  }, [dispatch, posts.length]);

  const polls = useMemo(() => {
    return posts
      .filter(
        (post) =>
          post.blocks?.some((block) => block.type === "poll") &&
          post.author?._id === authorId
      )
      .map((post) => {
        const pollBlock = post.blocks.find((block) => block.type === "poll");
        const totalVotes = pollBlock?.votedUserIds?.length || 0;
        const authorVoted = pollBlock?.votedUserIds?.includes(authorId);
        return {
          _id: post._id,
          question: pollBlock?.question || "Poll",
          votes: totalVotes,
          authorVotedOption: authorVoted ? "Voted" : "No Vote",
          createdAt: post.createdAt,
        };
      });
  }, [posts, authorId]);

  const totalPages = Math.ceil(polls.length / pollsPerPage);
  const currentPolls = useMemo(() => {
    const start = (currentPage - 1) * pollsPerPage;
    return polls.slice(start, start + pollsPerPage);
  }, [polls, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FaSpinner className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-lg font-semibold  text-text-main-light dark:text-text-main-dark">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="bg-background-light dark:bg-background-dark  backdrop-blur-xl rounded-2xl shadow-xl p-6"
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h2 className="text-3xl font-extrabold  text-text-main-light dark:text-text-main-dark mb-6 flex items-center gap-3">
            <FaPoll className="text-indigo-600" /> Polls by This Author 🗳️
          </h2>

          {polls.length ? (
            <>
              <div className="overflow-y-auto max-h-[500px] rounded-xl border border-gray-100 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-background-light dark:bg-background-dark  sticky top-0 z-10">
                    <tr>
                      {["Question", "Total Votes", "Your Vote", "Created At", "Action"].map((head) => (
                        <th
                          key={head}
                          className="px-6 py-4 text-left text-xs font-semibold  text-text-main-light dark:text-text-main-dark uppercase tracking-wider"
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-background-light dark:bg-background-dark  divide-y divide-gray-100">
                    {currentPolls.map((poll) => (
                      <motion.tr
                        key={poll._id}
                        className="hover:bg-indigo-50 transition-all duration-200"
                        whileHover={{ scale: 1.01 }}
                      >
                        <td className="px-6 py-4">{poll.question}</td>
                        <td className="px-6 py-4">{poll.votes}</td>
                        <td className="px-6 py-4">{poll.authorVotedOption}</td>
                        <td className="px-6 py-4">{new Date(poll.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <motion.button
                            onClick={() => navigate(`/post/${poll._id}`)}
                            className="px-4 py-2 rounded-full text-text-main-light dark:text-text-main-dark bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Go to Poll
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 flex justify-center"
                >
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                </motion.div>
              )}
            </>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center  text-text-main-light dark:text-text-main-dark text-lg py-10"
            >
              No polls found for this author ✋
            </motion.p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default AuthorPolls;