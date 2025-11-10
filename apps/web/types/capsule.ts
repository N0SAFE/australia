// Lock types
export type LockType = "code" | "voice" | "device_shake" | "device_tilt" | "device_tap" | "api" | "time_based";

// Lock configuration types
export type CodeLockConfig = {
  type: "code";
  code: string;
  attempts?: number;
};

export type VoiceLockConfig = {
  type: "voice";
  phrase: string;
  language?: string;
};

export type DeviceLockConfig = {
  type: "device_shake" | "device_tilt" | "device_tap";
  threshold?: number;
  pattern?: number[];
};

export type ApiLockConfig = {
  type: "api";
  endpoint: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  expectedResponse?: any;
};

export type TimeBasedLockConfig = {
  type: "time_based";
  delayMinutes: number;
};

export type LockConfig = CodeLockConfig | VoiceLockConfig | DeviceLockConfig | ApiLockConfig | TimeBasedLockConfig;

// Content metadata for media elements
export type ContentMetadata = {
  url: string;
  duration?: number;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
};

export type Capsule = {
  id: string;
  openingDate: string;
  
  // Plate.js content (JSON string that can contain text, images, videos, audio, etc.)
  content: string;
  
  openingMessage: string | null;
  
  // Lock mechanism
  isLocked: boolean;
  lockType: LockType | null;
  lockConfig: LockConfig | null;
  unlockedAt: string | null;
  
  createdAt: string;
  updatedAt: string;
}