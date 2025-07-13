export const replacePlaceholders = (template, values) => {
  const sanitize = (str) => (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  let result = template
    .replace(/{{subject}}/g, sanitize(values.subject || ''))
    .replace(/{{name}}/g, sanitize(values.name || 'User'))
    .replace(/{{email}}/g, sanitize(values.email || ''))
    .replace(/{{message}}/g, sanitize(values.message || ''))
    .replace(/{{buttonText}}/g, sanitize(values.buttonText || ''))
    .replace(/{{buttonUrl}}/g, sanitize(values.buttonUrl || ''));

  result = values.hasButton
    ? result.replace(/{{#if hasButton}}([\s\S]*?){{\/if}}/, '$1')
    : result.replace(/{{#if hasButton}}[\s\S]*?{{\/if}}/, '');

  return result;
};
