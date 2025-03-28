import userModel from "../models/userModel.js";
// add products to user cart
async function addToCart(req, res) {
  try {
    const { userId, itemId, size } = req.body;
    const userData = await userModel.findById(userId);
    let cartData = await userData.cartData;

    if (cartData[itemId]) {
      if (cartData[itemId][size]) {
        cartData[itemId][size] += 1;
      } else {
        cartData[itemId][size] = 1;
      }
    } else {
      cartData[itemId] = {};
      cartData[itemId][size] = 1;
    }

    await userModel.findByIdAndUpdate(userId, { cartData });

    res.json({ success: true, message: "Added to cart" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}

// update user cart
async function updateCart(req, res) {
  try {
    const { userId, itemId, quantity, size } = req.body;

    const userData = await userModel.findById(userId);
    let cartData = await userData.cartData;

    cartData[itemId][size] = quantity;

    await userModel.findByIdAndUpdate(userId, { cartData });
    res.json({ success: true, message: "Cart updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}

//get user cart data
async function getUserCart(req, res) {
  try {
    const { userId } = req.body;
    const userData = await userModel.findById(userId);
    let cartData = await userData.cartData;

    res.json({ success: true, cartData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}

//clear user cart
async function clearCart(req, res) {
  try {
    const userId = req.body.userId; // From authUser middleware
    const userData = await userModel.findById(userId);

    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    userData.cartData = {}; // Reset cart to empty
    await userModel.findByIdAndUpdate(userId, { cartData: userData.cartData });

    res.json({ success: true, message: "Cart cleared successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
}

export { addToCart, updateCart, getUserCart, clearCart };
