import React from 'react';
import { Link } from 'react-router-dom'; // ✅ Step 1: Import Link

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 pt-28 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-10">
        <h1 className="text-3xl font-semibold text-gray-800 mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-6">
          Effective Date: May 24, 2025
        </p>

        <div className="space-y-6 text-gray-700 text-base leading-relaxed">
          <p>
            This blog is created and maintained by an independent developer (Amit) for informational and
            educational purposes. I respect your privacy and am committed to protecting your personal information.
          </p>

          <h2 className="text-xl font-semibold">1. Information I Collect</h2>
          <p>
            I do not collect any personal data unless you voluntarily submit it via the contact form.
            In that case, your name, email, and message are only used for communication purposes and are not stored
            or shared with third parties.
          </p>

          <h2 className="text-xl font-semibold">2. Cookies</h2>
          <p>
            This site may use basic cookies or analytics tools to understand visitor trends and improve user experience.
            No personally identifiable information is stored or tracked intentionally.
          </p>

          <h2 className="text-xl font-semibold">3. Embedded Content & Links</h2>
          <p>
            Posts on this blog may include embedded content (e.g., videos, images, articles). Such content behaves the
            same as if you visited the source website and may use their own cookies or tracking.
          </p>

          <h2 className="text-xl font-semibold">4. Your Rights</h2>
          <p>
            If you’ve submitted your information via the contact form and wish to delete it, you may request that by
            emailing me directly.
          </p>

          <h2 className="text-xl font-semibold">5. Updates</h2>
          <p>
            This privacy policy may be updated occasionally to reflect changes in functionality or third-party tools.
            Please check back for updates.
          </p>

          <h2 className="text-xl font-semibold">6. Contact</h2>
          <p>
            If you have any questions about this policy, feel free to reach out at{' '}
            <span className="text-blue-600">amit@example.com</span>.
          </p>

          {/* ✅ Step 2: Add Terms & Conditions link */}
          <p>
            For more information, please also read our{' '}
            <Link to="/Term&Condition" className="text-blue-600 underline">
              Terms and Conditions
            </Link>.
          </p>
        </div>

        <div className="mt-10 text-sm text-gray-400 text-center">
          © {new Date().getFullYear()} Amit's Blog. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
