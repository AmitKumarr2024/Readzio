import React, { useState } from "react";
import AccountsSettings from "../components/UserSetting/AccountsSettings";
import UsersSettings from "../components/UserSetting/UsersSettings";
import ProfileSettings from "../components/UserSetting/ProfileSettings";
import BillingSettings from "../components/UserSetting/BillingSettings";
import NotificationsSettings from "../components/UserSetting/NotificationsSettings";
import IntegrationsSettings from "../components/UserSetting/IntegrationsSettings";
import Sidebar from "../components/UserSetting/Sidebar";


const UserSettingsPage = () => {
  const [selected, setSelected] = useState("Accounts");

  const renderContent = () => {
    switch (selected) {
      case "Accounts":
        return <AccountsSettings />;
      case "Users":
        return <UsersSettings />;
      case "Profile":
        return <ProfileSettings />;
      case "Billing":
        return <BillingSettings />;
      case "Notifications":
        return <NotificationsSettings />;
      case "Integrations":
        return <IntegrationsSettings />;
      default:
        return <AccountsSettings />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Source Sans Pro', sans-serif" }}>
      <aside
        style={{
          minWidth: 200,
          borderRight: "1px solid #ddd",
          padding: "20px",
          backgroundColor: "#f9fafb",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Settings</h1>
        <Sidebar selected={selected} onSelect={setSelected} />
      </aside>
      <main style={{ flexGrow: 1, padding: 30, backgroundColor: "white" }}>{renderContent()}</main>
    </div>
  );
};

export default UserSettingsPage;
