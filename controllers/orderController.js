import axios from "axios";
import moment from "moment";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";

// placing orders using POD method
const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      amount,
      address,
      paymentMethod: "POD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await orderModel.findByIdAndUpdate(userId, { cartData: {} });

    res.json({ success: true, message: "Order placed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// placing orders using Mpesa
const placeOrderMpesa = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    // Validate phone number format
    const phone = address.phone;
    if (!phone.match(/^0\d{9}$|^254\d{9}$/)) {
      return res.json({
        success: false,
        message: "Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX",
      });
    }

    // Save the order to your database
    const orderData = {
      userId,
      items,
      amount,
      address,
      paymentMethod: "mpesa",
      payment: false,
      paymentStatus: "pending",
      date: Date.now(),
    };
    const newOrder = new orderModel(orderData);
    await newOrder.save();

    // Step 1: Generate M-Pesa access token
    const consumerKey = process.env.SAFARICOM_CONSUMER_KEY;
    const consumerSecret = process.env.SAFARICOM_CONSUMER_SECRET;
    const auth =
      "Basic " +
      Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenUrl =
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    const tokenResponse = await axios.get(tokenUrl, {
      headers: { Authorization: auth },
    });
    const accessToken = tokenResponse.data.access_token;
    console.log("Generated Access Token:", accessToken);

    // Step 2: Prepare STK Push payload
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString("base64");

    const stkPayload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount.toString(),
      PartyA: address.phone.startsWith("254")
        ? address.phone
        : "254" + address.phone.slice(1),
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: address.phone.startsWith("254")
        ? address.phone
        : "254" + address.phone.slice(1),
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: newOrder._id.toString(),
      TransactionDesc: "Payment for order",
    };

    // Step 3: Send STK Push request
    const stkUrl =
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    const stkResponse = await axios.post(stkUrl, stkPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // Step 4: Handle the response
    if (stkResponse.data.ResponseCode === "0") {
      await orderModel.findByIdAndUpdate(newOrder._id, {
        checkoutRequestID: stkResponse.data.CheckoutRequestID,
      });
      res.json({
        success: true,
        message: "STK Push initiated. Please enter your M-Pesa PIN.",
        orderId: newOrder._id,
        checkoutRequestID: stkResponse.data.CheckoutRequestID,
      });
    } else {
      throw new Error(
        "Failed to initiate STK Push: " + JSON.stringify(stkResponse.data)
      );
    }
  } catch (error) {
    console.error("Error in placeOrderMpesa:", error);
    res.json({
      success: false,
      message:
        error.message || "An error occurred while processing the payment",
    });
  }
};

// M-pesa Callback Handler
const mpesaCallBack = async (req, res) => {
  try {
    const callbackData = req.body.Body?.stkCallback;

    if (!callbackData) {
      console.log("Invalid callback data received:", req.body);
      return res
        .status(400)
        .json({ success: false, message: "Invalid callback data" });
    }
    const { CheckoutRequestID, ResultCode, ResultDesc } = callbackData;

    // Find order by CheckoutRequestID
    const order = await orderModel.findOne({
      checkoutRequestID: CheckoutRequestID,
    });

    if (!order) {
      console.log(
        `Order not found for CheckoutRequestID: ${CheckoutRequestID}`
      );
      return res.json({ success: false, message: "Order not found" });
    }

    switch (ResultCode.toString()) {
      case "0":
        // Payment successful
        order.payment = true;
        order.paymentStatus = "completed";
        await order.save();

        // Clear user cart
        await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
        console.log(`✅ Payment successful for Order ID: ${order._id}`);
        res.json({ success: true, message: "Payment confirmed" });
        break;

      case "1032":
        // Transaction cancelled by user
        console.log(`❌ Payment cancelled by user for Order ID: ${order._id}`);
        res.json({ success: false, message: "Transaction cancelled by user" });
        break;

      case "1037":
        // Transaction timed out
        console.log(`⏳ Payment timed out for Order ID: ${order._id}`);
        res.json({ success: false, message: "Transaction timed out" });
        break;

      default:
        // Other failures
        console.log(
          `⚠️ Payment failed for Order ID: ${order._id}: ${ResultDesc}`
        );
        res.json({ success: false, message: ResultDesc });
        break;
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Callback processing failed" });
  }
};

// Check order status
const getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    res.json({
      success: true,
      paymentStatus: order.paymentStatus,
      message:
        order.paymentStatus === "completed"
          ? "payment successful"
          : order.paymentStatus === "pending"
          ? "processing payment..."
          : order.paymentStatus,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// placing order using Airtel Money
const placeOrderAirtelMoney = async (req, res) => {};

// All order data for Admin panel
const allOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// User order data for frontend
const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;

    const orders = await orderModel.find({ userId });
    res.json({ success: true, orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Update order status from admin panel
const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    await orderModel.findByIdAndUpdate(orderId, { status });
    res.json({ success: true, message: "Status updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  placeOrder,
  placeOrderMpesa,
  placeOrderAirtelMoney,
  allOrders,
  userOrders,
  updateStatus,
  mpesaCallBack,
  getOrderStatus,
};
