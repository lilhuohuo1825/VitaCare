const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    name: String,
    province: String,
    phone: String,
    dob: String,
    gender: String,
    referralCode: String,
    agreed: Boolean,
    quiz_id: String,
    score: Number,
    result_id: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Result', ResultSchema, 'results');
