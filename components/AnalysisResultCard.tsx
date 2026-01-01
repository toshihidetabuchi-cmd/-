import React, { useState, useRef } from 'react';
import { FileText, Tag, AlignLeft, ChevronDown, ChevronUp, Copy, Check, Video, Mic, Play, Settings, Download, Edit2, Type, Palette, Youtube } from 'lucide-react';
import { AnalysisResult, SubtitleConfig } from '../types';

interface AnalysisResultCardProps {
  result: AnalysisResult;
  onUpdate: (updated: Partial<AnalysisResult>) => void;
}

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({ result, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Default subtitle config if not present
  const config = result.subtitleConfig || {
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: '#000000',
    backgroundOpacity: 0.6,
    maxCharPerLine: 20
  };

  const updateConfig = (newConfig: Partial<SubtitleConfig>) => {
    onUpdate({ subtitleConfig: { ...config, ...newConfig } });
  };

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const getIcon = () => {
    switch (result.fileType) {
      case 'video': return <Video className="w-5 h-5 text-rose-500" />;
      case 'audio': return <Mic className="w-5 h-5 text-emerald-500" />;
      case 'youtube': return <Youtube className="w-5 h-5 text-red-600" />;
      default: return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const parseTimestamp = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  };

  const handleSeek = (timeStr: string) => {
    const seconds = parseTimestamp(timeStr);
    
    if (result.fileType === 'youtube' && result.fileUrl) {
       // Only partial support for seeking via updating iframe source or postMessage (not implemented fully here without Youtube API)
       // We can reload the iframe with start param
       const videoId = getYouTubeId(result.fileUrl);
       if (videoId && containerRef.current) {
         const iframe = containerRef.current.querySelector('iframe');
         if (iframe) {
           iframe.src = `https://www.youtube.com/embed/${videoId}?start=${seconds}&autoplay=1`;
         }
       }
    } else if (mediaRef.current) {
      // Local file logic
      mediaRef.current.currentTime = seconds;
      mediaRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (!mediaRef.current) return;
    const currentTime = mediaRef.current.currentTime;
    
    // Find the active segment
    const activeSegment = result.transcription.find((seg, index) => {
      const start = parseTimestamp(seg.timestamp);
      const nextSeg = result.transcription[index + 1];
      const end = nextSeg ? parseTimestamp(nextSeg.timestamp) : start + 5; 
      return currentTime >= start && currentTime < end;
    });

    setCurrentSubtitle(activeSegment ? activeSegment.text : '');
  };

  const handleTranscriptionEdit = (index: number, newText: string) => {
    const newTranscription = [...result.transcription];
    newTranscription[index] = { ...newTranscription[index], text: newText };
    onUpdate({ transcription: newTranscription });
  };

  // Helper to extract ID
  const getYouTubeId = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("v");
    } catch (e) { return null; }
  };

  // --- Video Export Logic ---
  const handleExportVideo = async () => {
    if (!mediaRef.current || !result.fileUrl || result.fileType !== 'video') return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    const video = mediaRef.current as HTMLVideoElement;
    const wasPaused = video.paused;
    const originalTime = video.currentTime;
    const originalVolume = video.volume;

    try {
      // 1. Setup Canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      // Wait for metadata to ensure dimensions
      if (video.readyState < 2) {
        await new Promise(r => { video.onloadedmetadata = r; });
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ratio = canvas.width / containerRef.current!.clientWidth; // Scale factor for font size

      // 2. Setup Recorder
      const stream = canvas.captureStream(30); // 30 FPS
      
      let audioTrack;
      try {
        // @ts-ignore
        const videoStream = video.captureStream ? video.captureStream() : video.mozCaptureStream ? video.mozCaptureStream() : null;
        if (videoStream) {
           audioTrack = videoStream.getAudioTracks()[0];
           if (audioTrack) stream.addTrack(audioTrack);
        }
      } catch (e) {
        console.warn("Could not capture audio track:", e);
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edited-${result.fileName.replace(/\.[^/.]+$/, "")}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      recorder.start();

      // 3. Play and Record loop
      video.currentTime = 0;
      video.volume = 0; // Mute during processing to avoid annoyance
      await video.play();

      const duration = video.duration;

      const processFrame = () => {
        if (video.ended || video.currentTime >= duration) {
          recorder.stop();
          video.volume = originalVolume;
          video.currentTime = originalTime;
          if (wasPaused) video.pause();
          setIsExporting(false);
          return;
        }

        // Draw Video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Calculate Subtitle
        const curTime = video.currentTime;
        const activeSeg = result.transcription.find((seg, idx) => {
           const start = parseTimestamp(seg.timestamp);
           const next = result.transcription[idx+1];
           const end = next ? parseTimestamp(next.timestamp) : start + 5;
           return curTime >= start && curTime < end;
        });

        // Draw Subtitle if exists
        if (activeSeg) {
          const text = activeSeg.text;
          const fontSize = config.fontSize * ratio; // Scale font to video resolution
          
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          
          // Calculate wrapping
          const maxWidth = (config.maxCharPerLine || 20) * fontSize; // Approx width
          const x = canvas.width / 2;
          const bottomMargin = 50 * ratio;
          let y = canvas.height - bottomMargin;
          
          ctx.fillStyle = config.color;
          ctx.shadowColor = "black";
          ctx.shadowBlur = 4;
          ctx.lineWidth = 3;
          ctx.strokeStyle = `rgba(0,0,0,${config.backgroundOpacity})`;
          
          const words = text.split(''); // Char split for Japanese
          let line = '';
          const lines = [];
          
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              lines.push(line);
              line = words[n];
            } else {
              line = testLine;
            }
          }
          lines.push(line);

          // Draw lines from bottom up
          lines.reverse().forEach((l, i) => {
             ctx.strokeText(l, x, y - (i * fontSize * 1.2));
             ctx.fillText(l, x, y - (i * fontSize * 1.2));
          });
        }

        setExportProgress(Math.round((video.currentTime / duration) * 100));
        
        if ('requestVideoFrameCallback' in video) {
          // @ts-ignore
          video.requestVideoFrameCallback(processFrame);
        } else {
          requestAnimationFrame(processFrame);
        }
      };

      if ('requestVideoFrameCallback' in video) {
        // @ts-ignore
        video.requestVideoFrameCallback(processFrame);
      } else {
        requestAnimationFrame(processFrame);
      }

    } catch (err) {
      console.error("Export failed", err);
      setIsExporting(false);
      video.volume = originalVolume;
    }
  };

  const fullTranscriptionText = result.transcription.map(s => `[${s.timestamp}] ${s.text}`).join('\n');

  // Convert hex color to rgba for css background
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer bg-slate-50/50 hover:bg-slate-50 border-b border-slate-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0">
            {getIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{result.fileName}</h3>
            <p className="text-xs text-slate-500">
              {result.createdAt.toLocaleDateString()} • {result.createdAt.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-8">
          
          {/* Media Player Section with Overlay */}
          <div className="space-y-4">
            <div className="relative bg-black rounded-xl overflow-hidden shadow-lg mx-auto max-w-3xl group" ref={containerRef}>
              
              {result.fileType === 'youtube' && result.fileUrl ? (
                <div className="aspect-video w-full">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${getYouTubeId(result.fileUrl)}`}
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : result.fileType === 'video' ? (
                <video 
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={result.fileUrl} 
                  controls 
                  className="w-full aspect-video"
                  onTimeUpdate={handleTimeUpdate}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="p-8 flex flex-col items-center justify-center bg-slate-900 text-white min-h-[200px]">
                   <Mic className="w-12 h-12 text-indigo-400 mb-4" />
                   {result.fileType === 'audio' && (
                     <audio 
                       ref={mediaRef as React.RefObject<HTMLAudioElement>}
                       src={result.fileUrl} 
                       controls 
                       className="w-full max-w-md"
                       onTimeUpdate={handleTimeUpdate}
                     />
                   )}
                   {result.fileType === 'text' && <div className="text-slate-300">Document Analysis</div>}
                </div>
              )}
              
              {/* Subtitle Overlay (Preview for Local Video Files Only) */}
              {result.fileType === 'video' && currentSubtitle && (
                <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none px-8 pb-4">
                  <div 
                    style={{
                      fontSize: `${config.fontSize}px`,
                      color: config.color,
                      backgroundColor: hexToRgba(config.backgroundColor, config.backgroundOpacity),
                      maxWidth: `${config.maxCharPerLine}em`, // Rough approximation using em
                      textAlign: 'center',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word',
                    }}
                    className="px-3 py-1 rounded transition-all duration-200"
                  >
                    {currentSubtitle}
                  </div>
                </div>
              )}
              
              {/* Export Overlay */}
              {isExporting && (
                 <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-white">
                    <Download className="w-10 h-10 mb-4 animate-bounce text-indigo-400" />
                    <h3 className="text-xl font-bold mb-2">Rendering Video...</h3>
                    <p className="text-sm text-slate-300 mb-4">Please do not close this tab.</p>
                    <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <span className="mt-2 text-xs font-mono">{exportProgress}%</span>
                 </div>
              )}
            </div>

            {/* Subtitle & Export Controls */}
            {result.fileType === 'video' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Settings className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-bold text-slate-700 uppercase">Subtitle Settings</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-90">
                  {/* Font Size */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Type className="w-3 h-3" /> Size
                    </label>
                    <input 
                      type="range" 
                      min="12" 
                      max="48" 
                      value={config.fontSize}
                      onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="text-right text-xs text-slate-400">{config.fontSize}px</div>
                  </div>

                  {/* Width / Max Chars */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <AlignLeft className="w-3 h-3" /> Width
                    </label>
                    <input 
                      type="range" 
                      min="10" 
                      max="50" 
                      value={config.maxCharPerLine}
                      onChange={(e) => updateConfig({ maxCharPerLine: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="text-right text-xs text-slate-400">~{config.maxCharPerLine} chars</div>
                  </div>

                  {/* Colors */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Palette className="w-3 h-3" /> Colors
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                         <input 
                          type="color" 
                          value={config.color}
                          onChange={(e) => updateConfig({ color: e.target.value })}
                          className="w-full h-8 rounded cursor-pointer"
                          title="Text Color"
                        />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="color" 
                          value={config.backgroundColor}
                          onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                          className="w-full h-8 rounded cursor-pointer"
                          title="Background Color"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Background Opacity */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Bg Opacity</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1"
                      value={config.backgroundOpacity}
                      onChange={(e) => updateConfig({ backgroundOpacity: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="text-right text-xs text-slate-400">{Math.round(config.backgroundOpacity * 100)}%</div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                   <button 
                    onClick={handleExportVideo}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors shadow-sm"
                   >
                    {isExporting ? (
                        <>Processing...</>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            Export Edited Video
                        </>
                    )}
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                <AlignLeft className="w-4 h-4 text-indigo-500" />
                Summary
              </h4>
              <button 
                onClick={() => handleCopy(result.summary, 'summary')}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="Copy summary"
              >
                {copiedSection === 'summary' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="bg-indigo-50/30 p-4 rounded-xl text-slate-700 text-sm leading-relaxed border border-indigo-50/50">
              {result.summary}
            </div>
          </section>

          {/* Keywords Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-rose-500" />
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Keywords</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.keywords.map((keyword, idx) => (
                <span 
                  key={idx}
                  className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-medium shadow-sm hover:border-indigo-200 hover:text-indigo-600 transition-colors cursor-default"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          </section>

          {/* Transcription Section */}
          <section>
             <div className="flex items-center justify-between mb-3">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-emerald-500" />
                Transcription
              </h4>
              <div className="flex items-center gap-2">
                 <span className="text-xs text-slate-400 hidden sm:inline-block mr-2">
                   <Edit2 className="w-3 h-3 inline mr-1"/>
                   Click text to edit
                 </span>
                <button 
                  onClick={() => handleCopy(fullTranscriptionText, 'transcription')}
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Copy transcription"
                >
                  {copiedSection === 'transcription' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-100 max-h-96 overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {result.transcription.map((segment, idx) => (
                  <div key={idx} className="p-3 hover:bg-slate-100 transition-colors flex gap-3 group items-start">
                    <button 
                      onClick={() => handleSeek(segment.timestamp)}
                      className="shrink-0 flex items-center justify-center h-6 px-2 bg-indigo-100 text-indigo-700 rounded text-xs font-mono font-medium hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer mt-1"
                      title="Jump to this time"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      {segment.timestamp}
                    </button>
                    <textarea
                      value={segment.text}
                      onChange={(e) => handleTranscriptionEdit(idx, e.target.value)}
                      className="flex-1 bg-transparent border-none text-sm text-slate-600 leading-relaxed resize-none focus:ring-0 focus:bg-white focus:shadow-sm rounded p-1 -m-1 transition-all"
                      rows={Math.max(1, Math.ceil(segment.text.length / 60))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
};