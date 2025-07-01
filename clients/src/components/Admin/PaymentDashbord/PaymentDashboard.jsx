import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "reselect";
import { motion } from "framer-motion";
import { getAllUsersEarnings, processBulkPayouts, clearError } from "../../../store/adminSlice";
// import { fetchAllAdEarnings } from "../../../store/adsSlice";
import { viewBankDetails, clearBankDetails, clearMessages } from "../../../store/bankSlice";
import axiosInstance from "../../../connection/axiosInstance";
import toast from "react-hot-toast";
import DashboardHeader from "./dashboard components/DashboardHeader";
import DashboardTabs from "./dashboard components/DashboardTabs";
import StatsCards from "./dashboard components/StatsCards";
import SearchFilterControls from "./dashboard components/SearchFilterControls";
import UserEarningsTable from "./dashboard components/UserEarningsTable";
import BankDetailsModal from "./dashboard components/BankDetailsModal";
import PayoutHistoryModal from "./dashboard components/PayoutHistoryModal";
import ReceivedPayments from "./ReceivedPayments";

const selectAdminState = (state) => state.admin || {};
const selectAdsState = (state) => state.ads || {};
const selectBankState = (state) => state.banks || {};

const selectAdmin = createSelector([selectAdminState], (admin) => ({
  userEarnings: admin.userEarnings,
  loading: admin.loading,
  error: admin.error,
}));
const selectAds = createSelector([selectAdsState], (ads) => ({
  adEarnings: ads.adEarnings,
  adsLoading: ads.loading,
  adsError: ads.error,
}));
const selectBank = createSelector([selectBankState], (bank) => ({
  bankDetailsByUser: bank.bankDetailsByUser,
  bankLoading: bank.loading,
  bankError: bank.error,
}));

const PaymentDashboard = () => {
  const dispatch = useDispatch();
  const { userEarnings, loading, error } = useSelector(selectAdmin);
  const { adEarnings, adsLoading, adsError } = useSelector(selectAds);
  const { bankDetailsByUser, bankLoading, bankError } = useSelector(selectBank);
  const [theme] = useState("light");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [payoutAmounts, setPayoutAmounts] = useState({});
  const [editingAmounts, setEditingAmounts] = useState({});
  const [stats, setStats] = useState({ totalEarnings: 0, subscription: 0, ads: 0 });
  const [modalUser, setModalUser] = useState(null);
  const [fetchedBankDetails, setFetchedBankDetails] = useState(null);
  const [checkedUsers, setCheckedUsers] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [payoutHistoryUser, setPayoutHistoryUser] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payoutErrors, setPayoutErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("username");
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeTab, setActiveTab] = useState("payouts");

  useEffect(() => {
    if (activeTab === "payouts") {
      dispatch(getAllUsersEarnings());
      // dispatch(fetchAllAdEarnings());
    }
  }, [dispatch, activeTab]);

  useEffect(() => {
    if (activeTab !== "payouts") return;
    const validEarnings = Array.isArray(userEarnings) ? userEarnings.filter((e) => e.user && e.user._id) : [];
    const validAdEarnings = Array.isArray(adEarnings) ? adEarnings.filter((e) => e.user && e.user._id) : [];
    const adsTotal = validAdEarnings.reduce((sum, e) => sum + (e.totalEarnings || 0), 0);
    setStats({
      totalEarnings: validEarnings.reduce((sum, e) => sum + (e.subscription / 100), 0) + adsTotal,
      subscription: validEarnings.reduce((sum, e) => sum + (e.subscription / 100), 0),
      ads: adsTotal,
    });
    const combinedPayouts = {};
    validAdEarnings.forEach((e) => {
      combinedPayouts[e.user._id] = Number(e.totalEarnings || 0);
    });
    validEarnings.forEach((e) => {
      combinedPayouts[e.user._id] = (
        parseFloat(combinedPayouts[e.user._id] || 0) + (e.subscription / 100)
      ).toFixed(2);
    });
    setPayoutAmounts(combinedPayouts);
    [...validEarnings, ...validAdEarnings].forEach((e) => {
      const userId = e.user._id;
      if (!(userId in checkedUsers)) {
        dispatch(viewBankDetails(userId))
          .unwrap()
          .then((data) => {
            setCheckedUsers((prev) => ({ ...prev, [userId]: !!data?.fundAccount }));
          })
          .catch((err) => {
            setCheckedUsers((prev) => ({ ...prev, [userId]: false }));
            setPayoutErrors((prev) => ({ ...prev, [userId]: "Failed to fetch bank details" }));
          });
      }
    });
  }, [dispatch, userEarnings, adEarnings, checkedUsers, activeTab]);

  useEffect(() => {
    if (modalUser?.userId) {
      setFetchedBankDetails(bankDetailsByUser[modalUser.userId] || null);
    }
  }, [modalUser?.userId, bankDetailsByUser]);

  useEffect(() => {
    if (payoutHistoryUser?.userId) {
      fetchPayoutHistory(payoutHistoryUser.userId);
    }
  }, [payoutHistoryUser]);

  const fetchPayoutHistory = async (userId) => {
    try {
      setHistoryLoading(true);
      const response = await axiosInstance.get(`/payment/records?userId=${userId}`);
      const records = Array.isArray(response?.data?.records) ? response.data.records : [];
      const validStatuses = ["payout_created", "payout_done", "queued", "processed", "rejected"];
      const formattedHistory = records
        .filter((p) => p.userId === userId && validStatuses.includes(p.status))
        .map((p) => ({
          id: p.payoutId || `payout_${Date.now()}`,
          date: p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "Unknown",
          amount: p.amount ? (p.amount / 100).toFixed(2) : "0.00",
          status: p.status || "Unknown",
        }));
      setPayoutHistory(formattedHistory);
    } catch (err) {
      setPayoutHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handlePayoutAmountChange = (userId, amount) => {
    const value = parseFloat(amount);
    if (isNaN(value) || value < 0) return;
    setPayoutAmounts((prev) => ({ ...prev, [userId]: value.toFixed(2) }));
  };

  const toggleEditAmount = (userId) => {
    setEditingAmounts((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleBulkPayout = async () => {
    if (!selectedUsers.length) {
      toast.error("No users selected for payout.");
      return;
    }
    const payouts = [];
    const newErrors = {};
    for (const userId of selectedUsers) {
      try {
        const bankDetails =
          bankDetailsByUser[userId] || (await dispatch(viewBankDetails(userId)).unwrap());
        if (!bankDetails || !bankDetails.fundAccount) {
          newErrors[userId] = "No bank details found";
          setCheckedUsers((prev) => ({ ...prev, [userId]: false }));
          continue;
        }
        const amount = parseFloat(payoutAmounts[userId]);
        if (isNaN(amount) || amount < 1 || amount > 10000) {
          newErrors[userId] = "Amount must be between ₹1 and ₹10,000";
          continue;
        }
        const user =
          (adEarnings.find((e) => e.user?._id === userId)?.user) ||
          (userEarnings.find((e) => e.user?._id === userId)?.user);
        if (!user) {
          newErrors[userId] = "User data not found";
          continue;
        }
        payouts.push({
          userId,
          orderId: `order_${Date.now()}_${userId}`,
          amount,
          name  : bankDetails.contactData?.name || user.username,
          email: bankDetails.contactData?.email || user.email,
          contact: bankDetails.contactData?.contact || "",
          bankAccount:
            bankDetails.fundAccount?.account_type === "bank_account"
              ? {
                  name: bankDetails.fundAccount.bank_account?.name,
                  account_number: bankDetails.fundAccount.bank_account?.account_number,
                  ifsc_code: bankDetails.fundAccount.bank_account?.ifsc,
                }
              : undefined,
          cardDetails:
            bankDetails.fundAccount?.account_type === "card"
              ? {
                  cardName: bankDetails.fundAccount.card?.name,
                  card_number: bankDetails.fundAccount.card?.card_number,
                  expiry: bankDetails.fundAccount.card?.expiry,
                  cardType: bankDetails.cardDetails?.cardType,
                }
              : undefined,
          upiId:
            bankDetails.fundAccount?.account_type === "vpa"
              ? bankDetails.fundAccount.vpa?.address
              : undefined,
          currency: "INR",
          notes: { reason: "Payout for earnings" },
        });
      } catch (err) {
        newErrors[userId] = "Failed to fetch bank details";
        setCheckedUsers((prev) => ({ ...prev, [userId]: false }));
      }
    }
    setPayoutErrors(newErrors);
    if (!payouts.length) {
      toast.error("No valid users with bank details or amounts to process payout.");
      return;
    }
    try {
      await dispatch(processBulkPayouts({ users: payouts })).unwrap();
      toast.success("Payouts processed successfully!");
      setSelectedUsers([]);
      setPayoutAmounts((prev) => {
        const newAmounts = { ...prev };
        payouts.forEach(({ userId }) => delete newAmounts[userId]);
        return newAmounts;
      });
      setEditingAmounts({});
      setPayoutErrors({});
      payouts.forEach(({ userId }) => dispatch(clearBankDetails(userId)));
    } catch (error) {
      setPayoutErrors((prev) => ({
        ...prev,
        ...payouts.reduce(
          (acc, { userId }) => ({
            ...acc,
            [userId]: error.message || "Payout processing failed",
          }),
          {}
        ),
      }));
      toast.error(`Payout failed: ${error.message}`);
    }
  };

  const openModal = (user) => setModalUser(user);
  const closeModal = () => {
    setModalUser(null);
    setFetchedBankDetails(null);
  };
  const openPayoutHistoryModal = (user) => setPayoutHistoryUser(user);
  const closePayoutHistoryModal = () => {
    setPayoutHistoryUser(null);
    setPayoutHistory([]);
  };

  const filteredEarnings = [
    ...(Array.isArray(userEarnings) ? userEarnings : []),
    ...(Array.isArray(adEarnings) ? adEarnings : []),
  ].reduce((acc, e) => {
    if (!e.user || !e.user._id) return acc;
    const userId = e.user._id;
    if (!acc[userId]) {
      acc[userId] = { user: e.user, subscription: 0, ads: 0, total: 0 };
    }
    acc[userId].subscription += e.subscription ? e.subscription / 100 : 0;
    acc[userId].ads += e.totalEarnings || 0;
    acc[userId].total = acc[userId].subscription + acc[userId].ads;
    return acc;
  }, {});
  const filteredEarningsArray = Object.values(filteredEarnings)
    .filter((e) => {
      if (filterStatus === "all") return true;
      const hasBankAccount = checkedUsers[e.user._id];
      if (filterStatus === "present") return hasBankAccount === true;
      if (filterStatus === "none") return hasBankAccount === false;
      if (filterStatus === "notChecked") return !(e.user._id in checkedUsers);
      return true;
    })
    .filter((e) =>
      searchTerm
        ? (e.user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const fieldA = a.user[sortField] ? a.user[sortField].toLowerCase() : '';
      const fieldB = b.user[sortField] ? b.user[sortField].toLowerCase() : '';
      return sortOrder === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-100"
    >
      <div className="max-w-7xl mx-auto">
        <DashboardHeader />
        <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        {activeTab === "payouts" ? (
          <>
            {(error || bankError || adsError || Object.keys(payoutErrors).length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 text-red-800 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-center"
              >
                <div>
                  <span className="font-medium">
                    {error || bankError || adsError || "Payout errors occurred. Check user details."}
                  </span>
                  {Object.keys(payoutErrors).length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {Object.entries(payoutErrors).map(([userId, errMsg]) => (
                        <li key={userId}>User {userId}: {errMsg}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => {
                    dispatch(clearError());
                    dispatch(clearMessages());
                    setPayoutErrors({});
                  }}
                  className="mt-2 sm:mt-0 text-red-600 hover:text-red-800 transition-colors"
                >
                  ✕
                </button>
              </motion.div>
            )}
            {(loading || bankLoading || adsLoading) && (
              <div className="text-center py-12">
                <svg
                  className="w-10 h-10 animate-spin mx-auto text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span className="text-lg font-medium text-blue-600">Loading...</span>
              </div>
            )}
            <StatsCards stats={stats} />
            <SearchFilterControls
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              sortField={sortField}
              setSortField={setSortField}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />
            <UserEarningsTable
              filteredEarningsArray={filteredEarningsArray}
              selectedUsers={selectedUsers}
              handleSelectUser={handleSelectUser}
              payoutAmounts={payoutAmounts}
              handlePayoutAmountChange={handlePayoutAmountChange}
              editingAmounts={editingAmounts}
              toggleEditAmount={toggleEditAmount}
              checkedUsers={checkedUsers}
              openModal={openModal}
              openPayoutHistoryModal={openPayoutHistoryModal}
              handleBulkPayout={handleBulkPayout}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
            />
            {modalUser && (
              <BankDetailsModal
                modalUser={modalUser}
                fetchedBankDetails={fetchedBankDetails}
                bankLoading={bankLoading}
                closeModal={closeModal}
              />
            )}
            {payoutHistoryUser && (
              <PayoutHistoryModal
                payoutHistoryUser={payoutHistoryUser}
                payoutHistory={payoutHistory}
                historyLoading={historyLoading}
                closePayoutHistoryModal={closePayoutHistoryModal}
              />
            )}
          </>
        ) : activeTab === "received" ? (
          <ReceivedPayments />
        ) : (
          <ReceivedPayments defaultStatus="pending" />
        )}
      </div>
    </motion.div>
  );
};

export default PaymentDashboard;