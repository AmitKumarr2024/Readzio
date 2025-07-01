import { SENDER_EMAIL } from "../config/dotenv.js";
import { NOTIFICATION_TEMPLATE } from "../config/emailTemplate.js";
import { replacePlaceholders } from "../Utils/emailTemplateHelper.js";

export const createMailOption = ({
  to,
  subject,
  name = "User",
  email,
  message,
  hasButton = false,
  buttonText = "",
  buttonUrl = "",
}) => ({
  from: SENDER_EMAIL,
  to,
  subject,
  html: replacePlaceholders(NOTIFICATION_TEMPLATE, {
    subject,
    name,
    email,
    message,
    hasButton,
    buttonText,
    buttonUrl,
  }),
});

export default createMailOption;