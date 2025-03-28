import orderModel from "../models/orderModel.js";
import mpesa from "../config/mpesaConfig.js";

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

    const orderData = {
      userId,
      items,
      amount,
      address,
      paymentMethod: "mpesa",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    //STK Push
    const phoneNumber = address.phone;
    const accountReference = newOrder._id.toString();
    const transactionDesc = "Payment for order";

    const mpesaResponse = await mpesa.lipaNaMpesaOnline({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    });

    if (mpesaResponse.ResponseCode === "0") {
      res.json({
        success: true,
        message: "STK Push initiated. Please enter your M-Pesa PIN.",
        orderId: newOrder._id,
        checkoutRequestID: mpesaResponse.CheckoutRequestID,
      });
    } else {
      throw new Error("Failed to initiate STK Push");
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// M-pesa Callback Handler
const mpesaCallBack = async (req, res) => {
  try {
    const callbackData = req.body.Body.stkCallback;
    const { CheckoutRequestID, ResultCode, ResultDesc } = callbackData;

    // Find order by CheckoutRequestID

    const order = await orderModel.findOne({
      checkoutRequestID: CheckoutRequestID,
    });

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    if (ResultCode === 0) {
      //Payment successful
      order.payment = true;
      order.checkoutRequestID = CheckoutRequestID;
      await order.save();

      //Clear cart
      await orderModel.findByIdAndUpdate(order.userId, { cartData: {} });
      res.json({ success: true, message: "Payment confirmed" });
    } else {
      // Payment failed
      console.log(`Payment failed: ${ResultDesc}`);
      res.json({ success: false, message: ResultDesc });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Callback processing failed" });
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
};
