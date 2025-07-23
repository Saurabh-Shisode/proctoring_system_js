// mobileDetection.js - Detects mobile phones in the frame
class MobileDetection {
    constructor() {
        this.isActive = false;
        this.model = null;
        this.mobileDetectionCount = 0;
        this.alertThreshold = 5; // Alert after 5 consecutive detections
        this.lastViolationTime = 0;
        this.violationCooldown = 3000; // 3 seconds between violation logs
        this.confidenceThreshold = 0.5;
    }

    async initialize() {
        try {
            // Load a pre-trained COCO-SSD model for object detection
            this.model = await tf.loadGraphModel('https://cdnjs.cloudflare.com/ajax/libs/tensorflow-models/1.3.1/coco-ssd/model.json');
            console.log('Mobile Detection model loaded');
        } catch (error) {
            console.error('Failed to load mobile detection model:', error);
            // Fallback to simple detection based on rectangular shapes
            this.useSimpleDetection = true;
        }
    }

    start() {
        this.isActive = true;
        this.mobileDetectionCount = 0;
    }

    stop() {
        this.isActive = false;
    }

    async detectMobile(video) {
        if (!this.isActive) return;

        try {
            let mobileDetected = false;
            let detections = [];

            if (this.model && !this.useSimpleDetection) {
                // Use TensorFlow model for detection
                const predictions = await this.model.executeAsync(tf.browser.fromPixels(video));
                detections = await this.processPredictions(predictions);
                mobileDetected = detections.length > 0;
            } else {
                // Fallback to simple detection
                const result = await this.simplePhoneDetection(video);
                mobileDetected = result.detected;
                detections = result.detections;
            }

            const currentTime = Date.now();

            if (mobileDetected) {
                this.mobileDetectionCount++;
                this.updateStatus('red', `Mobile detected! (${this.mobileDetectionCount})`);
                
                // Log violation if threshold reached and cooldown passed
                if (this.mobileDetectionCount >= this.alertThreshold && 
                    currentTime - this.lastViolationTime > this.violationCooldown) {
                    
                    if (window.logger) {
                        window.logger.logViolation('MOBILE_DETECTED', 
                            `Mobile phone detected in frame`);
                    }
                    
                    this.lastViolationTime = currentTime;
                }
                
                return { status: 'mobile_detected', detections: detections };
            } else {
                this.mobileDetectionCount = Math.max(0, this.mobileDetectionCount - 1);
                this.updateStatus('green', 'No mobile detected');
                return { status: 'no_mobile', detections: [] };
            }
        } catch (error) {
            console.error('Mobile detection error:', error);
            this.updateStatus('yellow', 'Detection error');
            return { status: 'error' };
        }
    }

    async processPredictions(predictions) {
        // Process TensorFlow model predictions
        const [boxes, scores, classes] = predictions;
        const boxesData = await boxes.data();
        const scoresData = await scores.data();
        const classesData = await classes.data();

        const detections = [];
        
        for (let i = 0; i < scoresData.length; i++) {
            if (scoresData[i] > this.confidenceThreshold) {
                const classId = classesData[i];
                // Check if detected object is likely a phone/mobile device
                // Class 77 is typically 'cell phone' in COCO dataset
                if (classId === 77 || this.isPhoneLikeObject(classId)) {
                    detections.push({
                        bbox: [
                            boxesData[i * 4],     // y1
                            boxesData[i * 4 + 1], // x1
                            boxesData[i * 4 + 2], // y2
                            boxesData[i * 4 + 3]  // x2
                        ],
                        score: scoresData[i],
                        class: classId
                    });
                }
            }
        }

        // Clean up tensors
        boxes.dispose();
        scores.dispose();
        classes.dispose();

        return detections;
    }

    isPhoneLikeObject(classId) {
        // Additional classes that might be phones or phone-like objects
        const phoneLikeClasses = [77, 78, 63]; // cell phone, book, laptop (sometimes confused)
        return phoneLikeClasses.includes(classId);
    }

    async simplePhoneDetection(video) {
        // Fallback method using basic computer vision techniques
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Simple detection based on rectangular shapes and edge detection
        const detections = this.findRectangularObjects(imageData);
        
        return {
            detected: detections.length > 0,
            detections: detections
        };
    }

    findRectangularObjects(imageData) {
        // Simplified edge detection and rectangular shape finding
        const { data, width, height } = imageData;
        const detections = [];
        
        // Convert to grayscale and find edges
        const gray = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const idx = i / 4;
            gray[idx] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        
        // Simple rectangular object detection
        // This is a very basic implementation - in production, you'd use more sophisticated methods
        const minWidth = 60;  // Minimum phone width in pixels
        const minHeight = 100; // Minimum phone height in pixels
        const maxWidth = 200;  // Maximum phone width in pixels
        const maxHeight = 350; // Maximum phone height in pixels
        
        // Scan for rectangular regions with high edge density
        for (let y = 0; y < height - minHeight; y += 10) {
            for (let x = 0; x < width - minWidth; x += 10) {
                for (let w = minWidth; w <= maxWidth && x + w < width; w += 20) {
                    for (let h = minHeight; h <= maxHeight && y + h < height; h += 20) {
                        const edgeDensity = this.calculateEdgeDensity(gray, x, y, w, h, width);
                        const aspectRatio = h / w;
                        
                        // Phone-like aspect ratio and sufficient edge density
                        if (aspectRatio > 1.4 && aspectRatio < 2.5 && edgeDensity > 0.3) {
                            detections.push({
                                bbox: [y, x, y + h, x + w],
                                score: edgeDensity,
                                type: 'rectangular_object'
                            });
                        }
                    }
                }
            }
        }
        
        return detections;
    }

    calculateEdgeDensity(gray, x, y, w, h, width) {
        let edgeCount = 0;
        let totalPixels = 0;
        
        for (let dy = y; dy < y + h - 1; dy++) {
            for (let dx = x; dx < x + w - 1; dx++) {
                const idx = dy * width + dx;
                const right = (dy * width + dx + 1);
                const down = ((dy + 1) * width + dx);
                
                if (right < gray.length && down < gray.length) {
                    const gradX = Math.abs(gray[right] - gray[idx]);
                    const gradY = Math.abs(gray[down] - gray[idx]);
                    const gradient = Math.sqrt(gradX * gradX + gradY * gradY);
                    
                    if (gradient > 30) { // Edge threshold
                        edgeCount++;
                    }
                    totalPixels++;
                }
            }
        }
        
        return totalPixels > 0 ? edgeCount / totalPixels : 0;
    }

    // Draw detection boxes on canvas
    drawDetections(detections, canvas) {
        if (!detections || detections.length === 0) return;

        const ctx = canvas.getContext('2d');
        const scaleX = canvas.width / 640;
        const scaleY = canvas.height / 480;
        
        detections.forEach((detection, index) => {
            const [y1, x1, y2, x2] = detection.bbox;
            
            // Scale coordinates to canvas size
            const drawBox = {
                x: x1 * scaleX,
                y: y1 * scaleY,
                width: (x2 - x1) * scaleX,
                height: (y2 - y1) * scaleY
            };

            // Draw bounding box for mobile phone
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(drawBox.x, drawBox.y, drawBox.width, drawBox.height);
            
            // Draw label
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`MOBILE ${(detection.score * 100).toFixed(0)}%`, 
                drawBox.x, drawBox.y - 5);
        });
    }

    updateStatus(color, text) {
        const indicator = document.getElementById('mobileIndicator');
        const textEl = document.getElementById('mobileText');
        
        if (indicator && textEl) {
            indicator.className = `status-indicator ${color}`;
            textEl.textContent = text;
        }
    }
}

// Export for use in main.js
window.MobileDetection = MobileDetection;