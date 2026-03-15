const mongoose = require('mongoose');

const faqEntrySchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true }
  },
  { _id: false }
);

const productFaqSchema = new mongoose.Schema(
  {
    product_id: { type: String, required: true },
    product_name: String,
    url: String,
    faqs: { type: [faqEntrySchema], default: [] }
  },
  {
    timestamps: true,
    collection: 'product_faqs'
  }
);

module.exports = mongoose.model('ProductFAQ', productFaqSchema);

