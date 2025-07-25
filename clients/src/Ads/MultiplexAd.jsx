import GoogleAd from "./GoogleAd";

const MultiplexAd = ({ postId, testMode = false }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm w-full p-3 overflow-hidden">
    <GoogleAd
      adSlot="9884544478"
      adFormat="multiplex"
      postId={postId}
      testMode={testMode}
      style={{
        display: "block",
        width: "100%",
        minHeight: "250px",
        height: "auto",
      }}
    />
    <p className="mt-2 text-xs text-center text-gray-400 dark:text-gray-500">
      Sponsored content
    </p>
  </div>
);

export default MultiplexAd;
