import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FileType, GeminiResponseSchema, TimeRange } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transcription: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.STRING, description: "Timestamp in MM:SS format relative to the segment start" },
          text: { type: Type.STRING, description: "Transcribed text for this segment" },
        },
        required: ["timestamp", "text"],
      },
      description: "The transcription split into segments with timestamps.",
    },
    summary: {
      type: Type.STRING,
      description: "A concise and informative summary of the content in Japanese, following any custom instructions provided.",
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 5-10 relevant search keywords or tags in Japanese.",
    },
  },
  required: ["transcription", "summary", "keywords"],
};

export const analyzeContent = async (
  input: File | Blob | string,
  fileType: FileType,
  timeRange?: TimeRange,
  customPrompt?: string
): Promise<GeminiResponseSchema> => {
  try {
    let parts: any[] = [];
    let prompt = "";
    let mimeType = "";
    
    // Check if input is a URL (YouTube)
    if (typeof input === 'string') {
       prompt = `
        Please analyze the video at the following URL: ${input}
       `;
    } else {
       // Handle File/Blob Upload
       const base64Data = await fileToBase64(input);
       mimeType = input.type || getMimeTypeFromType(fileType);
       parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      });
    }

    // Determine model based on task/file type
    // Video requires the Pro model for best results
    let modelName = "gemini-3-flash-preview"; 
    if (fileType === "video" || fileType === "youtube") modelName = "gemini-3-pro-preview";
    
    let timeInstruction = "";
    if (timeRange) {
      timeInstruction = `
        IMPORTANT: Analyze ONLY the segment of the media from timestamp ${timeRange.startTime} to ${timeRange.endTime}. 
        Do not describe or transcribe anything outside of this time range.
        Adjust the output timestamps to be relative to the start of this segment (e.g., ${timeRange.startTime} becomes 00:00).
      `;
    }

    let summaryInstruction = "Provide a concise summary of the main points in Japanese.";
    if (customPrompt && customPrompt.trim().length > 0) {
      summaryInstruction = `Provide a summary in Japanese based strictly on the following instructions: "${customPrompt}"`;
    }

    prompt += `
      ${timeInstruction}
      1. Transcribe the audio/video content fully. Split the transcription into logical segments with timestamps (MM:SS). 
          If it is a text file, extract the text as a single segment with timestamp "00:00".
      2. ${summaryInstruction}
      3. Generate relevant search keywords (tags) in Japanese.
    `;

    parts.push({
      text: prompt,
    });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (!response.text) {
      throw new Error("No response generated from Gemini.");
    }

    const result = JSON.parse(response.text) as GeminiResponseSchema;
    return result;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(
      "Failed to analyze content. Please try again. " +
        (error instanceof Error ? error.message : String(error))
    );
  }
};

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const getMimeTypeFromType = (type: FileType): string => {
  switch (type) {
    case "audio": return "audio/mp3";
    case "video": return "video/mp4";
    case "text": return "text/plain";
    default: return "application/octet-stream";
  }
};