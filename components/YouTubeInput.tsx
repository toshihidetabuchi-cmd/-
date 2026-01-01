import React, { useState } from 'react';
import { Youtube, Play, Clock, ArrowRight } from 'lucide-react';
import { YouTubeParams } from '../types';

interface YouTubeInputProps {
  onAnalyze: (params: YouTubeParams) => void;
  isLoading: boolean;
}

export const YouTubeInput: React.FC<YouTubeInputProps> = ({ onAnalyze, isLoading }) => {
  const [url, setUrl] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('05:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && startTime && endTime) {
      onAnalyze({ url, startTime, endTime });
    }
  };

  return (
    <div className="w-full max-w-xl p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
          <Youtube className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Analyze YouTube Video</h3>
        <p className="text-slate-500 text-sm mt-1">
          Paste a link and specify the segment you want to transcribe.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
            Video URL
          </label>
          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              required
              disabled={isLoading}
            />
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
              Start Time (MM:SS)
            </label>
            <div className="relative">
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="00:00"
                pattern="[0-9]{1,2}:[0-9]{2}"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                required
                disabled={isLoading}
              />
              <Play className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
              End Time (MM:SS)
            </label>
            <div className="relative">
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="05:00"
                pattern="[0-9]{1,2}:[0-9]{2}"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                required
                disabled={isLoading}
              />
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !url}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors shadow-sm mt-2"
        >
          {isLoading ? 'Analyzing...' : 'Start Analysis'}
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};