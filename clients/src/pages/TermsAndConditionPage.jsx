import React from "react";

const TermsAndConditionPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 md:px-20 lg:px-40">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-6 text-gray-900">Terms and Conditions</h1>

        <p className="mb-4 text-gray-700">
          Welcome to MyBlogApp! By using our website and services, you agree to these terms. Please read them carefully.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900">1. Using Our Service</h2>
        <p className="mb-4 text-gray-700">
          You agree to use MyBlogApp only in ways that are legal and fair. Don’t do anything that stops others from using it.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900">2. Your Content</h2>
        <p className="mb-4 text-gray-700">
          You are responsible for what you post. We don’t guarantee that all content is accurate and can remove anything that breaks our rules or the law.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900">3. Content Restrictions</h2>
        <p className="mb-4 text-gray-700">
          To ensure MyBlogApp remains safe and respectful for all users, the following content is not allowed:
        </p>
        <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
          <li>Pornographic or sexually explicit content including images, videos, or written descriptions.</li>
          <li>Gradual or disguised nudity or sexually suggestive content, even if starting with clothed images.</li>
          <li>Sexualized use of public figure images or adult industry actors, unless used respectfully and non-sexually (e.g., journalism).</li>
          <li>Promotion or linking to adult content or pornographic websites.</li>
          <li>Hate speech, threats, harassment, or content promoting violence or discrimination.</li>
          <li>Illegal content, including incitement to violence, drug promotion, or fraud.</li>
        </ul>
        <p className="mb-4 text-gray-700">
          Mature topics (e.g. war, politics, mental health) are allowed for educational or informational purposes with appropriate warnings or blur filters if needed.
        </p>
        <p className="mb-4 text-gray-700">
          We reserve the right to review and remove any content that violates these rules. Repeated violations may result in a permanent ban.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900">4. Our Liability</h2>
        <p className="mb-4 text-gray-700">
          We try to keep MyBlogApp running smoothly, but we aren’t responsible for any problems, like lost data or downtime.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900">5. Privacy</h2>
        <p className="mb-4 text-gray-700">
          Check our Privacy Policy to learn how we handle your personal information.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900">6. Governing Law</h2>
        <p className="mb-4 text-gray-700">
          These terms follow the laws of [Your Country]. If there’s a dispute, it will be handled in courts there.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-900">7. Changes to These Terms</h2>
        <p className="mb-4 text-gray-700">
          We may update these terms sometimes. If you keep using MyBlogApp, it means you accept the new terms.
        </p>

        <p className="mt-10 text-center text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} MyBlogApp. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default TermsAndConditionPage;
