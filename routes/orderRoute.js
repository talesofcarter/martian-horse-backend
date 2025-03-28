import express from "express";
import {
  placeOrder,
  placeOrderMpesa,
  placeOrderAirtelMoney,
  allOrders,
  userOrders,
  updateStatus,
  mpesaCallBack,
} from "../controllers/orderController.js";

import adminAuth from "../middleware/adminAuth.js";

import authUser from "../middleware/auth.js";

const orderRouter = express.Router();

// Admin features
orderRouter.post("/list", adminAuth, allOrders);
orderRouter.post("/status", adminAuth, updateStatus);

//Payment features
orderRouter.post("/place", authUser, placeOrder);
orderRouter.post("/mpesa", authUser, placeOrderMpesa);
orderRouter.post("/airtelmoney", authUser, placeOrderAirtelMoney);
orderRouter.post("/callback", mpesaCallBack);

// User features
orderRouter.post("/userorders", authUser, userOrders);

export default orderRouter;
