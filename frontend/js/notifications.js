// Toast Notification System

// Inject styles for notifications
const injectNotificationStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    #notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    }

    .notification {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      padding: 16px 20px;
      margin-bottom: 12px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      animation: slideIn 0.3s ease-out;
      border-left: 4px solid;
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    .notification.removing {
      animation: slideOut 0.3s ease-out;
    }

    .notification-icon {
      font-size: 24px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .notification-content {
      flex: 1;
    }

    .notification-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }

    .notification-message {
      font-size: 13px;
      color: #666;
      line-height: 1.4;
    }

    .notification-close {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      margin-left: 8px;
      flex-shrink: 0;
      transition: color 0.2s;
    }

    .notification-close:hover {
      color: #333;
    }

    /* Notification types */
    .notification.success {
      border-left-color: #27ae60;
    }

    .notification.error {
      border-left-color: #e74c3c;
    }

    .notification.info {
      border-left-color: #667eea;
    }

    .notification.warning {
      border-left-color: #f39c12;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      #notification-container {
        left: 12px;
        right: 12px;
        max-width: none;
      }
    }
  `;
  document.head.appendChild(style);
};

// Create notification container if not exists
const getNotificationContainer = () => {
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
    injectNotificationStyles();
  }
  return container;
};

// Show notification toast
function showNotificationToast(notificationData) {
  const { type = 'info', title, message, duration = 5000 } = notificationData;
  
  const container = getNotificationContainer();

  // Determine icon based on type
  const icons = {
    'booking-created': '📌',
    'status-changed': '🔄',
    'booking-cancelled': '❌',
    'feedback-received': '⭐',
    'success': '✓',
    'error': '✗',
    'info': 'ℹ',
    'warning': '⚠',
  };

  const icon = icons[type] || icons['info'];

  // Create notification element safely (prevent XSS — no innerHTML for user data)
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'notification-icon';
  iconDiv.textContent = icon;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'notification-content';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'notification-title';
  titleDiv.textContent = title; // Safe: textContent escapes HTML

  const msgDiv = document.createElement('div');
  msgDiv.className = 'notification-message';
  msgDiv.textContent = message; // Safe: textContent escapes HTML

  contentDiv.appendChild(titleDiv);
  contentDiv.appendChild(msgDiv);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'notification-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => notification.remove());

  notification.appendChild(iconDiv);
  notification.appendChild(contentDiv);
  notification.appendChild(closeBtn);

  container.appendChild(notification);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('removing');
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }

  return notification;
}

// Quick notification helpers
function showSuccess(title, message, duration = 5000) {
  return showNotificationToast({
    type: 'success',
    title,
    message,
    duration,
  });
}

function showError(title, message, duration = 5000) {
  return showNotificationToast({
    type: 'error',
    title,
    message,
    duration,
  });
}

function showInfo(title, message, duration = 5000) {
  return showNotificationToast({
    type: 'info',
    title,
    message,
    duration,
  });
}

function showWarning(title, message, duration = 5000) {
  return showNotificationToast({
    type: 'warning',
    title,
    message,
    duration,
  });
}

// Show booking notification
function showBookingNotification(notification) {
  const { type, title, message, data } = notification;
  
  showNotificationToast({
    type,
    title,
    message,
    duration: 6000,
  });
}
