"use strict";
// modules/expo-headphone-detection/src/ExpoHeadphoneDetectionModule.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
const expo_modules_core_1 = require("expo-modules-core");
// MARK: - Platform-Specific Module Loading
class ExpoHeadphoneDetectionModule extends expo_modules_core_1.EventEmitter {
    constructor() {
        super();
        this.isWebModuleLoaded = false;
        if (react_native_1.Platform.OS === 'web') {
            // Load web module asynchronously
            this.loadWebModule();
        }
        else {
            // Load native module
            this.nativeModule = expo_modules_core_1.NativeModulesProxy.ExpoHeadphoneDetection;
            if (!this.nativeModule) {
                console.warn('ExpoHeadphoneDetection native module is not available. ' +
                    'Make sure you have rebuilt your app with expo-dev-client after installing the module.');
            }
        }
    }
    loadWebModule() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isWebModuleLoaded) {
                return;
            }
            try {
                const webModuleImport = yield Promise.resolve().then(() => __importStar(require('./ExpoHeadphoneDetectionModule.web.js')));
                this.webModule = webModuleImport.default;
                this.isWebModuleLoaded = true;
            }
            catch (error) {
                console.error('Failed to load web module:', error);
                throw new Error('Web headphone detection module is not available');
            }
        });
    }
    getActiveModule() {
        return __awaiter(this, void 0, void 0, function* () {
            if (react_native_1.Platform.OS === 'web') {
                if (!this.isWebModuleLoaded) {
                    yield this.loadWebModule();
                }
                if (!this.webModule) {
                    throw new Error('Web module not loaded. Please ensure proper initialization.');
                }
                return this.webModule;
            }
            else {
                if (!this.nativeModule) {
                    throw new Error('Native module not available. Please check your development build.');
                }
                return this.nativeModule;
            }
        });
    }
    // MARK: - Core Detection Methods
    getCurrentStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const module = yield this.getActiveModule();
                const result = yield module.getCurrentStatus();
                // Ensure consistent return format across platforms
                return {
                    isConnected: Boolean(result.isConnected),
                    deviceType: result.deviceType || 'none',
                    deviceName: result.deviceName || '',
                    confidence: typeof result.confidence === 'number' ? result.confidence : 0,
                    timestamp: typeof result.timestamp === 'number' ? result.timestamp : Date.now(),
                    metadata: result.metadata || {}
                };
            }
            catch (error) {
                console.error('getCurrentStatus failed:', error);
                throw this.normalizeError(error);
            }
        });
    }
    startListening() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const module = yield this.getActiveModule();
                yield module.startListening();
            }
            catch (error) {
                console.error('startListening failed:', error);
                throw this.normalizeError(error);
            }
        });
    }
    stopListening() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const module = yield this.getActiveModule();
                yield module.stopListening();
            }
            catch (error) {
                console.error('stopListening failed:', error);
                throw this.normalizeError(error);
            }
        });
    }
    // MARK: - Advanced Features
    getDetectionMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const module = yield this.getActiveModule();
                if (!module.getDetectionMetrics) {
                    console.warn('getDetectionMetrics not supported on this platform');
                    return null;
                }
                const metrics = yield module.getDetectionMetrics();
                return {
                    detectionLatency: typeof metrics.detectionLatency === 'number' ? metrics.detectionLatency : 0,
                    accuracyScore: typeof metrics.accuracyScore === 'number' ? metrics.accuracyScore : 0,
                    deviceCount: typeof metrics.deviceCount === 'number' ? metrics.deviceCount : 0,
                    errorCount: typeof metrics.errorCount === 'number' ? metrics.errorCount : 0,
                    lastError: metrics.lastError || null
                };
            }
            catch (error) {
                console.error('getDetectionMetrics failed:', error);
                return null;
            }
        });
    }
    resetCircuitBreaker() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const module = yield this.getActiveModule();
                if (!module.resetCircuitBreaker) {
                    console.warn('resetCircuitBreaker not supported on this platform');
                    return;
                }
                if (typeof module.resetCircuitBreaker === 'function') {
                    yield module.resetCircuitBreaker();
                }
                else {
                    module.resetCircuitBreaker();
                }
            }
            catch (error) {
                console.error('resetCircuitBreaker failed:', error);
                throw this.normalizeError(error);
            }
        });
    }
    isCircuitBreakerOpen() {
        var _a, _b, _c, _d;
        try {
            if (react_native_1.Platform.OS === 'web' && this.webModule) {
                return Boolean((_b = (_a = this.webModule).isCircuitBreakerOpenPublic) === null || _b === void 0 ? void 0 : _b.call(_a));
            }
            else if (this.nativeModule) {
                return Boolean((_d = (_c = this.nativeModule).isCircuitBreakerOpen) === null || _d === void 0 ? void 0 : _d.call(_c));
            }
            return false;
        }
        catch (error) {
            console.error('isCircuitBreakerOpen failed:', error);
            return false;
        }
    }
    // MARK: - Web-Specific Methods
    getPermissionState() {
        if (react_native_1.Platform.OS !== 'web') {
            return null;
        }
        try {
            if (this.webModule && this.webModule.getPermissionState) {
                return this.webModule.getPermissionState();
            }
            return 'unknown';
        }
        catch (error) {
            console.error('getPermissionState failed:', error);
            return 'unknown';
        }
    }
    requestPermissions() {
        return __awaiter(this, void 0, void 0, function* () {
            if (react_native_1.Platform.OS !== 'web') {
                return { granted: true };
            }
            try {
                const module = yield this.getActiveModule();
                if (!module.requestPermissions) {
                    return { granted: false, error: 'Permission request not supported' };
                }
                const result = yield module.requestPermissions();
                return {
                    granted: Boolean(result.granted),
                    error: result.error
                };
            }
            catch (error) {
                console.error('requestPermissions failed:', error);
                return {
                    granted: false,
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        });
    }
    invalidateCache() {
        if (react_native_1.Platform.OS !== 'web') {
            return;
        }
        try {
            if (this.webModule && this.webModule.invalidateCache) {
                this.webModule.invalidateCache();
            }
        }
        catch (error) {
            console.error('invalidateCache failed:', error);
        }
    }
    getCacheInfo() {
        if (react_native_1.Platform.OS !== 'web') {
            return null;
        }
        try {
            if (this.webModule && this.webModule.getCacheInfo) {
                const info = this.webModule.getCacheInfo();
                return {
                    size: typeof info.size === 'number' ? info.size : 0,
                    lastUpdate: typeof info.lastUpdate === 'number' ? info.lastUpdate : null
                };
            }
            return null;
        }
        catch (error) {
            console.error('getCacheInfo failed:', error);
            return null;
        }
    }
    // MARK: - Event Management
    addListener(eventName, listener) {
        try {
            if (react_native_1.Platform.OS === 'web' && this.webModule) {
                // Web module extends EventEmitter directly
                const subscription = this.webModule.addListener(eventName, listener);
                return {
                    remove: () => subscription.remove()
                };
            }
            else if (this.nativeModule) {
                // Native module through Expo modules
                const subscription = this.nativeModule.addListener(eventName, listener);
                return {
                    remove: () => {
                        if (subscription && subscription.remove) {
                            subscription.remove();
                        }
                    }
                };
            }
            // Fallback - return a no-op listener to prevent crashes
            return {
                remove: () => { }
            };
        }
        catch (error) {
            console.error('addListener failed:', error);
            // Return a no-op listener to prevent crashes
            return {
                remove: () => { }
            };
        }
    }
    removeAllListeners(eventName) {
        try {
            if (react_native_1.Platform.OS === 'web' && this.webModule && this.webModule.removeAllListeners) {
                this.webModule.removeAllListeners(eventName);
            }
            else if (this.nativeModule && this.nativeModule.removeAllListeners) {
                this.nativeModule.removeAllListeners(eventName);
            }
        }
        catch (error) {
            console.error('removeAllListeners failed:', error);
        }
    }
    // MARK: - Error Handling
    normalizeError(error) {
        if (error instanceof Error) {
            return error;
        }
        if (typeof error === 'string') {
            return new Error(error);
        }
        if (error && typeof error === 'object') {
            const message = error.message || error.code || 'Unknown error';
            const normalizedError = new Error(message);
            // Preserve additional error properties
            if (error.code) {
                normalizedError.code = error.code;
            }
            if (error.userInfo) {
                normalizedError.userInfo = error.userInfo;
            }
            return normalizedError;
        }
        return new Error('Unknown error occurred');
    }
    // MARK: - Platform Capabilities
    getPlatformCapabilities() {
        return {
            supportsRealTimeDetection: true,
            supportsBluetooth: react_native_1.Platform.OS !== 'web',
            supportsMetrics: true,
            supportsCircuitBreaker: true,
            supportsPermissionCheck: react_native_1.Platform.OS === 'web',
            supportsCache: react_native_1.Platform.OS === 'web',
            platform: react_native_1.Platform.OS
        };
    }
    // MARK: - Health Check
    performHealthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            const issues = [];
            const recommendations = [];
            try {
                // Test basic functionality
                yield this.getCurrentStatus();
            }
            catch (error) {
                issues.push('Basic detection failed');
                recommendations.push('Check device permissions and module installation');
            }
            // Check circuit breaker
            if (this.isCircuitBreakerOpen()) {
                issues.push('Circuit breaker is open');
                recommendations.push('Reset circuit breaker or wait for automatic recovery');
            }
            // Check metrics
            const metrics = yield this.getDetectionMetrics();
            if (metrics) {
                if (metrics.errorCount > 10) {
                    issues.push('High error count detected');
                    recommendations.push('Review device compatibility and permissions');
                }
                if (metrics.detectionLatency > 1000) {
                    issues.push('High detection latency');
                    recommendations.push('Consider device performance optimization');
                }
                if (metrics.accuracyScore < 0.8) {
                    issues.push('Low detection accuracy');
                    recommendations.push('Check device compatibility and update detection algorithms');
                }
            }
            // Platform-specific checks
            if (react_native_1.Platform.OS === 'web') {
                const permissionState = this.getPermissionState();
                if (permissionState === 'denied') {
                    issues.push('Microphone permissions denied');
                    recommendations.push('Request user to grant microphone permissions');
                }
                const cacheInfo = this.getCacheInfo();
                if (cacheInfo && cacheInfo.size === 0) {
                    issues.push('Cache is empty');
                    recommendations.push('Perform initial detection to populate cache');
                }
            }
            return {
                isHealthy: issues.length === 0,
                issues,
                recommendations,
                platformInfo: {
                    platform: react_native_1.Platform.OS,
                    capabilities: this.getPlatformCapabilities(),
                    moduleVersion: '1.0.0',
                    timestamp: Date.now()
                }
            };
        });
    }
    // MARK: - Debug Information
    getDebugInfo() {
        let moduleLoaded = false;
        let lastError = null;
        try {
            if (react_native_1.Platform.OS === 'web') {
                moduleLoaded = this.isWebModuleLoaded && !!this.webModule;
            }
            else {
                moduleLoaded = !!this.nativeModule;
            }
        }
        catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }
        return {
            platform: react_native_1.Platform.OS,
            moduleLoaded,
            capabilities: this.getPlatformCapabilities(),
            lastError,
            timestamp: Date.now()
        };
    }
}
// MARK: - Singleton Export
const ExpoHeadphoneDetectionModuleInstance = new ExpoHeadphoneDetectionModule();
// Ensure proper cleanup on app termination
if (react_native_1.Platform.OS !== 'web') {
    const AppState = require('react-native').AppState;
    let appStateSubscription = null;
    const handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
            // App is going to background, stop listening to save battery
            ExpoHeadphoneDetectionModuleInstance.stopListening().catch(() => { });
        }
        else if (nextAppState === 'active') {
            // App is coming to foreground, restart listening
            ExpoHeadphoneDetectionModuleInstance.startListening().catch(() => { });
        }
    };
    // Set up app state listener
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    // Cleanup function for development
    if (__DEV__) {
        const originalConsoleError = console.error;
        console.error = (...args) => {
            if (args[0] && args[0].includes('ExpoHeadphoneDetection')) {
                // Enhanced error logging for development
                console.group('🎧 Headphone Detection Error');
                originalConsoleError(...args);
                console.log('Debug Info:', ExpoHeadphoneDetectionModuleInstance.getDebugInfo());
                console.groupEnd();
            }
            else {
                originalConsoleError(...args);
            }
        };
    }
}
exports.default = ExpoHeadphoneDetectionModuleInstance;
