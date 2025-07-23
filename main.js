// main.js - Main application controller
class ProctoringSystem {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.isMonitoring = false;
        this.animationFrame = null;
        
        // Initialize all detection modules
        this.personDetection = new PersonDetection();
        this.identityVerification = new IdentityVerification();
        this.multipleFaceDetection = new MultipleFaceDetection();
        this.attentionTracking = new AttentionTracking();
        this.mobileDetection = new MobileDetection();
        this.logger = new Logger();
        
        // Make logger available globally
        window.logger = this.logger;
        
        this.detectionInterval = 100; // Run detection every 100ms
        this.lastDetectionTime = 0;
    }

    async initialize() {
        try {
            this.logger.logEvent('SYSTEM_INIT', 'Initializing proctoring system...');
            
            // Get DOM elements
            this.video = document.getElementById('videoElement');
            this.canvas = document.getElementById('canvas');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load face-api.js models
            await this.loadFaceApiModels();
            
            // Initialize all detection modules
            await Promise.all([
                this.personDetection.initialize(),
                this.identityVerification.initialize(),
                this.multipleFaceDetection.initialize(),
                this.attentionTracking.initialize(),
                this.mobileDetection.initialize()
            ]);
            
            // Setup camera
            await this.setupCamera();
            
            this.logger.logEvent('SYSTEM_INIT', 'Proctoring system initialized successfully');
            
        } catch (error) {
            this.logger.logError('SYSTEM_INIT', 'Failed to initialize proctoring system', error);
            throw error;
        }
    }

    async loadFaceApiModels() {
        try {
            this.logger.logEvent('MODEL_LOADING', 'Loading face detection models...');
            
            // const modelPath = 'https://cdnjs.cloudflare.com/ajax/libs/face-api.js/0.22.2/models';
            const modelPath = '/models';
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
                faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
            ]);
            
            this.logger.logEvent('MODEL_LOADING', 'Face detection models loaded successfully');
            
        } catch (error) {
            this.logger.logError('MODEL_LOADING', 'Failed to load face detection models', error);
            throw error;
        }
    }

    async setupCamera() {
        try {
            this.logger.logEvent('CAMERA_SETUP', 'Setting up camera...');
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });
            
            this.video.srcObject = stream;
            
            // Wait for video to load
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    // Set canvas size to match video
                    this.canvas.width = this.video.videoWidth || 640;
                    this.canvas.height = this.video.videoHeight || 480;
                    resolve();
                };
            });
            
            this.logger.logEvent('CAMERA_SETUP', 'Camera setup completed');
            
        } catch (error) {
            this.logger.logError('CAMERA_SETUP', 'Failed to setup camera', error);
            throw error;
        }
    }

    setupEventListeners() {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const setReferenceBtn = document.getElementById('setReferenceBtn');
        
        startBtn.addEventListener('click', () => this.startMonitoring());
        stopBtn.addEventListener('click', () => this.stopMonitoring());
        setReferenceBtn.addEventListener('click', () => this.setReferencePerson());
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.isMonitoring ? this.stopMonitoring() : this.startMonitoring();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.setReferencePerson();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.logger.exportLogs();
                        break;
                }
            }
        });
    }

    async startMonitoring() {
        if (this.isMonitoring) return;
        
        try {
            this.logger.logEvent('MONITORING', 'Starting monitoring session');
            
            this.isMonitoring = true;
            
            // Update UI
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            
            // Start all detection modules
            this.personDetection.start();
            this.identityVerification.start();
            this.multipleFaceDetection.start();
            this.attentionTracking.start();
            this.mobileDetection.start();
            
            // Start detection loop
            this.runDetectionLoop();
            
        } catch (error) {
            this.logger.logError('MONITORING', 'Failed to start monitoring', error);
            this.stopMonitoring();
        }
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.logger.logEvent('MONITORING', 'Stopping monitoring session');
        
        this.isMonitoring = false;
        
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Stop all detection modules
        this.personDetection.stop();
        this.identityVerification.stop();
        this.multipleFaceDetection.stop();
        this.attentionTracking.stop();
        this.mobileDetection.stop();
        
        // Update UI
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        
        // Clear canvas
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Log session statistics
        const stats = this.logger.getLogStats();
        this.logger.logEvent('SESSION_END', 'Monitoring session ended', stats);
    }

    async setReferencePerson() {
        try {
            this.logger.logEvent('REFERENCE_SETTING', 'Setting reference person...');
            
            const success = await this.identityVerification.setReference(this.video);
            
            if (success) {
                this.logger.logEvent('REFERENCE_SETTING', 'Reference person set successfully');
                alert('Reference person set successfully!');
            } else {
                this.logger.logWarning('REFERENCE_SETTING', 'Failed to set reference person');
                alert('Failed to set reference person. Please ensure only one face is visible.');
            }
            
        } catch (error) {
            this.logger.logError('REFERENCE_SETTING', 'Error setting reference person', error);
            alert('Error setting reference person.');
        }
    }

    async runDetectionLoop() {
        if (!this.isMonitoring) return;
        
        const currentTime = Date.now();
        
        // Run detection at specified interval
        if (currentTime - this.lastDetectionTime >= this.detectionInterval) {
            await this.performDetection();
            this.lastDetectionTime = currentTime;
        }
        
        // Schedule next frame
        this.animationFrame = requestAnimationFrame(() => this.runDetectionLoop());
    }

    async performDetection() {
        try {
            // Face detection with landmarks and descriptors
            const detections = await faceapi
                .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();
            
            // Run all detections in parallel
            const results = await Promise.all([
                this.personDetection.detectPerson(detections),
                this.identityVerification.verifyIdentity(detections),
                this.multipleFaceDetection.detectMultipleFaces(detections),
                this.attentionTracking.trackAttention(detections),
                this.mobileDetection.detectMobile(this.video)
            ]);
            
            // Draw detection results on canvas
            this.drawDetectionResults(detections, results);
            
        } catch (error) {
            this.logger.logError('DETECTION', 'Error during detection', error);
        }
    }

    drawDetectionResults(faceDetections, results) {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw face detection boxes
        if (faceDetections && faceDetections.length > 0) {
            this.multipleFaceDetection.drawFaceBoxes(faceDetections, this.canvas);
        }
        
        // Draw mobile detection boxes if any
        const mobileResult = results[4];
        if (mobileResult && mobileResult.detections) {
            this.mobileDetection.drawDetections(mobileResult.detections, this.canvas);
        }
        
        // Draw status overlay
        this.drawStatusOverlay(ctx, results);
    }

    drawStatusOverlay(ctx, results) {
        const [personResult, identityResult, multipleResult, attentionResult, mobileResult] = results;
        
        // Draw semi-transparent overlay for status
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 250, 120);
        
        // Draw status text
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        
        let y = 30;
        const lineHeight = 18;
        
        // Person status
        ctx.fillStyle = personResult?.status === 'person_present' ? '#4CAF50' : '#f44336';
        ctx.fillText(`Person: ${personResult?.status || 'unknown'}`, 20, y);
        y += lineHeight;
        
        // Identity status
        ctx.fillStyle = identityResult?.status === 'correct_person' ? '#4CAF50' : '#f44336';
        ctx.fillText(`Identity: ${identityResult?.status || 'unknown'}`, 20, y);
        y += lineHeight;
        
        // Multiple faces status
        ctx.fillStyle = multipleResult?.status === 'single_face' ? '#4CAF50' : '#f44336';
        ctx.fillText(`Faces: ${multipleResult?.count || 0}`, 20, y);
        y += lineHeight;
        
        // Attention status
        ctx.fillStyle = attentionResult?.status === 'paying_attention' ? '#4CAF50' : '#f44336';
        ctx.fillText(`Attention: ${attentionResult?.status || 'unknown'}`, 20, y);
        y += lineHeight;
        
        // Mobile status
        ctx.fillStyle = mobileResult?.status === 'no_mobile' ? '#4CAF50' : '#f44336';
        ctx.fillText(`Mobile: ${mobileResult?.status || 'unknown'}`, 20, y);
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const system = new ProctoringSystem();
        await system.initialize();
        
        // Make system available globally for debugging
        window.proctoringSystem = system;
        
        console.log('Proctoring system ready!');
        console.log('Keyboard shortcuts:');
        console.log('  Ctrl+S: Start/Stop monitoring');
        console.log('  Ctrl+R: Set reference person');
        console.log('  Ctrl+E: Export logs');
        
    } catch (error) {
        console.error('Failed to initialize proctoring system:', error);
        alert('Failed to initialize proctoring system. Please check console for details.');
    }
});