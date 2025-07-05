"use strict";
// modules/expo-headphone-detection/src/ExpoHeadphoneDetectionModule.web.ts
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
const expo_modules_core_1 = require("expo-modules-core");
// Basic web implementation for testing
class ExpoHeadphoneDetectionModuleWeb extends expo_modules_core_1.EventEmitter {
    getCurrentStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                isConnected: false,
                deviceType: 'none',
                deviceName: '',
                confidence: 0,
                timestamp: Date.now(),
                metadata: { platform: 'web', method: 'basic' }
            };
        });
    }
    startListening() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🌐 Web: Starting headphone detection...');
        });
    }
    stopListening() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🌐 Web: Stopping headphone detection...');
        });
    }
    getDetectionMetrics() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                detectionLatency: 0,
                accuracyScore: 0,
                deviceCount: 0,
                errorCount: 0,
                lastError: null
            };
        });
    }
    resetCircuitBreaker() {
        console.log('🌐 Web: Circuit breaker reset');
    }
    isCircuitBreakerOpenPublic() {
        return false;
    }
    getPermissionState() {
        return 'unknown';
    }
    requestPermissions() {
        return __awaiter(this, void 0, void 0, function* () {
            return { granted: true };
        });
    }
    invalidateCache() {
        console.log('🌐 Web: Cache invalidated');
    }
    getCacheInfo() {
        return { size: 0, lastUpdate: null };
    }
}
exports.default = new ExpoHeadphoneDetectionModuleWeb();
