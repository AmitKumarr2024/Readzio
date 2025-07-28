// BankDashboard.js
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createBankDetails,
  updateBankDetails,
  viewBankDetails,
  deleteBankDetails,
  clearMessages,
} from "../../../../../store/bankSlice";
import {toast} from "react-hot-toast";
import { motion } from "framer-motion";
import TabNavigation from "./TabNavigation";
import BankForm from "./BankForm";
import ViewBankDetails from "./ViewBankDetails";
import DeleteBankDetails from "./DeleteBankDetails";
import DeleteModal from "./DeleteModal";

const BankDashboard = () => {
  const dispatch = useDispatch();
  const { bankDetailsByUser, loading, error, successMessage } = useSelector(
    (state) => state.banks || {}
  );
  const userId = useSelector((state) => state.auth?.user?._id);

  const bankDetails = bankDetailsByUser[userId] || null;

  const [activeTab, setActiveTab] = useState("create");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    payoutMethod: "bank",
    bankAccount: { name: "", account_number: "", ifsc_code: "" },
    cardDetails: {
      cardName: "",
      card_number: "4242-4242-4242-4242",
      expiry: "",
      cardType: "Visa",
    },
  });
  const [paymentId, setPaymentId] = useState(bankDetails?.paymentId || null);
  const [errors, setErrors] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (["view", "update", "delete"].includes(activeTab) && userId && userId !== "null") {
      dispatch(viewBankDetails(userId));
    }
  }, [activeTab, userId, dispatch]);

  useEffect(() => {
    if (bankDetails) {
      setPaymentId(bankDetails.paymentId);
      setFormData({
        name: bankDetails.contactData?.name || "",
        email: bankDetails.contactData?.email || "",
        contact: bankDetails.contactData?.contact || "",
        payoutMethod: bankDetails.payoutMethod || "bank",
        bankAccount: {
          name: bankDetails.fundAccount?.bank_account?.name || "",
          account_number: bankDetails.fundAccount?.bank_account?.account_number || "",
          ifsc_code: bankDetails.fundAccount?.bank_account?.ifsc || "",
        },
        cardDetails: {
          cardName: bankDetails.fundAccount?.card?.name || "",
          card_number: bankDetails.fundAccount?.card?.card_number || "4242-4242-4242-4242",
          expiry: bankDetails.fundAccount?.card?.expiry || "",
          cardType: bankDetails.fundAccount?.card?.cardType || "Visa",
        },
      });
    } else {
      setPaymentId(null);
      if (activeTab === "update") {
        setActiveTab("create");
        toast.error("No bank details found. Please create bank details first.");
      }
    }
  }, [bankDetails, activeTab]);

  const isValidCardNumber = (number) => {
    const cleanNumber = number.replace(/[-\s]/g, "");
    if (!/^\d{13,19}$/.test(cleanNumber)) return false;
    let sum = 0;
    let isEven = false;
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  };

  const detectCardType = (number) => {
    const cleanNumber = number.replace(/[-\s]/g, "");
    if (/^4/.test(cleanNumber)) return "Visa";
    if (/^5[1-5]/.test(cleanNumber)) return "MasterCard";
    if (/^3[47]/.test(cleanNumber)) return "Amex";
    if (/^6(?:011|5)/.test(cleanNumber)) return "Discover";
    return null;
  };

  const isValidExpiry = (expiry) => {
    if (!/^\d{2}\/\d{4}$/.test(expiry)) return false;
    const [month, year] = expiry.split("/").map(Number);
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const expiryDate = new Date(year, month - 1, 1);
    return expiryDate >= now;
  };

  const isValidAccountNumber = (number) => /^\d{8,18}$/.test(number);

  const isValidIFSC = (code) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(code);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Valid email is required";
    if (!formData.contact || !/^\d{10}$/.test(formData.contact))
      newErrors.contact = "Valid 10-digit contact is required";

    if (formData.payoutMethod === "bank") {
      if (!formData.bankAccount.name)
        newErrors["bankAccount.name"] = "Account name is required";
      if (
        !formData.bankAccount.account_number ||
        !isValidAccountNumber(formData.bankAccount.account_number)
      ) {
        newErrors["bankAccount.account_number"] =
          "Valid account number (8-18 digits) is required";
      }
      if (
        !formData.bankAccount.ifsc_code ||
        !isValidIFSC(formData.bankAccount.ifsc_code)
      ) {
        newErrors["bankAccount.ifsc_code"] = "Valid IFSC code is required";
      }
    } else if (formData.payoutMethod === "card") {
      if (!formData.cardDetails.cardName)
        newErrors["cardDetails.cardName"] = "Cardholder name is required";
      if (
        !formData.cardDetails.card_number ||
        !isValidCardNumber(formData.cardDetails.card_number)
      ) {
        newErrors["cardDetails.card_number"] = "Valid card number is required";
      } else {
        const detectedType = detectCardType(formData.cardDetails.card_number);
        if (detectedType && detectedType !== formData.cardDetails.cardType) {
          newErrors[
            "cardDetails.cardType"
          ] = `Card type must be ${detectedType}`;
        }
      }
      if (
        !formData.cardDetails.expiry ||
        !isValidExpiry(formData.cardDetails.expiry)
      ) {
        newErrors["cardDetails.expiry"] =
          "Valid expiry date (MM/YYYY) is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === "cardDetails.card_number") {
      const cleanValue = value.replace(/[-\s]/g, "");
      formattedValue = cleanValue.replace(/(\d{4})(?=\d)/g, "$1-").slice(0, 19);
    }

    if (name.includes("bankAccount.")) {
      const field = name.split(".")[1];
      setFormData({
        ...formData,
        bankAccount: { ...formData.bankAccount, [field]: formattedValue },
      });
    } else if (name.includes("cardDetails.")) {
      const field = name.split(".")[1];
      setFormData({
        ...formData,
        cardDetails: { ...formData.cardDetails, [field]: formattedValue },
      });
    } else {
      setFormData({ ...formData, [name]: formattedValue });
    }
  };

  useEffect(() => {
    validateForm();
  }, [formData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix form errors");
      return;
    }
    const payload = {
      name: formData.name,
      email: formData.email,
      contact: formData.contact,
      payoutMethod: formData.payoutMethod,
      ...(formData.payoutMethod === "bank" && {
        bankAccount: formData.bankAccount,
      }),
      ...(formData.payoutMethod === "card" && {
        cardDetails: formData.cardDetails,
      }),
    };

    if (activeTab === "create") {
      dispatch(createBankDetails(payload));
    } else if (activeTab === "update") {
      if (!paymentId || paymentId === "null") {
        toast.error("No bank details found to update. Please create bank details first.");
        setActiveTab("create");
        return;
      }
      dispatch(updateBankDetails({ id: paymentId, bankData: payload }));
    }
  };

  const handleDelete = () => {
    if (!paymentId || paymentId === "null") {
      toast.error("No bank details found to delete. Please create bank details first.");
      setShowDeleteModal(false);
      setActiveTab("create");
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!paymentId || paymentId === "null") {
      toast.error("No bank details found to delete.");
      setShowDeleteModal(false);
      setActiveTab("create");
      return;
    }
    dispatch(deleteBankDetails(paymentId));
    setShowDeleteModal(false);
    setActiveTab("create");
  };

  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(clearMessages());
    }
    if (error) {
      toast.error(typeof error === "string" ? error : "Something went wrong");
      dispatch(clearMessages());
    }
  }, [successMessage, error, dispatch]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="max-h-full p-4 sm:p-6 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark  animate-gradient-x w-full max-w-full overflow-x-hidden">
      <motion.div
        className="w-full max-w-7xl rounded-3xl shadow-2xl p-1 bg-background-light dark:bg-background-dark  backdrop-blur-xl"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="relative bg-gradient-to-r from-indigo-500 to-purple-500 p-1 rounded-3xl">
          <div className="p-4 sm:p-8 rounded-3xl bg-background-light dark:bg-background-dark ">
            <motion.h2
              className="text-2xl sm:text-4xl text-center py-10 font-extrabold  text-text-main-light dark:text-text-main-dark bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {activeTab === "create"
                ? "Create Bank Details"
                : activeTab === "update"
                ? "Update Bank Details"
                : activeTab === "view"
                ? "View Bank Details"
                : "Delete Bank Details"}
            </motion.h2>
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} paymentId={paymentId} />
            {activeTab === "create" || activeTab === "update" ? (
              <BankForm
                activeTab={activeTab}
                formData={formData}
                errors={errors}
                loading={loading}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
              />
            ) : activeTab === "view" ? (
              <ViewBankDetails
                bankDetails={bankDetails}
                loading={loading}
                copyToClipboard={copyToClipboard}
              />
            ) : activeTab === "delete" ? (
              <DeleteBankDetails
                paymentId={paymentId}
                loading={loading}
                handleDelete={handleDelete}
              />
            ) : null}
            <DeleteModal
              showDeleteModal={showDeleteModal}
              paymentId={paymentId}
              setShowDeleteModal={setShowDeleteModal}
              confirmDelete={confirmDelete}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BankDashboard;