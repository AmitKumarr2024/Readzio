import React from "react";

const TitleInput = ({ title, setTitle }) => (
  <section className="mb-6">
    <label className="block mb-3 font-bold text-gray-700 text-4xl">Title</label>
    <input
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder="Write your post title here..."
      className="w-full border border-gray-300 rounded-lg px-5 py-3 text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
    />
  </section>
);

export default TitleInput;
