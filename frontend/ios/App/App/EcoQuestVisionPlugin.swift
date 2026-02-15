import Foundation
import Capacitor
import UIKit
import ExecuTorch

@objc(EcoQuestVision)
public class EcoQuestVisionPlugin: CAPPlugin, CAPBridgedPlugin {
    
    private let modelQueue = DispatchQueue(label: "EcoQuestVision.modelQueue")
    private var loadError: String?

    public let identifier = "EcoQuestVisionPlugin"
    public let jsName = "EcoQuestVision"

    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "ping", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "infer", returnType: CAPPluginReturnPromise),
    ]

    private var module: Module?
    private let methodName = "forward"

    // Adjust to your model’s expected input size (YOLO often uses 640)
    private let inputSize: Int = 640

    @objc func ping(_ call: CAPPluginCall) {
        call.resolve(["ok": true, "message": "pong ✅"])
    }

    @objc func loadModel(_ call: CAPPluginCall) {
        do {
            let modelName = call.getString("modelName") ?? "yolo3"   // yolo.pte by default
            let modelExt  = call.getString("modelExt") ?? "pte"

            guard let path = Bundle.main.path(forResource: modelName, ofType: modelExt) else {
                call.reject("Model not found in bundle: \(modelName).\(modelExt). Check Copy Bundle Resources.")
                return
            }

            let m = try Module(filePath: path)
//            try m.load(methodName) // pre-load forward method :contentReference[oaicite:1]{index=1}
            self.module = m

            call.resolve(["ok": true, "path": path])
        } catch {
            call.reject("Failed to load model: \(error)")
        }
    }

    @objc func infer(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async {
            autoreleasepool {
                do {
                    guard let module = self.getOrLoadModule() else {
                        DispatchQueue.main.async { call.reject(self.loadError ?? "Model failed to load.") }
                        return
                    }

                    guard let dataUrl = call.getString("dataUrl") else {
                        DispatchQueue.main.async { call.reject("Missing dataUrl") }
                        return
                    }

                    guard let uiImage = Self.dataUrlToUIImage(dataUrl) else {
                        DispatchQueue.main.async { call.reject("Could not decode dataUrl") }
                        return
                    }

                    let chw = Self.preprocessToCHWFloat(image: uiImage, size: self.inputSize)
                    let inputTensor = Tensor(chw, shape: [1, 3, self.inputSize, self.inputSize])

                    let outValue = try module.forward(inputTensor)

                    let outTensor = try Tensor<Float>(outValue)
                    let outShape = outTensor.shape
                    let out = outTensor.scalars()

                    let decoded = Self.decodeBestYoloDetection(output: out, shape: outShape, inputSize: self.inputSize)
                    let itemType = Self.mapCocoLabelToWasteType(decoded.label)
                    
                        #if DEBUG
                        print("[EcoQuestVision] Build = DEBUG")
                        #else
                        print("[EcoQuestVision] Build = RELEASE")
                        #endif


                    DispatchQueue.main.async {
                        call.resolve([
                            "ok": true,
                            "itemType": itemType,
                            "topLabel": decoded.label,
                            "confidence": decoded.confidence,
                            "debug": ["outputShape": outShape]
                        ])
                    }
                } catch {
                    DispatchQueue.main.async { call.reject("Infer failed: \(error)") }
                }
            }
        }
    }
    
    private func getOrLoadModule() -> Module? {
        return modelQueue.sync {
            if loadError != nil { return nil }
            if let m = self.module { return m }

            guard let path = Bundle.main.path(forResource: "yolo3", ofType: "pte") else {
                loadError = "yolo3.pte not found in bundle (Copy Bundle Resources)."
                return nil
            }

            if let attrs = try? FileManager.default.attributesOfItem(atPath: path),
               let size = attrs[.size] as? NSNumber {
                print("[EcoQuestVision] PTE bytes:", size)
            }
            print("[EcoQuestVision] Creating Module:", path)

            do {
                let loaded = try Module(filePath: path)

                // ✅ Put this back now that you added linker flags + xnnpack
                print("[EcoQuestVision] Loading method:", self.methodName)
                try loaded.load(self.methodName)

                self.module = loaded
                print("[EcoQuestVision] Model ready ✅")
                return loaded
            } catch {
                loadError = "Model init/load failed: \(error)"
                return nil
            }
        }
    }



    }

// MARK: - Helpers
private extension EcoQuestVisionPlugin {

    struct Box { let x: Float; let y: Float; let w: Float; let h: Float }
    struct Detection { let label: String; let confidence: Float; let box: Box }

    static func dataUrlToUIImage(_ dataUrl: String) -> UIImage? {
        // data:image/jpeg;base64,....
        guard let comma = dataUrl.firstIndex(of: ",") else { return nil }
        let base64 = String(dataUrl[dataUrl.index(after: comma)...])
        guard let data = Data(base64Encoded: base64) else { return nil }
        return UIImage(data: data)
    }

    static func preprocessToCHWFloat(image: UIImage, size: Int) -> [Float] {
        // Resize to size x size RGB
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size), format: format)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(x: 0, y: 0, width: size, height: size))
        }

        guard let cgImage = resized.cgImage else { return Array(repeating: 0, count: 3*size*size) }

        let width = size
        let height = size
        let bytesPerPixel = 4
        let bytesPerRow = bytesPerPixel * width
        var raw = [UInt8](repeating: 0, count: height * bytesPerRow)

        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let ctx = CGContext(
            data: &raw,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )!

        ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

        // Convert RGBA -> CHW float in [0,1]
        var chw = [Float](repeating: 0, count: 3 * width * height)
        let hw = width * height
        for i in 0..<hw {
            let base = i * 4
            let r = Float(raw[base + 0]) / 255.0
            let g = Float(raw[base + 1]) / 255.0
            let b = Float(raw[base + 2]) / 255.0
            chw[i] = r
            chw[hw + i] = g
            chw[2*hw + i] = b
        }
        return chw
    }

    static func sigmoid(_ x: Float) -> Float {
        return 1.0 / (1.0 + exp(-x))
    }

    // COCO class list is long; for demo we map a few common ones.
    // You can expand this as you test.
    static func mapCocoLabelToWasteType(_ label: String) -> String {
        let l = label.lowercased()

        // Compost examples
        if ["banana", "apple", "orange", "broccoli", "carrot", "sandwich", "pizza"].contains(l) {
            return "compost"
        }

        // Recycle examples
        if ["bottle", "cup", "wine glass", "can", "book"].contains(l) {
            return "recycle"
        }

        // Default
        return "trash"
    }

    // Minimal “best detection” decoder for common YOLOv8-like outputs.
    // This is intentionally simple (no full NMS). It finds the highest score box.
    static func decodeBestYoloDetection(output: [Float], shape: [Int], inputSize: Int) -> Detection {
        // If we can’t decode, return a safe fallback
        func fallback() -> Detection {
            return Detection(label: "unknown", confidence: 0.0, box: Box(x: 0, y: 0, w: 0, h: 0))
        }

        // You must adjust these names for your label set if not COCO.
        // For YOLO COCO: 80 classes. We’ll just return "class_<id>" unless you add a list.
        func className(_ id: Int) -> String { return "class_\(id)" }

        // Expect something like:
        // [1, N, 4+numClasses] OR [1, 4+numClasses, N]
        guard shape.count == 3 else { return fallback() }

        let b = shape[0]
        guard b == 1 else { return fallback() }

        let a = shape[1]
        let c = shape[2]

        // Try to infer which dim is anchors (N) and which is channels (K)
        // If one dim is 84 (4+80), treat that as channels.
        let numClassesGuess = 80

        let channelsA = a
        let channelsC = c

        var N: Int = 0
        var K: Int = 0
        var layout: String = ""

        if channelsA == 4 + numClassesGuess {
            // [1, K, N]
            K = channelsA
            N = channelsC
            layout = "KxN"
        } else if channelsC == 4 + numClassesGuess {
            // [1, N, K]
            N = channelsA
            K = channelsC
            layout = "NxK"
        } else {
            // Unknown layout; still attempt NxK
            N = channelsA
            K = channelsC
            layout = "NxK?"
        }

        guard K >= 5 else { return fallback() }

        var bestScore: Float = 0
        var bestClass: Int = -1
        var bestBox = Box(x: 0, y: 0, w: 0, h: 0)

        // Helper to read element
        func get(_ n: Int, _ k: Int) -> Float {
            // n in [0,N), k in [0,K)
            switch layout {
            case "KxN":
                // index = k*N + n
                return output[k * N + n]
            default:
                // NxK
                // index = n*K + k
                return output[n * K + k]
            }
        }

        // YOLO-style: first 4 = (cx, cy, w, h) in input pixels (often),
        // then class logits/scores. Some exports already have sigmoid applied, some not.
        // We’ll apply sigmoid to class scores to be safe.
        for n in 0..<N {
            let cx = get(n, 0)
            let cy = get(n, 1)
            let w  = get(n, 2)
            let h  = get(n, 3)

            // Find best class for this anchor
            var localBest: Float = 0
            var localCls: Int = -1
            for cls in 0..<min(numClassesGuess, K - 4) {
                let score = sigmoid(get(n, 4 + cls))
                if score > localBest {
                    localBest = score
                    localCls = cls
                }
            }

            if localBest > bestScore {
                bestScore = localBest
                bestClass = localCls

                // Convert center->top-left, normalize to 0..1
                let x = (cx - w/2) / Float(inputSize)
                let y = (cy - h/2) / Float(inputSize)
                let nw = w / Float(inputSize)
                let nh = h / Float(inputSize)

                bestBox = Box(x: x, y: y, w: nw, h: nh)
            }
        }

        if bestClass < 0 { return fallback() }
        return Detection(label: className(bestClass), confidence: bestScore, box: bestBox)
    }
}
