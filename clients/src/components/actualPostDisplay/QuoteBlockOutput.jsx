import React from "react";

const QuoteBlockOutput = ({ text, author }) => {
  return (
    <blockquote
      className="
        relative max-w-3xl mx-auto my-12 px-8 py-6
        bg-white
        border-l-8 border-teal-400
        rounded-r-3xl rounded-tl-xl rounded-bl-xl
        shadow-md
        font-serif text-lg text-gray-800 leading-relaxed
        before:absolute before:content-[''] before:left-0 before:top-1/2 before:-translate-y-1/2 before:-translate-x-full
        before:border-[15px] before:border-transparent before:border-r-teal-400
      "
      aria-label="Quote"
    >
      <p className="mb-4">“{text}”</p>
      {author && (
        <footer className="text-right text-teal-600 font-semibold text-base mt-3">
          — {author}
        </footer>
      )}
    </blockquote>
  );
};

export default QuoteBlockOutput;





// standard one always
// import React from "react";

// const QuoteBlockOutput = ({ text, author }) => {
//   return (
//     <blockquote
//       className="
//         relative max-w-3xl mx-auto my-8 px-8 py-6 
//         bg-white
//         border-l-8 border-slate-400 rounded-xl
//         shadow-md
//         font-serif text-lg text-gray-800 leading-relaxed
//       "
//       aria-label="Quote"
//     >
//       {/* Decorative large quote mark */}
//       <span
//         className="
//           absolute top-2 left-4 text-slate-300
//           text-8xl select-none -z-10 opacity-20
//           font-serif
//         "
//         aria-hidden="true"
//       >
//         &ldquo;
//       </span>

//       <p className="mb-4">{text}</p>

//       {author && (
//         <footer className="text-right text-slate-600 font-semibold text-base mt-2">
//           — {author}
//         </footer>
//       )}
//     </blockquote>
//   );
// };

// export default QuoteBlockOutput;
