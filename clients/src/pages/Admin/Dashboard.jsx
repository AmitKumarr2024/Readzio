import React from "react";

const Dashboard = () => {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Section: Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded p-4">
          <p className="text-sm text-gray-600">Total Posts</p>
          <h2 className="text-2xl font-semibold">123</h2>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-sm text-gray-600">Comments</p>
          <h2 className="text-2xl font-semibold">567</h2>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-sm text-gray-600">Users</p>
          <h2 className="text-2xl font-semibold">34</h2>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-sm text-gray-600">Ad Revenue</p>
          <h2 className="text-2xl font-semibold">$45.23</h2>
        </div>
      </section>

      {/* Section: Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded">Create Post</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded">Manage Users</button>
          <button className="px-4 py-2 bg-yellow-500 text-white rounded">Moderate Comments</button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
