const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    sku: String,
    productName: String,
    quantity: Number,
    price: Number,
    unit: String,
    image: String,
    hasPromotion: { type: Boolean, default: false },
    originalPrice: Number
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    city: String,
    district: String,
    ward: String,
    detail: String
  },
  { _id: false }
);

const shippingInfoSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    address: addressSchema
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    pending: String,
    confirmed: String,
    shipping: String,
    delivered: String,
    cancelled: String
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    order_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    paymentMethod: String,
    statusPayment: String,
    atPharmacy: { type: Boolean, default: false },
    pharmacyAddress: String,
    subtotal: Number,
    promotion: [String],
    promotion_id: String,
    code: String,
    name: String,
    shippingFee: Number,
    shippingDiscount: Number,
    totalAmount: Number,
    status: String,
    returnReason: String,
    cancelReason: String,
    note: String,
    item: [orderItemSchema],
    shippingInfo: shippingInfoSchema,
    route: routeSchema
  },
  {
    timestamps: true,
    collection: 'orders'
  }
);

module.exports = mongoose.model('Order', orderSchema);

