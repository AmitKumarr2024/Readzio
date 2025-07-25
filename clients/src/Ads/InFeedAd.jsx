import GoogleAd from "./GoogleAd";

const InFeedAd = ({ postId, testMode = true }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-64 w-full overflow-hidden flex flex-col justify-center items-center p-4">
      <GoogleAd
        adSlot="8028537328"
        adFormat="autorelaxed"
        postId={postId}
        testMode={testMode}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
        Sponsored content
      </p>
    </div>
  );
};

export default InFeedAd;
