// logger.js - Handles logging and server communication
class Logger {
    constructor() {
        this.logs = [];
        this.serverUrl = 'YOUR_SERVER_ENDPOINT_HERE'; // Replace with actual server URL
        this.batchSize = 10;
        this.batchTimeout = 30000; // 30 seconds
        this.logQueue = [];
        this.isOnline = navigator.onLine;
        
        // Setup online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.flushOfflineLogs();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
        
        // Auto-flush logs periodically
        setInterval(() => {
            if (this.logQueue.length > 0) {
                this.sendLogsToServer();
            }
        }, this.batchTimeout);
    }

    logEvent(type, message, data = {}) {
        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            type: 'EVENT',
            category: type,
            message: message,
            data: data,
            severity: 'INFO'
        };
        
        this.addLog(logEntry);
        this.displayLog(logEntry, 'info');
    }

    logViolation(type, message, data = {}) {
        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            type: 'VIOLATION',
            category: type,
            message: message,
            data: data,
            severity: 'HIGH'
        };
        
        this.addLog(logEntry);
        this.displayLog(logEntry, 'error');
        
        // Immediate send for violations if online
        if (this.isOnline) {
            this.sendLogsToServer([logEntry]);
        }
    }

    logWarning(type, message, data = {}) {
        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            type: 'WARNING',
            category: type,
            message: message,
            data: data,
            severity: 'MEDIUM'
        };
        
        this.addLog(logEntry);
        this.displayLog(logEntry, 'warning');
    }

    logError(type, message, error = null) {
        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            type: 'ERROR',
            category: type,
            message: message,
            data: {
                error: error ? error.toString() : null,
                stack: error ? error.stack : null
            },
            severity: 'HIGH'
        };
        
        this.addLog(logEntry);
        this.displayLog(logEntry, 'error');
    }

    addLog(logEntry) {
        this.logs.push(logEntry);
        this.logQueue.push(logEntry);
        
        // Keep only last 1000 logs in memory
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }
        
        // Auto-send if batch size reached
        if (this.logQueue.length >= this.batchSize && this.isOnline) {
            this.sendLogsToServer();
        }
    }

    async sendLogsToServer(specificLogs = null) {
        const logsToSend = specificLogs || [...this.logQueue];
        
        if (logsToSend.length === 0) return;
        
        try {
            const payload = {
                sessionId: this.getSessionId(),
                timestamp: new Date().toISOString(),
                logs: logsToSend,
                clientInfo: {
                    userAgent: navigator.userAgent,
                    screen: {
                        width: screen.width,
                        height: screen.height
                    },
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };

            // In a real implementation, replace this with actual server call
            console.log('Sending logs to server:', payload);
            
            // Simulate server call
            const response = await this.simulateServerCall(payload);
            
            if (response.success) {
                // Remove sent logs from queue if not specific logs
                if (!specificLogs) {
                    this.logQueue = [];
                }
                console.log(`Successfully sent ${logsToSend.length} logs to server`);
            } else {
                console.error('Failed to send logs to server:', response.error);
            }
            
        } catch (error) {
            console.error('Error sending logs to server:', error);
            // Keep logs in queue for retry
        }
    }

    async simulateServerCall(payload) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        // Simulate occasional failures
        if (Math.random() < 0.1) {
            return { success: false, error: 'Simulated network error' };
        }
        
        return { success: true, logId: this.generateLogId() };
    }

    flushOfflineLogs() {
        if (this.logQueue.length > 0) {
            console.log('Coming back online, flushing offline logs...');
            this.sendLogsToServer();
        }
    }

    displayLog(logEntry, cssClass) {
        const logsContainer = document.getElementById('logsContainer');
        if (!logsContainer) return;
        
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${cssClass}`;
        
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        const severityIcon = this.getSeverityIcon(logEntry.severity);
        
        logElement.innerHTML = `
            <span class="timestamp">[${timestamp}]</span> 
            ${severityIcon} 
            <strong>${logEntry.category}:</strong> 
            ${logEntry.message}
        `;
        
        logsContainer.appendChild(logElement);
        
        // Auto-scroll to bottom
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        // Keep only last 50 log entries in UI
        while (logsContainer.children.length > 50) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }

    getSeverityIcon(severity) {
        switch (severity) {
            case 'HIGH': return '🚨';
            case 'MEDIUM': return '⚠️';
            case 'INFO': return 'ℹ️';
            default: return '📝';
        }
    }

    generateLogId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('proctoring_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('proctoring_session_id', sessionId);
        }
        return sessionId;
    }

    // Export logs for debugging
    exportLogs() {
        const dataStr = JSON.stringify(this.logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `proctoring_logs_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // Get log statistics
    getLogStats() {
        const stats = {
            total: this.logs.length,
            violations: this.logs.filter(log => log.type === 'VIOLATION').length,
            warnings: this.logs.filter(log => log.type === 'WARNING').length,
            errors: this.logs.filter(log => log.type === 'ERROR').length,
            events: this.logs.filter(log => log.type === 'EVENT').length
        };
        
        const categories = {};
        this.logs.forEach(log => {
            categories[log.category] = (categories[log.category] || 0) + 1;
        });
        
        stats.categories = categories;
        return stats;
    }

    // Clear all logs
    clearLogs() {
        this.logs = [];
        this.logQueue = [];
        const logsContainer = document.getElementById('logsContainer');
        if (logsContainer) {
            logsContainer.innerHTML = '';
        }
    }
}

// Export for use in main.js
window.Logger = Logger;