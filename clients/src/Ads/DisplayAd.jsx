import GoogleAd from "./GoogleAd";

const DisplayAd = () => (
  <div className="flex flex-col items-center my-4">
    <GoogleAd
      adSlot="6440123489"
      adFormat="display"
      
      style={{ display: "block", width: "300px", height: "600px" }}
    />
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
      Sponsored
    </p>
  </div>
);

export default DisplayAd;
