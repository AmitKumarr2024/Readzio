import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInvoiceEmail,
  clearError,
} from "../../../store/adminSlice";

const SendEmailForm = () => {
  const dispatch = useDispatch();
  const { sendingEmail, error } = useSelector((state) => state.admin);

  const [formData, setFormData] = useState({
    type: "verification",
    email: "",
    name: "",
    invoiceData: {
      invoiceId: "",
      orderId: "",
      paymentId: "",
      amount: "",
      currency: "INR",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const [success, setSuccess] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("invoice.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        invoiceData: {
          ...prev.invoiceData,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    dispatch(clearError());

    try {
      let result;
      const { email, name, type, invoiceData } = formData;

      switch (type) {
        case "verification":
          result = await dispatch(
            sendVerificationEmail({ email, name })
          ).unwrap();
          break;
        case "welcome":
          result = await dispatch(sendWelcomeEmail({ email, name })).unwrap();
          break;
        case "reset_password":
          result = await dispatch(sendPasswordResetEmail({ email })).unwrap();
          break;
        case "invoice":
          result = await dispatch(
            sendInvoiceEmail({ email, name, invoiceData })
          ).unwrap();
          break;
        default:
          throw new Error("Invalid email type");
      }

      setSuccess("Email sent successfully!");

      // Reset form
      setFormData({
        type: "verification",
        email: "",
        name: "",
        invoiceData: {
          invoiceId: "",
          orderId: "",
          paymentId: "",
          amount: "",
          currency: "INR",
          date: new Date().toISOString().split("T")[0],
        },
      });
    } catch (err) {
      // Error is handled by Redux
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Email</h2>

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => dispatch(clearError())}
                className="text-red-700 hover:text-red-900"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="verification">Email Verification</option>
              <option value="welcome">Welcome Email</option>
              <option value="reset_password">Password Reset</option>
              <option value="invoice">Invoice Email</option>
            </select>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
              required
            />
          </div>

          {/* Name (not required for password reset) */}
          {formData.type !== "reset_password" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
                required
              />
            </div>
          )}

          {/* Invoice Fields */}
          {formData.type === "invoice" && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900">
                Invoice Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice ID
                  </label>
                  <input
                    type="text"
                    name="invoice.invoiceId"
                    value={formData.invoiceData.invoiceId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="INV-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order ID
                  </label>
                  <input
                    type="text"
                    name="invoice.orderId"
                    value={formData.invoiceData.orderId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ORD-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment ID
                  </label>
                  <input
                    type="text"
                    name="invoice.paymentId"
                    value={formData.invoiceData.paymentId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PAY-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    name="invoice.amount"
                    value={formData.invoiceData.amount}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="invoice.currency"
                    value={formData.invoiceData.currency}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="invoice.date"
                    value={formData.invoiceData.date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={sendingEmail}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingEmail ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : (
                "Send Email"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendEmailForm;
