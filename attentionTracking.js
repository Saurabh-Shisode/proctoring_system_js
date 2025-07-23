// attentionTracking.js - Detects if person is looking away or distracted
class AttentionTracking {
    constructor() {
        this.isActive = false;
        this.lookingAwayCount = 0;
        this.lookingAwayThreshold = 30; // 30 frames (about 1 second at 30fps)
        this.maxLookAwayTime = 5000; // 5 seconds maximum
        this.lookAwayStartTime = null;
        this.isLookingAway = false;
        this.headPoseThreshold = 0.15; // Threshold for head pose deviation
    }

    async initialize() {
        console.log('Attention Tracking initialized');
    }

    start() {
        this.isActive = true;
        this.lookingAwayCount = 0;
        this.lookAwayStartTime = null;
        this.isLookingAway = false;
    }

    stop() {
        this.isActive = false;
    }

    async trackAttention(detections) {
        if (!this.isActive || !detections || detections.length === 0) {
            this.updateStatus('yellow', 'No face to track');
            return { status: 'no_face' };
        }

        // Use the first face if multiple faces detected
        const detection = detections[0];
        const landmarks = detection.landmarks;
        
        if (!landmarks) {
            this.updateStatus('yellow', 'No landmarks detected');
            return { status: 'no_landmarks' };
        }

        const attentionResult = this.analyzeAttention(landmarks);
        const currentTime = Date.now();

        if (attentionResult.isLookingAway) {
            if (!this.isLookingAway) {
                this.lookAwayStartTime = currentTime;
                this.isLookingAway = true;
            }
            
            this.lookingAwayCount++;
            const lookAwayDuration = currentTime - this.lookAwayStartTime;
            
            this.updateStatus('red', `Looking away for ${Math.floor(lookAwayDuration / 1000)}s`);
            
            // Log violation if looking away too long
            if (lookAwayDuration > this.maxLookAwayTime) {
                if (window.logger) {
                    window.logger.logViolation('LOOKING_AWAY', 
                        `Looking away for ${Math.floor(lookAwayDuration / 1000)} seconds`);
                }
            }
            
            return { 
                status: 'looking_away', 
                duration: lookAwayDuration,
                direction: attentionResult.direction 
            };
        } else {
            if (this.isLookingAway) {
                // Was looking away, now looking back
                const totalLookAwayTime = currentTime - this.lookAwayStartTime;
                if (window.logger) {
                    window.logger.logEvent('ATTENTION_RESTORED', 
                        `Attention restored after ${Math.floor(totalLookAwayTime / 1000)} seconds`);
                }
            }
            
            this.lookingAwayCount = 0;
            this.lookAwayStartTime = null;
            this.isLookingAway = false;
            
            this.updateStatus('green', 'Paying attention');
            return { status: 'paying_attention' };
        }
    }

    analyzeAttention(landmarks) {
        // Get key points for attention analysis
        const leftEye = this.getEyeCenter(landmarks.getLeftEye());
        const rightEye = this.getEyeCenter(landmarks.getRightEye());
        const nose = landmarks.getNose()[3]; // Nose tip
        const mouth = this.getMouthCenter(landmarks.getMouth());

        // Calculate head pose based on facial landmarks
        const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2
        };

        // Calculate horizontal deviation (left/right)
        const horizontalDeviation = Math.abs(nose.x - eyeCenter.x) / Math.abs(rightEye.x - leftEye.x);
        
        // Calculate vertical deviation (up/down)
        const verticalDeviation = Math.abs(nose.y - eyeCenter.y) / Math.abs(mouth.y - eyeCenter.y);

        // Determine if looking away
        const isLookingAway = horizontalDeviation > this.headPoseThreshold || 
                             verticalDeviation > this.headPoseThreshold;

        // Determine direction
        let direction = 'center';
        if (isLookingAway) {
            if (horizontalDeviation > this.headPoseThreshold) {
                direction = nose.x > eyeCenter.x ? 'right' : 'left';
            } else if (verticalDeviation > this.headPoseThreshold) {
                direction = nose.y < eyeCenter.y ? 'up' : 'down';
            }
        }

        return {
            isLookingAway,
            direction,
            horizontalDeviation,
            verticalDeviation
        };
    }

    getEyeCenter(eyePoints) {
        const sumX = eyePoints.reduce((sum, point) => sum + point.x, 0);
        const sumY = eyePoints.reduce((sum, point) => sum + point.y, 0);
        return {
            x: sumX / eyePoints.length,
            y: sumY / eyePoints.length
        };
    }

    getMouthCenter(mouthPoints) {
        const sumX = mouthPoints.reduce((sum, point) => sum + point.x, 0);
        const sumY = mouthPoints.reduce((sum, point) => sum + point.y, 0);
        return {
            x: sumX / mouthPoints.length,
            y: sumY / mouthPoints.length
        };
    }

    updateStatus(color, text) {
        const indicator = document.getElementById('attentionIndicator');
        const textEl = document.getElementById('attentionText');
        
        if (indicator && textEl) {
            indicator.className = `status-indicator ${color}`;
            textEl.textContent = text;
        }
    }
}

// Export for use in main.js
window.AttentionTracking = AttentionTracking;