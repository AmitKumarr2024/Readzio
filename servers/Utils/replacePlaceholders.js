import Handlebars from 'handlebars';

export const replacePlaceholders = (template, data) => {
  try {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  } catch (error) {
    throw new Error(`Template rendering failed: ${error.message}`);
  }
};