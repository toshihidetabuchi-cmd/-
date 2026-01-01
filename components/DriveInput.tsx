import React, { useState, useEffect, useRef } from 'react';
import { Cloud, Loader2, Video, ArrowRight, Play, Clock, Check, RefreshCw } from 'lucide-react';
import { GoogleUser, TimeRange } from '../types';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface DriveInputProps {
  user: GoogleUser | null;
  onAnalyze: (blob: Blob, mimeType: string, fileName: string, timeRange: TimeRange) => void;
  isLoading: boolean;
  onLoginRequest: () => void;
}

export const DriveInput: React.FC<DriveInputProps> = ({ user, onAnalyze, isLoading, onLoginRequest }) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: Pick, 2: Preview & Trim
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  
  // File State
  const [selectedBlob, setSelectedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');

  // Trim State
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (window.gapi) {
      window.gapi.load('picker', () => {
        setPickerApiLoaded(true);
      });
    }
  }, []);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleOpenPicker = () => {
    if (!user) {
      onLoginRequest();
      return;
    }

    if (!pickerApiLoaded) {
      alert("Google Picker API not loaded yet.");
      return;
    }

    setIsPickerLoading(true);

    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    view.setMimeTypes("video/mp4,audio/mpeg,audio/wav,text/plain,application/pdf,application/vnd.google-apps.document");

    const picker = new window.google.picker.PickerBuilder()
      .setAppId(process.env.GOOGLE_CLIENT_ID || "")
      .setOAuthToken(user.accessToken)
      .addView(view)
      .setCallback(pickerCallback)
      .build();

    picker.setVisible(true);
    setIsPickerLoading(false);
  };

  const pickerCallback = async (data: any) => {
    if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
      const doc = data[window.google.picker.Response.DOCUMENTS][0];
      const fileId = doc[window.google.picker.Document.ID];
      const name = doc[window.google.picker.Document.NAME];
      const mime = doc[window.google.picker.Document.MIME_TYPE];
      
      downloadDriveFile(fileId, name, mime);
    }
  };

  const downloadDriveFile = async (fileId: string, name: string, mime: string) => {
    if (!user) return;
    setIsPickerLoading(true);

    try {
      let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      if (mime.includes('vnd.google-apps')) {
         url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user.accessToken}` }
      });

      if (!response.ok) throw new Error('Failed to download file from Drive');

      const blob = await response.blob();
      const finalBlob = new Blob([blob], { type: mime.includes('vnd.google-apps') ? 'text/plain' : mime });
      
      // Set State for Step 2
      setSelectedBlob(finalBlob);
      setFileName(name);
      setMimeType(finalBlob.type);
      setPreviewUrl(URL.createObjectURL(finalBlob));
      setStep(2); // Move to Step 2
      
    } catch (error) {
      console.error(error);
      alert("Failed to download file. Please check permissions.");
    } finally {
      setIsPickerLoading(false);
    }
  };

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      // Default end time to duration or formatted string
      const h = Math.floor(duration / 3600);
      const m = Math.floor((duration % 3600) / 60);
      const s = Math.floor(duration % 60);
      const formattedEnd = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      setEndTime(formattedEnd);
    }
  };

  const handleStartAnalysis = () => {
    if (selectedBlob) {
      onAnalyze(selectedBlob, mimeType, fileName, { startTime, endTime });
    }
  };

  const resetSelection = () => {
    setStep(1);
    setSelectedBlob(null);
    setPreviewUrl(null);
    setStartTime('00:00:00');
    setEndTime('');
  };

  if (!user) {
     return (
        <div className="text-center p-8">
           <Cloud className="w-12 h-12 text-slate-300 mx-auto mb-4" />
           <h3 className="text-lg font-semibold text-slate-700 mb-2">Connect Google Drive</h3>
           <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
             Sign in with your Google account to access your files directly from Drive.
           </p>
           <button 
             onClick={onLoginRequest}
             className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
           >
             Sign in with Google
           </button>
        </div>
     );
  }

  // STEP 1: Picker
  if (step === 1) {
    return (
      <div className="w-full max-w-xl p-8 border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
          <Cloud className="w-8 h-8 text-indigo-500" />
        </div>
        
        <h3 className="text-lg font-semibold text-slate-800">
          Select from Google Drive
        </h3>
        <p className="text-slate-500 mt-2 mb-6 max-w-xs mx-auto text-sm">
          Select a video or audio file to clip and analyze.
        </p>

        <button 
          onClick={handleOpenPicker}
          disabled={isLoading || isPickerLoading}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          {isPickerLoading ? (
             <>
               <Loader2 className="w-4 h-4 animate-spin" />
               Downloading...
             </>
          ) : (
             "Open Drive Picker"
          )}
        </button>
      </div>
    );
  }

  // STEP 2: Preview & Trim
  return (
    <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
           <Video className="w-4 h-4 text-indigo-500" />
           {fileName}
        </h3>
        <button onClick={resetSelection} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Change File
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Preview Player */}
        <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-inner">
           {mimeType.startsWith('video') ? (
             <video 
               ref={videoRef}
               src={previewUrl || ""} 
               controls 
               className="w-full h-full"
               onLoadedMetadata={handleMetadataLoaded}
             />
           ) : mimeType.startsWith('audio') ? (
             <div className="w-full h-full flex items-center justify-center bg-slate-900">
               <audio 
                 ref={videoRef as any}
                 src={previewUrl || ""} 
                 controls 
                 className="w-3/4"
                 onLoadedMetadata={handleMetadataLoaded}
               />
             </div>
           ) : (
             <div className="flex items-center justify-center h-full text-white">Preview not available for this file type</div>
           )}
        </div>

        {/* Trimming Inputs */}
        <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block flex items-center gap-1">
               <Play className="w-3 h-3" /> Start Time (HH:MM:SS)
             </label>
             <input 
               type="text" 
               value={startTime}
               onChange={(e) => setStartTime(e.target.value)}
               placeholder="00:00:00"
               className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
             />
           </div>
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block flex items-center gap-1">
               <Clock className="w-3 h-3" /> End Time (HH:MM:SS)
             </label>
             <input 
               type="text" 
               value={endTime}
               onChange={(e) => setEndTime(e.target.value)}
               placeholder="00:00:00"
               className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
             />
           </div>
        </div>

        {/* Action */}
        <button
          onClick={handleStartAnalysis}
          disabled={isLoading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2 text-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing Segment...
            </>
          ) : (
            <>
              Start Analysis
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};