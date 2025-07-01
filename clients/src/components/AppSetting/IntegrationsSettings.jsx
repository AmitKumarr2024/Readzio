import React from "react";

const IntegrationsSettings = () => {
  return (
    <div>
      <h2>Integrations</h2>
      <p>Connect third-party services to your blog.</p>
      <ul>
        <li>Google Analytics <button style={{ marginLeft: 10, padding: "4px 8px" }}>Connect</button></li>
        <li>Facebook Pixel <button style={{ marginLeft: 10, padding: "4px 8px" }}>Connect</button></li>
        <li>Mailchimp <button style={{ marginLeft: 10, padding: "4px 8px" }}>Connect</button></li>
      </ul>
    </div>
  );
};

export default IntegrationsSettings;
