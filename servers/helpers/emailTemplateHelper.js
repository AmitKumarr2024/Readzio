export const replacePlaceholders = (template, values) => {
  return template
    .replace(/{{subject}}/g, values.subject || '')
    .replace(/{{name}}/g, values.name || 'User')
    .replace(/{{email}}/g, values.email || '')
    .replace(/{{message}}/g, values.message || '')
    .replace(/{{otp}}/g, values.otp || '')
    .replace(/{{supportEmail}}/g, values.supportEmail || '')
    .replace(/{{#if hasButton}}([\s\S]*?){{\/if}}/, (match, content) =>
      values.hasButton ? content : ''
    )
    .replace(/{{#if otp}}([\s\S]*?){{\/if}}/, (match, content) =>
      values.otp ? content : ''
    )
    .replace(/{{#if isResetOtp}}([\s\S]*?){{\/if}}/, (match, content) =>
      values.isResetOtp ? content : '1 hour')
    .replace(/{{buttonText}}/g, values.buttonText || '')
    .replace(/{{buttonUrl}}/g, values.buttonUrl || '');
};