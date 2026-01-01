export type FileType = 'audio' | 'video' | 'text' | 'image' | 'youtube';

export interface TranscriptionSegment {
  timestamp: string;
  text: string;
}

export interface SubtitleConfig {
  fontSize: number;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  maxCharPerLine: number;
}

export interface YouTubeParams {
  url: string;
  startTime: string;
  endTime: string;
}

export interface TimeRange {
  startTime: string; // HH:MM:SS
  endTime: string;   // HH:MM:SS
}

export interface AnalysisResult {
  id: string;
  fileName: string;
  fileType: FileType;
  transcription: TranscriptionSegment[];
  summary: string;
  keywords: string[];
  createdAt: Date;
  fileUrl?: string; // Blob URL for local files
  subtitleConfig?: SubtitleConfig;
  timeRange?: TimeRange;
  customPrompt?: string;
}

export interface GeminiResponseSchema {
  transcription: TranscriptionSegment[];
  summary: string;
  keywords: string[];
}

export interface GoogleUser {
  accessToken: string;
  name?: string;
  picture?: string;
  email?: string;
}