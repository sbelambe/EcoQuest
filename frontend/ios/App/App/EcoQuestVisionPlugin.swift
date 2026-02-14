import Foundation
import Capacitor

@objc(EcoQuestVision)
public class EcoQuestVisionPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "EcoQuestVisionPlugin"
    public let jsName = "EcoQuestVision"

    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "ping", returnType: CAPPluginReturnPromise)
    ]

    @objc func ping(_ call: CAPPluginCall) {
        call.resolve([
            "ok": true,
            "message": "pong ✅"
        ])
    }
}
