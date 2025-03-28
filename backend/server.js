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
                    parts: [{ 
                        text: "You are a helpful Goal Setting Assistant. Provide:" +
                              "\n1. Concise answers" +
                              "\n2. Bullet points when helpful" +
                              "\n3. No markdown formatting" +
                              "\n4. Polite, encouraging tone"
                    }],
                },
                {
                    role: "model",
                    parts: [{ 
                        text: "Understood! I'll help you set and achieve goals with:" +
                              "\n- Clear advice" +
                              "\n- Actionable steps" +
                              "\n- Encouraging support" +
                              "\n\nWhat goal would you like to work on today?"
                    }],
                }
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