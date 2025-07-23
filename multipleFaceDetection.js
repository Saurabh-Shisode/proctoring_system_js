// multipleFaceDetection.js - Detects multiple faces in frame
class MultipleFaceDetection {
    constructor() {
        this.isActive = false;
        this.multipleFaceCount = 0;
        this.alertThreshold = 3; // Alert after 3 consecutive detections
        this.lastViolationTime = 0;
        this.violationCooldown = 5000; // 5 seconds between violation logs
    }

    async initialize() {
        console.log('Multiple Face Detection initialized');
    }

    start() {
        this.isActive = true;
        this.multipleFaceCount = 0;
    }

    stop() {
        this.isActive = false;
    }

    async detectMultipleFaces(detections) {
        if (!this.isActive) return;

        const currentTime = Date.now();
        const faceCount = detections ? detections.length : 0;

        if (faceCount === 0) {
            this.multipleFaceCount = 0;
            this.updateStatus('yellow', 'No faces detected');
            return { status: 'no_faces', count: 0 };
        } else if (faceCount === 1) {
            this.multipleFaceCount = 0;
            this.updateStatus('green', 'Single face detected');
            return { status: 'single_face', count: 1 };
        } else {
            this.multipleFaceCount++;
            this.updateStatus('red', `${faceCount} faces detected`);
            
            // Log violation if threshold reached and cooldown passed
            if (this.multipleFaceCount >= this.alertThreshold && 
                currentTime - this.lastViolationTime > this.violationCooldown) {
                
                if (window.logger) {
                    window.logger.logViolation('MULTIPLE_FACES', 
                        `${faceCount} faces detected in frame`);
                }
                
                this.lastViolationTime = currentTime;
            }
            
            return { status: 'multiple_faces', count: faceCount };
        }
    }

    // Draw bounding boxes for all detected faces
    drawFaceBoxes(detections, canvas) {
        if (!detections || detections.length === 0) return;

        const ctx = canvas.getContext('2d');
        const displaySize = { width: canvas.width, height: canvas.height };
        
        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        detections.forEach((detection, index) => {
            const box = detection.detection.box;
            const drawBox = {
                x: box.x * displaySize.width / 640,
                y: box.y * displaySize.height / 480,
                width: box.width * displaySize.width / 640,
                height: box.height * displaySize.height / 480
            };

            // Draw bounding box
            ctx.strokeStyle = detections.length > 1 ? '#ff0000' : '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(drawBox.x, drawBox.y, drawBox.width, drawBox.height);
            
            // Draw face number if multiple faces
            if (detections.length > 1) {
                ctx.fillStyle = '#ff0000';
                ctx.font = '16px Arial';
                ctx.fillText(`Face ${index + 1}`, drawBox.x, drawBox.y - 5);
            }
        });
    }

    updateStatus(color, text) {
        const indicator = document.getElementById('multipleIndicator');
        const textEl = document.getElementById('multipleText');
        
        if (indicator && textEl) {
            indicator.className = `status-indicator ${color}`;
            textEl.textContent = text;
        }
    }
}

// Export for use in main.js
window.MultipleFaceDetection = MultipleFaceDetection;