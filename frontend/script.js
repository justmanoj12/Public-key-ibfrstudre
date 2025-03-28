document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatLog = document.getElementById('chat-log');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatBtn = document.getElementById('new-chat-btn');
    const recentChats = document.getElementById('recent-chats');

    // Chat state
    let sessionId = localStorage.getItem('sessionId') || generateSessionId();
    let currentChat = JSON.parse(localStorage.getItem(`chat-${sessionId}`)) || [];
    let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    let typingIndicator = null; // Track loading indicator

    // Initialize
    initializeChat();

    function generateSessionId() {
        return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }

    function initializeChat() {
        chatLog.innerHTML = '';
        if (currentChat.length > 0) {
            currentChat.forEach(msg => addMessage(msg.content, msg.type));
        } else {
            showWelcomeMessage();
        }
        loadRecentChats();
    }

    function showWelcomeMessage() {
        addMessage("Welcome to your Goal Setting Assistant! 💪", 'bot-message');
        addMessage("I can help you:", 'bot-message');
        addMessage("- Set clear goals<br>- Break them into steps<br>- Track your progress<br>- Stay motivated", 'bot-message');
        addMessage("What would you like to achieve today?", 'bot-message');
    }

    function addMessage(content, type) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', type);
        messageElement.innerHTML = content.replace(/\n/g, '<br>');
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight;
        return messageElement; // Return reference to the message
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, 'user-message');
        currentChat.push({ content: message, type: 'user-message' });
        userInput.value = '';

        // Show typing indicator
        typingIndicator = addMessage('<div class="typing-indicator"><span></span><span></span><span></span></div>', 'bot-message');
        
        try {
            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, sessionId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }

            const data = await response.json();
            
            // Remove typing indicator
            if (typingIndicator && typingIndicator.parentNode) {
                chatLog.removeChild(typingIndicator);
            }
            
            // Add bot response
            const botMessage = addMessage(data.response, 'bot-message');
            currentChat.push({ content: data.response, type: 'bot-message' });
            
            // Save to history
            updateChatHistory();

        } catch (error) {
            console.error("Chat error:", error);
            
            // Remove typing indicator if it exists
            if (typingIndicator && typingIndicator.parentNode) {
                chatLog.removeChild(typingIndicator);
            }
            
            // Add error message
            addMessage("Sorry, I'm having trouble connecting. Please try again later.", 'bot-error');
        } finally {
            typingIndicator = null; // Reset indicator
        }
    }

    function updateChatHistory() {
        if (currentChat.length === 0) return;
        
        localStorage.setItem(`chat-${sessionId}`, JSON.stringify(currentChat));
        
        // Update history
        const existingIndex = chatHistory.findIndex(chat => chat.id === sessionId);
        const lastMessage = currentChat[currentChat.length - 1].content;
        
        const chatEntry = {
            id: sessionId,
            lastMessage: lastMessage.length > 50 
                ? lastMessage.substring(0, 50) + '...' 
                : lastMessage,
            timestamp: new Date().toLocaleTimeString()
        };

        if (existingIndex >= 0) {
            chatHistory[existingIndex] = chatEntry;
        } else {
            chatHistory.unshift(chatEntry);
            if (chatHistory.length > 10) chatHistory.pop();
        }
        
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        loadRecentChats();
    }

    function loadRecentChats() {
        recentChats.innerHTML = '';
        
        if (chatHistory.length === 0) {
            recentChats.innerHTML = '<div class="no-chats">No recent conversations</div>';
            return;
        }

        // Add clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-btn';
        clearBtn.textContent = 'Clear History';
        clearBtn.addEventListener('click', clearAllChats);
        recentChats.appendChild(clearBtn);

        // Add chat items
        chatHistory.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.innerHTML = `
                <div class="chat-preview">${chat.lastMessage}</div>
                <div class="chat-time">${chat.timestamp}</div>
                <button class="delete-btn">×</button>
            `;
            
            chatItem.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChat(chat.id);
            });
            
            chatItem.addEventListener('click', () => loadChat(chat.id));
            recentChats.appendChild(chatItem);
        });
    }

    function loadChat(chatId) {
        const chatData = JSON.parse(localStorage.getItem(`chat-${chatId}`)) || [];
        sessionId = chatId;
        currentChat = chatData;
        localStorage.setItem('sessionId', sessionId);
        initializeChat();
    }

    function deleteChat(chatId) {
        if (!confirm('Delete this conversation?')) return;
        
        localStorage.removeItem(`chat-${chatId}`);
        chatHistory = chatHistory.filter(chat => chat.id !== chatId);
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        
        if (chatId === sessionId) startNewChat();
        loadRecentChats();
    }

    function clearAllChats() {
        if (!confirm('Delete ALL conversation history?')) return;
        
        chatHistory.forEach(chat => localStorage.removeItem(`chat-${chat.id}`));
        chatHistory = [];
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        
        startNewChat();
    }

    function startNewChat() {
        // Confirm if current chat has messages
        if (currentChat.length > 0) {
            if (!confirm('Start new chat? Your current conversation will be saved.')) {
                return; // User canceled
            }
            updateChatHistory(); // Save current chat first
        }
    
        // Start fresh
        sessionId = generateSessionId();
        currentChat = [];
        
        // Update storage
        localStorage.setItem(`chat-${sessionId}`, JSON.stringify(currentChat));
        localStorage.setItem('sessionId', sessionId);
        
        // Reset UI
        chatLog.innerHTML = '';
        showWelcomeMessage();
        
        // Reload recent chats to show new session
        loadRecentChats();
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    newChatBtn.addEventListener('click', startNewChat);
    userInput.focus();
});