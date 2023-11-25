const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

// Path to questions.json
const questionsFilePath = path.join(__dirname, '../data/questions.json');

// Read questions from file
const questionStore = JSON.parse(fs.readFileSync(questionsFilePath, 'utf-8'));

function getUniqueSubjects() {
    const subjects = new Set(questionStore.map(q => q.subject));
    return Array.from(subjects);
}

app.get('/subjects', (req, res) => {
    const subjects = getUniqueSubjects();
    res.json({ subjects });
});

// Question Paper Generator
app.post('/generate-paper', (req, res) => {
    const { totalMarks, difficultyDistribution } = req.body;

    if (!totalMarks || !difficultyDistribution) {
        return res.status(400).json({ error: 'Please provide totalMarks and difficultyDistribution in the request body' });
    }

    const questionPaper = generateQuestionPaper(totalMarks, difficultyDistribution);
    res.json({ questionPaper });
});

// Question Paper Generator By Subjects
app.post('/generate-paper-subject', (req, res) => {
    const { totalMarks, subjectPercentages } = req.body;

    if (!totalMarks || !subjectPercentages) {
        return res.status(400).json({ error: 'Please provide totalMarks and difficultyDistribution in the request body' });
    }

    const questionPaper = generateQuestionPaperBySubject(totalMarks, subjectPercentages);
    res.json({ questionPaper });
});

// to handle new question addition
app.post('/add-question', (req, res) => {
    const { question, subject, topic, difficulty, marks } = req.body;

    if (!question || !subject || !topic || !difficulty || !marks) {
        return res.status(400).json({ error: 'Please provide all required fields for the new question' });
    }

    const id = new Date().getTime().toString();

    const newQuestion = {
        id,
        question,
        subject,
        topic,
        difficulty,
        marks
    };

    // Add the new question to your questionStore array
    questionStore.push(newQuestion);

    // Save the updated questionStore to the questions.json file
    fs.writeFileSync(questionsFilePath, JSON.stringify(questionStore, null, 2), 'utf-8');

    res.json({ success: true });
});


// Function to generate question paper
function generateQuestionPaper(totalMarks, difficultyDistribution) {
    const questionPaper = [];
    let remainingMarks = totalMarks;

    //for each difficulty level deciding the marks according to percentage distribution
    for (const difficulty in difficultyDistribution) {
        const percentage = difficultyDistribution[difficulty];
        const marksForDifficulty = Math.floor((percentage * totalMarks) / 100);

        //filtering the marks of that difficulty and getting random questions from them
        const filteredQuestions = questionStore.filter(q => q.difficulty === difficulty);
        const selectedQuestions = getRandomQuestions(filteredQuestions, marksForDifficulty);

        questionPaper.push(...selectedQuestions.map((question, index) => {
            return {
                ...question,
                questionNumber: index + 1,
            };
        }));

        remainingMarks -= marksForDifficulty;
    }

    // If there are remaining marks, distribute them among the questions with the lowest difficulty
    if (remainingMarks > 0) {
        const filteredQuestions = questionStore.filter(q => q.difficulty === "Easy");
        const selectedQuestions = getRandomQuestions(filteredQuestions, remainingMarks);

        questionPaper.push(...selectedQuestions.map((question, index) => {
            return {
                ...question,
                questionNumber: questionPaper.length + index + 1,
            };
        }));
    }

    return questionPaper;
}

function generateQuestionPaperBySubject(totalMarks, subjectPercentages) {
    const questionPaper = [];
    let remainingMarks = totalMarks;

    //for each difficulty level deciding the marks according to percentage distribution
    for (const subject in subjectPercentages) {
        const percentage = subjectPercentages[subject];
        const marksForSubject = Math.floor((percentage * totalMarks) / 100);

        //filtering the marks of that difficulty and getting random questions from them
        const filteredQuestions = questionStore.filter(q => q.subject === subject);
        const selectedQuestions = getRandomQuestions(filteredQuestions, marksForSubject);

        questionPaper.push(...selectedQuestions.map((question, index) => {
            return {
                ...question,
                questionNumber: index + 1,
            };
        }));

        remainingMarks -= marksForSubject;
    }

    // If there are remaining marks, distribute them among the questions with the lowest difficulty
    if (remainingMarks > 0) {
        const filteredQuestions = questionStore.filter(q => q.difficulty === "Easy");
        const selectedQuestions = getRandomQuestions(filteredQuestions, remainingMarks);

        questionPaper.push(...selectedQuestions.map((question, index) => {
            return {
                ...question,
                questionNumber: questionPaper.length + index + 1,
            };
        }));
    }

    return questionPaper;
}


function getRandomQuestions(questions, totalMarks) {
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
    let accumulatedMarks = 0;

    //checking if current marks is exceeding the marks for that difficulty or not
    return shuffledQuestions.filter(question => {
        if (accumulatedMarks + question.marks <= totalMarks) {
            accumulatedMarks += question.marks;
            return true;
        }
        return false;
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
