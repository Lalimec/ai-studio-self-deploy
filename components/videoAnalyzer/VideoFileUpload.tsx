/// <reference lib="dom" />
import React, { useState, useCallback } from 'react';
import { UploadIcon, PrepareMagicIcon } from '../Icons';

interface VideoFileUploadProps {
  file: File | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onChange: (files: File[]) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  isAnalyzed: boolean;
}

const VideoFileUpload: React.FC<VideoFileUploadProps> = ({
  file,
  videoRef,
  onChange,
  onAnalyze,
  isAnalyzing,
  isAnalyzed,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files) {
      const videoFiles = Array.from(files).filter(f => f.type.startsWith('video/'));
      if (videoFiles.length > 0) {
        onChange(videoFiles);
      } else {
        alert("Please upload a valid video file.");
      }
    }
  }, [onChange]);

  const onDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy';
  }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFileChange(e.dataTransfer.files);
  }, [handleFileChange]);

  if (file) {
    return (
      <div className="w-full flex flex-col items-center gap-4">
        <div className="w-full">
          <video ref={videoRef} controls playsInline className="w-full rounded-lg" />
        </div>
        <div className="w-full flex-grow text-center">
          <p className="font-bold text-lg text-[var(--color-text-light)] break-all">{file.name}</p>
          <p className="text-sm text-[var(--color-text-dim)]">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <div className="w-full mt-2 flex flex-row gap-2 justify-center">
            <button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
                <PrepareMagicIcon className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzed ? 'Re-Analyze' : 'Analyze Video'}
            </button>
             <label className="relative flex-1 cursor-pointer bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted-hover)] text-[var(--color-text-main)] font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                <UploadIcon className="w-5 h-5" />
                <span>Change Video</span>
                <input
                    type="file"
                    accept="video/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                        handleFileChange(e.target.files);
                        if (e.target) e.target.value = '';
                    }}
                />
            </label>
          </div>
      </div>
    );
  }

  return (
    <label
      className={`relative w-full border-4 border-dashed rounded-xl p-12 sm:p-20 transition-colors flex items-center justify-center text-center h-[50vh] ${isDragging ? 'border-[var(--color-primary-accent)] bg-[var(--color-bg-surface-light)]' : 'border-[var(--color-border-default)] hover:border-[var(--color-primary)]'}`}
      onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
    >
      <div className="flex flex-col items-center text-[var(--color-text-dim)] pointer-events-none">
        <h2 className="text-xl font-bold text-[var(--color-text-light)] mb-4">1. Upload Video Ad</h2>
        <UploadIcon className="h-16 w-16 mb-4" />
        <p className="text-xl font-semibold mb-2">Drag & drop your video here</p>
        <p className="mb-6">or</p>
        <div className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-3 px-6 rounded-lg transition-colors shadow-md pointer-events-auto">
          Browse File
        </div>
         <p className="text-xs text-[var(--color-text-dimmer)] mt-4">Max duration: 5 minutes / Max file size: 100MB</p>
      </div>
      <input
        type="file"
        accept="video/*"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={(e) => handleFileChange(e.target.files)}
      />
    </label>
  );
};

export default VideoFileUpload;
