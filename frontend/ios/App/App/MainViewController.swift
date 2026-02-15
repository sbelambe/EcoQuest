import Foundation
import Capacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {

  override func capacitorDidLoad() {
    super.capacitorDidLoad()
    print("✅ MainViewController loaded — registering EcoQuestVisionPlugin")
    bridge?.registerPluginInstance(EcoQuestVisionPlugin())
  }
}
