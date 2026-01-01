import React from 'react';
import { HardDrive, Clock, Star, Trash2, Settings, Cloud, FileText, Video, Mic } from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col h-full border-r border-slate-800">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <Cloud className="w-6 h-6 text-indigo-400" />
          <span>DriveAnalyzer</span>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Storage</h3>
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-white bg-slate-800 rounded-lg transition-colors">
              <HardDrive className="w-4 h-4" />
              <span>All Files</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <Clock className="w-4 h-4" />
              <span>Recent</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <Star className="w-4 h-4" />
              <span>Starred</span>
            </a>
          </nav>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Categories</h3>
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <Video className="w-4 h-4 text-rose-400" />
              <span>Videos</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Recordings</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Documents</span>
            </a>
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <nav className="space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
            <span>Trash</span>
          </a>
        </nav>
      </div>
    </aside>
  );
};