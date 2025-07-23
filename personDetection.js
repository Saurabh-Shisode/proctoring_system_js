// personDetection.js - Detects if no one is in the frame
class PersonDetection {
    constructor() {
        this.isActive = false;
        this.lastDetectionTime = 0;
        this.noPersonThreshold = 3000; // 3 seconds of no detection
        this.detectionInterval = null;
    }

    async initialize() {
        // Face-api.js models will be loaded in main.js
        console.log('Person Detection initialized');
    }

    start() {
        this.isActive = true;
        this.lastDetectionTime = Date.now();
        this.detectionInterval = setInterval(() => {
            this.checkNoPersonTimeout();
        }, 1000);
    }

    stop() {
        this.isActive = false;
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }
    }

    async detectPerson(detections) {
        if (!this.isActive) return;

        const currentTime = Date.now();
        const personDetected = detections && detections.length > 0;

        if (personDetected) {
            this.lastDetectionTime = currentTime;
            this.updateStatus('green', 'Person detected');
            return { status: 'person_present', count: detections.length };
        } else {
            this.updateStatus('red', 'No person detected');
            return { status: 'no_person', count: 0 };
        }
    }

    checkNoPersonTimeout() {
        if (!this.isActive) return;

        const currentTime = Date.now();
        const timeSinceLastDetection = currentTime - this.lastDetectionTime;

        if (timeSinceLastDetection > this.noPersonThreshold) {
            this.updateStatus('red', `No person for ${Math.floor(timeSinceLastDetection / 1000)}s`);
            
            // Log the violation
            if (window.logger) {
                window.logger.logViolation('NO_PERSON', 
                    `No person detected for ${Math.floor(timeSinceLastDetection / 1000)} seconds`);
            }
        }
    }

    updateStatus(color, text) {
        const indicator = document.getElementById('personIndicator');
        const textEl = document.getElementById('personText');
        
        if (indicator && textEl) {
            indicator.className = `status-indicator ${color}`;
            textEl.textContent = text;
        }
    }
}

// Export for use in main.js
window.PersonDetection = PersonDetection;