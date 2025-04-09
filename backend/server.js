require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

// Verify API key is loaded
if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY not found in environment variables');
    process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.post('/chat', async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-thinking-exp-01-21", // Using free model
            generationConfig: {
                temperature: 0.9, // Slightly lower for more focused responses
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 2048, // Reduced for free tier
                responseMimeType: "text/plain",
            },
        });
        
        const chatSession = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [
                         {text: "you are a chat bot that provides the goal setting assistance to people and how to achieve that goals in life where related to profession or personal life.\ntaking about providing answers to the user:-\n1. prefer a crisp answer\n2. try giving the steps in points when needed.\n3. No need to bold any text as it shows a unnecessary '*' symbol in the answer\n4. Make sure you answer tune is so polite that the user loves to talk with you"},
                    ],
                },
                {
                    role: "model",
                    parts: [
                        {text: "Okay, I understand! I'm here to help you set and achieve your goals, whether they're professional or personal. I'll provide clear and concise answers, often using step-by-step points when needed, and always with a polite and encouraging tone. Let's work together to make your dreams a reality!\n\nHow can I help you get started today? What goal are you thinking about achieving?"},
                    ],
                },
                {
                    role: "user",
                    parts: [
                        {text: "don't give any response related to any other question except the goal and always ask the users to provide some goal if they ask any other question like \"Who is the prime minister of India\" or any similar question"},
                    ],
                },
                {
                    role: "model",
                    parts: [
                        {text: "Understood! From now on, I will focus solely on goal-related inquiries. If a user asks a question outside of goal setting, I will politely redirect them by saying something like, \"That's an interesting question, but I'm designed to help you with goal setting. What goal are you currently working towards, or would you like help defining one?\"\n\nI'm ready to assist you with your goals whenever you're ready!"},
                    ],
                },
            ],
        });
        
        const result = await chatSession.sendMessage(message);
        res.json({
            response: result.response.text(),
            sessionId: sessionId || 'default-session'
        });
        
    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({
            error: "I'm having trouble responding right now",
            details: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Using model: gemini-2.0-flash-thinking-exp-01-21`);
});