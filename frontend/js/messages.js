// Frontend Message Utilities
// Location: frontend/js/messages.js

// NOTE: API_URL is already defined in auth.js — do NOT redeclare

/**
 * Get all messages for a specific booking
 */
async function getMessages(bookingId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/messages/${bookingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      logout();
      return null;
    }

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    if (typeof showError === 'function') showError('Chat Error', 'Failed to load messages');
    return [];
  }
}

/**
 * Send a new message in a booking session
 */
async function sendMessageAPI(bookingId, messageText) {
  try {
    if (!messageText.trim()) {
      if (typeof showWarning === 'function') showWarning('Empty Message', 'Message cannot be empty');
      return null;
    }

    const token = getAuthToken();
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        message: messageText,
      }),
    });

    if (response.status === 401) {
      logout();
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error: ${response.status}`);
    }

    const data = await response.json();
    return data.messageData;
  } catch (error) {
    console.error('Error sending message:', error);
    if (typeof showError === 'function') showError('Send Failed', 'Failed to send message');
    return null;
  }
}

/**
 * Mark a message as read
 */
async function markMessageAsRead(messageId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/messages/${messageId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error marking message as read:', error);
    return false;
  }
}

/**
 * Get unread message count for a booking
 */
async function getUnreadCount(bookingId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/messages/${bookingId}/unread-count`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    return data.unreadCount || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Format timestamp for display
 */
function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Create a message element for display
 */
function createMessageElement(messageData, currentUserId) {
  const isOwnMessage = messageData.senderId === currentUserId;
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
  messageDiv.setAttribute('data-message-id', messageData._id);

  const roleClass = messageData.senderRole === 'tutor' ? 'tutor-role' : 'student-role';

  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="sender-name">${messageData.senderName}</span>
      <span class="sender-role ${roleClass}">${messageData.senderRole}</span>
      <span class="message-time">${formatMessageTime(messageData.createdAt)}</span>
    </div>
    <div class="message-content">${escapeHtml(messageData.message)}</div>
    ${!messageData.isRead && !isOwnMessage ? '<div class="unread-indicator">●</div>' : ''}
  `;

  return messageDiv;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Display typing indicator
 */
function showTypingIndicator(senderName) {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.innerHTML = `<span>${senderName} is typing</span><span class="dots">...</span>`;
  return typingDiv;
}
