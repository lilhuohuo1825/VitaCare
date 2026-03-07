const mongoose = require('mongoose');

const measurementWithTimestampSchema = new mongoose.Schema(
  {
    value: Number,
    unit: String,
    updatedAt: String
  },
  { _id: false }
);

const healthProfileSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
    full_name: String,
    phone: String,
    gender: String,
    // Detailed measurements (from seed JSON, optional)
    height_cm: measurementWithTimestampSchema,
    weight_kg: measurementWithTimestampSchema,
    bmi_score: measurementWithTimestampSchema,
    bmi_status: String,
    bmr_score: measurementWithTimestampSchema,
    bmr_status: String,
    blood_pressure: {
      systolic: Number,
      diastolic: Number,
      updatedAt: String
    },
    heart_rate: measurementWithTimestampSchema,
    blood_sugar: {
      value: Number,
      unit: String,
      status: String,
      updatedAt: String
    },
    blood_fat: {
      cholesterol: Number,
      triglyceride: Number,
      hdl: Number,
      ldl: Number,
      status: String,
      updatedAt: String
    },
    osteoporosis_risk: {
      level: String,
      updatedAt: String
    },
    menstruation_cycle: {
      lastPeriod: String,
      cycleLength: Number,
      updatedAt: String
    },
    pregnancy_status: {
      isPregnant: Boolean,
      week: Number,
      updatedAt: String
    },
    medicationReminder: {
      type: Array,
      default: []
    },
    // Flattened fields used by current API implementation
    bmi: Number,
    bmiStatus: String,
    bmr: Number,
    bmrStatus: String,
    bloodPressure: String,
    bloodSugar: String,
    bloodFat: String,
    osteoporosis: String,
    menstruation: String,
    pregnancy: String
  },
  {
    timestamps: true,
    collection: 'healthprofiles'
  }
);

module.exports = mongoose.model('HealthProfile', healthProfileSchema);

