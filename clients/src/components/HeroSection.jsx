import React from "react";

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-r from-slate-400 to-slate-500 text-amber-50 py-6 flex flex-col justify-center items-center">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Welcome to <span className="text-yellow-400">MyyBlog</span>
        </h1>
        <p className="text-lg md:text-xl mb-8">
          Discover articles, personal stories, and insights from developers like you.
        </p>
       
      </div>
    </section>
  );
};

export default HeroSection;
