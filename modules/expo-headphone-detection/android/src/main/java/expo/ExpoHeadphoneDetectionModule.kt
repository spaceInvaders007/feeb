// modules/expo-headphone-detection/android/src/main/java/expo/modules/headphonedetection/ExpoHeadphoneDetectionModule.kt

package expo.modules.headphonedetection

import android.annotation.SuppressLint
import android.bluetooth.*
import android.content.*
import android.content.pm.PackageManager
import android.media.*
import android.os.*
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.kotlin.types.Enumerable
import kotlinx.coroutines.*
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.min
import kotlin.math.pow

// MARK: - Data Classes

data class HeadphoneInfo(
    val isConnected: Boolean = false,
    val deviceType: String = "none",
    val deviceName: String = "",
    val confidence: Double = 0.0,
    val timestamp: Long = System.currentTimeMillis(),
    val metadata: Map<String, Any> = emptyMap()
) {
    fun toMap(): Map<String, Any> = mapOf(
        "isConnected" to isConnected,
        "deviceType" to deviceType,
        "deviceName" to deviceName,
        "confidence" to confidence,
        "timestamp" to timestamp.toDouble(),
        "metadata" to metadata
    )
}

data class DetectionMetrics(
    val detectionLatency: Double = 0.0,
    val accuracyScore: Double = 0.0,
    val deviceCount: Int = 0,
    val errorCount: Int = 0,
    val lastError: String? = null
) {
    fun toMap(): Map<String, Any> = mapOf(
        "detectionLatency" to detectionLatency,
        "accuracyScore" to accuracyScore,
        "deviceCount" to deviceCount,
        "errorCount" to errorCount,
        "lastError" to (lastError ?: "")
    )
}

enum class DeviceType(val value: String) : Enumerable {
    WIRED("wired"),
    BLUETOOTH("bluetooth"),
    USB("usb"),
    NONE("none");
    
    companion object {
        fun fromString(value: String): DeviceType {
            return values().find { it.value == value } ?: NONE
        }
    }
}

// MARK: - Production Headphone Detection Module

class ExpoHeadphoneDetectionModule : Module() {
    
    companion object {
        private const val TAG = "HeadphoneDetection"
        private const val MAX_RETRY_ATTEMPTS = 3
        private const val RETRY_BACKOFF_MULTIPLIER = 2.0
        private const val INITIAL_RETRY_DELAY = 100L
        private const val DETECTION_TIMEOUT = 5000L
        private const val ACCURACY_THRESHOLD = 0.95
        private const val TELEMETRY_BATCH_SIZE = 100
        private const val CACHE_EXPIRATION = 30000L
        private const val CIRCUIT_BREAKER_THRESHOLD = 5
        private const val CIRCUIT_BREAKER_TIMEOUT = 60000L
    }
    
    // MARK: - State Management
    
    private var isListening = false
    private var audioManager: AudioManager? = null
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothHeadset: BluetoothHeadset? = null
    private var headsetReceiver: HeadsetStateReceiver? = null
    private var bluetoothReceiver: BluetoothStateReceiver? = null
    
    private val detectionScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    // MARK: - Performance & Circuit Breaker
    
    private val retryCount = AtomicInteger(0)
    private val circuitBreakerFailureCount = AtomicInteger(0)
    private val lastCircuitBreakerFailure = AtomicLong(0)
    private var isCircuitBreakerOpen = false
    
    private var lastKnownState: HeadphoneInfo? = null
    private var lastDetectionResult: Pair<HeadphoneInfo, Long>? = null
    
    // MARK: - Telemetry
    
    private val telemetryEvents = ConcurrentHashMap<String, Map<String, Any>>()
    private var metrics = DetectionMetrics()
    
    // MARK: - Module Definition
    
    override fun definition() = ModuleDefinition {
        Name("ExpoHeadphoneDetection")
        
        Events("headphoneStatusChanged", "detectionError", "performanceMetrics")
        
        AsyncFunction("getCurrentStatus") { promise: Promise ->
            detectionScope.launch {
                try {
                    val result = performDetectionWithFallback()
                    promise.resolve(result.toMap())
                } catch (e: Exception) {
                    promise.reject("DETECTION_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("startListening") { promise: Promise ->
            mainScope.launch {
                try {
                    startListening()
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("START_LISTENING_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("stopListening") { promise: Promise ->
            mainScope.launch {
                try {
                    stopListening()
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("STOP_LISTENING_ERROR", e.message, e)
                }
            }
        }
        
        AsyncFunction("getDetectionMetrics") { promise: Promise ->
            promise.resolve(metrics.toMap())
        }
        
        AsyncFunction("resetCircuitBreaker") { promise: Promise ->
            resetCircuitBreaker()
            promise.resolve(null)
        }
        
        Function("isCircuitBreakerOpen") {
            return@Function isCircuitBreakerOpen
        }
        
        OnCreate {
            initializeModule()
        }
        
        OnDestroy {
            cleanup()
        }
    }
    
    // MARK: - Core Detection Logic
    
    private suspend fun performDetectionWithFallback(): HeadphoneInfo = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()
        
        // Check circuit breaker
        if (isCircuitBreakerOpen && shouldKeepCircuitBreakerOpen()) {
            logTelemetry("detection_blocked_circuit_breaker", mapOf("timestamp" to startTime))
            return@withContext lastKnownState ?: HeadphoneInfo()
        }
        
        // Check cache
        getCachedResult()?.let { cached ->
            logTelemetry("detection_cache_hit", mapOf("timestamp" to startTime))
            return@withContext cached
        }
        
        var detectionResult: HeadphoneInfo? = null
        var lastError: Exception? = null
        
        // Detection methods in order of reliability
        val detectionMethods = listOf<suspend () -> HeadphoneInfo>(
            { detectViaAudioManager() },
            { detectViaBluetooth() },
            { detectViaMediaPlayer() },
            { detectViaSystemProperties() }
        )
        
        for ((index, method) in detectionMethods.withIndex()) {
            try {
                val methodStartTime = System.currentTimeMillis()
                detectionResult = withTimeout(DETECTION_TIMEOUT) {
                    method()
                }
                
                val methodLatency = System.currentTimeMillis() - methodStartTime
                logTelemetry("detection_method_success", mapOf(
                    "method" to index,
                    "latency" to methodLatency,
                    "timestamp" to methodStartTime
                ))
                break
            } catch (e: Exception) {
                lastError = e
                logTelemetry("detection_method_failed", mapOf(
                    "method" to index,
                    "error" to e.message,
                    "timestamp" to System.currentTimeMillis()
                ))
                continue
            }
        }
        
        val totalLatency = (System.currentTimeMillis() - startTime).toDouble()
        
        return@withContext if (detectionResult != null) {
            handleDetectionSuccess(detectionResult, totalLatency)
            detectionResult
        } else {
            handleDetectionFailure(lastError, totalLatency)
            lastKnownState ?: HeadphoneInfo()
        }
    }
    
    // MARK: - Detection Methods
    
    private suspend fun detectViaAudioManager(): HeadphoneInfo = withContext(Dispatchers.IO) {
        val audioManager = this@ExpoHeadphoneDetectionModule.audioManager
            ?: throw IllegalStateException("AudioManager not initialized")
        
        var deviceType = DeviceType.NONE
        var deviceName = ""
        var confidence = 0.0
        var isConnected = false
        
        try {
            // Check wired headphones
            val isWiredHeadsetOn = audioManager.isWiredHeadsetOn
            if (isWiredHeadsetOn) {
                deviceType = DeviceType.WIRED
                deviceName = "Wired Headphones"
                confidence = 0.95
                isConnected = true
            }
            
            // Check Bluetooth audio
            val isBluetoothA2dpOn = audioManager.isBluetoothA2dpOn
            val isBluetoothScoOn = audioManager.isBluetoothScoOn
            
            if (isBluetoothA2dpOn || isBluetoothScoOn) {
                deviceType = DeviceType.BLUETOOTH
                confidence = 0.9
                isConnected = true
                
                // Try to get connected Bluetooth device name
                bluetoothHeadset?.connectedDevices?.firstOrNull()?.let { device ->
                    deviceName = device.name ?: "Bluetooth Device"
                    confidence = 0.95
                }
            }
            
            // Advanced audio device detection for API 23+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
                
                for (device in audioDevices) {
                    val deviceAnalysis = analyzeAudioDevice(device)
                    if (deviceAnalysis.second > confidence) {
                        deviceType = deviceAnalysis.first
                        deviceName = getDeviceName(device)
                        confidence = deviceAnalysis.second
                        isConnected = true
                    }
                }
            }
            
        } catch (e: SecurityException) {
            Log.w(TAG, "Security exception during audio detection", e)
            throw e
        }
        
        HeadphoneInfo(
            isConnected = isConnected && confidence > ACCURACY_THRESHOLD,
            deviceType = deviceType.value,
            deviceName = deviceName,
            confidence = confidence,
            timestamp = System.currentTimeMillis(),
            metadata = mapOf(
                "detection_method" to "audio_manager",
                "api_level" to Build.VERSION.SDK_INT,
                "wired_headset_on" to audioManager.isWiredHeadsetOn,
                "bluetooth_a2dp_on" to audioManager.isBluetoothA2dpOn,
                "bluetooth_sco_on" to audioManager.isBluetoothScoOn
            )
        )
    }
    
    @SuppressLint("MissingPermission")
    private suspend fun detectViaBluetooth(): HeadphoneInfo = withContext(Dispatchers.IO) {
        val bluetoothAdapter = this@ExpoHeadphoneDetectionModule.bluetoothAdapter
            ?: throw IllegalStateException("Bluetooth not available")
        
        if (!bluetoothAdapter.isEnabled) {
            return@withContext HeadphoneInfo(
                metadata = mapOf("detection_method" to "bluetooth", "bluetooth_enabled" to false)
            )
        }
        
        var bestMatch: Triple<String, DeviceType, Double>? = null
        
        try {
            // Check paired devices
            val pairedDevices = bluetoothAdapter.bondedDevices
            for (device in pairedDevices) {
                if (isBluetoothAudioDevice(device)) {
                    val analysis = analyzeBluetoothDevice(device)
                    val current = bestMatch
                    if (current == null || analysis.second > current.third) {
                        bestMatch = Triple(device.name ?: "Bluetooth Device", analysis.first, analysis.second)
                    }
                }
            }
            
            // Check connected devices via profile
            bluetoothHeadset?.connectedDevices?.forEach { device ->
                val confidence = 0.98 // High confidence for actively connected devices
                val deviceType = if (device.bluetoothClass?.hasService(BluetoothClass.Service.AUDIO) == true) {
                    DeviceType.BLUETOOTH
                } else {
                    DeviceType.BLUETOOTH
                }
                
                val current = bestMatch
                if (current == null || confidence > current.third) {
                    bestMatch = Triple(device.name ?: "Connected Bluetooth Device", deviceType, confidence)
                }
            }
            
        } catch (e: SecurityException) {
            Log.w(TAG, "Security exception during Bluetooth detection", e)
            throw e
        }
        
        val (deviceName, deviceType, confidence) = bestMatch ?: Triple("", DeviceType.NONE, 0.0)
        
        HeadphoneInfo(
            isConnected = confidence > ACCURACY_THRESHOLD,
            deviceType = deviceType.value,
            deviceName = deviceName,
            confidence = confidence,
            timestamp = System.currentTimeMillis(),
            metadata = mapOf(
                "detection_method" to "bluetooth",
                "bluetooth_enabled" to bluetoothAdapter.isEnabled,
                "paired_devices_count" to (bluetoothAdapter.bondedDevices?.size ?: 0),
                "connected_devices_count" to (bluetoothHeadset?.connectedDevices?.size ?: 0)
            )
        )
    }
    
    private suspend fun detectViaMediaPlayer(): HeadphoneInfo = withContext(Dispatchers.IO) {
        // Media player-based detection as fallback
        val audioManager = this@ExpoHeadphoneDetectionModule.audioManager
            ?: throw IllegalStateException("AudioManager not initialized")
        
        var confidence = 0.0
        var deviceType = DeviceType.NONE
        var deviceName = ""
        
        try {
            // Check audio routing
            val audioMode = audioManager.mode
            val isSpeakerphoneOn = audioManager.isSpeakerphoneOn
            val isMusicActive = audioManager.isMusicActive
            
            // Heuristic: if music is active and speaker is off, likely headphones
            if (isMusicActive && !isSpeakerphoneOn) {
                confidence = 0.6
                deviceType = DeviceType.WIRED // Default assumption
                deviceName = "Audio Device"
            }
            
            // Check for USB audio on supported devices
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val usbDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
                    .filter { it.type == AudioDeviceInfo.TYPE_USB_HEADSET || it.type == AudioDeviceInfo.TYPE_USB_DEVICE }
                
                if (usbDevices.isNotEmpty()) {
                    confidence = 0.85
                    deviceType = DeviceType.USB
                    deviceName = "USB Audio Device"
                }
            }
            
        } catch (e: Exception) {
            Log.w(TAG, "Error in media player detection", e)
            throw e
        }
        
        HeadphoneInfo(
            isConnected = confidence > 0.5,
            deviceType = deviceType.value,
            deviceName = deviceName,
            confidence = confidence,
            timestamp = System.currentTimeMillis(),
            metadata = mapOf(
                "detection_method" to "media_player",
                "audio_mode" to audioManager.mode,
                "speakerphone_on" to audioManager.isSpeakerphoneOn,
                "music_active" to audioManager.isMusicActive
            )
        )
    }
    
    private suspend fun detectViaSystemProperties(): HeadphoneInfo = withContext(Dispatchers.IO) {
        // System property-based detection as last resort
        var confidence = 0.0
        var deviceType = DeviceType.NONE
        var deviceName = ""
        
        try {
            // Check system properties (requires careful handling)
            val wiredProperty = getSystemProperty("ro.audio.headphone", "0")
            val bluetoothProperty = getSystemProperty("ro.bluetooth.headset", "0")
            
            if (wiredProperty == "1") {
                confidence = 0.4
                deviceType = DeviceType.WIRED
                deviceName = "System Detected Headphones"
            } else if (bluetoothProperty == "1") {
                confidence = 0.4
                deviceType = DeviceType.BLUETOOTH
                deviceName = "System Detected Bluetooth"
            }
            
        } catch (e: Exception) {
            Log.w(TAG, "Error reading system properties", e)
        }
        
        HeadphoneInfo(
            isConnected = confidence > 0.3,
            deviceType = deviceType.value,
            deviceName = deviceName,
            confidence = confidence,
            timestamp = System.currentTimeMillis(),
            metadata = mapOf("detection_method" to "system_properties")
        )
    }
    
    // MARK: - Analysis Helpers
    
    @RequiresApi(Build.VERSION_CODES.M)
    private fun analyzeAudioDevice(device: AudioDeviceInfo): Pair<DeviceType, Double> {
        var confidence = 0.0
        var deviceType = DeviceType.NONE
        
        when (device.type) {
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
            AudioDeviceInfo.TYPE_WIRED_HEADSET -> {
                deviceType = DeviceType.WIRED
                confidence = 0.98
            }
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> {
                deviceType = DeviceType.BLUETOOTH
                confidence = 0.96
            }
            AudioDeviceInfo.TYPE_USB_HEADSET,
            AudioDeviceInfo.TYPE_USB_DEVICE -> {
                deviceType = DeviceType.USB
                confidence = 0.90
            }
            AudioDeviceInfo.TYPE_BUILTIN_EARPIECE,
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> {
                deviceType = DeviceType.NONE
                confidence = 0.0
            }
            else -> {
                // Analyze by product name
                val productName = device.productName.toString().lowercase()
                val nameAnalysis = analyzeDeviceName(productName)
                deviceType = nameAnalysis.first
                confidence = nameAnalysis.second * 0.7 // Lower confidence for name-based detection
            }
        }
        
        return Pair(deviceType, confidence)
    }
    
    @SuppressLint("MissingPermission")
    private fun analyzeBluetoothDevice(device: BluetoothDevice): Pair<DeviceType, Double> {
        var confidence = 0.0
        
        try {
            // Check device class
            device.bluetoothClass?.let { bluetoothClass ->
                when (bluetoothClass.majorDeviceClass) {
                    BluetoothClass.Device.Major.AUDIO_VIDEO -> {
                        confidence += 0.4
                        
                        // Check specific audio device types
                        when (bluetoothClass.deviceClass) {
                            BluetoothClass.Device.AUDIO_VIDEO_HEADPHONES,
                            BluetoothClass.Device.AUDIO_VIDEO_WEARABLE_HEADSET -> {
                                confidence = 0.95
                            }
                            BluetoothClass.Device.AUDIO_VIDEO_HANDSFREE -> {
                                confidence = 0.85
                            }
                        }
                        
                        // Check services
                        if (bluetoothClass.hasService(BluetoothClass.Service.AUDIO)) {
                            confidence += 0.3
                        }
                        if (bluetoothClass.hasService(BluetoothClass.Service.RENDER)) {
                            confidence += 0.2
                        }
                    }
                }
            }
            
            // Analyze device name
            device.name?.let { name ->
                val nameAnalysis = analyzeDeviceName(name.lowercase())
                confidence = maxOf(confidence, nameAnalysis.second)
            }
            
        } catch (e: SecurityException) {
            Log.w(TAG, "Security exception analyzing Bluetooth device", e)
        }
        
        return Pair(DeviceType.BLUETOOTH, min(confidence, 1.0))
    }
    
    private fun analyzeDeviceName(name: String): Pair<DeviceType, Double> {
        val headphoneKeywords = mapOf(
            "airpods" to 0.98,
            "beats" to 0.95,
            "headphone" to 0.9,
            "headset" to 0.85,
            "earphone" to 0.85,
            "earbuds" to 0.9,
            "bluetooth" to 0.7,
            "wireless" to 0.6,
            "sony" to 0.8,
            "bose" to 0.85,
            "sennheiser" to 0.9,
            "jbl" to 0.8,
            "skullcandy" to 0.8,
            "audio-technica" to 0.85
        )
        
        for ((keyword, score) in headphoneKeywords) {
            if (name.contains(keyword)) {
                val deviceType = if (keyword == "bluetooth" || keyword == "wireless" || keyword == "airpods") {
                    DeviceType.BLUETOOTH
                } else {
                    DeviceType.WIRED
                }
                return Pair(deviceType, score)
            }
        }
        
        return Pair(DeviceType.NONE, 0.0)
    }
    
    @RequiresApi(Build.VERSION_CODES.M)
    private fun getDeviceName(device: AudioDeviceInfo): String {
        return device.productName?.toString() ?: when (device.type) {
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "Wired Headphones"
            AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired Headset"
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "Bluetooth A2DP"
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth SCO"
            AudioDeviceInfo.TYPE_USB_HEADSET -> "USB Headset"
            AudioDeviceInfo.TYPE_USB_DEVICE -> "USB Audio Device"
            else -> "Audio Device"
        }
    }
    
    @SuppressLint("MissingPermission")
    private fun isBluetoothAudioDevice(device: BluetoothDevice): Boolean {
        return try {
            device.bluetoothClass?.let { bluetoothClass ->
                bluetoothClass.majorDeviceClass == BluetoothClass.Device.Major.AUDIO_VIDEO &&
                bluetoothClass.hasService(BluetoothClass.Service.AUDIO)
            } ?: false
        } catch (e: SecurityException) {
            false
        }
    }
    
    // MARK: - Caching & State Management
    
    private fun getCachedResult(): HeadphoneInfo? {
        val (result, timestamp) = lastDetectionResult ?: return null
        val age = System.currentTimeMillis() - timestamp
        
        return if (age < CACHE_EXPIRATION) {
            result
        } else {
            lastDetectionResult = null
            null
        }
    }
    
    private fun cacheResult(result: HeadphoneInfo) {
        lastDetectionResult = Pair(result, System.currentTimeMillis())
    }
    
    // MARK: - Error Handling & Circuit Breaker
    
    private fun handleDetectionSuccess(result: HeadphoneInfo, latency: Double) {
        lastKnownState = result
        cacheResult(result)
        retryCount.set(0)
        
        // Reset circuit breaker on success
        if (circuitBreakerFailureCount.get() > 0) {
            circuitBreakerFailureCount.decrementAndGet()
            if (circuitBreakerFailureCount.get() <= 0) {
                isCircuitBreakerOpen = false
            }
        }
        
        metrics = metrics.copy(
            detectionLatency = latency,
            accuracyScore = result.confidence
        )
        
        logTelemetry("detection_success", mapOf(
            "latency" to latency,
            "confidence" to result.confidence,
            "device_type" to result.deviceType,
            "timestamp" to result.timestamp
        ))
        
        // Emit success event
        mainScope.launch {
            sendEvent("headphoneStatusChanged", result.toMap())
        }
    }
    
    private fun handleDetectionFailure(error: Exception?, latency: Double) {
        retryCount.incrementAndGet()
        circuitBreakerFailureCount.incrementAndGet()
        lastCircuitBreakerFailure.set(System.currentTimeMillis())
        
        metrics = metrics.copy(
            errorCount = metrics.errorCount + 1,
            lastError = error?.message
        )
        
        // Open circuit breaker if too many failures
        if (circuitBreakerFailureCount.get() >= CIRCUIT_BREAKER_THRESHOLD) {
            isCircuitBreakerOpen = true
        }
        
        logTelemetry("detection_failure", mapOf(
            "error" to (error?.message ?: "unknown"),
            "retry_count" to retryCount.get(),
            "circuit_breaker_failures" to circuitBreakerFailureCount.get(),
            "latency" to latency,
            "timestamp" to System.currentTimeMillis()
        ))
        
        // Emit error event
        mainScope.launch {
            sendEvent("detectionError", mapOf(
                "error" to (error?.message ?: "Detection failed"),
                "retryCount" to retryCount.get(),
                "circuitBreakerOpen" to isCircuitBreakerOpen
            ))
        }
    }
    
    private fun shouldKeepCircuitBreakerOpen(): Boolean {
        val lastFailure = lastCircuitBreakerFailure.get()
        if (lastFailure == 0L) return false
        
        val timeSinceFailure = System.currentTimeMillis() - lastFailure
        val backoffTime = (RETRY_BACKOFF_MULTIPLIER.pow(circuitBreakerFailureCount.get().toDouble()) * 10000).toLong()
        
        return timeSinceFailure < backoffTime
    }
    
    private fun resetCircuitBreaker() {
        circuitBreakerFailureCount.set(0)
        lastCircuitBreakerFailure.set(0)
        isCircuitBreakerOpen = false
        retryCount.set(0)
        
        logTelemetry("circuit_breaker_reset", mapOf("timestamp" to System.currentTimeMillis()))
    }
    
    // MARK: - Broadcast Receivers
    
    private inner class HeadsetStateReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (!isListening) return
            
            when (intent?.action) {
                AudioManager.ACTION_HEADSET_PLUG -> {
                    val state = intent.getIntExtra("state", -1)
                    val name = intent.getStringExtra("name") ?: "Wired Headset"
                    val microphone = intent.getIntExtra("microphone", -1)
                    
                    detectionScope.launch {
                        val startTime = System.currentTimeMillis()
                        val result = performDetectionWithFallback()
                        val latency = System.currentTimeMillis() - startTime
                        
                        logTelemetry("headset_plug_detected", mapOf(
                            "state" to state,
                            "name" to name,
                            "microphone" to microphone,
                            "latency" to latency,
                            "timestamp" to startTime
                        ))
                        
                        mainScope.launch {
                            sendEvent("headphoneStatusChanged", result.toMap())
                        }
                    }
                }
            }
        }
    }
    
    private inner class BluetoothStateReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (!isListening) return
            
            when (intent?.action) {
                BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED,
                BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED -> {
                    detectionScope.launch {
                        val startTime = System.currentTimeMillis()
                        val result = performDetectionWithFallback()
                        val latency = System.currentTimeMillis() - startTime
                        
                        logTelemetry("bluetooth_connection_changed", mapOf(
                            "action" to intent.action,
                            "latency" to latency,
                            "timestamp" to startTime
                        ))
                        
                        mainScope.launch {
                            sendEvent("headphoneStatusChanged", result.toMap())
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Module Lifecycle
    
    private fun initializeModule() {
        try {
            audioManager = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            
            // Initialize Bluetooth if available
            if (appContext.reactContext?.packageManager?.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH) == true) {
                bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
            }
            
            logTelemetry("module_initialized", mapOf(
                "timestamp" to System.currentTimeMillis(),
                "audio_manager_available" to (audioManager != null),
                "bluetooth_available" to (bluetoothAdapter != null)
            ))
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing module", e)
            logTelemetry("module_init_error", mapOf(
                "error" to e.message,
                "timestamp" to System.currentTimeMillis()
            ))
        }
    }
    
    private fun startListening() {
        if (isListening) return
        
        isListening = true
        
        try {
            val context = appContext.reactContext ?: return
            
            // Register headset receiver
            headsetReceiver = HeadsetStateReceiver()
            val headsetFilter = IntentFilter(AudioManager.ACTION_HEADSET_PLUG)
            context.registerReceiver(headsetReceiver, headsetFilter)
            
            // Register Bluetooth receiver
            bluetoothReceiver = BluetoothStateReceiver()
            val bluetoothFilter = IntentFilter().apply {
                addAction(BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED)
                addAction(BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED)
            }
            context.registerReceiver(bluetoothReceiver, bluetoothFilter)
            
            // Setup Bluetooth profile listeners
            setupBluetoothProfiles()
            
            // Initial detection
            detectionScope.launch {
                performDetectionWithFallback()
            }
            
            logTelemetry("listening_started", mapOf("timestamp" to System.currentTimeMillis()))
        } catch (e: Exception) {
            Log.e(TAG, "Error starting listening", e)
            logTelemetry("listening_start_error", mapOf(
                "error" to e.message,
                "timestamp" to System.currentTimeMillis()
            ))
        }
    }
    
    private fun stopListening() {
        if (!isListening) return
        
        isListening = false
        
        try {
            val context = appContext.reactContext
            
            // Unregister receivers
            headsetReceiver?.let { context?.unregisterReceiver(it) }
            bluetoothReceiver?.let { context?.unregisterReceiver(it) }
            
            headsetReceiver = null
            bluetoothReceiver = null
            
            // Close Bluetooth profiles
            bluetoothAdapter?.closeProfileProxy(BluetoothProfile.HEADSET, bluetoothHeadset)
            bluetoothHeadset = null
            
            logTelemetry("listening_stopped", mapOf("timestamp" to System.currentTimeMillis()))
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping listening", e)
            logTelemetry("listening_stop_error", mapOf(
                "error" to e.message,
                "timestamp" to System.currentTimeMillis()
            ))
        }
    }
    
    @SuppressLint("MissingPermission")
    private fun setupBluetoothProfiles() {
        bluetoothAdapter?.let { adapter ->
            if (adapter.isEnabled) {
                try {
                    adapter.getProfileProxy(appContext.reactContext, object : BluetoothProfile.ServiceListener {
                        override fun onServiceConnected(profile: Int, proxy: BluetoothProfile?) {
                            if (profile == BluetoothProfile.HEADSET) {
                                bluetoothHeadset = proxy as? BluetoothHeadset
                                logTelemetry("bluetooth_headset_profile_connected", mapOf(
                                    "timestamp" to System.currentTimeMillis()
                                ))
                            }
                        }
                        
                        override fun onServiceDisconnected(profile: Int) {
                            if (profile == BluetoothProfile.HEADSET) {
                                bluetoothHeadset = null
                                logTelemetry("bluetooth_headset_profile_disconnected", mapOf(
                                    "timestamp" to System.currentTimeMillis()
                                ))
                            }
                        }
                    }, BluetoothProfile.HEADSET)
                } catch (e: SecurityException) {
                    Log.w(TAG, "Security exception setting up Bluetooth profiles", e)
                }
            }
        }
    }
    
    private fun cleanup() {
        try {
            stopListening()
            
            // Cancel all coroutines
            detectionScope.cancel()
            mainScope.cancel()
            
            // Clear caches
            lastDetectionResult = null
            lastKnownState = null
            telemetryEvents.clear()
            
            logTelemetry("module_cleanup", mapOf("timestamp" to System.currentTimeMillis()))
        } catch (e: Exception) {
            Log.e(TAG, "Error during cleanup", e)
        }
    }
    
    // MARK: - Telemetry & Analytics
    
    private fun logTelemetry(event: String, data: Map<String, Any>) {
        detectionScope.launch {
            val telemetryEvent = mapOf(
                "event" to event,
                "timestamp" to System.currentTimeMillis(),
                "data" to data,
                "session_id" to UUID.randomUUID().toString()
            )
            
            telemetryEvents[UUID.randomUUID().toString()] = telemetryEvent
            
            // Batch telemetry events
            if (telemetryEvents.size >= TELEMETRY_BATCH_SIZE) {
                flushTelemetry()
            }
        }
    }
    
    private fun flushTelemetry() {
        val events = telemetryEvents.toMap()
        telemetryEvents.clear()
        
        // Send telemetry events
        mainScope.launch {
            sendEvent("performanceMetrics", mapOf(
                "events" to events,
                "metrics" to metrics.toMap(),
                "timestamp" to System.currentTimeMillis()
            ))
        }
    }
    
    // MARK: - Utility Functions
    
    private fun getSystemProperty(key: String, defaultValue: String): String {
        return try {
            val systemProperties = Class.forName("android.os.SystemProperties")
            val get = systemProperties.getMethod("get", String::class.java, String::class.java)
            get.invoke(null, key, defaultValue) as? String ?: defaultValue
        } catch (e: Exception) {
            Log.w(TAG, "Error reading system property: $key", e)
            defaultValue
        }
    }
}