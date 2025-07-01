
export const replacePlaceholders = (template, values) => {
  let result = template
    .replace(/{{subject}}/g, values.subject || '')
    .replace(/{{name}}/g, values.name || 'User')
    .replace(/{{email}}/g, values.email || '')
    .replace(/{{message}}/g, values.message || '')
    .replace(/{{buttonText}}/g, values.buttonText || '')
    .replace(/{{buttonUrl}}/g, values.buttonUrl || '');

  // Handle conditional button rendering
  if (values.hasButton) {
    result = result.replace(/{{#if hasButton}}([\s\S]*?){{\/if}}/, '$1');
  } else {
    result = result.replace(/{{#if hasButton}}[\s\S]*?{{\/if}}/, '');
  }

  return result;
};