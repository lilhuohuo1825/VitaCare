const express = require('express');
const router = express.Router();
const Quiz = require('../models/quiz');
const Result = require('../models/result');

// Get all quizzes
router.get('/', async (req, res) => {
    try {
        const quizzes = await Quiz.find({});
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quizzes', error: error.message });
    }
});

// Submit a quiz result
router.post('/result', async (req, res) => {
    try {
        const newResult = new Result(req.body);
        const savedResult = await newResult.save();
        res.status(201).json({ message: 'Result saved successfully', result: savedResult });
    } catch (error) {
        res.status(500).json({ message: 'Error saving result', error: error.message });
    }
});

module.exports = router;
