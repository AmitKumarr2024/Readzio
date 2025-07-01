import GoogleAd from "./components/GoogleAd";
import AdBlockModal from "./components/AdBlockModal";
import useAdBlockDetector from "./hooks/useAdBlockDetector";

export default function AdPage() {
  const isBlocked = useAdBlockDetector();

  return (
    <div className={isBlocked ? "blur-sm pointer-events-none select-none" : ""}>
      <main className="p-6 space-y-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Welcome to Free Content</h1>
        {!isBlocked && <GoogleAd adSlot="1234567890" className="my-6" />}
        <p>
          This content is free thanks to ad support. Please consider allowing ads to keep it free.
        </p>
      </main>
      <AdBlockModal show={isBlocked} />
    </div>
  );
}
