document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatLog = document.getElementById('chat-log');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatBtn = document.getElementById('new-chat-btn');
    const recentChats = document.getElementById('recent-chats');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const chatContainer = document.querySelector('.chat-container');
    const voiceButton = document.getElementById('voice-button');
    const speakResponseButton = document.getElementById('speak-response-button');
    const stopSpeechButton = document.getElementById('stop-speech-button');
    // Chat state
    let sessionId = localStorage.getItem('sessionId') || generateSessionId();
    let currentChat = JSON.parse(localStorage.getItem(`chat-${sessionId}`)) || [];
    let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    let typingIndicator = null;
    let recognition = null;
    let lastBotMessage = '';

    // Initialize
    initializeChat();
    setupResponsiveSidebar();
    setupVoiceRecognition();

    function setupVoiceRecognition() {
        // Enhanced browser detection including Brave
        const isBrave = navigator.brave && (navigator.brave.isBrave || (() => false))();
        const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime) && !isBrave;
        const isEdge = /Edg/.test(navigator.userAgent);
        const isFirefox = typeof InstallTrigger !== 'undefined';
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
        // Check for basic support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            voiceButton.disabled = true;
            voiceButton.title = "Voice input not supported";
            addMessage("Voice input works best in Chrome, Brave, and Edge browsers", 'bot-message');
            return;
        }
    
        // Initialize recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
    
        // Browser-specific adjustments
        if (isBrave) {
            // Brave-specific settings
            recognition.lang = 'en-US';
        } else if (isFirefox) {
            recognition.lang = 'en-US';
            recognition.grammars = null;
        } else if (isSafari) {
            recognition.continuous = true;
        }
    
        // Status messages
        const voiceStatus = document.createElement('div');
        voiceStatus.id = 'voice-status';
        voiceStatus.style.cssText = 'margin-left: 80px; color: var(--text-secondary); font-size: 0.8em; display: none;';
        document.querySelector('.input-options').prepend(voiceStatus);
    
        // Event handlers
        recognition.onstart = () => {
            voiceButton.classList.add('listening');
            userInput.placeholder = "Listening...";
            voiceStatus.textContent = "Listening... Speak now";
            voiceStatus.style.display = 'block';
            userInput.value = '';
        };
    
        recognition.onerror = (event) => {
            let errorMessage = "Voice input failed";
            
            // Browser-specific error handling
            if (isBrave) {
                errorMessage = "In Brave: 1) Click the Brave shield icon 2) Set 'Scripts' to 'Allow all' 3) Refresh page";
            } else if (isFirefox) {
                errorMessage = "Firefox requires HTTPS for voice input. Please use Chrome if on HTTP.";
            } else if (isSafari) {
                errorMessage = "Safari has limited voice support. Try longer phrases.";
            }
    
            switch(event.error) {
                case 'network':
                    errorMessage = "Internet connection required for voice input";
                    if (isBrave) {
                        errorMessage += " (Brave may block cloud services. Use Chrome or Edge instead.)";
                    }
                    break;
                case 'not-allowed':
                    if (isBrave) {
                        errorMessage = "Brave blocked microphone. Click the shield icon (🔰) to allow it.";
                    } else if (isFirefox) {
                        errorMessage = "In Firefox: 1) Click the padlock icon 2) Permissions 3) Allow microphone";
                    } else {
                        errorMessage = "Microphone access was blocked. Please allow it.";
                    }
                    break;
            }
    
            voiceStatus.textContent = errorMessage;
            voiceStatus.style.color = '#ff4444';
            voiceButton.classList.remove('listening');
            addMessage(errorMessage, 'bot-error');
        };
    
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            userInput.focus();
        
            // Move cursor to end of text
            setTimeout(() => {
                userInput.selectionStart = userInput.selectionEnd = userInput.value.length;
            }, 0);
        };
    
        recognition.onend = () => {
            voiceButton.classList.remove('listening');
            userInput.placeholder = "Ask Chatbot";
            voiceStatus.style.display = 'none';
        };
    
        // Modified click handler with Brave-specific checks
        voiceButton.addEventListener('click', async () => {
            if (voiceButton.classList.contains('listening')) {
                recognition.stop();
                return;
            }
    
            try {
                // Special handling for Brave's privacy protections
                if (isBrave) {
                    try {
                        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                        if (permissionStatus.state === 'denied') {
                            addMessage("Brave has permanently blocked microphone. Change in settings.", 'bot-error');
                            return;
                        }
                    } catch (e) {
                        console.log("Permissions API not available");
                    }
                }
    
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                recognition.start();
            } catch (err) {
                let helpText = "Microphone access denied";
                if (isBrave) {
                    helpText += ". In Brave: 1) Click the shield icon (🔰) 2) Allow scripts 3) Refresh page";
                } else if (isFirefox) {
                    helpText += ". In Firefox, refresh the page after granting permission.";
                }
                addMessage(helpText, 'bot-error');
            }
        });
    }

    function speakText(text) {
        if (!('speechSynthesis' in window)) {
            console.warn('Text-to-speech not supported in this browser');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        speakResponseButton.style.display = 'none';
        stopSpeechButton.style.display = 'flex';
        stopSpeechButton.classList.add('active');
    
        utterance.onend = () => {
        // When speech ends, show speak button and hide stop button
            stopSpeechButton.style.display = 'none';
            speakResponseButton.style.display = 'flex';
            stopSpeechButton.classList.remove('active');
        };
    
        utterance.onerror = () => {
            // If there's an error, reset the buttons
            stopSpeechButton.style.display = 'none';
            speakResponseButton.style.display = 'flex';
            stopSpeechButton.classList.remove('active');
        };
        window.speechSynthesis.speak(utterance);
    }

    stopSpeechButton.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        stopSpeechButton.style.display = 'none';
        speakResponseButton.style.display = 'flex';
        stopSpeechButton.classList.remove('active');
    });

    function generateSessionId() {
        return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }

    function initializeChat() {
        chatLog.innerHTML = '';
        if (currentChat.length > 0) {
            currentChat.forEach(msg => addMessage(msg.content, msg.type));
            // Store the last bot message for voice response
            const lastBotMsg = currentChat.filter(msg => msg.type === 'bot-message').pop();
            lastBotMessage = lastBotMsg ? lastBotMsg.content : '';
        } else {
            showWelcomeMessage();
        }
        loadRecentChats();
    }

    function setupResponsiveSidebar() {
        if (window.innerWidth >= 768) {
            // Desktop
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
        } else {
            // Mobile
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        }
    }

    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        
        setTimeout(() => {
            const messages = document.querySelectorAll('.chat-message');
            messages.forEach(msg => {
                msg.style.maxWidth = mainContent.classList.contains('expanded') 
                    ? '90%' 
                    : 'calc(100% - 40px)';
            });
        }, 300);
    }

    function showWelcomeMessage() {
        const messages = [
            "Welcome to your Goal Setting Assistant! 💪",
            "I can help you:",
            "- Set clear goals<br>- Break them into steps<br>- Track your progress<br>- Stay motivated",
            "What would you like to achieve today?"
        ];
    
        let delay = 1000;
        messages.forEach((msg, index) => {
            setTimeout(() => {
                addMessage(msg, 'bot-message');
                setTimeout(() => {
                    chatLog.scrollTop = chatLog.scrollHeight;
                }, 100);
            }, delay * index);
        });
    }

    function addMessage(content, type) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', type);
        messageElement.innerHTML = content.replace(/\n/g, '<br>');
        
        messageElement.style.maxWidth = mainContent.classList.contains('expanded') 
            ? '90%' 
            : 'calc(100% - 40px)';
        
        chatLog.appendChild(messageElement);
        chatLog.scrollTop = chatLog.scrollHeight;

        // Store the last bot message for voice response
        if (type === 'bot-message') {
            lastBotMessage = content;
        }
        
        return messageElement;
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, 'user-message');
        currentChat.push({ content: message, type: 'user-message' });
        userInput.value = '';

        typingIndicator = addMessage('<div class="typing-indicator"><span></span><span></span><span></span></div>', 'bot-message');
        
        try {
            const response = await fetch('https://goal-setting-assistant-server.onrender.com/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, sessionId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }

            const data = await response.json();
            
            if (typingIndicator && typingIndicator.parentNode) {
                chatLog.removeChild(typingIndicator);
            }
            
            const botMessage = addMessage(data.response, 'bot-message');
            currentChat.push({ content: data.response, type: 'bot-message' });
            
            updateChatHistory();

        } catch (error) {
            console.error("Chat error:", error);
            
            if (typingIndicator && typingIndicator.parentNode) {
                chatLog.removeChild(typingIndicator);
            }
            
            addMessage("Sorry, I'm having trouble connecting. Please try again later.", 'bot-error');
        } finally {
            typingIndicator = null;
        }
    }

    function updateChatHistory() {
        if (currentChat.length === 0) return;
        
        localStorage.setItem(`chat-${sessionId}`, JSON.stringify(currentChat));
        
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

        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-btn';
        clearBtn.textContent = 'Clear History';
        clearBtn.addEventListener('click', clearAllChats);
        recentChats.appendChild(clearBtn);

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
            
            chatItem.addEventListener('click', () => {
                loadChat(chat.id);
                if (window.innerWidth <= 768) {
                    sidebar.classList.add('collapsed');
                }
            });
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
        localStorage.removeItem(`chat-${chatId}`);
        chatHistory = chatHistory.filter(chat => chat.id !== chatId);
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        
        if (chatId === sessionId) startNewChat();
        loadRecentChats();
    }

    function clearAllChats() {
        chatHistory.forEach(chat => {
            localStorage.removeItem(`chat-${chat.id}`);
        });
        
        chatHistory = [];
        currentChat = [];
        sessionId = generateSessionId();
        
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        localStorage.setItem('sessionId', sessionId);
        
        loadRecentChats();
        initializeChat();
    }

    function startNewChat() {
        if (currentChat.length > 0) {
            updateChatHistory();
        }
    
        sessionId = generateSessionId();
        currentChat = [];
        
        localStorage.setItem(`chat-${sessionId}`, JSON.stringify(currentChat));
        localStorage.setItem('sessionId', sessionId);
        
        chatLog.innerHTML = '';
        showWelcomeMessage();
        
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
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarToggle.addEventListener('touchstart', toggleSidebar);
    
    // Voice input button
    voiceButton.addEventListener('click', () => {
        if (recognition) {
            recognition.start();
        }
    });
    
    // Speak response button
    speakResponseButton.addEventListener('click', () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            stopSpeechButton.style.display = 'none';
            speakResponseButton.style.display = 'flex';
            stopSpeechButton.classList.remove('active');
        } else if (lastBotMessage) {
            speakText(lastBotMessage);
        } else {
            addMessage("No response available to speak", 'bot-error');
        }
    });

    // Check for speech synthesis support
    if (!('speechSynthesis' in window)) {
        speakResponseButton.disabled = true;
        speakResponseButton.title = "Text-to-speech not supported in your browser";
    }

    userInput.focus();

    // Responsive behavior
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
        } else {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        }
        
        const messages = document.querySelectorAll('.chat-message');
        messages.forEach(msg => {
            msg.style.maxWidth = mainContent.classList.contains('expanded') 
                ? '90%' 
                : 'calc(100% - 40px)';
        });
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && 
            !sidebar.contains(e.target) && 
            e.target !== sidebarToggle && 
            !sidebarToggle.contains(e.target) &&
            !sidebar.classList.contains('collapsed')) {
            toggleSidebar();
        }
    });
});