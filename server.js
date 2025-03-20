import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";

// App Config
const app = express();
const port = process.env.PORT || 4000;
const startServer = async () => {
  try {
    await connectDB(); // Wait for MongoDB connection
    await connectCloudinary(); // Wait for Cloudinary config
    app.listen(port, () => console.log("Server started on PORT : " + port));
  } catch (error) {
    console.error("Failed to start server:", error);
  }
};

// middlewares
app.use(express.json());
app.use(cors());

// API endpoints
app.use("/api/user", userRouter);
app.use("/api/product", productRouter);

app.get("/", (req, res) => {
  res.send("API Working");
});

startServer();

console.log("MongoDB URI:", process.env.MONGODB_URI);
