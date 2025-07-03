"use strict";
// modules/expo-headphone-detection/src/ExpoHeadphoneDetectionModule.ts
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
var react_native_1 = require("react-native");
var expo_modules_core_1 = require("expo-modules-core");
// MARK: - Platform-Specific Module Loading
var ExpoHeadphoneDetectionModule = /** @class */ (function (_super) {
    __extends(ExpoHeadphoneDetectionModule, _super);
    function ExpoHeadphoneDetectionModule() {
        var _this = _super.call(this) || this;
        _this.isWebModuleLoaded = false;
        if (react_native_1.Platform.OS === 'web') {
            // Load web module asynchronously
            _this.loadWebModule();
        }
        else {
            // Load native module
            _this.nativeModule = expo_modules_core_1.NativeModulesProxy.ExpoHeadphoneDetection;
            if (!_this.nativeModule) {
                console.warn('ExpoHeadphoneDetection native module is not available. ' +
                    'Make sure you have rebuilt your app with expo-dev-client after installing the module.');
            }
        }
        return _this;
    }
    ExpoHeadphoneDetectionModule.prototype.loadWebModule = function () {
        return __awaiter(this, void 0, void 0, function () {
            var webModuleImport, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isWebModuleLoaded) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./ExpoHeadphoneDetectionModule.web'); })];
                    case 2:
                        webModuleImport = _a.sent();
                        this.webModule = webModuleImport.default;
                        this.isWebModuleLoaded = true;
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Failed to load web module:', error_1);
                        throw new Error('Web headphone detection module is not available');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModule.prototype.getActiveModule = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(react_native_1.Platform.OS === 'web')) return [3 /*break*/, 3];
                        if (!!this.isWebModuleLoaded) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.loadWebModule()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.webModule) {
                            throw new Error('Web module not loaded. Please ensure proper initialization.');
                        }
                        return [2 /*return*/, this.webModule];
                    case 3:
                        if (!this.nativeModule) {
                            throw new Error('Native module not available. Please check your development build.');
                        }
                        return [2 /*return*/, this.nativeModule];
                }
            });
        });
    };
    // MARK: - Core Detection Methods
    ExpoHeadphoneDetectionModule.prototype.getCurrentStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var module_1, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getActiveModule()];
                    case 1:
                        module_1 = _a.sent();
                        return [4 /*yield*/, module_1.getCurrentStatus()];
                    case 2:
                        result = _a.sent();
                        // Ensure consistent return format across platforms
                        return [2 /*return*/, {
                                isConnected: Boolean(result.isConnected),
                                deviceType: result.deviceType || 'none',
                                deviceName: result.deviceName || '',
                                confidence: typeof result.confidence === 'number' ? result.confidence : 0,
                                timestamp: typeof result.timestamp === 'number' ? result.timestamp : Date.now(),
                                metadata: result.metadata || {}
                            }];
                    case 3:
                        error_2 = _a.sent();
                        console.error('getCurrentStatus failed:', error_2);
                        throw this.normalizeError(error_2);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModule.prototype.startListening = function () {
        return __awaiter(this, void 0, void 0, function () {
            var module_2, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getActiveModule()];
                    case 1:
                        module_2 = _a.sent();
                        return [4 /*yield*/, module_2.startListening()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.error('startListening failed:', error_3);
                        throw this.normalizeError(error_3);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModule.prototype.stopListening = function () {
        return __awaiter(this, void 0, void 0, function () {
            var module_3, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getActiveModule()];
                    case 1:
                        module_3 = _a.sent();
                        return [4 /*yield*/, module_3.stopListening()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        console.error('stopListening failed:', error_4);
                        throw this.normalizeError(error_4);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // MARK: - Advanced Features
    ExpoHeadphoneDetectionModule.prototype.getDetectionMetrics = function () {
        return __awaiter(this, void 0, void 0, function () {
            var module_4, metrics, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getActiveModule()];
                    case 1:
                        module_4 = _a.sent();
                        if (!module_4.getDetectionMetrics) {
                            console.warn('getDetectionMetrics not supported on this platform');
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, module_4.getDetectionMetrics()];
                    case 2:
                        metrics = _a.sent();
                        return [2 /*return*/, {
                                detectionLatency: typeof metrics.detectionLatency === 'number' ? metrics.detectionLatency : 0,
                                accuracyScore: typeof metrics.accuracyScore === 'number' ? metrics.accuracyScore : 0,
                                deviceCount: typeof metrics.deviceCount === 'number' ? metrics.deviceCount : 0,
                                errorCount: typeof metrics.errorCount === 'number' ? metrics.errorCount : 0,
                                lastError: metrics.lastError || null
                            }];
                    case 3:
                        error_5 = _a.sent();
                        console.error('getDetectionMetrics failed:', error_5);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModule.prototype.resetCircuitBreaker = function () {
        return __awaiter(this, void 0, void 0, function () {
            var module_5, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.getActiveModule()];
                    case 1:
                        module_5 = _a.sent();
                        if (!module_5.resetCircuitBreaker) {
                            console.warn('resetCircuitBreaker not supported on this platform');
                            return [2 /*return*/];
                        }
                        if (!(typeof module_5.resetCircuitBreaker === 'function')) return [3 /*break*/, 3];
                        return [4 /*yield*/, module_5.resetCircuitBreaker()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        module_5.resetCircuitBreaker();
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_6 = _a.sent();
                        console.error('resetCircuitBreaker failed:', error_6);
                        throw this.normalizeError(error_6);
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModule.prototype.isCircuitBreakerOpen = function () {
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
    };
    // MARK: - Web-Specific Methods
    ExpoHeadphoneDetectionModule.prototype.getPermissionState = function () {
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
    };
    ExpoHeadphoneDetectionModule.prototype.requestPermissions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var module_6, result, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (react_native_1.Platform.OS !== 'web') {
                            return [2 /*return*/, { granted: true }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.getActiveModule()];
                    case 2:
                        module_6 = _a.sent();
                        if (!module_6.requestPermissions) {
                            return [2 /*return*/, { granted: false, error: 'Permission request not supported' }];
                        }
                        return [4 /*yield*/, module_6.requestPermissions()];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, {
                                granted: Boolean(result.granted),
                                error: result.error
                            }];
                    case 4:
                        error_7 = _a.sent();
                        console.error('requestPermissions failed:', error_7);
                        return [2 /*return*/, {
                                granted: false,
                                error: error_7 instanceof Error ? error_7.message : String(error_7)
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ExpoHeadphoneDetectionModule.prototype.invalidateCache = function () {
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
    };
    ExpoHeadphoneDetectionModule.prototype.getCacheInfo = function () {
        if (react_native_1.Platform.OS !== 'web') {
            return null;
        }
        try {
            if (this.webModule && this.webModule.getCacheInfo) {
                var info = this.webModule.getCacheInfo();
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
    };
    // MARK: - Event Management
    ExpoHeadphoneDetectionModule.prototype.addListener = function (eventName, listener) {
        try {
            if (react_native_1.Platform.OS === 'web' && this.webModule) {
                // Web module extends EventEmitter directly
                var subscription_1 = this.webModule.addListener(eventName, listener);
                return {
                    remove: function () { return subscription_1.remove(); }
                };
            }
            else if (this.nativeModule) {
                // Native module through Expo modules
                var subscription_2 = this.nativeModule.addListener(eventName, listener);
                return {
                    remove: function () {
                        if (subscription_2 && subscription_2.remove) {
                            subscription_2.remove();
                        }
                    }
                };
            }
            // Fallback - return a no-op listener to prevent crashes
            return {
                remove: function () { }
            };
        }
        catch (error) {
            console.error('addListener failed:', error);
            // Return a no-op listener to prevent crashes
            return {
                remove: function () { }
            };
        }
    };
    ExpoHeadphoneDetectionModule.prototype.removeAllListeners = function (eventName) {
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
    };
    // MARK: - Error Handling
    ExpoHeadphoneDetectionModule.prototype.normalizeError = function (error) {
        if (error instanceof Error) {
            return error;
        }
        if (typeof error === 'string') {
            return new Error(error);
        }
        if (error && typeof error === 'object') {
            var message = error.message || error.code || 'Unknown error';
            var normalizedError = new Error(message);
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
    };
    // MARK: - Platform Capabilities
    ExpoHeadphoneDetectionModule.prototype.getPlatformCapabilities = function () {
        return {
            supportsRealTimeDetection: true,
            supportsBluetooth: react_native_1.Platform.OS !== 'web',
            supportsMetrics: true,
            supportsCircuitBreaker: true,
            supportsPermissionCheck: react_native_1.Platform.OS === 'web',
            supportsCache: react_native_1.Platform.OS === 'web',
            platform: react_native_1.Platform.OS
        };
    };
    // MARK: - Health Check
    ExpoHeadphoneDetectionModule.prototype.performHealthCheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var issues, recommendations, error_8, metrics, permissionState, cacheInfo;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        issues = [];
                        recommendations = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        // Test basic functionality
                        return [4 /*yield*/, this.getCurrentStatus()];
                    case 2:
                        // Test basic functionality
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_8 = _a.sent();
                        issues.push('Basic detection failed');
                        recommendations.push('Check device permissions and module installation');
                        return [3 /*break*/, 4];
                    case 4:
                        // Check circuit breaker
                        if (this.isCircuitBreakerOpen()) {
                            issues.push('Circuit breaker is open');
                            recommendations.push('Reset circuit breaker or wait for automatic recovery');
                        }
                        return [4 /*yield*/, this.getDetectionMetrics()];
                    case 5:
                        metrics = _a.sent();
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
                            permissionState = this.getPermissionState();
                            if (permissionState === 'denied') {
                                issues.push('Microphone permissions denied');
                                recommendations.push('Request user to grant microphone permissions');
                            }
                            cacheInfo = this.getCacheInfo();
                            if (cacheInfo && cacheInfo.size === 0) {
                                issues.push('Cache is empty');
                                recommendations.push('Perform initial detection to populate cache');
                            }
                        }
                        return [2 /*return*/, {
                                isHealthy: issues.length === 0,
                                issues: issues,
                                recommendations: recommendations,
                                platformInfo: {
                                    platform: react_native_1.Platform.OS,
                                    capabilities: this.getPlatformCapabilities(),
                                    moduleVersion: '1.0.0',
                                    timestamp: Date.now()
                                }
                            }];
                }
            });
        });
    };
    // MARK: - Debug Information
    ExpoHeadphoneDetectionModule.prototype.getDebugInfo = function () {
        var moduleLoaded = false;
        var lastError = null;
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
            moduleLoaded: moduleLoaded,
            capabilities: this.getPlatformCapabilities(),
            lastError: lastError,
            timestamp: Date.now()
        };
    };
    return ExpoHeadphoneDetectionModule;
}(expo_modules_core_1.EventEmitter));
// MARK: - Singleton Export
var ExpoHeadphoneDetectionModuleInstance = new ExpoHeadphoneDetectionModule();
// Ensure proper cleanup on app termination
if (react_native_1.Platform.OS !== 'web') {
    var AppState = require('react-native').AppState;
    var appStateSubscription = null;
    var handleAppStateChange = function (nextAppState) {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
            // App is going to background, stop listening to save battery
            ExpoHeadphoneDetectionModuleInstance.stopListening().catch(function () { });
        }
        else if (nextAppState === 'active') {
            // App is coming to foreground, restart listening
            ExpoHeadphoneDetectionModuleInstance.startListening().catch(function () { });
        }
    };
    // Set up app state listener
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    // Cleanup function for development
    if (__DEV__) {
        var originalConsoleError_1 = console.error;
        console.error = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (args[0] && args[0].includes('ExpoHeadphoneDetection')) {
                // Enhanced error logging for development
                console.group('🎧 Headphone Detection Error');
                originalConsoleError_1.apply(void 0, args);
                console.log('Debug Info:', ExpoHeadphoneDetectionModuleInstance.getDebugInfo());
                console.groupEnd();
            }
            else {
                originalConsoleError_1.apply(void 0, args);
            }
        };
    }
}
exports.default = ExpoHeadphoneDetectionModuleInstance;
