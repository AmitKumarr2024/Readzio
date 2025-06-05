import React from "react";

const BillingSettings = () => {
  return (
    <div>
      <h2>Billing Information</h2>
      <p>Manage your subscription and payment methods.</p>
      <form>
        <label>
          Credit Card Number:
          <input type="text" placeholder="•••• •••• •••• ••••" style={{ marginLeft: 8, padding: 4 }} />
        </label>
        <br /><br />
        <label>
          Expiration Date:
          <input type="month" style={{ marginLeft: 8, padding: 4 }} />
        </label>
        <br /><br />
        <label>
          CVV:
          <input type="text" placeholder="123" style={{ marginLeft: 8, padding: 4, width: 50 }} />
        </label>
        <br /><br />
        <button type="submit" style={{ backgroundColor: "#3b82f6", color: "white", padding: "8px 16px", border: "none", borderRadius: 4 }}>
          Update Billing
        </button>
      </form>
    </div>
  );
};

export default BillingSettings;
