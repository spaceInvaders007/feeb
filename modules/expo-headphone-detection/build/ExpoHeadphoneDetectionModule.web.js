"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var expo_modules_core_1 = require("expo-modules-core");
// MARK: - Constants
var CONSTANTS = {
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_BACKOFF_MULTIPLIER: 2.0,
    INITIAL_RETRY_DELAY: 100,
    DETECTION_TIMEOUT: 5000,
    ACCURACY_THRESHOLD: 0.95,
    TELEMETRY_BATCH_SIZE: 100,
    CACHE_EXPIRATION: 30000,
    CIRCUIT_BREAKER_THRESHOLD: 5,
    CIRCUIT_BREAKER_TIMEOUT: 60000,
    DEVICE_CHANGE_DEBOUNCE: 150,
    BLUETOOTH_WEB_API_TIMEOUT: 3000,
};
// MARK: - Production Web Headphone Detection Module
var ExpoHeadphoneDetectionModuleWeb = /** @class */ (function (_super) {
    __extends(ExpoHeadphoneDetectionModuleWeb, _super);
    function ExpoHeadphoneDetectionModuleWeb() {
        var _this = _super.call(this) || this;
        // MARK: - State Management
        _this.isListening = false;
        _this.deviceChangeHandler = null;
        _this.bluetoothDeviceHandler = null;
        _this.currentDetectionPromise = null;
        // MARK: - Performance & Circuit Breaker
        _this.retryCount = 0;
        _this.circuitBreakerFailureCount = 0;
        _this.lastCircuitBreakerFailure = 0;
        _this.isCircuitBreakerOpen = false;
        _this.lastKnownState = null;
        _this.lastDetectionResult = null;
        // MARK: - Telemetry & Caching
        _this.telemetryEvents = new Map();
        _this.metrics = {
            detectionLatency: 0,
            accuracyScore: 0,
            deviceCount: 0,
            errorCount: 0,
            lastError: null,
        };
        _this.deviceCache = new Map();
        _this.permissionState = 'unknown';
        // MARK: - Advanced Detection Features
        _this.bluetoothDevice = null;
        _this.audioContext = null;
        _this.analyserNode = null;
        _this.debounceTimer = null;
        _this.initializeModule();
        return _this;
    }
    // MARK: - Core Detection Logic
    ExpoHeadphoneDetectionModuleWeb.prototype.getCurrentStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = performance.now();
                        // Prevent concurrent detections
                        if (this.currentDetectionPromise) {
                            return [2 /*return*/, this.currentDetectionPromise];
                        }
                        this.currentDetectionPromise = this.performDetectionWithFallback(startTime);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, this.currentDetectionPromise];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 3:
                        this.currentDetectionPromise = null;
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.performDetectionWithFallback = function (startTime) {
        return __awaiter(this, void 0, void 0, function () {
            var cached, detectionResult, lastError, detectionMethods, _i, detectionMethods_1, _a, name_1, method, timeout, methodStartTime, methodLatency, error_1, totalLatency;
            var _this = this;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        // Check circuit breaker
                        if (this.isCircuitBreakerOpen && this.shouldKeepCircuitBreakerOpen()) {
                            this.logTelemetry('detection_blocked_circuit_breaker', { timestamp: startTime });
                            return [2 /*return*/, (_b = this.lastKnownState) !== null && _b !== void 0 ? _b : this.createEmptyHeadphoneInfo()];
                        }
                        cached = this.getCachedResult();
                        if (cached) {
                            this.logTelemetry('detection_cache_hit', { timestamp: startTime });
                            return [2 /*return*/, cached];
                        }
                        detectionResult = null;
                        lastError = null;
                        detectionMethods = [
                            {
                                name: 'enumerate_devices_primary',
                                method: function () { return _this.detectViaEnumerateDevices(); },
                                timeout: CONSTANTS.DETECTION_TIMEOUT
                            },
                            {
                                name: 'bluetooth_web_api',
                                method: function () { return _this.detectViaBluetooth(); },
                                timeout: CONSTANTS.BLUETOOTH_WEB_API_TIMEOUT
                            },
                            {
                                name: 'audio_context_analysis',
                                method: function () { return _this.detectViaAudioContext(); },
                                timeout: CONSTANTS.DETECTION_TIMEOUT
                            },
                            {
                                name: 'media_query_heuristics',
                                method: function () { return _this.detectViaMediaQueries(); },
                                timeout: 1000
                            },
                            {
                                name: 'navigator_properties',
                                method: function () { return _this.detectViaNavigatorProperties(); },
                                timeout: 500
                            }
                        ];
                        _i = 0, detectionMethods_1 = detectionMethods;
                        _d.label = 1;
                    case 1:
                        if (!(_i < detectionMethods_1.length)) return [3 /*break*/, 6];
                        _a = detectionMethods_1[_i], name_1 = _a.name, method = _a.method, timeout = _a.timeout;
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 5]);
                        methodStartTime = performance.now();
                        return [4 /*yield*/, this.withTimeout(timeout, method)];
                    case 3:
                        detectionResult = _d.sent();
                        methodLatency = performance.now() - methodStartTime;
                        this.logTelemetry('detection_method_success', {
                            method: name_1,
                            latency: methodLatency,
                            confidence: detectionResult.confidence,
                            timestamp: methodStartTime
                        });
                        // If confidence is high enough, use this result
                        if (detectionResult.confidence >= CONSTANTS.ACCURACY_THRESHOLD) {
                            return [3 /*break*/, 6];
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _d.sent();
                        lastError = error_1;
                        this.logTelemetry('detection_method_failed', {
                            method: name_1,
                            error: error_1 instanceof Error ? error_1.message : String(error_1),
                            timestamp: performance.now()
                        });
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        totalLatency = performance.now() - startTime;
                        if (detectionResult && detectionResult.confidence > 0.5) {
                            this.handleDetectionSuccess(detectionResult, totalLatency);
                            return [2 /*return*/, detectionResult];
                        }
                        else {
                            this.handleDetectionFailure(lastError, totalLatency);
                            return [2 /*return*/, (_c = this.lastKnownState) !== null && _c !== void 0 ? _c : this.createEmptyHeadphoneInfo()];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    // MARK: - Detection Methods
    ExpoHeadphoneDetectionModuleWeb.prototype.detectViaEnumerateDevices = function () {
        return __awaiter(this, void 0, void 0, function () {
            var devices, audioOutputs, bestMatch, _i, audioOutputs_1, device, analysis, result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.enumerateDevices)) {
                            throw new Error('MediaDevices API not supported');
                        }
                        // Request permissions if needed
                        return [4 /*yield*/, this.ensurePermissions()];
                    case 1:
                        // Request permissions if needed
                        _b.sent();
                        return [4 /*yield*/, navigator.mediaDevices.enumerateDevices()];
                    case 2:
                        devices = _b.sent();
                        audioOutputs = devices.filter(function (device) { return device.kind === 'audiooutput'; });
                        this.logTelemetry('devices_enumerated', {
                            total_devices: devices.length,
                            audio_outputs: audioOutputs.length,
                            has_labels: audioOutputs.some(function (d) { return d.label; }),
                            permission_state: this.permissionState
                        });
                        bestMatch = null;
                        for (_i = 0, audioOutputs_1 = audioOutputs; _i < audioOutputs_1.length; _i++) {
                            device = audioOutputs_1[_i];
                            analysis = this.analyzeMediaDevice(device);
                            if (!bestMatch || analysis.confidence > bestMatch.analysis.confidence) {
                                bestMatch = { device: device, analysis: analysis };
                            }
                            // Cache device for future reference
                            this.deviceCache.set(device.deviceId, {
                                device: device,
                                timestamp: Date.now()
                            });
                        }
                        result = bestMatch ? {
                            isConnected: bestMatch.analysis.confidence >= CONSTANTS.ACCURACY_THRESHOLD,
                            deviceType: bestMatch.analysis.deviceType,
                            deviceName: this.getDeviceDisplayName(bestMatch.device),
                            confidence: bestMatch.analysis.confidence,
                            timestamp: Date.now(),
                            metadata: {
                                detection_method: 'enumerate_devices',
                                device_id: bestMatch.device.deviceId,
                                group_id: bestMatch.device.groupId,
                                analysis_factors: bestMatch.analysis.factors,
                                total_audio_outputs: audioOutputs.length,
                                permission_state: this.permissionState
                            }
                        } : this.createEmptyHeadphoneInfo();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.detectViaBluetooth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var analysis, devices, audioDevice, error_2;
            var _this = this;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!('bluetooth' in navigator)) {
                            throw new Error('Bluetooth Web API not supported');
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        // Check if we already have a connected device
                        if (this.bluetoothDevice && ((_a = this.bluetoothDevice.gatt) === null || _a === void 0 ? void 0 : _a.connected)) {
                            analysis = this.analyzeBluetoothDevice(this.bluetoothDevice);
                            return [2 /*return*/, {
                                    isConnected: true,
                                    deviceType: 'bluetooth',
                                    deviceName: this.bluetoothDevice.name || 'Bluetooth Device',
                                    confidence: analysis.confidence,
                                    timestamp: Date.now(),
                                    metadata: {
                                        detection_method: 'bluetooth_web_api',
                                        device_id: this.bluetoothDevice.id,
                                        analysis_factors: analysis.factors
                                    }
                                }];
                        }
                        return [4 /*yield*/, ((_c = (_b = navigator.bluetooth).getAvailabilityState) === null || _c === void 0 ? void 0 : _c.call(_b))];
                    case 2:
                        devices = (_d.sent()) || [];
                        if (devices.length > 0) {
                            audioDevice = devices.find(function (device) {
                                return _this.isBluetoothAudioDevice(device);
                            });
                            if (audioDevice) {
                                return [2 /*return*/, {
                                        isConnected: true,
                                        deviceType: 'bluetooth',
                                        deviceName: audioDevice.name || 'Bluetooth Audio Device',
                                        confidence: 0.85,
                                        timestamp: Date.now(),
                                        metadata: {
                                            detection_method: 'bluetooth_web_api',
                                            available_devices: devices.length
                                        }
                                    }];
                            }
                        }
                        throw new Error('No Bluetooth audio devices detected');
                    case 3:
                        error_2 = _d.sent();
                        // Bluetooth detection failed - this is common on web
                        throw new Error("Bluetooth detection failed: ".concat(error_2 instanceof Error ? error_2.message : String(error_2)));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.detectViaAudioContext = function () {
        return __awaiter(this, void 0, void 0, function () {
            var destination, sampleRate, outputLatency, baseLatency, oscillator, analyser, gainNode, bufferLength, dataArray, confidence, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!window.AudioContext && !window.webkitAudioContext) {
                            throw new Error('AudioContext not supported');
                        }
                        if (!this.audioContext) {
                            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        destination = this.audioContext.destination;
                        sampleRate = this.audioContext.sampleRate;
                        outputLatency = this.audioContext.outputLatency || 0;
                        baseLatency = this.audioContext.baseLatency || 0;
                        oscillator = this.audioContext.createOscillator();
                        analyser = this.audioContext.createAnalyser();
                        gainNode = this.audioContext.createGain();
                        // Set very low volume to avoid audible sound
                        gainNode.gain.value = 0.001;
                        oscillator.connect(gainNode);
                        gainNode.connect(analyser);
                        analyser.connect(destination);
                        oscillator.frequency.value = 440; // A4 note
                        oscillator.start();
                        bufferLength = analyser.frequencyBinCount;
                        dataArray = new Uint8Array(bufferLength);
                        // Wait a moment for analysis
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 50); })];
                    case 2:
                        // Wait a moment for analysis
                        _a.sent();
                        analyser.getByteFrequencyData(dataArray);
                        oscillator.stop();
                        confidence = this.analyzeAudioCharacteristics({
                            sampleRate: sampleRate,
                            outputLatency: outputLatency,
                            baseLatency: baseLatency,
                            frequencyData: dataArray,
                            maxChannelCount: destination.maxChannelCount
                        });
                        return [2 /*return*/, {
                                isConnected: confidence > 0.6,
                                deviceType: confidence > 0.8 ? 'wired' : 'none',
                                deviceName: confidence > 0.6 ? 'Audio Device' : '',
                                confidence: confidence,
                                timestamp: Date.now(),
                                metadata: {
                                    detection_method: 'audio_context',
                                    sample_rate: sampleRate,
                                    output_latency: outputLatency,
                                    base_latency: baseLatency,
                                    max_channel_count: destination.maxChannelCount
                                }
                            }];
                    case 3:
                        error_3 = _a.sent();
                        throw new Error("AudioContext detection failed: ".concat(error_3 instanceof Error ? error_3.message : String(error_3)));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.detectViaMediaQueries = function () {
        return __awaiter(this, void 0, void 0, function () {
            var mediaQueries, confidence, userAgent, isMobile;
            return __generator(this, function (_a) {
                mediaQueries = {
                    'prefers-reduced-motion': window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                    'high-resolution': window.matchMedia('(min-resolution: 2dppx)').matches,
                    'wide-gamut': window.matchMedia('(color-gamut: p3)').matches,
                    'hover-capability': window.matchMedia('(hover: hover)').matches,
                    'pointer-fine': window.matchMedia('(pointer: fine)').matches
                };
                confidence = 0.0;
                if (mediaQueries['high-resolution'])
                    confidence += 0.1;
                if (mediaQueries['wide-gamut'])
                    confidence += 0.1;
                if (mediaQueries['hover-capability'])
                    confidence += 0.1;
                if (mediaQueries['pointer-fine'])
                    confidence += 0.1;
                userAgent = navigator.userAgent.toLowerCase();
                isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
                if (isMobile) {
                    confidence += 0.3; // Mobile devices more likely to use headphones
                }
                return [2 /*return*/, {
                        isConnected: confidence > 0.4,
                        deviceType: isMobile ? 'bluetooth' : 'wired',
                        deviceName: confidence > 0.4 ? 'Detected Audio Device' : '',
                        confidence: Math.min(confidence, 0.7), // Cap at 0.7 for heuristic method
                        timestamp: Date.now(),
                        metadata: {
                            detection_method: 'media_queries',
                            media_queries: mediaQueries,
                            user_agent: userAgent,
                            is_mobile: isMobile
                        }
                    }];
            });
        });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.detectViaNavigatorProperties = function () {
        return __awaiter(this, void 0, void 0, function () {
            var properties, confidence, deviceType, conn;
            return __generator(this, function (_a) {
                properties = {
                    platform: navigator.platform,
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    languages: navigator.languages,
                    cookieEnabled: navigator.cookieEnabled,
                    onLine: navigator.onLine,
                    hardwareConcurrency: navigator.hardwareConcurrency,
                    deviceMemory: navigator.deviceMemory,
                    connection: navigator.connection
                };
                confidence = 0.0;
                deviceType = 'none';
                // Platform-based heuristics
                if (properties.platform.includes('iPhone') || properties.platform.includes('iPad')) {
                    confidence += 0.2;
                    deviceType = 'bluetooth'; // iOS devices often use AirPods
                }
                else if (properties.platform.includes('Android')) {
                    confidence += 0.15;
                    deviceType = 'bluetooth';
                }
                else if (properties.platform.includes('Mac')) {
                    confidence += 0.1;
                    deviceType = 'wired';
                }
                // Hardware capabilities
                if (properties.hardwareConcurrency && properties.hardwareConcurrency >= 4) {
                    confidence += 0.05; // Better hardware might have better audio
                }
                if (properties.deviceMemory && properties.deviceMemory >= 4) {
                    confidence += 0.05;
                }
                // Connection quality (good connection might indicate stationary use with headphones)
                if (properties.connection) {
                    conn = properties.connection;
                    if (conn.effectiveType === '4g' || conn.effectiveType === '5g') {
                        confidence += 0.05;
                    }
                }
                return [2 /*return*/, {
                        isConnected: confidence > 0.3,
                        deviceType: deviceType,
                        deviceName: confidence > 0.3 ? 'Detected Device' : '',
                        confidence: Math.min(confidence, 0.6), // Cap for heuristic method
                        timestamp: Date.now(),
                        metadata: {
                            detection_method: 'navigator_properties',
                            properties: properties
                        }
                    }];
            });
        });
    };
    // MARK: - Analysis Helpers
    ExpoHeadphoneDetectionModuleWeb.prototype.analyzeMediaDevice = function (device) {
        var label = device.label.toLowerCase();
        var deviceId = device.deviceId;
        var groupId = device.groupId;
        var confidence = 0.0;
        var deviceType = 'none';
        var factors = {};
        // Label analysis
        var headphoneKeywords = {
            'airpods': 0.98,
            'beats': 0.95,
            'headphone': 0.9,
            'headset': 0.85,
            'earphone': 0.85,
            'earbuds': 0.9,
            'bluetooth': 0.8,
            'wireless': 0.7,
            'sony': 0.8,
            'bose': 0.85,
            'sennheiser': 0.9,
            'audio-technica': 0.85,
            'jbl': 0.8,
            'skullcandy': 0.8
        };
        for (var _i = 0, _a = Object.entries(headphoneKeywords); _i < _a.length; _i++) {
            var _b = _a[_i], keyword = _b[0], score = _b[1];
            if (label.includes(keyword)) {
                factors["keyword_".concat(keyword)] = score;
                confidence = Math.max(confidence, score);
                // Determine device type
                if (['bluetooth', 'wireless', 'airpods'].includes(keyword)) {
                    deviceType = 'bluetooth';
                }
                else {
                    deviceType = 'wired';
                }
                break;
            }
        }
        // Device ID analysis
        if (deviceId && deviceId !== 'default' && deviceId !== 'communications') {
            factors['has_specific_device_id'] = 0.3;
            confidence += 0.3;
        }
        // Group ID analysis (indicates physical device grouping)
        if (groupId) {
            factors['has_group_id'] = 0.2;
            confidence += 0.2;
        }
        // Label presence (permissions granted)
        if (label && label !== '') {
            factors['has_label'] = 0.4;
            confidence += 0.4;
        }
        else {
            factors['no_label'] = -0.2;
            confidence -= 0.2;
        }
        // Default device exclusion
        if (deviceId === 'default' || label.includes('default')) {
            factors['is_default_device'] = -0.3;
            confidence -= 0.3;
        }
        // Speaker keywords (negative indicators)
        var speakerKeywords = ['speaker', 'monitor', 'display', 'hdmi', 'internal'];
        for (var _c = 0, speakerKeywords_1 = speakerKeywords; _c < speakerKeywords_1.length; _c++) {
            var keyword = speakerKeywords_1[_c];
            if (label.includes(keyword)) {
                factors["speaker_keyword_".concat(keyword)] = -0.4;
                confidence -= 0.4;
                deviceType = 'none';
                break;
            }
        }
        return {
            deviceType: deviceType,
            confidence: Math.max(0, Math.min(1, confidence)),
            factors: factors
        };
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.analyzeBluetoothDevice = function (device) {
        var _a, _b;
        var name = ((_a = device.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        var factors = {};
        var confidence = 0.8; // Base confidence for connected Bluetooth device
        // Name analysis
        if (name.includes('airpods')) {
            factors['airpods'] = 0.98;
            confidence = 0.98;
        }
        else if (name.includes('beats')) {
            factors['beats'] = 0.95;
            confidence = 0.95;
        }
        else if (name.includes('headphone') || name.includes('headset')) {
            factors['headphone_in_name'] = 0.9;
            confidence = 0.9;
        }
        else if (name.includes('bluetooth') || name.includes('wireless')) {
            factors['bluetooth_wireless'] = 0.8;
            confidence = 0.8;
        }
        // Connection state
        if ((_b = device.gatt) === null || _b === void 0 ? void 0 : _b.connected) {
            factors['connected'] = 0.3;
            confidence += 0.3;
        }
        return { confidence: Math.min(1, confidence), factors: factors };
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.analyzeAudioCharacteristics = function (characteristics) {
        var confidence = 0.0;
        // Sample rate analysis
        if (characteristics.sampleRate >= 44100) {
            confidence += 0.2;
        }
        // Channel count analysis
        if (characteristics.maxChannelCount >= 2) {
            confidence += 0.2;
        }
        // Latency analysis (lower latency might indicate direct connection)
        if (characteristics.outputLatency < 0.1) {
            confidence += 0.1;
        }
        // Frequency response analysis
        var frequencyData = characteristics.frequencyData;
        if (frequencyData.some(function (value) { return value > 0; })) {
            confidence += 0.2;
        }
        return Math.min(confidence, 0.8);
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.isBluetoothAudioDevice = function (device) {
        if (!device.name)
            return false;
        var audioKeywords = ['headphone', 'headset', 'earphone', 'earbuds', 'speaker', 'audio'];
        var name = device.name.toLowerCase();
        return audioKeywords.some(function (keyword) { return name.includes(keyword); });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.getDeviceDisplayName = function (device) {
        if (device.label) {
            return device.label;
        }
        // Fallback names based on device ID patterns
        var deviceId = device.deviceId;
        if (deviceId.includes('bluetooth'))
            return 'Bluetooth Device';
        if (deviceId.includes('usb'))
            return 'USB Audio Device';
        if (deviceId.includes('hdmi'))
            return 'HDMI Audio';
        return 'Audio Device';
    };
    // MARK: - State Management & Caching
    ExpoHeadphoneDetectionModuleWeb.prototype.getCachedResult = function () {
        if (!this.lastDetectionResult)
            return null;
        var age = Date.now() - this.lastDetectionResult.timestamp;
        if (age < CONSTANTS.CACHE_EXPIRATION) {
            return this.lastDetectionResult.result;
        }
        this.lastDetectionResult = null;
        return null;
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.cacheResult = function (result) {
        this.lastDetectionResult = {
            result: result,
            timestamp: Date.now()
        };
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.createEmptyHeadphoneInfo = function () {
        return {
            isConnected: false,
            deviceType: 'none',
            deviceName: '',
            confidence: 0.0,
            timestamp: Date.now(),
            metadata: {}
        };
    };
    // MARK: - Error Handling & Circuit Breaker
    ExpoHeadphoneDetectionModuleWeb.prototype.handleDetectionSuccess = function (result, latency) {
        this.lastKnownState = result;
        this.cacheResult(result);
        this.retryCount = 0;
        // Reset circuit breaker on success
        if (this.circuitBreakerFailureCount > 0) {
            this.circuitBreakerFailureCount = Math.max(0, this.circuitBreakerFailureCount - 1);
            if (this.circuitBreakerFailureCount === 0) {
                this.isCircuitBreakerOpen = false;
            }
        }
        this.metrics = __assign(__assign({}, this.metrics), { detectionLatency: latency, accuracyScore: result.confidence, deviceCount: this.deviceCache.size });
        this.logTelemetry('detection_success', {
            latency: latency,
            confidence: result.confidence,
            device_type: result.deviceType,
            device_name: result.deviceName,
            timestamp: result.timestamp
        });
        // Emit success event
        this.emit('headphoneStatusChanged', result);
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.handleDetectionFailure = function (error, latency) {
        this.retryCount++;
        this.circuitBreakerFailureCount++;
        this.lastCircuitBreakerFailure = Date.now();
        this.metrics = __assign(__assign({}, this.metrics), { errorCount: this.metrics.errorCount + 1, lastError: (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error' });
        // Open circuit breaker if too many failures
        if (this.circuitBreakerFailureCount >= CONSTANTS.CIRCUIT_BREAKER_THRESHOLD) {
            this.isCircuitBreakerOpen = true;
        }
        this.logTelemetry('detection_failure', {
            error: (error === null || error === void 0 ? void 0 : error.message) || 'unknown',
            retry_count: this.retryCount,
            circuit_breaker_failures: this.circuitBreakerFailureCount,
            latency: latency,
            timestamp: Date.now()
        });
        // Emit error event
        this.emit('detectionError', {
            error: (error === null || error === void 0 ? void 0 : error.message) || 'Detection failed',
            retryCount: this.retryCount,
            circuitBreakerOpen: this.isCircuitBreakerOpen
        });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.shouldKeepCircuitBreakerOpen = function () {
        if (this.lastCircuitBreakerFailure === 0)
            return false;
        var timeSinceFailure = Date.now() - this.lastCircuitBreakerFailure;
        var backoffTime = Math.pow(CONSTANTS.RETRY_BACKOFF_MULTIPLIER, this.circuitBreakerFailureCount) * 10000;
        return timeSinceFailure < backoffTime;
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.resetCircuitBreaker = function () {
        this.circuitBreakerFailureCount = 0;
        this.lastCircuitBreakerFailure = 0;
        this.isCircuitBreakerOpen = false;
        this.retryCount = 0;
        this.logTelemetry('circuit_breaker_reset', { timestamp: Date.now() });
    };
    // MARK: - Permissions Management
    ExpoHeadphoneDetectionModuleWeb.prototype.ensurePermissions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var stream, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia)) {
                            throw new Error('getUserMedia not supported');
                        }
                        if (this.permissionState === 'granted') {
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, navigator.mediaDevices.getUserMedia({
                                audio: {
                                    echoCancellation: true,
                                    noiseSuppression: true,
                                    autoGainControl: true
                                }
                            })];
                    case 2:
                        stream = _b.sent();
                        // Immediately stop the stream - we only needed it for permissions
                        stream.getTracks().forEach(function (track) { return track.stop(); });
                        this.permissionState = 'granted';
                        this.logTelemetry('permissions_granted', {
                            timestamp: Date.now(),
                            method: 'getUserMedia'
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _b.sent();
                        this.permissionState = 'denied';
                        this.logTelemetry('permissions_denied', {
                            error: error_4 instanceof Error ? error_4.message : String(error_4),
                            timestamp: Date.now()
                        });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // MARK: - Event Handling & Listening
    ExpoHeadphoneDetectionModuleWeb.prototype.startListening = function () {
        var _this = this;
        var _a, _b, _c;
        if (this.isListening || !((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.addEventListener)) {
            return;
        }
        this.isListening = true;
        // Setup device change handler with debouncing
        this.deviceChangeHandler = function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
                this.debounceTimer = window.setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                    var startTime, result, latency, error_5;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                startTime = performance.now();
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, this.getCurrentStatus()];
                            case 2:
                                result = _a.sent();
                                latency = performance.now() - startTime;
                                this.logTelemetry('device_change_detected', {
                                    latency: latency,
                                    device_type: result.deviceType,
                                    confidence: result.confidence,
                                    timestamp: startTime
                                });
                                this.emit('headphoneStatusChanged', result);
                                return [3 /*break*/, 4];
                            case 3:
                                error_5 = _a.sent();
                                this.logTelemetry('device_change_error', {
                                    error: error_5 instanceof Error ? error_5.message : String(error_5),
                                    timestamp: performance.now()
                                });
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); }, CONSTANTS.DEVICE_CHANGE_DEBOUNCE);
                return [2 /*return*/];
            });
        }); };
        navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
        // Setup Bluetooth event handlers if available
        if ('bluetooth' in navigator) {
            this.bluetoothDeviceHandler = function (event) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logTelemetry('bluetooth_event', {
                                event_type: event.type,
                                timestamp: performance.now()
                            });
                            if (!this.deviceChangeHandler) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.deviceChangeHandler()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            }); };
            // Listen for Bluetooth events
            (_c = (_b = navigator.bluetooth) === null || _b === void 0 ? void 0 : _b.addEventListener) === null || _c === void 0 ? void 0 : _c.call(_b, 'availabilitychanged', this.bluetoothDeviceHandler);
        }
        // Initial detection
        setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getCurrentStatus()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _a.sent();
                        this.logTelemetry('initial_detection_error', {
                            error: error_6 instanceof Error ? error_6.message : String(error_6),
                            timestamp: performance.now()
                        });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); }, 100);
        this.logTelemetry('listening_started', { timestamp: Date.now() });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.stopListening = function () {
        var _a, _b;
        if (!this.isListening)
            return;
        this.isListening = false;
        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        // Remove device change listener
        if (this.deviceChangeHandler && ((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.removeEventListener)) {
            navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
            this.deviceChangeHandler = null;
        }
        // Remove Bluetooth listeners
        if (this.bluetoothDeviceHandler && ((_b = navigator.bluetooth) === null || _b === void 0 ? void 0 : _b.removeEventListener)) {
            navigator.bluetooth.removeEventListener('availabilitychanged', this.bluetoothDeviceHandler);
            this.bluetoothDeviceHandler = null;
        }
        this.logTelemetry('listening_stopped', { timestamp: Date.now() });
    };
    // MARK: - Module Lifecycle
    ExpoHeadphoneDetectionModuleWeb.prototype.initializeModule = function () {
        var _a, _b, _c;
        try {
            // Check for required APIs
            var capabilities = {
                mediaDevices: !!navigator.mediaDevices,
                enumerateDevices: !!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.enumerateDevices),
                getUserMedia: !!((_b = navigator.mediaDevices) === null || _b === void 0 ? void 0 : _b.getUserMedia),
                bluetooth: 'bluetooth' in navigator,
                audioContext: !!(window.AudioContext || window.webkitAudioContext),
                deviceChangeEvents: !!((_c = navigator.mediaDevices) === null || _c === void 0 ? void 0 : _c.addEventListener)
            };
            this.logTelemetry('module_initialized', {
                timestamp: Date.now(),
                capabilities: capabilities,
                user_agent: navigator.userAgent,
                platform: navigator.platform
            });
            // Pre-warm permissions if possible
            this.checkInitialPermissions();
        }
        catch (error) {
            this.logTelemetry('module_init_error', {
                error: error instanceof Error ? error.message : String(error),
                timestamp: Date.now()
            });
        }
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.checkInitialPermissions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var micPermission_1, error_7;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!((_a = navigator.permissions) === null || _a === void 0 ? void 0 : _a.query)) {
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, navigator.permissions.query({ name: 'microphone' })];
                    case 2:
                        micPermission_1 = _b.sent();
                        this.permissionState = micPermission_1.state;
                        micPermission_1.addEventListener('change', function () {
                            _this.permissionState = micPermission_1.state;
                            _this.logTelemetry('permission_state_changed', {
                                new_state: micPermission_1.state,
                                timestamp: Date.now()
                            });
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_7 = _b.sent();
                        // Permission query not supported
                        this.logTelemetry('permission_query_not_supported', {
                            error: error_7 instanceof Error ? error_7.message : String(error_7),
                            timestamp: Date.now()
                        });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.cleanup = function () {
        this.stopListening();
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close().catch(function () { });
            this.audioContext = null;
        }
        // Clear caches
        this.deviceCache.clear();
        this.lastDetectionResult = null;
        this.lastKnownState = null;
        // Flush remaining telemetry
        this.flushTelemetry();
        this.logTelemetry('module_cleanup', { timestamp: Date.now() });
    };
    // MARK: - Telemetry & Analytics
    ExpoHeadphoneDetectionModuleWeb.prototype.logTelemetry = function (event, data) {
        var telemetryEvent = {
            event: event,
            timestamp: Date.now(),
            data: data,
            sessionId: this.generateSessionId()
        };
        this.telemetryEvents.set(this.generateEventId(), telemetryEvent);
        // Batch telemetry events
        if (this.telemetryEvents.size >= CONSTANTS.TELEMETRY_BATCH_SIZE) {
            this.flushTelemetry();
        }
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.flushTelemetry = function () {
        if (this.telemetryEvents.size === 0)
            return;
        var events = Object.fromEntries(this.telemetryEvents);
        this.telemetryEvents.clear();
        // Send telemetry events
        this.emit('performanceMetrics', {
            events: events,
            metrics: this.metrics,
            timestamp: Date.now()
        });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.generateSessionId = function () {
        return "web_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.generateEventId = function () {
        return "evt_".concat(Date.now(), "_").concat(Math.random().toString(36).substr(2, 9));
    };
    // MARK: - Utility Functions
    ExpoHeadphoneDetectionModuleWeb.prototype.withTimeout = function (timeoutMs, operation) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var timeoutId = setTimeout(function () {
                            reject(new Error("Operation timed out after ".concat(timeoutMs, "ms")));
                        }, timeoutMs);
                        operation()
                            .then(function (result) {
                            clearTimeout(timeoutId);
                            resolve(result);
                        })
                            .catch(function (error) {
                            clearTimeout(timeoutId);
                            reject(error);
                        });
                    })];
            });
        });
    };
    // MARK: - Public API Extensions
    ExpoHeadphoneDetectionModuleWeb.prototype.getDetectionMetrics = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, __assign({}, this.metrics)];
            });
        });
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.resetCircuitBreakerPublic = function () {
        this.resetCircuitBreaker();
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.isCircuitBreakerOpenPublic = function () {
        return this.isCircuitBreakerOpen;
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.getPermissionState = function () {
        return this.permissionState;
    };
    ExpoHeadphoneDetectionModuleWeb.prototype.getCacheInfo = function () {
        var _a;
        return {
            size: this.deviceCache.size,
            lastUpdate: ((_a = this.lastDetectionResult) === null || _a === void 0 ? void 0 : _a.timestamp) || null
        };
    };
    // Force cache invalidation
    ExpoHeadphoneDetectionModuleWeb.prototype.invalidateCache = function () {
        this.lastDetectionResult = null;
        this.deviceCache.clear();
        this.logTelemetry('cache_invalidated', { timestamp: Date.now() });
    };
    // Manual permission request
    ExpoHeadphoneDetectionModuleWeb.prototype.requestPermissions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.ensurePermissions()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { granted: this.permissionState === 'granted' }];
                    case 2:
                        error_8 = _a.sent();
                        return [2 /*return*/, {
                                granted: false,
                                error: error_8 instanceof Error ? error_8.message : String(error_8)
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ExpoHeadphoneDetectionModuleWeb;
}(expo_modules_core_1.EventEmitter));
// Export singleton instance
exports.default = new ExpoHeadphoneDetectionModuleWeb();
