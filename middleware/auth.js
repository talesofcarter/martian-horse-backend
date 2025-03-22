import jwt from "jsonwebtoken";

const authUser = async (req, res) => {
  const { token } = req.headers;

  if (!token) {
    return res.json({ success: false, message: "Not authorized, login again" });
  }

  try {
    const token_decode = jwt.verify(token, process.even.JWT_SECRET);
    req.body.userId = token_decode.id;
    next();
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default authUser;
