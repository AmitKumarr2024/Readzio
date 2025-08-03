import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { voteOnPoll } from "../../store/PostInteractions";

const PollBlockOutput = ({
  slug,
  question = "",
  options = [],
  caption = "",
  blockId,
  ...rest
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { loading: interactionLoading } = useSelector((state) => state.post);
  const { currentPost, posts } = useSelector((state) => state.post);
  const userId = user?._id;

  // console.log("[PollBlockOutput] Component props:", {
  //   slug,
  //   question,
  //   options,
  //   blockId,
  // });

  const postFromStore = useMemo(() => {
    const post =
      currentPost?.slug === slug
        ? currentPost
        : posts.find((p) => p.slug === slug);
    // console.log("[PollBlockOutput] Post from store:", post);
    return post;
  }, [currentPost, posts, slug]);

  const pollFromStore = useMemo(() => {
    if (!postFromStore) {
      console.warn("[PollBlockOutput] No post found in store for slug:", slug);
      return { question, options, votedUserIds: [] };
    }
    const pollBlock = postFromStore.blocks?.find(
      (b) => b.id === blockId && b.type === "poll"
    ) || {
      question,
      options,
      votedUserIds: [],
    };
    // console.log("[PollBlockOutput] Poll block retrieved:", pollBlock);
    return pollBlock;
  }, [postFromStore, question, options, blockId]);

  const normalizedOptions = useMemo(() => {
    const opts = (pollFromStore.options || options)
      .map((opt, idx) => {
        const optionValue = typeof opt === "string" ? opt : opt?.option;
        return {
          option:
            optionValue && typeof optionValue === "string"
              ? optionValue
              : `Option ${idx + 1}`,
          votes: typeof opt === "string" ? 0 : opt?.votes || 0,
        };
      })
      .filter((opt) => opt.option && typeof opt.option === "string");
    // console.log("[PollBlockOutput] Normalized options:", opts);
    return opts;
  }, [pollFromStore.options, options]);

  const userHasVoted = useMemo(() => {
    const votedUserIds = pollFromStore.votedUserIds || [];
    const hasVoted =
      userId && Array.isArray(votedUserIds)
        ? votedUserIds.some((vote) => vote?.userId?.toString?.() === userId)
        : false;
    // console.log(
    //   "[PollBlockOutput] User has voted:",
    //   hasVoted,
    //   "userId:",
    //   userId
    // );
    return hasVoted;
  }, [pollFromStore.votedUserIds, userId]);

  const [votes, setVotes] = useState(() =>
    Object.fromEntries(
      normalizedOptions.map((opt) => [opt.option, opt.votes || 0])
    )
  );
  const prevVotesRef = useRef(votes);
  const [selected, setSelected] = useState(null);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    // console.log("[PollBlockOutput] Updating votes from normalized options");
    const updatedVotes = Object.fromEntries(
      normalizedOptions.map((opt) => [opt.option, opt.votes || 0])
    );
    setVotes(updatedVotes);
    prevVotesRef.current = updatedVotes;
    setSelected(null);
    // console.log("[PollBlockOutput] Updated votes:", updatedVotes);
  }, [normalizedOptions]);

  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0);
  // console.log("[PollBlockOutput] Total votes:", totalVotes);

  const handleVote = async (option, optionIndex) => {
    // console.log("[PollBlockOutput] Handling vote:", { option, optionIndex });
    if (!isAuthenticated) {
      // console.log("[PollBlockOutput] Redirecting to login for voting");
      navigate(`/login?redirect=/post/${slug}`);
      return;
    }
    if (userHasVoted) {
      // console.log("[PollBlockOutput] User already voted for slug:", slug);
      alert("You have already voted.");
      return;
    }
    if (!postFromStore?._id || !blockId) {
      console.error(
        "[PollBlockOutput] No valid post ID or block ID for voting"
      );
      alert("Cannot vote: Post or poll not loaded.");
      return;
    }
    if (isVoting || interactionLoading) {
      console.warn(
        "[PollBlockOutput] Voting in progress or interaction loading"
      );
      alert("Please wait while the vote is processing.");
      return;
    }

    setIsVoting(true);
    prevVotesRef.current = { ...votes };
    const updatedVotes = { ...votes, [option]: (votes[option] || 0) + 1 };
    setVotes(updatedVotes);
    setSelected(option);
    // console.log("[PollBlockOutput] Optimistic vote update:", updatedVotes);

    try {
      const result = await dispatch(
        voteOnPoll({
          postId: postFromStore._id,
          blockId,
          optionIndex,
        })
      ).unwrap();
      // console.log(
      //   "[PollBlockOutput] Vote recorded for post:",
      //   postFromStore._id,
      //   result
      // );
    } catch (err) {
      console.error("[PollBlockOutput] voteOnPoll failed:", err);
      setVotes(prevVotesRef.current);
      setSelected(null);
      alert("Failed to submit vote. Please try again.");
    } finally {
      setIsVoting(false);
      // console.log("[PollBlockOutput] Voting completed, isVoting:", false);
    }
  };

  // console.log("[PollBlockOutput] Rendering with pollFromStore:", pollFromStore);

  if (!postFromStore && !pollFromStore.question && !normalizedOptions.length) {
    console.warn("[PollBlockOutput] Rendering loading state for slug:", slug);
    return (
      <div className="italic text-sm text-gray-500 dark:text-gray-400">
        Loading poll...
      </div>
    );
  }

  if (!pollFromStore.question && !normalizedOptions.length) {
    console.warn("[PollBlockOutput] No valid poll data for slug:", slug);
    return (
      <div className="italic text-sm text-gray-500 dark:text-gray-400">
        Poll not available.
      </div>
    );
  }

  return (
    <div
      {...rest}
      className="max-w-[600px] mx-auto p-6 border border-gray-300 rounded-lg bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-sans"
    >
      <h4 className="text-xl font-semibold mb-4 text-text-main-light dark:text-text-main-dark">
        {pollFromStore.question || "No question provided"}
      </h4>

      {normalizedOptions.length > 0 ? (
        normalizedOptions.map((opt, idx) => {
          const count = votes[opt.option] || 0;
          const percent = totalVotes
            ? ((count / totalVotes) * 100).toFixed(1)
            : 0;

          return (
            <div key={`${opt.option}-${idx}`} className="mb-4">
              <button
                onClick={() => handleVote(opt.option, idx)}
                disabled={
                  userHasVoted ||
                  !isAuthenticated ||
                  isVoting ||
                  interactionLoading
                }
                className={`w-full text-left py-2 px-4 rounded-md border-2 ${
                  selected === opt.option
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-gray-300 bg-white text-gray-900"
                } ${
                  userHasVoted ||
                  !isAuthenticated ||
                  isVoting ||
                  interactionLoading
                    ? "cursor-not-allowed"
                    : "cursor-pointer"
                } font-medium text-base transition-all duration-300 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50`}
              >
                {opt.option}
              </button>

              {userHasVoted && (
                <div className="mt-2">
                  <div className="h-2.5 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-full overflow-hidden w-full">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-xs text-text-main-light dark:text-text-main-dark mt-1">
                    {percent}% ({count} vote{count !== 1 ? "s" : ""})
                  </div>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <p className="italic text-text-main-light dark:text-text-main-dark">
          No options available.
        </p>
      )}

      <div className="mt-6 text-sm font-semibold text-text-main-light dark:text-text-main-dark">
        Total votes: {totalVotes}
      </div>

      {isAuthenticated && userHasVoted && (
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Your vote is recorded!
        </div>
      )}

      {!isAuthenticated && (
        <div className="mt-4 flex items-center text-blue-600 font-semibold gap-1.5 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h7a3 3 0 013 3v1"
            />
          </svg>
          Log in to vote
        </div>
      )}

      {caption && (
        <div className="mt-6 italic text-text-main-light dark:text-text-main-dark border-t border-gray-200 pt-3 text-xs">
          {caption}
        </div>
      )}
    </div>
  );
};

export default PollBlockOutput;
