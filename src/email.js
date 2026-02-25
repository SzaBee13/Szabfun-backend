const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DOMAIN = "fun.szabee.me";

async function sendMail(to, subject, message, from = "auth") {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set in the environment");
  }

  const payload = {
    from: `${from}@${DOMAIN}`,
    to,
    subject,
    html: message,
  };

  await axios.post("https://api.resend.com/emails", payload, {
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
}

module.exports = {
  sendMail,
};