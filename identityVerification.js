// identityVerification.js - Detects wrong person in frame
class IdentityVerification {
    constructor() {
        this.isActive = false;
        this.referenceDescriptor = null;
        this.similarityThreshold = 0.6; // Adjust based on accuracy needs
        this.wrongPersonCount = 0;
        this.wrongPersonThreshold = 5; // Consecutive wrong detections before alert
    }

    async initialize() {
        console.log('Identity Verification initialized');
    }

    start() {
        this.isActive = true;
        this.wrongPersonCount = 0;
    }

    stop() {
        this.isActive = false;
    }

    async setReference(video) {
        try {
            const canvas = document.getElementById('canvas');
            const detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (detections.length === 1) {
                this.referenceDescriptor = detections[0].descriptor;
                this.updateStatus('green', 'Reference person set');
                
                if (window.logger) {
                    window.logger.logEvent('REFERENCE_SET', 'Reference person successfully set');
                }
                
                return true;
            } else {
                this.updateStatus('red', 'Multiple faces or no face detected');
                return false;
            }
        } catch (error) {
            console.error('Error setting reference:', error);
            this.updateStatus('red', 'Error setting reference');
            return false;
        }
    }

    async verifyIdentity(detections) {
        if (!this.isActive || !this.referenceDescriptor) {
            this.updateStatus('yellow', 'No reference set');
            return { status: 'no_reference' };
        }

        if (!detections || detections.length === 0) {
            this.updateStatus('yellow', 'No face detected');
            return { status: 'no_face' };
        }

        if (detections.length > 1) {
            this.updateStatus('red', 'Multiple faces detected');
            return { status: 'multiple_faces' };
        }

        const detection = detections[0];
        const distance = faceapi.euclideanDistance(this.referenceDescriptor, detection.descriptor);
        const similarity = 1 - distance;

        if (similarity >= this.similarityThreshold) {
            this.wrongPersonCount = 0;
            this.updateStatus('green', `Correct person (${(similarity * 100).toFixed(1)}%)`);
            return { status: 'correct_person', similarity: similarity };
        } else {
            this.wrongPersonCount++;
            this.updateStatus('red', `Wrong person (${(similarity * 100).toFixed(1)}%)`);
            
            if (this.wrongPersonCount >= this.wrongPersonThreshold) {
                if (window.logger) {
                    window.logger.logViolation('WRONG_PERSON', 
                        `Wrong person detected (similarity: ${(similarity * 100).toFixed(1)}%)`);
                }
            }
            
            return { status: 'wrong_person', similarity: similarity };
        }
    }

    updateStatus(color, text) {
        const indicator = document.getElementById('identityIndicator');
        const textEl = document.getElementById('identityText');
        
        if (indicator && textEl) {
            indicator.className = `status-indicator ${color}`;
            textEl.textContent = text;
        }
    }
}

// Export for use in main.js
window.IdentityVerification = IdentityVerification;