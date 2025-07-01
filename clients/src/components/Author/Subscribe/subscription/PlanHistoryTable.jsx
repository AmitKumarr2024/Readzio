import React from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const formatINR = (amountInPaise) =>
  `₹${((amountInPaise ?? 0) / 100).toFixed(2)}`;

const PlanHistoryTable = ({ plans = [], loading = false, error = null }) => {
  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark shadow-2xl rounded-3xl p-8 mb-8 max-w-8xl mx-auto border border-gray-100">
      <h2 className="text-3xl font-extrabold  text-text-main-light dark:text-text-main-dark mb-8 text-center bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
        Subscription Plan History
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-8  text-text-main-light dark:text-text-main-dark">
          <Loader2 className="animate-spin mr-3 h-6 w-6 text-blue-600" />
          Loading...
        </div>
      ) : error ? (
        <div className="bg-background-light dark:bg-background-dark  text-red-600 px-6 py-4 rounded-lg text-center font-medium">
          {error}
        </div>
      ) : plans.length === 0 ? (
        <div className=" text-text-main-light dark:text-text-main-dark text-center py-6 font-medium">
          No plans found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-sm border border-gray-200">
            <thead className="bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark font-semibold">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Type</th>
                <th className="px-6 py-4 whitespace-nowrap">Price (₹)</th>
                <th className="px-6 py-4 whitespace-nowrap">Subscribers</th>
                <th className="px-6 py-4 whitespace-nowrap">Revenue (₹)</th>
                <th className="px-6 py-4 whitespace-nowrap">Created</th>
                <th className="px-6 py-4 whitespace-nowrap">Deleted</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan, index) => (
                <tr
                  key={plan._id}
                  className={`border-t ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-500"
                  } hover:bg-blue-200 text-gray-600 transition-colors duration-200`}
                >
                  <td className="px-6 py-4 font-medium">{plan.name}</td>
                  <td className="px-6 py-4">
                    {plan.deletedAt ? (
                      <span className="text-red-600 font-semibold">Deleted</span>
                    ) : (
                      <span className="text-green-600 font-semibold">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4 capitalize">{plan.type}</td>
                  <td className="px-6 py-4">{formatINR(plan.price)}</td>
                  <td className="px-6 py-4">{plan.totalSubscribers ?? 0}</td>
                  <td className="px-6 py-4">{formatINR(plan.totalRevenue)}</td>
                  <td className="px-6 py-4">
                    {plan.createdAt
                      ? format(new Date(plan.createdAt), "dd MMM yyyy")
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    {plan.deletedAt
                      ? format(new Date(plan.deletedAt), "dd MMM yyyy")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlanHistoryTable;
