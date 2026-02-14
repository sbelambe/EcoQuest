import { registerPlugin } from '@capacitor/core';

export interface ScanResult {
  binType: 'recycle' | 'compost' | 'trash';
  confidence: number;
  label: string;
}

export interface EcoQuestVisionPlugin {
  scan(options: { imageBase64: string }): Promise<ScanResult>;
  ping(): Promise<{ ok: boolean; message: string }>;
}

export const EcoQuestVision = registerPlugin<EcoQuestVisionPlugin>('EcoQuestVision');
