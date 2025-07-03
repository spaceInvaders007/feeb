import ExpoModulesCore
import AVFoundation

public class ExpoHeadphoneDetectionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoHeadphoneDetection")

    AsyncFunction("getCurrentStatus") { (promise: Promise) in
      do {
        let status = getCurrentHeadphoneStatus()
        promise.resolve(status)
      } catch {
        promise.reject("HEADPHONE_DETECTION_ERROR", error.localizedDescription, error)
      }
    }

    AsyncFunction("startListening") { (promise: Promise) in
      do {
        // For now, just resolve - we can add real listening later
        promise.resolve(nil)
      } catch {
        promise.reject("START_LISTENING_ERROR", error.localizedDescription, error)
      }
    }

    AsyncFunction("stopListening") { (promise: Promise) in
      do {
        // For now, just resolve - we can add real listening later
        promise.resolve(nil)
      } catch {
        promise.reject("STOP_LISTENING_ERROR", error.localizedDescription, error)
      }
    }
  }

  private func getCurrentHeadphoneStatus() -> [String: Any] {
    let audioSession = AVAudioSession.sharedInstance()
    
    var isConnected = false
    var deviceType = "none"
    var deviceName = ""
    var confidence = 0.0

    // Check available audio routes
    let currentRoute = audioSession.currentRoute
    
    for output in currentRoute.outputs {
      switch output.portType {
      case .headphones, .headsetMic:
        isConnected = true
        deviceType = "wired"
        deviceName = output.portName
        confidence = 0.95
        break
      case .bluetoothA2DP, .bluetoothHFP, .bluetoothLE:
        isConnected = true
        deviceType = "bluetooth"
        deviceName = output.portName
        confidence = 0.90
        break
      default:
        continue
      }
    }

    return [
      "isConnected": isConnected,
      "deviceType": deviceType,
      "deviceName": deviceName,
      "confidence": confidence,
      "timestamp": Date().timeIntervalSince1970 * 1000,
      "metadata": [
        "platform": "ios",
        "routeDescription": currentRoute.description,
        "method": "AVAudioSession"
      ]
    ]
  }
}
