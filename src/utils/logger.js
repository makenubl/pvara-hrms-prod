/**
 * Frontend Logger Utility
 * Logs to console and stores in localStorage with rotation
 */

const MAX_LOGS = 1000; // Maximum number of logs to keep in localStorage
const LOG_STORAGE_KEY = 'pvara_hrms_logs';

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
  }

  /**
   * Get current timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Store log in localStorage with rotation
   */
  storeLog(level, message, data) {
    try {
      const logs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
      
      logs.push({
        timestamp: this.getTimestamp(),
        level,
        message,
        data,
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      // Keep only last MAX_LOGS entries
      if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS);
      }

      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  /**
   * Info level logging
   */
  info(message, data = null) {
    const timestamp = this.getTimestamp();
    console.log(`[INFO] ${timestamp}:`, message, data || '');
    this.storeLog('INFO', message, data);
  }

  /**
   * Warning level logging
   */
  warn(message, data = null) {
    const timestamp = this.getTimestamp();
    console.warn(`[WARN] ${timestamp}:`, message, data || '');
    this.storeLog('WARN', message, data);
  }

  /**
   * Error level logging
   */
  error(message, error = null) {
    const timestamp = this.getTimestamp();
    console.error(`[ERROR] ${timestamp}:`, message, error || '');
    
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : null;
    
    this.storeLog('ERROR', message, errorData);
  }

  /**
   * Debug level logging (only in development)
   */
  debug(message, data = null) {
    if (this.isDevelopment) {
      const timestamp = this.getTimestamp();
      console.debug(`[DEBUG] ${timestamp}:`, message, data || '');
    }
  }

  /**
   * API request logging
   */
  logApiRequest(method, url, data = null) {
    this.debug(`API ${method} ${url}`, data);
  }

  /**
   * API response logging
   */
  logApiResponse(method, url, status, data = null) {
    if (status >= 200 && status < 300) {
      this.debug(`API ${method} ${url} - ${status}`, data);
    } else if (status >= 400) {
      this.warn(`API ${method} ${url} - ${status}`, data);
    }
  }

  /**
   * API error logging
   */
  logApiError(method, url, error) {
    this.error(`API ${method} ${url} failed`, error);
  }

  /**
   * User action logging
   */
  logUserAction(action, details = null) {
    this.info(`User Action: ${action}`, details);
  }

  /**
   * Get all stored logs
   */
  getLogs() {
    try {
      return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    localStorage.removeItem(LOG_STORAGE_KEY);
    this.info('Logs cleared');
  }

  /**
   * Export logs as JSON file
   */
  exportLogs() {
    const logs = this.getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pvara-hrms-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.info('Logs exported');
  }
}

// Create singleton instance
const logger = new Logger();

// Log uncaught errors
window.addEventListener('error', (event) => {
  logger.error('Uncaught Error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Log unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection', {
    reason: event.reason
  });
});

export default logger;
