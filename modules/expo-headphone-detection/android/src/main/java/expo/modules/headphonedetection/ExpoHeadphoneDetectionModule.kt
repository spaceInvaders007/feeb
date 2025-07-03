package expo.modules.headphonedetection

import android.content.Context
import android.media.AudioManager
import android.media.AudioDeviceInfo
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoHeadphoneDetectionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoHeadphoneDetection")

    AsyncFunction("getCurrentStatus") { promise: Promise ->
      try {
        val status = getCurrentHeadphoneStatus()
        promise.resolve(status)
      } catch (error: Throwable) {
        promise.reject("HEADPHONE_DETECTION_ERROR", error.message, error)
      }
    }

    AsyncFunction("startListening") { promise: Promise ->
      try {
        // For now, just resolve - we can add real listening later
        promise.resolve(null)
      } catch (error: Throwable) {
        promise.reject("START_LISTENING_ERROR", error.message, error)
      }
    }

    AsyncFunction("stopListening") { promise: Promise ->
      try {
        // For now, just resolve - we can add real listening later
        promise.resolve(null)
      } catch (error: Throwable) {
        promise.reject("STOP_LISTENING_ERROR", error.message, error)
      }
    }
  }

  private val context
    get() = requireNotNull(appContext.reactContext)

  private fun getCurrentHeadphoneStatus(): Map<String, Any> {
    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    
    var isConnected = false
    var deviceType = "none"
    var deviceName = ""
    var confidence = 0.0

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      
      for (device in devices) {
        when (device.type) {
          AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
          AudioDeviceInfo.TYPE_WIRED_HEADSET -> {
            isConnected = true
            deviceType = "wired"
            deviceName = device.productName?.toString() ?: "Wired Headphones"
            confidence = 0.95
            break
          }
          AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
          AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> {
            isConnected = true
            deviceType = "bluetooth"
            deviceName = device.productName?.toString() ?: "Bluetooth Headphones"
            confidence = 0.90
            break
          }
        }
      }
    } else {
      // Fallback for older Android versions
      isConnected = audioManager.isWiredHeadsetOn || audioManager.isBluetoothA2dpOn
      if (isConnected) {
        deviceType = if (audioManager.isWiredHeadsetOn) "wired" else "bluetooth"
        deviceName = if (audioManager.isWiredHeadsetOn) "Wired Headphones" else "Bluetooth Headphones"
        confidence = 0.80
      }
    }

    return mapOf(
      "isConnected" to isConnected,
      "deviceType" to deviceType,
      "deviceName" to deviceName,
      "confidence" to confidence,
      "timestamp" to System.currentTimeMillis(),
      "metadata" to mapOf(
        "platform" to "android",
        "apiLevel" to Build.VERSION.SDK_INT,
        "method" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) "AudioDeviceInfo" else "AudioManager"
      )
    )
  }
}
