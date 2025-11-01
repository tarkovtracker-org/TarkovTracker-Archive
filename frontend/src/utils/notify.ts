import { ref } from 'vue';

export interface NotificationOptions {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  timeout?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

export interface NotificationState {
  show: boolean;
  message: string;
  color: string;
  action?: NotificationOptions['action'];
}

// Global notification state
const notificationState = ref<NotificationState>({
  show: false,
  message: '',
  color: 'accent',
});

// Timer management for auto-dismiss
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

const colorMap: Record<string, string> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

function clearAutoDismissTimer(): void {
  if (autoDismissTimer) {
    clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
}

function setAutoDismissTimer(timeout: number, callback: () => void): void {
  clearAutoDismissTimer();
  autoDismissTimer = setTimeout(callback, timeout);
}

export function notify(options: NotificationOptions | string): void {
  const opts: NotificationOptions = typeof options === 'string' ? { message: options } : options;

  // Clear any existing timer
  clearAutoDismissTimer();

  notificationState.value = {
    show: true,
    message: opts.message,
    color: colorMap[opts.type || 'info'] || 'accent',
    action: opts.action,
  };

  // Set up auto-dismiss if timeout is specified
  if (opts.timeout && opts.timeout > 0) {
    setAutoDismissTimer(opts.timeout, () => {
      notificationState.value.show = false;
      autoDismissTimer = null;
    });
  }
}

export function useNotification() {
  const close = () => {
    clearAutoDismissTimer();
    notificationState.value.show = false;
  };

  return {
    state: notificationState,
    notify,
    close,
  };
}
