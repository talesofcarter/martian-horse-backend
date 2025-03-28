import Mpesa from "mpesa-node";
import "dotenv/config";

const mpesa = new Mpesa({
  consumerKey: process.env.SAFARICOM_CONSUMER_KEY,
  consumerSecret: process.env.SAFARICOM_CONSUMER_SECRET,
  environment: "sandbox", // Change to "production" when ready
  shortCode: process.env.MPESA_SHORTCODE,
  passKey: process.env.MPESA_PASSKEY,
});

export default mpesa;
