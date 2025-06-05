import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSinglePost, updatePost } from "../../store/postSlice";

const PollBlockOutput = ({ postId, question = "", options = [], caption = "", ...rest }) => {
  const dispatch = useDispatch();

  // Current logged-in user ID
  const currentUser = useSelector((state) => state.auth.user);
  const userId = currentUser?._id;

  // Get post either from currentPost or from posts list
  const postFromStore = useSelector((state) =>
    state.post.currentPost?._id === postId
      ? state.post.currentPost
      : state.post.posts.find((p) => p._id === postId)
  );

  // Memoized poll block from post
  const pollFromStore = useMemo(() => {
    if (!postFromStore) return { question, options, votedUserIds: [] };
    const pollBlock = postFromStore.blocks?.find((b) => b.type === "poll");
    return pollBlock || { question, options, votedUserIds: [] };
  }, [postFromStore, question, options]);

  // Normalize options: ensure valid objects with non-empty option field
  const normalizedOptions = useMemo(() => {
    return (pollFromStore.options || options)
      .map((opt, idx) => {
        // Handle string or object input
        const optionValue = typeof opt === "string" ? opt : opt?.option;
        return {
          option: optionValue && typeof optionValue === "string" ? optionValue : `Option ${idx + 1}`,
          votes: typeof opt === "string" ? 0 : opt?.votes || 0,
        };
      })
      .filter((opt) => opt.option && typeof opt.option === "string"); // Filter invalid options
  }, [pollFromStore.options, options]);

  // Check if user has voted
  const userHasVoted = useMemo(() => {
    return userId && Array.isArray(pollFromStore.votedUserIds)
      ? pollFromStore.votedUserIds.includes(userId)
      : false;
  }, [pollFromStore.votedUserIds, userId]);

  // Votes state for optimistic UI updates
  const [votes, setVotes] = useState(() =>
    Object.fromEntries(normalizedOptions.map((opt) => [opt.option, opt.votes || 0]))
  );

  // To rollback state on error
  const prevVotesRef = useRef(votes);

  // Selected option in UI
  const [selected, setSelected] = useState(null);

  // Sync votes when normalizedOptions changes
  useEffect(() => {
    const updatedVotes = Object.fromEntries(
      normalizedOptions.map((opt) => [opt.option, opt.votes || 0])
    );
    setVotes(updatedVotes);
    prevVotesRef.current = updatedVotes;
    setSelected(null);
  }, [normalizedOptions]);

  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0);

  const handleVote = (option) => {
    if (!userId) {
      alert("Please log in to vote.");
      return;
    }
    if (userHasVoted) {
      alert("You have already voted.");
      return;
    }

    // Save previous votes for rollback
    prevVotesRef.current = { ...votes };

    // Optimistically update votes
    const updatedVotes = { ...votes, [option]: (votes[option] || 0) + 1 };
    setVotes(updatedVotes);
    setSelected(option);

    // Ensure options sent to backend are valid
    const updatedOptions = normalizedOptions.map((opt) => ({
      option: opt.option,
      votes: opt.option === option ? (opt.votes || 0) + 1 : opt.votes || 0,
    }));

    dispatch(
      updatePost({
        postId,
        updateData: {
          poll: {
            question: pollFromStore.question || question,
            options: updatedOptions,
            votedUserIds: [...(pollFromStore.votedUserIds || []), userId],
          },
        },
      })
    )
      .unwrap()
      .then(() => {
        dispatch(getSinglePost(postId));
      })
      .catch((err) => {
        console.error("[updatePost failed]", err);
        // Rollback votes and selection on failure
        setVotes(prevVotesRef.current);
        setSelected(null);
        alert("Failed to submit vote. Please try again.");
      });
  };

  // Debug logs to inspect data
  console.log("Poll from store:", pollFromStore);
  console.log("Normalized Options:", normalizedOptions);

  return (
    <div
      {...rest}
      className="max-w-[600px] mx-auto p-6 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-sans"
    >
      <h4 className="text-xl font-semibold mb-4 text-gray-950">
        {pollFromStore.question || "No question provided"}
      </h4>

      {normalizedOptions.length > 0 ? (
        normalizedOptions.map((opt, idx) => {
          const count = votes[opt.option] || 0;
          const percent = totalVotes ? ((count / totalVotes) * 100).toFixed(1) : 0;

          return (
            <div key={`${opt.option}-${idx}`} className="mb-4">
              <button
                onClick={() => handleVote(opt.option)}
                disabled={userHasVoted}
                className={`w-full text-left py-2 px-4 rounded-md border-2 ${
                  selected === opt.option
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-gray-300 bg-white text-gray-900"
                } ${userHasVoted ? "cursor-not-allowed" : "cursor-pointer"} font-medium text-base transition-all duration-300 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50`}
              >
                {opt.option}
              </button>

              <div className="mt-2">
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden w-full">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {percent}% ({count} vote{count !== 1 ? "s" : ""})
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="italic text-gray-600">No options available.</p>
      )}

      <div className="mt-6 text-sm font-semibold text-gray-700">
        Total votes: {totalVotes}
      </div>

      {userHasVoted && (
        <div className="mt-4 flex items-center text-green-600 font-semibold gap-1.5 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Thank you for voting!
        </div>
      )}

      {caption && (
        <div className="mt-6 italic text-gray-600 border-t border-gray-200 pt-3 text-xs">
          {caption}
        </div>
      )}
    </div>
  );
};

export default PollBlockOutput;