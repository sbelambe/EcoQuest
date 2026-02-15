import Foundation
import Capacitor
import UIKit
import ExecuTorch

@objc(EcoQuestVision)
public class EcoQuestVisionPlugin: CAPPlugin, CAPBridgedPlugin {

    private let modelQueue = DispatchQueue(label: "EcoQuestVision.modelQueue", qos: .userInitiated)
    private var module: Module?
    private var loadError: String?
    private var loadedModelPath: String?

    public let identifier = "EcoQuestVisionPlugin"
    public let jsName = "EcoQuestVision"

    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "ping", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "infer", returnType: CAPPluginReturnPromise),
    ]

    private let methodName = "forward"
    private let inputSize: Int = 640

    @objc func ping(_ call: CAPPluginCall) {
        call.resolve(["ok": true, "message": "pong ✅"])
    }

    /// Loads + preloads the "forward" method ONCE.
    @objc func loadModel(_ call: CAPPluginCall) {
        let modelName = call.getString("modelName") ?? "yolo4"   // change if needed
        let modelExt  = call.getString("modelExt") ?? "pte"

        modelQueue.async(execute: {   // ✅ avoids DispatchWorkItem overload confusion
            autoreleasepool {
                do {
                    if self.module != nil {
                        DispatchQueue.main.async {
                            call.resolve([
                                "ok": true,
                                "alreadyLoaded": true,
                                "path": self.loadedModelPath ?? ""
                            ])
                        }
                        return
                    }

                    if let err = self.loadError {
                        DispatchQueue.main.async { call.reject(err) }
                        return
                    }

                    guard let bundlePath = Bundle.main.path(forResource: modelName, ofType: modelExt) else {
                        DispatchQueue.main.async {
                            call.reject("Model not found in bundle: \(modelName).\(modelExt). Check Copy Bundle Resources.")
                        }
                        return
                    }

                    let dstPath = try Self.copyModelToAppSupportIfNeeded(
                        srcPath: bundlePath,
                        fileName: "\(modelName).\(modelExt)"
                    )

                    self.printFileSize(path: dstPath, prefix: "[EcoQuestVision] PTE bytes:")
                    print("[EcoQuestVision] Creating Module:", dstPath)

                    let loaded = try Module(filePath: dstPath)

                    print("[EcoQuestVision] Loading method:", self.methodName)
                    try loaded.load(self.methodName)

                    self.module = loaded
                    self.loadedModelPath = dstPath
                    self.loadError = nil

                    print("[EcoQuestVision] Model ready ✅")

                    DispatchQueue.main.async {
                        call.resolve(["ok": true, "path": dstPath])
                    }
                } catch {
                    self.loadError = "Failed to init/load model: \(error)"
                    DispatchQueue.main.async { call.reject(self.loadError!) }
                }
            }
        })
    }

    @objc func infer(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async(execute: { // ✅ avoids DispatchWorkItem overload confusion
            autoreleasepool {
                do {
                    guard let module = self.module else {
                        DispatchQueue.main.async {
                            call.reject(self.loadError ?? "Model not loaded. Call loadModel() first.")
                        }
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

                    // --- Preprocess (letterbox to 640x640) ---
                    let chw = Self.letterboxToCHWFloat(image: uiImage, size: self.inputSize)

                    // --- Forward with layout fallback ---
                    let outputs: [Value]
                    do {
                        // Attempt A: NCHW Float [1,3,H,W]
                        let inputA = Tensor(chw, shape: [1, 3, self.inputSize, self.inputSize])
                        outputs = try module.forward(inputA)
                    } catch {
                        print("[EcoQuestVision] forward() failed with NCHW Float:", error)

                        // Attempt B: NHWC Float [1,H,W,3]
                        let nhwc = Self.chwToNhwc(chw, size: self.inputSize)
                        let inputB = Tensor(nhwc, shape: [1, self.inputSize, self.inputSize, 3])
                        outputs = try module.forward(inputB)
                    }

                    print("[EcoQuestVision] forward output count:", outputs.count)

                    // --- Decode output ---
                    let (decoded, outShape) = try Self.decodeOutputsToBestDetection(
                        outputs: outputs,
                        inputSize: self.inputSize
                    )

                    let itemType = Self.mapCocoLabelToWasteType(decoded.label)

                    #if DEBUG
                    print("[EcoQuestVision] Build = DEBUG")
                    #else
                    print("[EcoQuestVision] Build = RELEASE")
                    #endif
                    print("[EcoQuestVision] topLabel=\(decoded.label) conf=\(decoded.confidence)")

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
        })
    }

    // MARK: - File helpers

    private func printFileSize(path: String, prefix: String) {
        if let attrs = try? FileManager.default.attributesOfItem(atPath: path),
           let size = attrs[.size] as? NSNumber {
            print(prefix, size)
        }
    }

    private static func copyModelToAppSupportIfNeeded(srcPath: String, fileName: String) throws -> String {
        let fm = FileManager.default
        let appSupport = try fm.url(for: .applicationSupportDirectory,
                                    in: .userDomainMask,
                                    appropriateFor: nil,
                                    create: true)
        let dstURL = appSupport.appendingPathComponent(fileName)

        if !fm.fileExists(atPath: dstURL.path) {
            try fm.copyItem(atPath: srcPath, toPath: dstURL.path)
        }
        return dstURL.path
    }
}

// MARK: - Helpers
private extension EcoQuestVisionPlugin {

    struct Box { let x: Float; let y: Float; let w: Float; let h: Float }
    struct Detection { let label: String; let confidence: Float; let box: Box }

    static func dataUrlToUIImage(_ dataUrl: String) -> UIImage? {
        guard let comma = dataUrl.firstIndex(of: ",") else { return nil }
        let base64 = String(dataUrl[dataUrl.index(after: comma)...])
        guard let data = Data(base64Encoded: base64) else { return nil }
        return UIImage(data: data)
    }

    static func letterboxToCHWFloat(image: UIImage, size: Int) -> [Float] {
        let target = CGSize(width: size, height: size)

        let srcSize = image.size
        let scale = min(target.width / srcSize.width, target.height / srcSize.height)
        let newW = srcSize.width * scale
        let newH = srcSize.height * scale

        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: target, format: format)

        let padded = renderer.image { ctx in
            UIColor(white: 114.0/255.0, alpha: 1.0).setFill()
            ctx.fill(CGRect(origin: .zero, size: target))

            let x = (target.width - newW) / 2.0
            let y = (target.height - newH) / 2.0
            image.draw(in: CGRect(x: x, y: y, width: newW, height: newH))
        }

        guard let cgImage = padded.cgImage else {
            return Array(repeating: 0, count: 3 * size * size)
        }

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

        var chw = [Float](repeating: 0, count: 3 * width * height)
        let hw = width * height

        for i in 0..<hw {
            let base = i * 4
            let r = Float(raw[base + 0]) / 255.0
            let g = Float(raw[base + 1]) / 255.0
            let b = Float(raw[base + 2]) / 255.0
            chw[i] = r
            chw[hw + i] = g
            chw[2 * hw + i] = b
        }
        return chw
    }

    static func chwToNhwc(_ chw: [Float], size: Int) -> [Float] {
        let hw = size * size
        var nhwc = [Float](repeating: 0, count: hw * 3)
        for i in 0..<hw {
            let r = chw[i]
            let g = chw[hw + i]
            let b = chw[2 * hw + i]
            let base = i * 3
            nhwc[base + 0] = r
            nhwc[base + 1] = g
            nhwc[base + 2] = b
        }
        return nhwc
    }

    // ✅ Decodes first output tensor into your best detection
    static func decodeOutputsToBestDetection(outputs: [Value], inputSize: Int) throws -> (Detection, [Int]) {
        guard let first = outputs.first else {
            throw NSError(domain: "EcoQuestVision", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Model returned 0 outputs"])
        }

        // This is the only potentially API-dependent line.
        // If you get "Value has no member tensor", tell me what autocomplete shows for `first.`
        if let outTensor: Tensor<Float> = first.tensor() {
            let shape = outTensor.shape
            print("[EcoQuestVision] Output tensor shape:", shape)

            let scalars = outTensor.scalars()
            
            let det = decodeBestYoloDetection(output: scalars, shape: shape, inputSize: inputSize)
            return (det, shape)
        }

        print("[EcoQuestVision] First output not Tensor<Float>. outputs =", outputs)
        throw NSError(domain: "EcoQuestVision", code: -2,
                      userInfo: [NSLocalizedDescriptionKey: "Unsupported output type (not Tensor<Float>)"])
    }

    static func sigmoid(_ x: Float) -> Float { 1.0 / (1.0 + exp(-x)) }

    static func mapCocoLabelToWasteType(_ label: String) -> String {
        let l = label.lowercased()

        if l == "unknown" { return "unknown" }

        if ["banana","apple","orange","broccoli","carrot","sandwich","pizza"].contains(l) { return "compost" }
        if ["bottle","cup","wine glass","can","book"].contains(l) { return "recycle" }

        return "trash"
    }


    static func decodeBestYoloDetection(output: [Float], shape: [Int], inputSize: Int) -> Detection {
        func fallback() -> Detection {
            Detection(label: "unknown", confidence: 0.0, box: Box(x: 0, y: 0, w: 0, h: 0))
        }

        let coco80 = [
            "person","bicycle","car","motorcycle","airplane","bus","train","truck","boat",
            "traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat",
            "dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack",
            "umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball",
            "kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket",
            "bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple",
            "sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair",
            "couch","potted plant","bed","dining table","toilet","tv","laptop","mouse","remote",
            "keyboard","cell phone","microwave","oven","toaster","sink","refrigerator","book",
            "clock","vase","scissors","teddy bear","hair drier","toothbrush"
        ]
        func className(_ id: Int) -> String {
            if id >= 0 && id < coco80.count { return coco80[id] }
            return "class_\(id)"
        }

        // Expect [1, N, 6]
        guard shape.count == 3, shape[0] == 1, shape[2] == 6 else {
            print("[EcoQuestVision] Unexpected output shape:", shape)
            return fallback()
        }

        let N = shape[1]
        let stride = 6
        guard output.count >= N * stride else { return fallback() }

        var bestScore: Float = 0
        var bestClassId: Int = -1
        var bestBox = Box(x: 0, y: 0, w: 0, h: 0)

        for i in 0..<N {
            let base = i * stride

            let x1 = output[base + 0]
            let y1 = output[base + 1]
            let x2 = output[base + 2]
            let y2 = output[base + 3]
            let score = output[base + 4]
            let clsF = output[base + 5]

            // class id is typically an integer stored in float
            let cls = Int(clsF.rounded())

            if score > bestScore {
                bestScore = score
                bestClassId = cls

                // Interpret as xyxy in input pixels; normalize to 0..1
                let w = max(0, x2 - x1)
                let h = max(0, y2 - y1)
                bestBox = Box(
                    x: x1 / Float(inputSize),
                    y: y1 / Float(inputSize),
                    w: w / Float(inputSize),
                    h: h / Float(inputSize)
                )
            }
        }

        let minConf: Float = 0.30
        if bestScore < minConf || bestClassId < 0 {
            return fallback()
        }

        return Detection(label: className(bestClassId), confidence: bestScore, box: bestBox)
    }

}

