import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { AudioRecorder } from './components/AudioRecorder';
import { DriveInput } from './components/DriveInput';
import { YouTubeInput } from './components/YouTubeInput';
import { AnalysisResultCard } from './components/AnalysisResultCard';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { analyzeContent } from './services/geminiService';
import { AnalysisResult, FileType, GoogleUser, TimeRange, YouTubeParams } from './types';
import { Loader2, AlertCircle, MessageSquare } from 'lucide-react';

// Placeholder Client ID - user must replace this or set it in their env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID_HERE"; 

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'drive' | 'youtube'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Auth State
  const [user, setUser] = useState<GoogleUser | null>(null);

  const handleLogin = () => {
    // @ts-ignore
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
             headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          })
          .then(res => res.json())
          .then(profile => {
             setUser({
               accessToken: tokenResponse.access_token,
               name: profile.name,
               email: profile.email,
               picture: profile.picture
             });
          });
        }
      },
    });
    client.requestAccessToken();
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleAnalysis = async (input: File | Blob | string, type: FileType, fileName: string, timeRange?: TimeRange) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      // Pass customPrompt to the service
      const result = await analyzeContent(input, type, timeRange, customPrompt);
      
      let fileUrl = undefined;
      // Only create object URL for actual files
      if (input instanceof Blob) {
        fileUrl = URL.createObjectURL(input);
      } else if (typeof input === 'string') {
        fileUrl = input; // Keep the URL string for YouTube
      }
      
      const newResult: AnalysisResult = {
        ...result,
        id: crypto.randomUUID(),
        fileName: timeRange ? `${fileName} (clipped)` : fileName,
        fileType: type,
        createdAt: new Date(),
        fileUrl: fileUrl,
        timeRange: timeRange,
        customPrompt: customPrompt, // Store the prompt used
        subtitleConfig: {
          fontSize: 16,
          color: '#ffffff',
          backgroundColor: '#000000',
          backgroundOpacity: 0.6,
          maxCharPerLine: 20
        }
      };
      setResults(prev => [newResult, ...prev]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateResult = (id: string, updatedResult: Partial<AnalysisResult>) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...updatedResult } : r));
  };
  
  const handleDriveFileSelect = (blob: Blob, mimeType: string, fileName: string, timeRange: TimeRange) => {
      let type: FileType = 'text';
      if (mimeType.startsWith('audio/')) type = 'audio';
      else if (mimeType.startsWith('video/')) type = 'video';
      
      handleAnalysis(blob, type, fileName, timeRange);
  };

  const handleYouTubeAnalysis = (params: YouTubeParams) => {
    // Convert generic time format to seconds for later use if needed, but here we just pass the strings
    const timeRange: TimeRange = {
      startTime: params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime, // Ensure HH:MM:SS
      endTime: params.endTime.length === 5 ? `${params.endTime}:00` : params.endTime
    };
    
    // Extract video ID for filename
    let videoId = "YouTube Video";
    try {
      const urlObj = new URL(params.url);
      videoId = urlObj.searchParams.get("v") || "YouTube Video";
    } catch (e) {}

    handleAnalysis(params.url, 'youtube', `YouTube: ${videoId}`, timeRange);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Input Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex space-x-4 mb-6 border-b border-slate-100 pb-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                    activeTab === 'upload' 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  File Upload
                </button>
                <button
                  onClick={() => setActiveTab('record')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                    activeTab === 'record' 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  Record Audio
                </button>
                <button
                  onClick={() => setActiveTab('drive')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                    activeTab === 'drive' 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  Google Drive
                </button>
                <button
                  onClick={() => setActiveTab('youtube')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
                    activeTab === 'youtube' 
                      ? 'bg-red-50 text-red-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  YouTube
                </button>
              </div>

              {/* Custom Prompt Input */}
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                  <MessageSquare className="w-3 h-3" />
                  Custom Summary Instructions (Optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="E.g., Summarize for a 5-year-old, Focus on technical details, Use 3 bullet points..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 min-h-[60px]"
                />
              </div>

              <div className="min-h-[200px] flex flex-col items-center justify-center">
                {activeTab === 'upload' && (
                  <FileUploader 
                    onFileSelect={(file, type) => handleAnalysis(file, type, file.name)} 
                    isLoading={isAnalyzing}
                  />
                )}
                {activeTab === 'record' && (
                  <AudioRecorder 
                    onAudioCapture={(blob) => handleAnalysis(blob, 'audio', `Recording ${new Date().toLocaleTimeString()}.webm`)}
                    isLoading={isAnalyzing}
                  />
                )}
                {activeTab === 'drive' && (
                  <DriveInput 
                    user={user}
                    onAnalyze={handleDriveFileSelect}
                    isLoading={isAnalyzing}
                    onLoginRequest={handleLogin}
                  />
                )}
                {activeTab === 'youtube' && (
                  <YouTubeInput
                    onAnalyze={handleYouTubeAnalysis}
                    isLoading={isAnalyzing}
                  />
                )}
              </div>

              {isAnalyzing && (
                <div className="mt-6 flex flex-col items-center justify-center text-indigo-600 animate-in fade-in duration-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm font-medium">Analyzing content with Gemini...</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeTab === 'youtube' 
                      ? "Processing video information and generating insights"
                      : "Transcribing and Summarizing"
                    }
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Analysis Failed</h4>
                    <p className="text-sm opacity-90">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Results Feed */}
            <div className="space-y-6 pb-20">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                Recent Analysis
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{results.length}</span>
              </h2>
              
              {results.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-slate-400">No files analyzed yet. Upload a file, record audio, import from Drive, or paste a YouTube link to get started.</p>
                </div>
              ) : (
                results.map((result) => (
                  <AnalysisResultCard 
                    key={result.id} 
                    result={result} 
                    onUpdate={(updated) => handleUpdateResult(result.id, updated)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;