const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    _id: String,
    sku: String,
    productName: String,
    quantity: Number,
    discount: { type: Number, default: 0 },
    price: { type: Number, required: true },
    hasPromotion: { type: Boolean, default: false },
    image: String,
    unit: String,
    category: String,
    addedAt: String,
    updatedAt: String
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
    itemCount: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    collection: 'carts'
  }
);

module.exports = mongoose.model('Cart', cartSchema);

