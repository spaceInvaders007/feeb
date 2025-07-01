
// modules/expo-headphone-detection/android/src/main/java/expo/modules/headphonedetection/ExpoHeadphoneDetectionModule.kt
package expo.modules.headphonedetection

import android.bluetooth.BluetoothA2dp
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoHeadphoneDetectionModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext)
    
  private var audioManager: AudioManager? = null
  private var headphoneReceiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoHeadphoneDetection")
    
    Events("onHeadphoneStatusChanged")
    
    OnCreate {
      audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      setupHeadphoneReceiver()
    }
    
    OnDestroy {
      headphoneReceiver?.let { receiver ->
        try {
          context.unregisterReceiver(receiver)
        } catch (e: Exception) {
          // Receiver might not be registered
        }
      }
    }
    
    AsyncFunction("getCurrentStatus") { ->
      getCurrentHeadphoneStatus()
    }
    
    Function("startListening") {
      // Already set up in OnCreate
    }
    
    Function("stopListening") {
      headphoneReceiver?.let { receiver ->
        try {
          context.unregisterReceiver(receiver)
        } catch (e: Exception) {
          // Receiver might not be registered
        }
      }
    }
  }

  private fun setupHeadphoneReceiver() {
    headphoneReceiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
          AudioManager.ACTION_HEADSET_PLUG -> {
            val state = intent.getIntExtra("state", -1)
            val name = intent.getStringExtra("name") ?: "Wired Headphones"
            
            val status = mapOf(
              "isConnected" to (state == 1),
              "deviceType" to "wired",
              "deviceName" to name
            )
            
            sendEvent("onHeadphoneStatusChanged", status)
          }
          
          BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED -> {
            val state = intent.getIntExtra(BluetoothA2dp.EXTRA_STATE, -1)
            val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
              intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
            } else {
              @Suppress("DEPRECATION")
              intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
            }
            
            val status = mapOf(
              "isConnected" to (state == BluetoothA2dp.STATE_CONNECTED),
              "deviceType" to "bluetooth",
              "deviceName" to (device?.name ?: "Bluetooth Device")
            )
            
            sendEvent("onHeadphoneStatusChanged", status)
          }
        }
      }
    }

    val filter = IntentFilter().apply {
      addAction(AudioManager.ACTION_HEADSET_PLUG)
      addAction(BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED)
    }
    
    context.registerReceiver(headphoneReceiver, filter)
  }

  private fun getCurrentHeadphoneStatus(): Map<String, Any> {
    val audioManager = this.audioManager ?: return mapOf(
      "isConnected" to false,
      "deviceType" to "none",
      "deviceName" to ""
    )

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      
      for (device in devices) {
        when (device.type) {
          AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
          AudioDeviceInfo.TYPE_WIRED_HEADSET -> {
            return mapOf(
              "isConnected" to true,
              "deviceType" to "wired",
              "deviceName" to (device.productName?.toString() ?: "Wired Headphones")
            )
          }
          
          AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
          AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> {
            return mapOf(
              "isConnected" to true,
              "deviceType" to "bluetooth",
              "deviceName" to (device.productName?.toString() ?: "Bluetooth Device")
            )
          }
        }
      }
    } else {
      // Fallback for older Android versions
      val isWiredConnected = audioManager.isWiredHeadsetOn
      val isBluetoothConnected = audioManager.isBluetoothA2dpOn
      
      return when {
        isWiredConnected -> mapOf(
          "isConnected" to true,
          "deviceType" to "wired",
          "deviceName" to "Wired Headphones"
        )
        isBluetoothConnected -> mapOf(
          "isConnected" to true,
          "deviceType" to "bluetooth", 
          "deviceName" to "Bluetooth Device"
        )
        else -> mapOf(
          "isConnected" to false,
          "deviceType" to "none",
          "deviceName" to ""
        )
      }
    }

    return mapOf(
      "isConnected" to false,
      "deviceType" to "none",
      "deviceName" to ""
    )
  }
}