document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le chat dans la modal
    const chatInputModal = document.getElementById('chatInputModal');
    const sendChatModal = document.getElementById('sendChatModal');
    const chatMessagesModal = document.getElementById('chatMessagesModal');
    
    if (sendChatModal) {
        sendChatModal.addEventListener('click', () => sendChatMessage('modal'));
        chatInputModal.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage('modal');
        });
    }
});

// Variable globale pour stocker le contexte du contrat
let contractContext = {
    content: '',
    problematicClauses: [],
    aiScore: 0,
    analysisResults: null
};

// Fonction pour mettre à jour le contexte après l'analyse
function updateContractContext(results) {
    contractContext.content = document.getElementById('contractText').value;
    contractContext.problematicClauses = results.problematicClauses || [];
    contractContext.aiScore = results.aiScore || 0;
    contractContext.analysisResults = results;
}

// Modifier la fonction analyzeContract pour capturer le contexte
async function analyzeContract() {
    // ...existing code...
    
    // Après avoir reçu les résultats
    if (data.success) {
        // Capturer le contexte pour le chat
        updateContractContext(data.results);
        
        // ...existing code...
    }
}

// Fonction améliorée pour envoyer les messages avec contexte
async function sendChatMessage(context = 'main') {
    const inputId = context === 'modal' ? 'chatInputModal' : 'chatInput';
    const messagesId = context === 'modal' ? 'chatMessagesModal' : 'chatMessages';
    
    const input = document.getElementById(inputId);
    const messagesContainer = document.getElementById(messagesId);
    const message = input.value.trim();
    
    if (!message) return;
    
    // Afficher le message de l'utilisateur
    addMessageToChat(messagesContainer, message, 'user');
    input.value = '';
    
    // Préparer le contexte enrichi pour l'API
    const enrichedMessage = prepareEnrichedMessage(message);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: enrichedMessage,
                contractContext: contractContext,
                originalMessage: message
            })
        });
        
        const data = await response.json();
        addMessageToChat(messagesContainer, data.response, 'assistant');
    } catch (error) {
        addMessageToChat(messagesContainer, 'Erreur lors de l\'envoi du message.', 'error');
    }
}

// Fonction pour enrichir le message avec le contexte
function prepareEnrichedMessage(message) {
    let enrichedMessage = message;
    
    if (contractContext.content) {
        enrichedMessage = `Question sur le contrat analysé:\n${message}\n\n`;
        
        if (contractContext.problematicClauses.length > 0) {
            enrichedMessage += `Contexte - Clauses problématiques identifiées:\n`;
            contractContext.problematicClauses.forEach(clause => {
                enrichedMessage += `- ${clause.type}: ${clause.description}\n`;
            });
        }
        
        if (contractContext.aiScore > 0) {
            enrichedMessage += `\nScore IA détecté: ${contractContext.aiScore}%\n`;
        }
        
        enrichedMessage += `\nExtrait du contrat:\n${contractContext.content.substring(0, 1000)}...`;
    }
    
    return enrichedMessage;
}

// Gérer les suggestions de questions
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    
    // Gérer les boutons de suggestions
    const suggestionButtons = document.querySelectorAll('.suggestion-btn');
    suggestionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            const chatInput = document.getElementById('chatInputModal');
            if (chatInput) {
                chatInput.value = question;
                sendChatMessage('modal');
            }
        });
    });
    
    // Masquer les suggestions après la première utilisation
    const hideSuggestions = () => {
        const suggestions = document.getElementById('chatSuggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    };
});

// Fonction helper pour ajouter des messages au chat
function addMessageToChat(container, message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;
    
    const icon = type === 'user' ? 'fa-user' : 'fa-robot';
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas ${icon}"></i>
            <div class="message-text">${message}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}