import React from "react";

const TitleInput = ({ title, setTitle }) => (
  <section className="mb-6">
    <label className="block mb-2 font-bold text-2xl sm:text-3xl  text-text-main-light dark:text-text-main-dark">Title</label>
    <input
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder="Write your post title here..."
      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg text-text-main-light dark:text-text-main-dark focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
    />
  </section>
);

export default TitleInput;