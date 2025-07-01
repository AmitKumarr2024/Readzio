import React from "react";

const menuItems = [
  "Accounts",
  "Users",
  "Profile",
  "Billing",
  "Notifications",
  "Integrations",
];

const Sidebar = ({ selected, onSelect }) => {
  return (
    <ul className="sidebar-menu" style={{ listStyle: "none", padding: 0 }}>
      {menuItems.map((item) => (
        <li
          key={item}
          onClick={() => onSelect(item)}
          style={{
            cursor: "pointer",
            padding: "12px 16px",
            borderLeft: selected === item ? "4px solid #3b82f6" : "4px solid transparent",
            backgroundColor: selected === item ? "#e0f2fe" : "transparent",
            fontWeight: selected === item ? "600" : "400",
            color: selected === item ? "#2563eb" : "#374151",
            transition: "all 0.3s",
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
};

export default Sidebar;
