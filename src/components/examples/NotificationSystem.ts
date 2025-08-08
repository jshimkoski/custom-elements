import { component, html, css, type ComponentState, eventBus, Store } from '../../lib/runtime.ts';

// ============================================================================
// SHARED STORE FOR NOTIFICATION DATA
// ============================================================================

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface GlobalNotificationState {
  notifications: Notification[];
  unreadCount: number;
  isVisible: boolean;
  filter: 'all' | 'unread' | 'read';
}

// Create shared store for notifications
export const notificationStore = new Store<GlobalNotificationState>({
  notifications: [
    {
      id: '1',
      type: 'info',
      title: 'Welcome!',
      message: 'This notification system demonstrates store + event bus integration.',
      timestamp: Date.now() - 300000, // 5 minutes ago
      read: false
    },
    {
      id: '2',
      type: 'success',
      title: 'Store Connected',
      message: 'The notification store is working correctly.',
      timestamp: Date.now() - 120000, // 2 minutes ago
      read: true
    }
  ],
  unreadCount: 1,
  isVisible: false,
  filter: 'all'
});

// ============================================================================
// NOTIFICATION PANEL COMPONENT
// ============================================================================

interface NotificationPanelState extends ComponentState {
  localNotifications: Notification[];
  localUnreadCount: number;
  localIsVisible: boolean;
  localFilter: 'all' | 'unread' | 'read';
}

component<NotificationPanelState>({
  tag: 'notification-panel',

  state: {
    localNotifications: [],
    localUnreadCount: 0,
    localIsVisible: false,
    localFilter: 'all'
  },

  computed: {
    filteredNotifications: (state) => {
      switch (state.localFilter) {
        case 'unread': return state.localNotifications.filter(n => !n.read);
        case 'read': return state.localNotifications.filter(n => n.read);
        default: return state.localNotifications;
      }
    },
    
    hasNotifications: (state) => state.localNotifications.length > 0
  },

  template: (state) => {
    const filteredNotifications = (state as any).filteredNotifications;
    const hasNotifications = (state as any).hasNotifications;

    if (!state.localIsVisible) return '';

    return html`
    <div class="notification-panel">
      <div class="panel-header">
        <h3>🔔 Notifications</h3>
        <div class="header-controls">
          <select data-ref="filterSelect" class="filter-select">
            <option value="all" ${state.localFilter === 'all' ? 'selected' : ''}>All</option>
            <option value="unread" ${state.localFilter === 'unread' ? 'selected' : ''}>Unread</option>
            <option value="read" ${state.localFilter === 'read' ? 'selected' : ''}>Read</option>
          </select>
          <button data-ref="markAllRead" class="mark-all-btn" ${!hasNotifications ? 'disabled' : ''}>
            Mark All Read
          </button>
          <button data-ref="closePanel" class="close-btn">✕</button>
        </div>
      </div>

      <div class="notifications-list" data-ref="notificationsList">
        ${filteredNotifications.length === 0 ? `
          <div class="empty-state">
            <p>No notifications to show</p>
          </div>
        ` : filteredNotifications.map((notification: Notification) => `
          <div class="notification-item ${notification.type} ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
            <div class="notification-icon">
              ${notification.type === 'info' ? 'ℹ️' : 
                notification.type === 'success' ? '✅' : 
                notification.type === 'warning' ? '⚠️' : '❌'}
            </div>
            <div class="notification-content">
              <div class="notification-title">${notification.title}</div>
              <div class="notification-message">${notification.message}</div>
              <div class="notification-time">${new Date(notification.timestamp).toLocaleTimeString()}</div>
            </div>
            <div class="notification-actions">
              ${!notification.read ? `
                <button class="mark-read-btn" data-id="${notification.id}">Mark Read</button>
              ` : ''}
              <button class="remove-btn" data-id="${notification.id}">Remove</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  },

  refs: {
    closePanel: (el, _state, _api) => {
      el.addEventListener('click', () => {
        eventBus.emit('notification:toggle');
      });
    },

    markAllRead: (el, _state, _api) => {
      el.addEventListener('click', () => {
        eventBus.emit('notification:mark-all-read');
      });
    },

    filterSelect: (el, _state, _api) => {
      el.addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        eventBus.emit('notification:set-filter', { filter: select.value as any });
      });
    },

    notificationsList: (el, _state, _api) => {
      // Add event delegation to the notifications list container
      el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        console.log('Notification list click:', target, target.classList.toString());
        
        if (target.classList.contains('mark-read-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const id = target.getAttribute('data-id');
          if (id) {
            console.log('Mark read clicked for:', id);
            eventBus.emit('notification:mark-read', { id });
          }
        }
        
        if (target.classList.contains('remove-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const id = target.getAttribute('data-id');
          if (id) {
            console.log('Remove clicked for:', id);
            eventBus.emit('notification:remove', { id });
          }
        }
      });
    }
  },

  onMount: (_state, api) => {
    // Subscribe to store changes
    notificationStore.subscribe((globalState) => {
      api.update({
        localNotifications: globalState.notifications,
        localUnreadCount: globalState.unreadCount,
        localIsVisible: globalState.isVisible,
        localFilter: globalState.filter
      });
    });

    // Listen for event bus events
    eventBus.on('notification:toggle', () => {
      const globalState = notificationStore.getState();
      globalState.isVisible = !globalState.isVisible;
      
      // Emit another event when visibility changes
      eventBus.emit('notification:visibility-changed', { isVisible: globalState.isVisible });
    });

    eventBus.on('notification:mark-read', (data: { id: string }) => {
      console.log('Processing mark-read event for:', data.id);
      const globalState = notificationStore.getState();
      const notification = globalState.notifications.find(n => n.id === data.id);
      if (notification && !notification.read) {
        notification.read = true;
        globalState.unreadCount = Math.max(0, globalState.unreadCount - 1);
        console.log('Marked notification as read:', data.id);
      }
    });

    eventBus.on('notification:mark-all-read', () => {
      console.log('Processing mark-all-read event');
      const globalState = notificationStore.getState();
      globalState.notifications.forEach(n => n.read = true);
      globalState.unreadCount = 0;
    });

    eventBus.on('notification:remove', (data: { id: string }) => {
      console.log('Processing remove event for:', data.id);
      const globalState = notificationStore.getState();
      const index = globalState.notifications.findIndex(n => n.id === data.id);
      if (index !== -1) {
        const notification = globalState.notifications[index];
        if (!notification.read) {
          globalState.unreadCount = Math.max(0, globalState.unreadCount - 1);
        }
        // Instead of splice, create a new array to trigger reactivity
        globalState.notifications = globalState.notifications.filter(n => n.id !== data.id);
        console.log('Removed notification:', data.id);
      }
    });

    eventBus.on('notification:set-filter', (data: { filter: 'all' | 'unread' | 'read' }) => {
      const globalState = notificationStore.getState();
      globalState.filter = data.filter;
    });
  },

  style: css`
    .notification-panel {
      position: fixed;
      top: 60px;
      right: 20px;
      width: 400px;
      max-width: 90vw;
      max-height: 80vh;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
      z-index: 1000;
    }

    .panel-header {
      background: #f8f9fa;
      padding: 16px;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .header-controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .filter-select {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .mark-all-btn, .close-btn {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
    }

    .mark-all-btn:hover, .close-btn:hover {
      background: #f0f0f0;
    }

    .mark-all-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .notifications-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      padding: 16px;
      border-bottom: 1px solid #eee;
      gap: 12px;
    }

    .notification-item.unread {
      background: #f0f8ff;
      border-left: 4px solid #007bff;
    }

    .notification-item.info { border-left-color: #17a2b8; }
    .notification-item.success { border-left-color: #28a745; }
    .notification-item.warning { border-left-color: #ffc107; }
    .notification-item.error { border-left-color: #dc3545; }

    .notification-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .notification-content {
      flex: 1;
    }

    .notification-title {
      font-weight: bold;
      margin-bottom: 4px;
    }

    .notification-message {
      color: #666;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .notification-time {
      color: #999;
      font-size: 12px;
    }

    .notification-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .mark-read-btn, .remove-btn {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 12px;
    }

    .mark-read-btn:hover, .remove-btn:hover {
      background: #f0f0f0;
    }

    .empty-state {
      padding: 32px;
      text-align: center;
      color: #666;
    }
  `
});

// ============================================================================
// NOTIFICATION BUTTON COMPONENT (HEADER BUTTON)
// ============================================================================

interface NotificationButtonState extends ComponentState {
  unreadCount: number;
  isVisible: boolean;
}

component<NotificationButtonState>({
  tag: 'notification-button',
  
  state: {
    unreadCount: 0,
    isVisible: false
  },

  onMount: (_state, api) => {
    // Subscribe to store changes
    notificationStore.subscribe((globalState) => {
      api.update({
        unreadCount: globalState.unreadCount,
        isVisible: globalState.isVisible
      });
    });

    // Listen for visibility changes
    eventBus.on('notification:visibility-changed', (data: { isVisible: boolean }) => {
      console.log('Notification panel visibility changed:', data.isVisible);
    });
  },

  template: (state) => html`
    <button class="notification-btn ${state.isVisible ? 'active' : ''}" data-ref="toggleBtn">
      🔔 Notifications
      ${state.unreadCount > 0 ? `<span class="badge">${state.unreadCount}</span>` : ''}
    </button>
  `,

  refs: {
    toggleBtn: (el, _state, _api) => {
      el.addEventListener('click', () => {
        eventBus.emit('notification:toggle');
      });
    }
  },

  style: css`
    .notification-btn {
      position: relative;
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
    }

    .notification-btn:hover {
      background: #f0f0f0;
    }

    .notification-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #dc3545;
      color: white;
      border-radius: 50%;
      padding: 2px 6px;
      font-size: 10px;
      min-width: 16px;
      text-align: center;
    }
  `
});

// ============================================================================
// NOTIFICATION CREATOR COMPONENT (FOR TESTING)
// ============================================================================

interface NotificationCreatorState extends ComponentState {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

component<NotificationCreatorState>({
  tag: 'notification-creator',
  
  state: {
    title: '',
    message: '',
    type: 'info'
  },

  template: (state) => html`
    <div class="notification-creator">
      <h3>🆕 Create New Notification</h3>
      <form data-ref="form" class="create-form">
        <div class="form-row">
          <label>Type:</label>
          <select data-ref="typeSelect" value="${state.type}">
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
        
        <div class="form-row">
          <label>Title:</label>
          <input 
            type="text" 
            data-ref="titleInput" 
            value="${state.title}" 
            placeholder="Notification title"
          >
        </div>
        
        <div class="form-row">
          <label>Message:</label>
          <textarea 
            data-ref="messageInput" 
            placeholder="Notification message"
          >${state.message}</textarea>
        </div>
        
        <div class="form-actions">
          <button type="submit" ${!state.title || !state.message ? 'disabled' : ''}>
            Create Notification
          </button>
          <button type="button" data-ref="quickTest">Quick Test</button>
        </div>
      </form>
    </div>
  `,

  refs: {
    form: (el, state, api) => {
      el.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!state.title || !state.message) return;

        // Create new notification via event bus
        eventBus.emit('notification:create', {
          type: state.type,
          title: state.title,
          message: state.message
        });

        // Clear form
        api.update({ title: '', message: '' });
      });
    },

    titleInput: (el, _state, api) => {
      el.addEventListener('input', (e) => {
        const input = e.target as HTMLInputElement;
        api.updateKey('title', input.value);
      });
    },

    messageInput: (el, _state, api) => {
      el.addEventListener('input', (e) => {
        const textarea = e.target as HTMLTextAreaElement;
        api.updateKey('message', textarea.value);
      });
    },

    typeSelect: (el, _state, api) => {
      el.addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        api.updateKey('type', select.value as any);
      });
    },

    quickTest: (el, _state, _api) => {
      el.addEventListener('click', () => {
        const notifications = [
          { type: 'info', title: 'Info Test', message: 'This is an info notification' },
          { type: 'success', title: 'Success Test', message: 'Operation completed successfully!' },
          { type: 'warning', title: 'Warning Test', message: 'Please check this warning' },
          { type: 'error', title: 'Error Test', message: 'Something went wrong!' }
        ];

        const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
        eventBus.emit('notification:create', randomNotification);
      });
    }
  },

  onMount: (_state, _api) => {
    // Listen for notification creation events
    eventBus.on('notification:create', (data: { type: string; title: string; message: string }) => {
      const globalState = notificationStore.getState();
      
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: data.type as any,
        title: data.title,
        message: data.message,
        timestamp: Date.now(),
        read: false
      };

      // Instead of unshift, create a new array to trigger reactivity
      globalState.notifications = [newNotification, ...globalState.notifications];
      globalState.unreadCount++;
      
      // Auto-show notifications panel when new notification is created
      if (!globalState.isVisible) {
        globalState.isVisible = true;
      }

      console.log('New notification created:', newNotification);
    });
  },

  style: css`
    .notification-creator {
      max-width: 400px;
      margin: 20px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: white;
    }

    .notification-creator h3 {
      margin-top: 0;
    }

    .create-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-row label {
      font-weight: bold;
      font-size: 14px;
    }

    .form-row input, .form-row select, .form-row textarea {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-row textarea {
      resize: vertical;
      min-height: 60px;
    }

    .form-actions {
      display: flex;
      gap: 8px;
    }

    .form-actions button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
    }

    .form-actions button[type="submit"] {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .form-actions button:hover {
      background: #f0f0f0;
    }

    .form-actions button[type="submit"]:hover {
      background: #0056b3;
    }

    .form-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `
});

// ============================================================================
// MAIN DEMO COMPONENT
// ============================================================================

interface NotificationSystemState extends ComponentState {
  activeDemo: boolean;
}

component<NotificationSystemState>({
  tag: 'notification-system-demo',
  
  state: {
    activeDemo: true
  },

  template: (_state) => html`
    <div class="notification-system-demo">
      <div class="demo-header">
        <h1>🔔 Notification System Demo</h1>
        <p>This example demonstrates using <strong>Store</strong> for shared state and <strong>Event Bus</strong> for component communication.</p>
        
        <div class="demo-controls">
          <notification-button></notification-button>
        </div>
      </div>

      <div class="demo-content">
        <div class="demo-section">
          <h2>How it works:</h2>
          <ul>
            <li><strong>Store</strong>: Shared notification state across all components</li>
            <li><strong>Event Bus</strong>: Components communicate via events (toggle, create, mark read, etc.)</li>
            <li><strong>Reactive</strong>: All components automatically update when state changes</li>
          </ul>
        </div>

        <notification-creator></notification-creator>
      </div>

      <notification-panel></notification-panel>
    </div>
  `,

  style: css`
    .notification-system-demo {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .demo-header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }

    .demo-header h1 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .demo-header p {
      color: #666;
      font-size: 16px;
      margin-bottom: 20px;
    }

    .demo-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
    }

    .demo-content {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 32px;
      align-items: start;
    }

    .demo-section h2 {
      margin-top: 0;
    }

    .demo-section ul {
      line-height: 1.6;
    }

    @media (max-width: 768px) {
      .demo-content {
        grid-template-columns: 1fr;
      }
    }
  `
});
