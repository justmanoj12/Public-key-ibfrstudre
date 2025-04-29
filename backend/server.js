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
    res.sendFile(path.join(__dirname, '../frontend', 'chatbot.html'));
});

app.post('/chat', async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-thinking-exp-01-21",
            generationConfig: {
                temperature: 0.8, // Adjusted for factual responses
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 3000,
                responseMimeType: "text/plain",
            },
        });
        
        const chatSession = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [
                         {text: "You are a public transit assistant that helps users find transportation options, routes, schedules, and transit-related information. Your responses should be:\n1. Clear and concise\n2. Provide step-by-step directions when needed\n3. Include relevant details like schedules, fares, and alternatives\n4. Be polite and helpful\n5. Stay focused on public transit topics"},
                    ],
                },
                {
                    role: "model",
                    parts: [
                        {text: "Understood! I'm here to help you with all your public transportation needs. I can provide information on bus routes, train schedules, fare options, and the best ways to get around your city. Please let me know your current location and destination, or ask any transit-related question you have."},
                    ],
                },
                {
                    role: "user",
                    parts: [
                        {text: "Don't respond to non-transit questions. If asked about other topics, politely redirect to transit information."},
                    ],
                },
                {
                    role: "model",
                    parts: [
                        {text: "I'll focus exclusively on public transit information. If asked about other topics, I'll respond with: \"I specialize in public transportation assistance. Could you tell me about your transit needs? For example, I can help with route planning, schedules, or fare information.\""},
                    ],
                },
                {
                    role: "model",
                    parts: [
                      {text: "Understood! I have removed any formatting that might cause the unwanted symbols. I will provide plain text responses from now on.\n"},
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
            error: "I'm having trouble accessing transit information right now",
            details: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Using model: gemini-2.0-flash-thinking-exp-01-21`);
});