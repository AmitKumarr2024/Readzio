import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getAllPosts } from "../../../store/postSlice";
import Pagination from "../../../Utils/Pagination";

function AuthorPolls({ authorId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();


  console.log("authhhh",authorId);
  

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
    return <div className="text-center p-6">Loading polls...</div>;
  }

  if (!polls.length) {
    return (
      <div className="p-6 bg-white rounded-xl shadow border text-center text-gray-600">
        <h2 className="text-3xl font-bold text-blue-600 mb-6">
          Polls by This Author 🗳️
        </h2>
        <p className="text-lg">No polls found for this author ✋</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow border">
      <h2 className="text-3xl font-bold text-blue-600 mb-6">
  Polls by This Author <span aria-label="ballot box" role="img">🗳️</span>
</h2>

      <div className="overflow-y-scroll max-h-[500px] border rounded">
        <table className="min-w-full border-collapse block md:table">
          <thead className="block md:table-header-group bg-indigo-100">
            <tr className="border border-gray-300 md:border-none block md:table-row">
              {[
                "Question",
                "Total Votes",
                "Your Vote",
                "Created At",
                "Action",
              ].map((head) => (
                <th
                  key={head}
                  className="p-3 text-left font-semibold text-gray-700 block md:table-cell"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {currentPolls.map((poll) => (
              <tr
                key={poll._id}
                className="border border-gray-300 md:border-none block md:table-row hover:bg-indigo-50"
              >
                <td className="p-3 block md:table-cell">{poll.question}</td>
                <td className="p-3 block md:table-cell">{poll.votes}</td>
                <td className="p-3 block md:table-cell">
                  {poll.authorVotedOption}
                </td>
                <td className="p-3 block md:table-cell">
                  {new Date(poll.createdAt).toLocaleString()}
                </td>
                <td className="p-3 block md:table-cell">
                  <button
                    onClick={() => navigate(`/post/${poll._id}`)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                  >
                    Go to Poll
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
      />
    </div>
  );
}

export default AuthorPolls;
