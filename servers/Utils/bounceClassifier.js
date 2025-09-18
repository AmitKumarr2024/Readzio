// Pre-compiled bounce classification patterns for performance
const BOUNCE_PATTERNS = {
  hard: [
    {
      pattern: /invalid|not found|no such user|user unknown|recipient unknown/i,
      reason: "invalid_recipient",
    },
    {
      pattern: /does not exist|doesn't exist|non-existent/i,
      reason: "invalid_recipient",
    },
    {
      pattern: /no mailbox|mailbox unavailable|address rejected/i,
      reason: "mailbox_not_found",
    },
    {
      pattern: /invalid recipient|recipient address rejected/i,
      reason: "invalid_recipient",
    },
    {
      pattern: /domain not found|domain does not exist|enotfound/i,
      reason: "invalid_domain",
    },
    {
      pattern: /mx record|no mail server|host not found/i,
      reason: "invalid_domain",
    },
    {
      pattern: /permanent failure|permanently deactivated/i,
      reason: "permanent_failure",
    },
    {
      pattern: /policy violation|blocked|blacklisted/i,
      reason: "blocked_recipient",
    },
    {
      pattern: /sender rejected|sender not authorized/i,
      reason: "sender_blocked",
    },
  ],
  soft: [
    {
      pattern: /mailbox full|quota exceeded|insufficient storage/i,
      reason: "mailbox_full",
    },
    {
      pattern: /temporary failure|try again later|service unavailable/i,
      reason: "temporary_failure",
    },
    {
      pattern: /connection timeout|timed out|timeout/i,
      reason: "connection_timeout",
    },
    { pattern: /rate limit|too many|throttled/i, reason: "rate_limited" },
    {
      pattern: /server busy|server temporarily unavailable/i,
      reason: "server_unavailable",
    },
    { pattern: /greylisting|greylist|delayed/i, reason: "greylisted" },
    { pattern: /dns|network|connection refused/i, reason: "network_issue" },
  ],
  spam: [
    { pattern: /spam|junk|bulk|unsolicited/i, reason: "marked_as_spam" },
    {
      pattern: /content rejected|message rejected/i,
      reason: "content_rejected",
    },
    { pattern: /reputation|trust/i, reason: "reputation_issue" },
    {
      pattern: /spf|dkim|dmarc|authentication failed/i,
      reason: "authentication_failed",
    },
  ],
};

const SMTP_CODES = {
  hard: [550, 551, 553, 554, 511, 512],
  soft: [421, 450, 451, 452],
  spam: [554, 571],
};

export const classifyBounce = (errorMessage, smtpCode) => {
  try {
    if (!errorMessage || typeof errorMessage !== "string") {
      return { type: "soft", reason: "unknown_error", code: smtpCode };
    }

    const error = errorMessage.toLowerCase();

    // Check SMTP codes first (most reliable)
    if (smtpCode) {
      const code = parseInt(smtpCode, 10);
      if (!isNaN(code)) {
        if (SMTP_CODES.hard.includes(code)) {
          return {
            type: "hard",
            reason: "smtp_permanent_failure",
            code: smtpCode,
          };
        }
        if (SMTP_CODES.soft.includes(code)) {
          return {
            type: "soft",
            reason: "smtp_temporary_failure",
            code: smtpCode,
          };
        }
        if (code >= 500 && code < 600) {
          return {
            type: "hard",
            reason: "smtp_permanent_failure",
            code: smtpCode,
          };
        }
        if (code >= 400 && code < 500) {
          return {
            type: "soft",
            reason: "smtp_temporary_failure",
            code: smtpCode,
          };
        }
      }
    }

    // Check error message patterns
    for (const [bounceType, patterns] of Object.entries(BOUNCE_PATTERNS)) {
      for (const { pattern, reason } of patterns) {
        if (pattern.test(error)) {
          return { type: bounceType, reason, code: smtpCode };
        }
      }
    }

    return { type: "soft", reason: "unknown_error", code: smtpCode };
  } catch (err) {
    console.error("Error in classifyBounce:", err);
    return { type: "soft", reason: "classification_error", code: smtpCode };
  }
};

export const extractSmtpCode = (errorMessage) => {
  if (!errorMessage || typeof errorMessage !== "string") return null;
  const match = errorMessage.match(/\b([4-5]\d{2})\b/);
  return match ? match[1] : null;
};
