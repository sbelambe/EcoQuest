import { registerPlugin } from "@capacitor/core";

export type VisionInferResult = {
  ok: boolean;
  itemType: "trash" | "recycle" | "compost";
  topLabel: string;
  confidence: number;
  box?: { x: number; y: number; w: number; h: number };
  debug?: { outputShape?: number[] };
};

export const EcoQuestVision = registerPlugin<{
  ping(): Promise<{ ok: boolean; message: string }>;
  loadModel(options?: { modelName?: string; modelExt?: string }): Promise<{ ok: boolean; path: string }>;
  infer(options: { dataUrl: string }): Promise<VisionInferResult>;
}>("EcoQuestVision");
