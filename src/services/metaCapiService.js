const axios = require("axios");
const crypto = require("crypto");

const hash = (value) => {
  if (!value) return undefined;
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
};

const sendMetaEvent = async ({
  eventName,
  eventId,
  email,
  value,
  currency = "INR",
  clientIp,
  userAgent,
}) => {
  try {
    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",

          user_data: {
            em: hash(email),
            client_ip_address: clientIp,
            client_user_agent: userAgent,
          },

          custom_data: {
            value,
            currency,
          },
        },
      ],
    };

    const url = `https://graph.facebook.com/v18.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_ACCESS_TOKEN}`;

    const response = await axios.post(url, payload);

    console.log("Meta CAPI Success:", response.data);
  } catch (error) {
    console.error(
      "Meta CAPI Error:",
      error.response?.data || error.message
    );
  }
};

module.exports = { sendMetaEvent };