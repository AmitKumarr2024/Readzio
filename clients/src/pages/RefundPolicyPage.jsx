import React from "react";
import SpaceBackground from "../Utils/SpaceBackground";

const RefundPolicyPage = () => {
  return (
    <SpaceBackground>
      <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark py-12 px-6 md:px-20 lg:px-40">
        <div className="max-w-4xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold mb-6">
            Refund & Cancellation Policy
          </h1>

          <p className="mb-4">
            <strong>Amit Kumar</strong> believes in helping its customers as far
            as possible, and has therefore a liberal cancellation policy. Under
            this policy:
          </p>

          <p className="mb-4">
            Cancellations will be considered only if the request is made within{" "}
            <strong>6-8 days</strong> of placing the order. However, the
            cancellation request may not be entertained if the orders have been
            communicated to the vendors/merchants and they have initiated the
            process of shipping them.
          </p>

          <p className="mb-4">
            <strong>Amit Kumar</strong> does not accept cancellation requests
            for perishable items like flowers, eatables, etc. However,
            refund/replacement can be made if the customer establishes that the
            quality of product delivered is not good.
          </p>

          <p className="mb-4">
            In case of receipt of damaged or defective items, please report the
            same to our Customer Service team. The request will be entertained
            once the merchant has checked and determined the same at their own
            end. This should be reported within <strong>6-8 days</strong> of
            receipt of the products.
          </p>

          <p className="mb-4">
            If the product received is not as shown on the site or as per your
            expectations, you must bring it to the notice of our Customer
            Service within <strong>6-8 days</strong> of receiving the product.
            The Customer Service Team will review your complaint and take an
            appropriate decision.
          </p>

          <p className="mb-4">
            For complaints regarding products that come with a warranty from
            manufacturers, please refer the issue to them.
          </p>

          <p className="mb-4">
            Refunds approved by <strong>Amit Kumar</strong> will be processed
            within <strong>9-15 days</strong> to the end customer.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-3">Contact Us</h2>
          <p className="mb-4">
            For any refund or cancellation requests, email us at{" "}
            <a
              href="mailto:support@inkshaa.com"
              className="text-blue-600 underline"
            >
              inksha.official@gmail.com
            </a>{" "}
            or call us at <strong>+91-7634995261</strong>.
          </p>

          <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Amit Kumar. All rights reserved.
          </p>
        </div>
      </div>
    </SpaceBackground>
  );
};

export default RefundPolicyPage;
