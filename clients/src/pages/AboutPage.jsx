import React from "react";
import { Helmet } from "react-helmet";

const AboutPage = () => {
  return (
    <>
      <Helmet>
        <title>About This Blog | Amit's MERN Blog</title>
        <meta
          name="description"
          content="Learn about Amit, the founder and sole developer of this MERN stack blog focused on delivering SEO-friendly content and dynamic user experience."
        />
        <meta property="og:title" content="About This Blog | Amit's MERN Blog" />
        <meta
          property="og:description"
          content="Discover the story behind this blog created by Amit, a passionate full-stack MERN developer."
        />
      </Helmet>

      <div className="min-h-[600px] bg-gray-100 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-2xl rounded-2xl p-8 sm:p-12 transition-transform hover:scale-[1.02]">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">About This Blog</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Welcome to our blog – a space where insightful stories meet modern design.
              This platform is built using the powerful MERN stack and focuses on delivering
              high-quality, SEO-friendly content across categories. Whether you're here to
              read trending articles, share your voice, or explore thoughtful perspectives,
              this blog is designed to offer a smooth, responsive, and interactive experience.
            </p>

            <p className="text-lg text-gray-600 mt-6 leading-relaxed">
              From clean UI elements to dynamic post interactions like nested comments and
              real-time previews, everything is crafted to enhance both reader and writer journeys.
              Stay tuned for regular updates and feel free to contribute, comment, and connect.
            </p>

            <p className="text-lg text-gray-600 mt-6 leading-relaxed font-semibold">
              This blog is developed and maintained solely by Amit, a passionate full-stack MERN developer and the founder of this app.
              Every feature and detail reflects my dedication and commitment to creating a quality platform for readers and writers alike.
            </p>

            <div className="mt-8 border-t pt-6 text-sm text-gray-500">
              Built with ❤️ by Amit | Powered by MERN Stack
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutPage;
