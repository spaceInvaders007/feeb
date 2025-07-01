// modules/expo-headphone-detection/ios/ExpoHeadphoneDetectionModule.swift

import Foundation
import ExpoModulesCore
import AVFoundation
import CoreAudio
import MediaPlayer

// MARK: - Data Structures

public struct HeadphoneInfo: Record {
    @Field
    public var isConnected: Bool = false
    
    @Field
    public var deviceType: String = "none"
    
    @Field
    public var deviceName: String = ""
    
    @Field
    public var confidence: Double = 0.0
    
    @Field
    public var timestamp: Double = Date().timeIntervalSince1970
    
    @Field
    public var metadata: [String: Any] = [:]
}

public struct DetectionMetrics: Record {
    @Field
    public var detectionLatency: Double = 0.0
    
    @Field
    public var accuracyScore: Double = 0.0
    
    @Field
    public var deviceCount: Int = 0
    
    @Field
    public var errorCount: Int = 0
    
    @Field
    public var lastError: String? = nil
}

// MARK: - Production Headphone Detection Module

public class ExpoHeadphoneDetectionModule: Module {
    
    // MARK: - Constants
    
    private enum Constants {
        static let maxRetryAttempts = 3
        static let retryBackoffMultiplier = 2.0
        static let initialRetryDelay = 0.1
        static let detectionTimeout = 5.0
        static let accuracyThreshold = 0.95
        static let telemetryBatchSize = 100
        static let cacheExpiration = 30.0
        static let maxConcurrentDetections = 3
    }
    
    private enum DeviceType: String, CaseIterable {
        case wired = "wired"
        case bluetooth = "bluetooth"
        case none = "none"
        case usbc = "usbc"
        case lightning = "lightning"
        case airplay = "airplay"
        case carplay = "carplay"
    }
    
    // MARK: - State Management
    
    private var isListening = false
    private var currentDetectionTask: Task<Void, Never>?
    private var retryCount = 0
    private var lastKnownState: HeadphoneInfo?
    private var detectionStartTime: CFAbsoluteTime = 0
    private var circuitBreakerFailureCount = 0
    private var circuitBreakerLastFailure: Date?
    private var isCircuitBreakerOpen = false
    
    // MARK: - Performance Tracking
    
    private var telemetryQueue = DispatchQueue(label: "com.feeb.headphone.telemetry", qos: .utility)
    private var detectionQueue = DispatchQueue(label: "com.feeb.headphone.detection", qos: .userInitiated)
    private var metrics = DetectionMetrics()
    private var telemetryEvents: [String: Any] = [:]
    
    // MARK: - Caching & Optimization
    
    private var deviceCache: [String: (info: AVAudioSessionPortDescription, timestamp: Date)] = [:]
    private var lastDetectionResult: (result: HeadphoneInfo, timestamp: Date)?
    
    // MARK: - Module Definition
    
    public func definition() -> ModuleDefinition {
        Name("ExpoHeadphoneDetection")
        
        Events("headphoneStatusChanged", "detectionError", "performanceMetrics")
        
        AsyncFunction("getCurrentStatus") { [weak self] () -> HeadphoneInfo in
            guard let self = self else {
                throw NSError(domain: "HeadphoneDetection", code: -1, userInfo: [NSLocalizedDescriptionKey: "Module deallocated"])
            }
            return await self.performDetectionWithFallback()
        }
        
        AsyncFunction("startListening") { [weak self] in
            await self?.startListening()
        }
        
        AsyncFunction("stopListening") { [weak self] in
            await self?.stopListening()
        }
        
        AsyncFunction("getDetectionMetrics") { [weak self] () -> DetectionMetrics in
            return self?.metrics ?? DetectionMetrics()
        }
        
        AsyncFunction("resetCircuitBreaker") { [weak self] in
            self?.resetCircuitBreaker()
        }
        
        Function("isCircuitBreakerOpen") { [weak self] () -> Bool in
            return self?.isCircuitBreakerOpen ?? false
        }
        
        OnCreate {
            self.setupAudioSession()
            self.logTelemetry("module_initialized", ["timestamp": Date().timeIntervalSince1970])
        }
        
        OnDestroy {
            Task { [weak self] in
                await self?.cleanup()
            }
        }
    }
    
    // MARK: - Core Detection Logic
    
    @MainActor
    private func performDetectionWithFallback() async -> HeadphoneInfo {
        let startTime = CFAbsoluteTimeGetCurrent()
        detectionStartTime = startTime
        
        // Check circuit breaker
        if isCircuitBreakerOpen && shouldKeepCircuitBreakerOpen() {
            logTelemetry("detection_blocked_circuit_breaker", ["timestamp": startTime])
            return lastKnownState ?? HeadphoneInfo()
        }
        
        // Check cache first
        if let cached = getCachedResult() {
            logTelemetry("detection_cache_hit", ["timestamp": startTime])
            return cached
        }
        
        var detectionResult: HeadphoneInfo?
        var lastError: Error?
        
        // Primary detection methods in order of reliability
        let detectionMethods: [(String, () async throws -> HeadphoneInfo)] = [
            ("route_change_detection", { await self.detectViaRouteChange() }),
            ("port_description_analysis", { await self.detectViaPortAnalysis() }),
            ("audio_unit_inspection", { await self.detectViaAudioUnit() }),
            ("media_player_fallback", { await self.detectViaMediaPlayer() })
        ]
        
        for (methodName, method) in detectionMethods {
            do {
                let methodStartTime = CFAbsoluteTimeGetCurrent()
                detectionResult = try await withTimeout(Constants.detectionTimeout) {
                    try await method()
                }
                
                let methodLatency = CFAbsoluteTimeGetCurrent() - methodStartTime
                logTelemetry("detection_method_success", [
                    "method": methodName,
                    "latency": methodLatency,
                    "timestamp": methodStartTime
                ])
                
                break
            } catch {
                lastError = error
                logTelemetry("detection_method_failed", [
                    "method": methodName,
                    "error": error.localizedDescription,
                    "timestamp": CFAbsoluteTimeGetCurrent()
                ])
                continue
            }
        }
        
        let totalLatency = CFAbsoluteTimeGetCurrent() - startTime
        
        guard let result = detectionResult else {
            await handleDetectionFailure(error: lastError, latency: totalLatency)
            return lastKnownState ?? HeadphoneInfo()
        }
        
        await handleDetectionSuccess(result: result, latency: totalLatency)
        return result
    }
    
    // MARK: - Detection Methods
    
    private func detectViaRouteChange() async throws -> HeadphoneInfo {
        return try await withCheckedThrowingContinuation { continuation in
            detectionQueue.async {
                let session = AVAudioSession.sharedInstance()
                let currentRoute = session.currentRoute
                
                var connectedDevice: AVAudioSessionPortDescription?
                var deviceType = DeviceType.none
                var confidence = 0.0
                
                // Analyze output ports
                for output in currentRoute.outputs {
                    let analysisResult = self.analyzeAudioPort(output)
                    if analysisResult.confidence > confidence {
                        connectedDevice = output
                        deviceType = analysisResult.deviceType
                        confidence = analysisResult.confidence
                    }
                }
                
                // Analyze input ports for headsets with microphones
                for input in currentRoute.inputs {
                    let analysisResult = self.analyzeAudioPort(input)
                    if analysisResult.confidence > confidence {
                        connectedDevice = input
                        deviceType = analysisResult.deviceType
                        confidence = analysisResult.confidence
                    }
                }
                
                let result = HeadphoneInfo(
                    isConnected: connectedDevice != nil && confidence > Constants.accuracyThreshold,
                    deviceType: deviceType.rawValue,
                    deviceName: connectedDevice?.portName ?? "",
                    confidence: confidence,
                    timestamp: Date().timeIntervalSince1970,
                    metadata: self.extractPortMetadata(connectedDevice)
                )
                
                continuation.resume(returning: result)
            }
        }
    }
    
    private func detectViaPortAnalysis() async throws -> HeadphoneInfo {
        return try await withCheckedThrowingContinuation { continuation in
            detectionQueue.async {
                let session = AVAudioSession.sharedInstance()
                var bestMatch: (port: AVAudioSessionPortDescription, type: DeviceType, confidence: Double)?
                
                let allPorts = session.currentRoute.outputs + session.currentRoute.inputs
                
                for port in allPorts {
                    let analysis = self.performAdvancedPortAnalysis(port)
                    
                    if let current = bestMatch {
                        if analysis.confidence > current.confidence {
                            bestMatch = (port, analysis.deviceType, analysis.confidence)
                        }
                    } else if analysis.confidence > 0.5 {
                        bestMatch = (port, analysis.deviceType, analysis.confidence)
                    }
                }
                
                let result: HeadphoneInfo
                if let match = bestMatch {
                    result = HeadphoneInfo(
                        isConnected: match.confidence > Constants.accuracyThreshold,
                        deviceType: match.type.rawValue,
                        deviceName: match.port.portName,
                        confidence: match.confidence,
                        timestamp: Date().timeIntervalSince1970,
                        metadata: self.extractAdvancedPortMetadata(match.port)
                    )
                } else {
                    result = HeadphoneInfo()
                }
                
                continuation.resume(returning: result)
            }
        }
    }
    
    private func detectViaAudioUnit() async throws -> HeadphoneInfo {
        return try await withCheckedThrowingContinuation { continuation in
            detectionQueue.async {
                var result = HeadphoneInfo()
                
                // Audio unit property inspection for detailed device info
                var propertySize: UInt32 = 0
                var status: OSStatus
                
                // Check for hardware-level device information
                status = AudioUnitGetPropertyInfo(
                    nil,
                    kAudioUnitProperty_CurrentDevice,
                    kAudioUnitScope_Global,
                    0,
                    &propertySize,
                    nil
                )
                
                if status == noErr {
                    // Additional hardware-level detection logic
                    result.confidence = 0.8
                    result.metadata["detection_method"] = "audio_unit"
                }
                
                continuation.resume(returning: result)
            }
        }
    }
    
    private func detectViaMediaPlayer() async throws -> HeadphoneInfo {
        return try await withCheckedThrowingContinuation { continuation in
            detectionQueue.async {
                // Media player route detection as fallback
                let session = AVAudioSession.sharedInstance()
                let route = session.currentRoute
                
                // Check for AirPlay and external audio routes
                let hasExternalOutput = route.outputs.contains { output in
                    self.isExternalAudioDevice(output)
                }
                
                let result = HeadphoneInfo(
                    isConnected: hasExternalOutput,
                    deviceType: hasExternalOutput ? "bluetooth" : "none",
                    deviceName: route.outputs.first?.portName ?? "",
                    confidence: hasExternalOutput ? 0.7 : 0.0,
                    timestamp: Date().timeIntervalSince1970,
                    metadata: ["detection_method": "media_player"]
                )
                
                continuation.resume(returning: result)
            }
        }
    }
    
    // MARK: - Analysis Helpers
    
    private func analyzeAudioPort(_ port: AVAudioSessionPortDescription) -> (deviceType: DeviceType, confidence: Double) {
        let portType = port.portType
        let portName = port.portName.lowercased()
        
        // High-confidence matches
        switch portType {
        case .headphones:
            return (.wired, 0.99)
        case .bluetoothA2DP, .bluetoothHFP, .bluetoothLE:
            return (.bluetooth, 0.99)
        case .usbAudio:
            return (.usbc, 0.95)
        case .airPlay:
            return (.airplay, 0.95)
        case .carAudio:
            return (.carplay, 0.95)
        default:
            break
        }
        
        // Name-based heuristics
        let headphoneKeywords = ["headphone", "headset", "airpods", "beats", "sony", "bose", "bluetooth", "wireless"]
        let matchingKeywords = headphoneKeywords.filter { portName.contains($0) }
        
        if !matchingKeywords.isEmpty {
            let confidence = Double(matchingKeywords.count) / Double(headphoneKeywords.count) * 0.8 + 0.1
            
            if portName.contains("bluetooth") || portName.contains("wireless") || portName.contains("airpods") {
                return (.bluetooth, min(confidence, 0.9))
            } else {
                return (.wired, min(confidence, 0.85))
            }
        }
        
        return (.none, 0.0)
    }
    
    private func performAdvancedPortAnalysis(_ port: AVAudioSessionPortDescription) -> (deviceType: DeviceType, confidence: Double) {
        var confidence = 0.0
        var deviceType = DeviceType.none
        
        // Check port characteristics
        let hasChannels = !port.channels.isEmpty
        let channelCount = port.channels.count
        let portName = port.portName.lowercased()
        let portType = port.portType
        
        // Multi-factor analysis
        var factors: [String: Double] = [:]
        
        // Port type factor
        switch portType {
        case .headphones:
            factors["port_type"] = 0.4
            deviceType = .wired
        case .bluetoothA2DP, .bluetoothHFP, .bluetoothLE:
            factors["port_type"] = 0.4
            deviceType = .bluetooth
        case .usbAudio:
            factors["port_type"] = 0.35
            deviceType = .usbc
        default:
            factors["port_type"] = 0.0
        }
        
        // Channel configuration factor
        if hasChannels {
            if channelCount == 2 {
                factors["channel_config"] = 0.2  // Stereo output typical for headphones
            } else if channelCount == 1 {
                factors["channel_config"] = 0.1  // Mono might be hands-free
            } else {
                factors["channel_config"] = 0.05 // Multi-channel less likely headphones
            }
        }
        
        // Name analysis factor
        let nameScore = analyzePortName(portName)
        factors["name_analysis"] = nameScore * 0.3
        
        // Hardware characteristics
        factors["hardware_analysis"] = analyzeHardwareCharacteristics(port) * 0.1
        
        confidence = factors.values.reduce(0, +)
        
        return (deviceType, min(confidence, 1.0))
    }
    
    private func analyzePortName(_ name: String) -> Double {
        let headphoneIndicators = [
            ("airpods", 0.95),
            ("beats", 0.9),
            ("headphone", 0.85),
            ("headset", 0.8),
            ("earphone", 0.8),
            ("earbuds", 0.85),
            ("bluetooth", 0.7),
            ("wireless", 0.6),
            ("sony", 0.7),
            ("bose", 0.7),
            ("sennheiser", 0.8),
            ("audio-technica", 0.8)
        ]
        
        for (keyword, score) in headphoneIndicators {
            if name.contains(keyword) {
                return score
            }
        }
        
        return 0.0
    }
    
    private func analyzeHardwareCharacteristics(_ port: AVAudioSessionPortDescription) -> Double {
        var score = 0.0
        
        // Check for preferred data source (indicates sophisticated device)
        if let _ = port.preferredDataSource {
            score += 0.3
        }
        
        // Check available data sources
        if !port.dataSources.isEmpty {
            score += 0.4
        }
        
        // Channel analysis
        for channel in port.channels {
            if channel.channelLabel != .unknown {
                score += 0.1
            }
        }
        
        return min(score, 1.0)
    }
    
    private func isExternalAudioDevice(_ port: AVAudioSessionPortDescription) -> Bool {
        let externalTypes: [AVAudioSession.Port] = [
            .headphones, .bluetoothA2DP, .bluetoothHFP, .bluetoothLE,
            .usbAudio, .airPlay, .carAudio, .HDMI
        ]
        return externalTypes.contains(port.portType)
    }
    
    // MARK: - Metadata Extraction
    
    private func extractPortMetadata(_ port: AVAudioSessionPortDescription?) -> [String: Any] {
        guard let port = port else { return [:] }
        
        return [
            "port_type": port.portType.rawValue,
            "port_name": port.portName,
            "channel_count": port.channels.count,
            "has_data_sources": !port.dataSources.isEmpty,
            "data_source_count": port.dataSources.count,
            "preferred_data_source": port.preferredDataSource?.dataSourceName ?? NSNull(),
            "uid": port.uid
        ]
    }
    
    private func extractAdvancedPortMetadata(_ port: AVAudioSessionPortDescription) -> [String: Any] {
        var metadata = extractPortMetadata(port)
        
        // Add detailed channel information
        var channelInfo: [[String: Any]] = []
        for channel in port.channels {
            channelInfo.append([
                "channel_name": channel.channelName,
                "channel_number": channel.channelNumber,
                "owner_uid": channel.ownerUID,
                "channel_label": channel.channelLabel.rawValue
            ])
        }
        metadata["channels"] = channelInfo
        
        // Add data source information
        var dataSourceInfo: [[String: Any]] = []
        for dataSource in port.dataSources {
            dataSourceInfo.append([
                "data_source_id": dataSource.dataSourceID,
                "data_source_name": dataSource.dataSourceName,
                "location": dataSource.location ?? NSNull(),
                "orientation": dataSource.orientation ?? NSNull()
            ])
        }
        metadata["data_sources"] = dataSourceInfo
        
        return metadata
    }
    
    // MARK: - State Management & Caching
    
    private func getCachedResult() -> HeadphoneInfo? {
        guard let (result, timestamp) = lastDetectionResult else { return nil }
        
        let age = Date().timeIntervalSince(timestamp)
        if age < Constants.cacheExpiration {
            return result
        }
        
        lastDetectionResult = nil
        return nil
    }
    
    private func cacheResult(_ result: HeadphoneInfo) {
        lastDetectionResult = (result, Date())
    }
    
    // MARK: - Error Handling & Circuit Breaker
    
    private func handleDetectionSuccess(result: HeadphoneInfo, latency: Double) async {
        await MainActor.run {
            lastKnownState = result
            cacheResult(result)
            retryCount = 0
            
            // Reset circuit breaker on success
            if circuitBreakerFailureCount > 0 {
                circuitBreakerFailureCount = max(0, circuitBreakerFailureCount - 1)
                if circuitBreakerFailureCount == 0 {
                    isCircuitBreakerOpen = false
                }
            }
            
            metrics.detectionLatency = latency
            metrics.accuracyScore = result.confidence
            
            logTelemetry("detection_success", [
                "latency": latency,
                "confidence": result.confidence,
                "device_type": result.deviceType,
                "timestamp": result.timestamp
            ])
            
            // Emit success event
            sendEvent("headphoneStatusChanged", result.toDictionary())
        }
    }
    
    private func handleDetectionFailure(error: Error?, latency: Double) async {
        await MainActor.run {
            retryCount += 1
            circuitBreakerFailureCount += 1
            circuitBreakerLastFailure = Date()
            
            metrics.errorCount += 1
            metrics.lastError = error?.localizedDescription
            
            // Open circuit breaker if too many failures
            if circuitBreakerFailureCount >= 5 {
                isCircuitBreakerOpen = true
            }
            
            logTelemetry("detection_failure", [
                "error": error?.localizedDescription ?? "unknown",
                "retry_count": retryCount,
                "circuit_breaker_failures": circuitBreakerFailureCount,
                "latency": latency,
                "timestamp": Date().timeIntervalSince1970
            ])
            
            // Emit error event
            sendEvent("detectionError", [
                "error": error?.localizedDescription ?? "Detection failed",
                "retryCount": retryCount,
                "circuitBreakerOpen": isCircuitBreakerOpen
            ])
        }
    }
    
    private func shouldKeepCircuitBreakerOpen() -> Bool {
        guard let lastFailure = circuitBreakerLastFailure else { return false }
        
        let timeSinceFailure = Date().timeIntervalSince(lastFailure)
        let backoffTime = pow(Constants.retryBackoffMultiplier, Double(circuitBreakerFailureCount)) * 10.0
        
        return timeSinceFailure < backoffTime
    }
    
    private func resetCircuitBreaker() {
        circuitBreakerFailureCount = 0
        circuitBreakerLastFailure = nil
        isCircuitBreakerOpen = false
        retryCount = 0
        
        logTelemetry("circuit_breaker_reset", ["timestamp": Date().timeIntervalSince1970])
    }
    
    // MARK: - Audio Session Setup
    
    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            
            // Configure session for optimal detection
            try session.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .allowBluetoothA2DP, .allowAirPlay])
            
            // Setup route change notification
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(handleRouteChange(_:)),
                name: AVAudioSession.routeChangeNotification,
                object: session
            )
            
            logTelemetry("audio_session_configured", ["timestamp": Date().timeIntervalSince1970])
        } catch {
            logTelemetry("audio_session_error", [
                "error": error.localizedDescription,
                "timestamp": Date().timeIntervalSince1970
            ])
        }
    }
    
    @objc private func handleRouteChange(_ notification: Notification) {
        guard isListening else { return }
        
        Task { [weak self] in
            guard let self = self else { return }
            
            let startTime = CFAbsoluteTimeGetCurrent()
            let result = await self.performDetectionWithFallback()
            let latency = CFAbsoluteTimeGetCurrent() - startTime
            
            await MainActor.run {
                self.logTelemetry("route_change_detected", [
                    "latency": latency,
                    "device_type": result.deviceType,
                    "timestamp": startTime
                ])
                
                self.sendEvent("headphoneStatusChanged", result.toDictionary())
            }
        }
    }
    
    // MARK: - Listening Control
    
    @MainActor
    private func startListening() async {
        guard !isListening else { return }
        
        isListening = true
        
        // Initial detection
        currentDetectionTask = Task { [weak self] in
            guard let self = self else { return }
            _ = await self.performDetectionWithFallback()
        }
        
        logTelemetry("listening_started", ["timestamp": Date().timeIntervalSince1970])
    }
    
    @MainActor
    private func stopListening() async {
        guard isListening else { return }
        
        isListening = false
        currentDetectionTask?.cancel()
        currentDetectionTask = nil
        
        logTelemetry("listening_stopped", ["timestamp": Date().timeIntervalSince1970])
    }
    
    // MARK: - Cleanup
    
    private func cleanup() async {
        await stopListening()
        
        NotificationCenter.default.removeObserver(self)
        
        // Clear caches
        deviceCache.removeAll()
        lastDetectionResult = nil
        
        logTelemetry("module_cleanup", ["timestamp": Date().timeIntervalSince1970])
    }
    
    // MARK: - Telemetry & Analytics
    
    private func logTelemetry(_ event: String, _ data: [String: Any]) {
        telemetryQueue.async {
            let timestamp = Date().timeIntervalSince1970
            let telemetryEvent: [String: Any] = [
                "event": event,
                "timestamp": timestamp,
                "data": data,
                "session_id": UUID().uuidString
            ]
            
            self.telemetryEvents[UUID().uuidString] = telemetryEvent
            
            // Batch telemetry events
            if self.telemetryEvents.count >= Constants.telemetryBatchSize {
                self.flushTelemetry()
            }
        }
    }
    
    private func flushTelemetry() {
        let events = telemetryEvents
        telemetryEvents.removeAll()
        
        // Send telemetry events
        sendEvent("performanceMetrics", [
            "events": events,
            "metrics": metrics.toDictionary(),
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - Utility Functions
    
    private func withTimeout<T>(_ timeout: TimeInterval, operation: @escaping () async throws -> T) async throws -> T {
        return try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask {
                try await operation()
            }
            
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                throw NSError(domain: "HeadphoneDetection", code: -2, userInfo: [NSLocalizedDescriptionKey: "Detection timeout"])
            }
            
            let result = try await group.next()!
            group.cancelAll()
            return result
        }
    }
}

// MARK: - Extensions

extension HeadphoneInfo {
    func toDictionary() -> [String: Any] {
        return [
            "isConnected": isConnected,
            "deviceType": deviceType,
            "deviceName": deviceName,
            "confidence": confidence,
            "timestamp": timestamp,
            "metadata": metadata
        ]
    }
}

extension DetectionMetrics {
    func toDictionary() -> [String: Any] {
        return [
            "detectionLatency": detectionLatency,
            "accuracyScore": accuracyScore,
            "deviceCount": deviceCount,
            "errorCount": errorCount,
            "lastError": lastError ?? NSNull()
        ]
    }
}