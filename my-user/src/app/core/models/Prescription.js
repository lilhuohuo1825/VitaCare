const mongoose = require('mongoose');

const medicineRequestedSchema = new mongoose.Schema(
  {
    id: mongoose.Schema.Types.Mixed,
    name: String,
    sku: String,
    image: String
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: String,
    changedAt: String,
    changedBy: String
  },
  { _id: false }
);

const currentStatusSchema = new mongoose.Schema(
  {
    status: String,
    changedAt: String,
    changedBy: String
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    full_name: String,
    phone: String,
    note: String,
    consultation_type: String,
    images: { type: [String], default: [] },
    medicines_requested: { type: [medicineRequestedSchema], default: [] },
    status: { type: String, default: 'pending' },
    current_status: currentStatusSchema,
    status_history: { type: [statusHistorySchema], default: [] }
  },
  {
    timestamps: true,
    collection: 'consultations_prescription'
  }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);

