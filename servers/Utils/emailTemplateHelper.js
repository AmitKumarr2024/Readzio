export const replacePlaceholders = (template, values) => {
  const sanitize = (str) =>
    (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  let result = template
    .replace(/{{subject}}/g, sanitize(values.subject || ""))
    .replace(/{{name}}/g, sanitize(values.name || "User"))
    .replace(/{{email}}/g, sanitize(values.email || ""))
    .replace(/{{message}}/g, sanitize(values.message || ""))
    .replace(/{{otp}}/g, values.otp || "")
    .replace(/{{buttonText}}/g, sanitize(values.buttonText || ""))
    .replace(/{{buttonUrl}}/g, values.buttonUrl || "")
    .replace(/{{supportEmail}}/g, values.supportEmail || "")
    .replace(/{{currentYear}}/g, new Date().getFullYear());

  // Handle conditional blocks
  if (values.hasButton) {
    result = result.replace(/{{#if hasButton}}([\s\S]*?){{\/if}}/g, "$1");
  } else {
    result = result.replace(/{{#if hasButton}}[\s\S]*?{{\/if}}/g, "");
  }

  if (values.otp) {
    result = result.replace(/{{#if otp}}([\s\S]*?){{\/if}}/g, "$1");
  } else {
    result = result.replace(/{{#if otp}}[\s\S]*?{{\/if}}/g, "");
  }

  return result;
};
