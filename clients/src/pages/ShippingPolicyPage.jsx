import React from "react";
import SpaceBackground from "../Utils/SpaceBackground";

const ShippingPolicyPage = () => {
  return (
    <SpaceBackground>
      <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark py-12 px-6 md:px-20 lg:px-40">
        <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold mb-6">
            Shipping & Delivery Policy
          </h1>

          <p className="mb-4">
            Inkshaa operates as a digital service platform. We do not ship any
            physical products. All our offerings are delivered electronically
            via our website and associated services.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            1. Digital Delivery
          </h2>
          <p className="mb-4">
            Upon successful payment, services such as memberships, tools, and
            content access are provided instantly to your registered account.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            2. Estimated Delivery Time
          </h2>
          <p className="mb-4">
            Access to digital services is immediate. In rare cases of technical
            delays, delivery may take up to <strong>24 hours</strong>.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">
            3. No Physical Shipping
          </h2>
          <p className="mb-4">
            We do not ship any physical goods. If you are expecting a tangible
            product, please note that Inkshaa is a 100% digital service
            platform.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">4. Contact Us</h2>
          <p className="mb-4">
            For delivery-related inquiries, contact us at{" "}
            <a
              href="mailto:support@inkshaa.com"
              className="text-blue-600 underline"
            >
              support@inkshaa.com
            </a>
            .
          </p>

          <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Inkshaa. All rights reserved.
          </p>
        </div>
      </div>
    </SpaceBackground>
  );
};

export default ShippingPolicyPage;
