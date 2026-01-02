import { useSelector } from "react-redux";

const RateLimitModal = () => {
  const { isLimited, retryAfter } = useSelector((state) => state.rateLimit);

  if (!isLimited) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[320px] text-center">
        <h2 className="text-lg font-semibold">Too many actions</h2>
        <p className="text-sm text-gray-600 mt-2">
          Please wait before continuing.
        </p>

        <div className="text-2xl font-bold mt-4">{retryAfter}s</div>

        <p className="text-xs text-gray-500 mt-2">Automatically unlocked</p>
      </div>
    </div>
  );
};

export default RateLimitModal;
