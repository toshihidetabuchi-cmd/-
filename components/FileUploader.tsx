import React, { useCallback } from 'react';
import { UploadCloud, FileType as FileIcon, Video, Mic, FileText } from 'lucide-react';
import { FileType } from '../types';

interface FileUploaderProps {
  onFileSelect: (file: File, type: FileType) => void;
  isLoading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isLoading }) => {
  const processFile = useCallback((file: File) => {
    // Basic MIME type detection
    const type = file.type.split('/')[0];
    let fileType: FileType = 'text';
    
    if (type === 'audio') fileType = 'audio';
    else if (type === 'video') fileType = 'video';
    else if (type === 'image') fileType = 'image';
    else fileType = 'text'; // Default to text for PDF/Docs

    onFileSelect(file, fileType);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  }, [isLoading, processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    // Reset value so same file can be selected again if needed
    e.target.value = '';
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`w-full max-w-xl border-2 border-dashed rounded-2xl transition-all duration-200 text-center ${
        isLoading
          ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
          : 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300'
      }`}
    >
      <input
        type="file"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
        accept="audio/*,video/*,text/*,application/pdf"
        disabled={isLoading}
      />
      <label 
        htmlFor="file-upload" 
        className={`block w-full h-full p-8 flex flex-col items-center ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
          <UploadCloud className="w-8 h-8 text-indigo-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">
          Upload file to analyze
        </h3>
        <p className="text-slate-500 mt-2 mb-6 max-w-xs mx-auto text-sm">
          Drag and drop specific files or browse your local drive.
        </p>
        
        <div className="flex gap-4 justify-center text-xs text-slate-400">
          <div className="flex flex-col items-center gap-1">
            <Video className="w-4 h-4" />
            <span>MP4, MOV</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Mic className="w-4 h-4" />
            <span>MP3, WAV</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>TXT, PDF</span>
          </div>
        </div>
        
        {/* Replaced button with div to avoid nested interactive controls inside label */}
        <div 
          className={`mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium transition-colors text-sm shadow-sm ${
            isLoading ? 'bg-indigo-400' : 'hover:bg-indigo-700'
          }`}
        >
          Browse Files
        </div>
      </label>
    </div>
  );
};