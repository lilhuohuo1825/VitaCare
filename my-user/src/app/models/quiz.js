const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
    value: String,
    text: String
});

const QuestionSchema = new mongoose.Schema({
    id: Number,
    question: String,
    options: [OptionSchema]
});

const ConditionSchema = new mongoose.Schema({
    operator: String,
    value: Number
});

const ResultSchema = new mongoose.Schema({
    id: String,
    condition: ConditionSchema,
    title: String,
    description: String,
    isLow: Boolean
});

const QuizSchema = new mongoose.Schema({
    quiz_id: { type: String, required: true, unique: true },
    category: String,
    category_short: String,
    icon: String,
    color: String,
    bgColor: String,
    questions: [QuestionSchema],
    logic_type: String,
    results: [ResultSchema]
});

module.exports = mongoose.model('Quiz', QuizSchema, 'quiz');
