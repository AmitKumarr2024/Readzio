import React, { useState, useEffect } from "react";
import {
  PenTool,
  BookOpen,
  Sparkles,
  Heart,
  MessageCircle,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const slides = [
  {
    type: "main",
    content: (
      <>
        <h1 className="text-3xl sm:text-3xl md:text-5xl font-extrabold mb-4 sm:mb-6 leading-tight">
          <span className="text-slate-800 dark:text-slate-100">
            Write Ideas, Get Feedback & Vote in Polls on{" "}
          </span>
          <span
            className="logo-shimmer relative inline-block notranslate text-5xl sm:text-7xl md:text-8xl font-extrabold"
            translate="no"
            lang="en"
            aria-label="Readzio - Real-time Discussion Platform"
          >
            Readzio
            <span className="absolute bottom-0 left-0 w-full h-1 sm:h-1.5 rainbow-border" />
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-2xl max-w-md sm:max-w-xl mx-auto text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
          A real-time space where ideas are read, discussed, and improved —
          together.
        </p>

        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-4">
          Write your thoughts. See who's online. Get instant reactions.
        </p>

        <p className="text-xl sm:text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-400 dark:to-amber-400 bg-clip-text text-transparent">
          Born in India. Built for the world.
        </p>
      </>
    ),
  },
  {
    type: "qa",
    question: "What is Readzio?",
    answer:
      "Readzio is a real-time reading and discussion platform where ideas are not just published, but discussed, voted on, and improved together.",
    keywords: "real-time platform, discussion, voting, ideas",
  },
  {
    type: "qa",
    question: "What can you do on Readzio?",
    answer:
      "You can write ideas, read posts, join live discussions, vote in polls, bookmark content, and share opinions while others are online.",
    keywords: "write ideas, polls, live discussions, bookmarks",
  },
  {
    type: "qa",
    question: "How is Readzio different from blogs or forums?",
    answer:
      "Unlike traditional platforms, Readzio is built for interaction—real-time comments, polls inside posts, visible feedback, and active discussions.",
    keywords: "interactive platform, real-time comments, feedback",
  },
  {
    type: "qa",
    question: "Why are polls and voting important on Readzio?",
    answer:
      "Polls and voting turn opinions into signals, helping ideas grow through collective feedback instead of silent views.",
    keywords: "polls, voting, feedback, opinions",
  },
  {
    type: "qa",
    question: "Who is Readzio built for?",
    answer:
      "Readzio is built for thinkers, writers, readers, and communities who want ideas to evolve through conversation, not isolation.",
    keywords: "writers, readers, thinkers, communities",
  },
];

const floatingIcons = [
  {
    Icon: PenTool,
    color: "text-yellow-400 dark:text-yellow-300",
    position: "top-[20%] left-[10%]",
    animation: "float-icon-1",
    delay: "0s",
    duration: "25s",
  },
  {
    Icon: BookOpen,
    color: "text-pink-400 dark:text-pink-300",
    position: "top-[20%] left-[10%]",
    animation: "float-icon-2",
    delay: "3s",
    duration: "28s",
  },
  {
    Icon: Sparkles,
    color: "text-blue-400 dark:text-blue-300",
    position: "top-[20%] left-[10%]",
    animation: "float-icon-3",
    delay: "6s",
    duration: "26s",
  },
  {
    Icon: Heart,
    color: "text-red-400 dark:text-red-300",
    position: "top-[20%] left-[10%]",
    animation: "float-icon-4",
    delay: "2s",
    duration: "27s",
  },
  {
    Icon: MessageCircle,
    color: "text-purple-400 dark:text-purple-300",
    position: "top-[20%] left-[10%]",
    animation: "float-icon-5",
    delay: "5s",
    duration: "24s",
  },
  {
    Icon: TrendingUp,
    color: "text-green-400 dark:text-green-300",
    position: "top-[20%] left-[10%]",
    animation: "float-icon-6",
    delay: "8s",
    duration: "29s",
  },
  {
    Icon: Users,
    color: "text-cyan-400 dark:text-cyan-300",
    position: "top-[20%] left-[10%]",
    animation: "float-icon-7",
    delay: "4s",
    duration: "26.5s",
  },
  {
    Icon: Zap,
    color: "text-orange-400 dark:text-orange-300",
    position: "top-[20%] left-[10%]",
    animation: "float-icon-8",
    delay: "7s",
    duration: "25.5s",
  },
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState("next");
  const [iconsVisible, setIconsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection("next");
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    // Show icons after 1 second delay
    const iconTimer = setTimeout(() => {
      setIconsVisible(true);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(iconTimer);
    };
  }, []);

  const goToSlide = (idx) => {
    setDirection(idx > currentSlide ? "next" : "prev");
    setCurrentSlide(idx);
  };

  return (
    <>
      <style>{`
        @keyframes float-icon-1 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate(calc(80vw - 100px), 0) rotate(90deg); }
          50% { transform: translate(calc(80vw - 100px), calc(70vh - 100px)) rotate(180deg); }
          75% { transform: translate(0, calc(70vh - 100px)) rotate(270deg); }
          100% { transform: translate(0, 0) rotate(360deg); opacity: 1; }
        }

        @keyframes float-icon-2 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate(0, calc(70vh - 100px)) rotate(-90deg); }
          50% { transform: translate(calc(80vw - 100px), calc(70vh - 100px)) rotate(-180deg); }
          75% { transform: translate(calc(80vw - 100px), 0) rotate(-270deg); }
          100% { transform: translate(0, 0) rotate(-360deg); opacity: 1; }
        }

        @keyframes float-icon-3 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate(calc(40vw - 50px), calc(-30vh)) rotate(120deg); }
          50% { transform: translate(calc(80vw - 100px), 0) rotate(240deg); }
          75% { transform: translate(calc(40vw - 50px), calc(70vh - 100px)) rotate(360deg); }
          100% { transform: translate(0, 0) rotate(480deg); opacity: 1; }
        }

        @keyframes float-icon-4 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate(calc(80vw - 100px), calc(35vh - 50px)) rotate(-120deg); }
          50% { transform: translate(calc(40vw - 50px), calc(70vh - 100px)) rotate(-240deg); }
          75% { transform: translate(0, calc(35vh - 50px)) rotate(-360deg); }
          100% { transform: translate(0, 0) rotate(-480deg); opacity: 1; }
        }

        @keyframes float-icon-5 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate(calc(60vw - 75px), 0) rotate(80deg); }
          50% { transform: translate(calc(80vw - 100px), calc(50vh - 75px)) rotate(160deg); }
          75% { transform: translate(calc(20vw - 25px), calc(70vh - 100px)) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(320deg); opacity: 1; }
        }

        @keyframes float-icon-6 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate(calc(20vw - 25px), calc(70vh - 100px)) rotate(-100deg); }
          50% { transform: translate(calc(80vw - 100px), calc(50vh - 75px)) rotate(-200deg); }
          75% { transform: translate(calc(60vw - 75px), 0) rotate(-300deg); }
          100% { transform: translate(0, 0) rotate(-400deg); opacity: 1; }
        }

        @keyframes float-icon-7 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate(calc(50vw - 62.5px), 0) rotate(110deg); }
          50% { transform: translate(calc(80vw - 100px), calc(35vh - 50px)) rotate(220deg); }
          75% { transform: translate(calc(30vw - 37.5px), calc(70vh - 100px)) rotate(330deg); }
          100% { transform: translate(0, 0) rotate(440deg); opacity: 1; }
        }

        @keyframes float-icon-8 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          5% { opacity: 1; }
          25% { transform: translate(calc(30vw - 37.5px), calc(70vh - 100px)) rotate(-85deg); }
          50% { transform: translate(calc(80vw - 100px), calc(35vh - 50px)) rotate(-170deg); }
          75% { transform: translate(calc(50vw - 62.5px), 0) rotate(-255deg); }
          100% { transform: translate(0, 0) rotate(-340deg); opacity: 1; }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        @keyframes move-star {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100px, 100px); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }

        @keyframes rainbow-loop {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .star {
          position: absolute;
          width: 2px;
          height: 2px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
          animation: twinkle 3s ease-in-out infinite;
        }

        .star:nth-child(1) { top: 10%; left: 20%; animation-delay: 0s, 0s; animation-name: twinkle, move-star; animation-duration: 2s, 15s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(2) { top: 20%; left: 80%; animation-delay: 0.5s, 2s; animation-name: twinkle, move-star; animation-duration: 3s, 20s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(3) { top: 30%; left: 40%; animation-delay: 1s, 4s; animation-name: twinkle, move-star; animation-duration: 2.5s, 18s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(4) { top: 50%; left: 60%; animation-delay: 1.5s, 6s; animation-name: twinkle, move-star; animation-duration: 3.5s, 22s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(5) { top: 60%; left: 10%; animation-delay: 2s, 8s; animation-name: twinkle, move-star; animation-duration: 2.8s, 16s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(6) { top: 70%; left: 90%; animation-delay: 2.5s, 10s; animation-name: twinkle, move-star; animation-duration: 3.2s, 19s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(7) { top: 15%; left: 50%; animation-delay: 0.3s, 3s; animation-name: twinkle, move-star; animation-duration: 2.3s, 17s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(8) { top: 80%; left: 30%; animation-delay: 1.8s, 5s; animation-name: twinkle, move-star; animation-duration: 3.8s, 21s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(9) { top: 40%; left: 70%; animation-delay: 0.8s, 7s; animation-name: twinkle, move-star; animation-duration: 2.6s, 23s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(10) { top: 90%; left: 50%; animation-delay: 2.2s, 9s; animation-name: twinkle, move-star; animation-duration: 3.3s, 20s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(11) { top: 25%; left: 15%; animation-delay: 1.2s, 11s; animation-name: twinkle, move-star; animation-duration: 2.9s, 18s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(12) { top: 55%; left: 85%; animation-delay: 0.6s, 12s; animation-name: twinkle, move-star; animation-duration: 3.1s, 22s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(13) { top: 35%; left: 25%; animation-delay: 1.4s, 13s; animation-name: twinkle, move-star; animation-duration: 2.7s, 19s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(14) { top: 75%; left: 65%; animation-delay: 0.9s, 14s; animation-name: twinkle, move-star; animation-duration: 3.4s, 21s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(15) { top: 45%; left: 45%; animation-delay: 2.3s, 15s; animation-name: twinkle, move-star; animation-duration: 2.4s, 17s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(16) { top: 65%; left: 75%; animation-delay: 1.7s, 16s; animation-name: twinkle, move-star; animation-duration: 3.6s, 24s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(17) { top: 85%; left: 20%; animation-delay: 0.4s, 17s; animation-name: twinkle, move-star; animation-duration: 2.2s, 20s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(18) { top: 12%; left: 65%; animation-delay: 1.1s, 18s; animation-name: twinkle, move-star; animation-duration: 3.7s, 23s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(19) { top: 48%; left: 35%; animation-delay: 2.1s, 19s; animation-name: twinkle, move-star; animation-duration: 2.5s, 16s; animation-iteration-count: infinite, infinite; }
        .star:nth-child(20) { top: 72%; left: 55%; animation-delay: 1.6s, 20s; animation-name: twinkle, move-star; animation-duration: 3.9s, 25s; animation-iteration-count: infinite, infinite; }

        .orb-1 {
          animation: pulse-glow 6s ease-in-out infinite;
        }

        .orb-2 {
          animation: pulse-glow 7s ease-in-out infinite 1s;
        }

        .orb-3 {
          animation: pulse-glow 8s ease-in-out infinite 2s;
        }

        .slide-content.slide-next {
          animation: slide-in-right 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .slide-content.slide-prev {
          animation: slide-in-left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .title-animate {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .logo-shimmer {
          background: linear-gradient(
            90deg,
            #ef4444 0%,
            #f97316 12.5%,
            #eab308 25%,
            #84cc16 37.5%,
            #22c55e 50%,
            #06b6d4 62.5%,
            #3b82f6 75%,
            #8b5cf6 87.5%,
            #ef4444 100%
          );
          background-size: 400% 400%;
          animation: rainbow-loop 6s linear infinite;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .dot-indicator {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dot-indicator.active {
          transform: scale(1.3);
        }

        .dot-indicator:hover {
          transform: scale(1.15);
        }

        .gradient-border {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%);
          background-size: 200% 200%;
          animation: gradient-flow 4s ease infinite;
        }

        .rainbow-border {
          background: linear-gradient(
            90deg,
            #ef4444 0%,
            #f97316 12.5%,
            #eab308 25%,
            #84cc16 37.5%,
            #22c55e 50%,
            #06b6d4 62.5%,
            #3b82f6 75%,
            #8b5cf6 87.5%,
            #ef4444 100%
          );
          background-size: 400% 400%;
          animation: rainbow-loop 6s linear infinite;
          margin-bottom: -0.25rem;
        }

        @media (min-width: 640px) {
          .rainbow-border {
            margin-bottom: -0.5rem;
          }
        }
      `}</style>

      <section
        className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 min-h-[200px] sm:min-h-[250px] md:min-h-[300px] flex flex-col justify-center items-center px-4 sm:px-6 md:px-10 py-10 sm:py-14 overflow-hidden"
        aria-label="Readzio Hero Section"
        role="banner"
      >
        {/* SEO: Hidden H1 for crawlers */}
        <div className="sr-only">
          <p>
            Readzio - Real-time Reading and Discussion Platform for Ideas,
            Feedback, and Polls
          </p>
          <p>
            Write ideas, get feedback, vote in polls, and join live discussions
            on Readzio. A platform where ideas are read, discussed, and improved
            together in real-time.
          </p>
        </div>

        {/* Decorative Orbs */}
        <div
          className="orb-1 absolute top-6 left-6 sm:top-10 sm:left-10 w-16 sm:w-24 h-16 sm:h-24 bg-pink-400/40 dark:bg-pink-500/30 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="orb-2 absolute bottom-10 right-6 sm:bottom-20 sm:right-20 w-20 sm:w-32 h-20 sm:h-32 bg-indigo-400/40 dark:bg-indigo-500/30 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 sm:w-48 h-32 sm:h-48 bg-yellow-300/20 dark:bg-yellow-500/20 rounded-full blur-3xl"
          aria-hidden="true"
        />

        {/* Moving Stars (Dark Mode Only) */}
        <div
          className="hidden dark:block absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          {[...Array(20)].map((_, i) => (
            <div key={i} className="star" />
          ))}
        </div>

        {/* Floating Icons - Hidden at start, slow animation */}
        {iconsVisible && (
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            {floatingIcons.map(
              ({ Icon, color, position, animation, delay, duration }, idx) => (
                <div
                  key={idx}
                  className={`absolute ${position}`}
                  style={{
                    animation: `${animation} ${duration} ease-in-out infinite`,
                    animationDelay: delay,
                  }}
                >
                  <Icon
                    className={`${color} w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 opacity-30 sm:opacity-40 md:opacity-50 dark:opacity-40 dark:sm:opacity-50 dark:md:opacity-60 drop-shadow-lg`}
                    strokeWidth={1.5}
                  />
                </div>
              )
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-2xl sm:max-w-3xl text-center z-10 relative">
          {/* Slider Content */}
          <div className="min-h-[250px] sm:min-h-[280px] md:min-h-[320px] flex items-center justify-center">
            <article
              key={currentSlide}
              className={`slide-content slide-${direction}`}
            >
              {slides[currentSlide].type === "main" ? (
                <header className="title-animate">
                  {slides[currentSlide].content}
                </header>
              ) : (
                <>
                  <h2 className="text-2xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 bg-clip-text text-transparent py-6 mb-1 sm:mb-2">
                    {slides[currentSlide].question}
                  </h2>
                  <p className="text-lg sm:text-xl md:text-2xl text-slate-700 dark:text-slate-300 leading-relaxed max-w-md sm:max-w-xl mx-auto">
                    {slides[currentSlide].answer}
                  </p>
                </>
              )}
            </article>
          </div>

          {/* Dot Indicators */}
          <nav
            className="flex gap-3 mt-6 justify-center"
            aria-label="Slide navigation"
          >
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`dot-indicator rounded-full transition-all ${
                  idx === currentSlide
                    ? "active p-0.5 gradient-border"
                    : "bg-slate-300/60 dark:bg-slate-600/60 hover:bg-slate-400 dark:hover:bg-slate-500 w-3 h-3"
                }`}
                aria-label={`Go to slide ${idx + 1}: ${
                  slides[idx].type === "main"
                    ? "Main content"
                    : slides[idx].question
                }`}
                aria-current={idx === currentSlide ? "true" : "false"}
              >
                {idx === currentSlide && (
                  <div className="w-2.5 h-2.5 bg-white dark:bg-slate-900 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
      </section>
    </>
  );
};

export default HeroSection;
