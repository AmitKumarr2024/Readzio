import GoogleAd from "./GoogleAd";

const InFeedAd = ({ postId, testMode = true }) => {
  return (
    <div className=" h-72 w-full overflow-hidden flex flex-col justify-center items-center p-4">
      <GoogleAd
        adSlot="8028537328"
        adFormat="autorelaxed"
        postId={postId}
        testMode={testMode}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
      Sponsored
    </p>
    </div>
  );
};

export default InFeedAd;
