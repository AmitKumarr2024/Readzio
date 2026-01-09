import React from "react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.3,
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.8 } },
};

const HeroSection = () => {
  return (
    <section
      className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 
      dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 
      min-h-[200px] sm:min-h-[250px] md:min-h-[300px] 
      flex flex-col justify-center items-center px-4 sm:px-6 md:px-10 py-10 sm:py-14
      overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute top-6 left-6 sm:top-10 sm:left-10 
           w-16 sm:w-24 h-16 sm:h-24 bg-pink-400/40 dark:bg-pink-500/30
           rounded-full animate-pulse blur-3xl"
      ></div>

      <div
        aria-hidden="true"
        className="absolute bottom-10 right-6 sm:bottom-20 sm:right-20 
        w-20 sm:w-32 h-20 sm:h-32 bg-indigo-400/40 dark:bg-indigo-500/30 
        rounded-full animate-pulse blur-3xl"
      ></div>

      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-32 sm:w-48 h-32 sm:h-48 bg-yellow-300/20 dark:bg-yellow-500/20 
        rounded-full blur-3xl"
      ></div>

      <motion.div
        className="max-w-2xl sm:max-w-3xl text-center z-10 relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold mb-4 sm:mb-6 leading-tight">
          <span className="text-slate-800 dark:text-slate-100" translate="no">
            Welcome to{" "}
          </span>
          <motion.span
            className="text-yellow-500 dark:text-yellow-400 relative inline-block notranslate"
            translate="no"
            lang="en"
            aria-label="readzio logo"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            readzio
            <span
              className="absolute bottom-0 left-0 w-full h-1 sm:h-1.5 
              bg-yellow-500 dark:bg-yellow-400 -mb-1 sm:-mb-2"
            ></span>
          </motion.span>
        </h1>

        <motion.p
          className="text-base sm:text-lg md:text-2xl max-w-md sm:max-w-xl mx-auto 
          text-slate-700 dark:text-slate-300 leading-relaxed"
          variants={itemVariants}
        >
          A real-time space where ideas are read, discussed, and improved —
          together.
        </motion.p>

        <motion.p
          className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400"
          variants={itemVariants}
        >
          Write your thoughts. See who’s online. Get instant reactions.
        </motion.p>

        <motion.p
          className="mt-4 text-lg sm:text-xl md:text-2xl font-semibold 
          bg-gradient-to-r from-yellow-600 to-amber-600 
          dark:from-yellow-400 dark:to-amber-400
          bg-clip-text text-transparent"
          variants={itemVariants}
        >
          Born in India. Built for the world.
        </motion.p>
      </motion.div>

      <div
        className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r 
        from-transparent via-yellow-500/50 to-transparent"
      ></div>
    </section>
  );
};

export default HeroSection;

// import React from "react";
// import { motion } from "framer-motion";

// const containerVariants = {
//   hidden: { opacity: 0, y: 20 },
//   visible: {
//     opacity: 1,
//     y: 0,
//     transition: {
//       staggerChildren: 0.3,
//       duration: 0.8,
//       ease: "easeOut",
//     },
//   },
// };

// const itemVariants = {
//   hidden: { opacity: 0, y: 20 },
//   visible: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.8 } },
// };

// const HeroSection = () => {
//   return (
//     <section
//       className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50
//       dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950
//       min-h-[200px] sm:min-h-[250px] md:min-h-[300px]
//       flex flex-col justify-center items-center px-4 sm:px-6 md:px-10 py-10 sm:py-14
//       overflow-hidden"
//     >
//       {/* Animated background orbs */}
//       <div
//         aria-hidden="true"
//         className="absolute top-6 left-6 sm:top-10 sm:left-10
//            w-16 sm:w-24 h-16 sm:h-24 bg-pink-400/40 dark:bg-pink-500/30
//            rounded-full animate-pulse blur-3xl"
//       ></div>

//       <div
//         aria-hidden="true"
//         className="absolute bottom-10 right-6 sm:bottom-20 sm:right-20
//         w-20 sm:w-32 h-20 sm:h-32 bg-indigo-400/40 dark:bg-indigo-500/30
//         rounded-full animate-pulse blur-3xl"
//       ></div>

//       <div
//         aria-hidden="true"
//         className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
//         w-32 sm:w-48 h-32 sm:h-48 bg-yellow-300/20 dark:bg-yellow-500/20
//         rounded-full blur-3xl"
//       ></div>

//       <motion.div
//         className="max-w-2xl sm:max-w-3xl text-center z-10 relative"
//         variants={containerVariants}
//         initial="hidden"
//         animate="visible"
//       >
//         <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold mb-4 sm:mb-6 leading-tight">
//           <span className="text-slate-800 dark:text-slate-100" translate="no">
//             Welcome to{" "}
//           </span>
//           <motion.span
//             className="text-yellow-500 dark:text-yellow-400
//             relative inline-block notranslate"
//             translate="no"
//             lang="en"
//             aria-label="readzio logo"
//             initial={{ scale: 0.9 }}
//             animate={{ scale: 1 }}
//             transition={{ duration: 0.6, ease: "easeOut" }}
//           >
//             readzio
//             <span
//               className="absolute bottom-0 left-0 w-full h-1 sm:h-1.5
//             bg-yellow-500 dark:bg-yellow-400 -mb-1 sm:-mb-2"
//             ></span>
//           </motion.span>
//         </h1>

//         <motion.p
//           className="text-base sm:text-lg md:text-2xl max-w-md sm:max-w-xl mx-auto
//           text-slate-700 dark:text-slate-300 leading-relaxed"
//           variants={itemVariants}
//         >
//           A real-time space where ideas are read, discussed, and improved —
//           together.
//         </motion.p>

//         <motion.p
//           className="mt-4 text-lg sm:text-xl md:text-2xl font-semibold
//           bg-gradient-to-r from-yellow-600 to-amber-600
//           dark:from-yellow-400 dark:to-amber-400
//           bg-clip-text text-transparent"
//           variants={itemVariants}
//         >
//           Born in India. Built for the world.
//         </motion.p>
//       </motion.div>

//       {/* Decorative elements */}
//       <div
//         className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r
//       from-transparent via-yellow-500/50 to-transparent"
//       ></div>
//     </section>
//   );
// };

// export default HeroSection;
