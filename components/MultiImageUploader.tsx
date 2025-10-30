/// <reference lib="dom" />
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './Icons';

interface MultiImageUploaderProps {
  onImagesUpload: (files: File[]) => void;
  isButton?: boolean;
}

const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({ onImagesUpload, isButton = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (fileList) {
      const imageFiles = Array.from(fileList).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        onImagesUpload(imageFiles);
      }
    }
  }, [onImagesUpload]);

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [handleFiles]);

  if (isButton) {
      return (
          <>
            <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-2 px-4 rounded-lg transition-colors text-sm" 
                title="Upload more images"
            >
                <UploadIcon className="w-4 h-4" /> Upload More
            </button>
            <input 
                ref={inputRef}
                id="multi-file-upload-button" 
                name="multi-file-upload-button" 
                type="file" 
                className="sr-only" 
                accept="image/*"
                multiple
                onChange={(e) => {
                    handleFiles(e.target.files);
                    if (e.target) e.target.value = '';
                }}
            />
        </>
      )
  }

  return (
    <div className="w-full max-w-2xl text-center">
      <div 
        className={`relative border-4 border-dashed rounded-xl p-12 sm:p-20 transition-colors ${isDragging ? 'border-[var(--color-primary-accent)] bg-[var(--color-bg-surface-light)]' : 'border-[var(--color-border-default)] hover:border-[var(--color-primary)]'}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center text-[var(--color-text-dim)]">
          <UploadIcon className="h-16 w-16 mb-4" />
          <p className="text-xl font-semibold mb-2">Drag & drop your images here</p>
          <p className="mb-6">or</p>
          <label htmlFor="multi-file-upload" className="cursor-pointer bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-text-on-primary)] font-bold py-3 px-6 rounded-lg transition-colors shadow-md shadow-[var(--color-shadow-primary)]/30" title="Click to open file browser">
            Browse Files
          </label>
          <input 
            id="multi-file-upload" 
            name="multi-file-upload" 
            type="file" 
            className="sr-only" 
            accept="image/*"
            multiple
            onChange={(e) => {
                handleFiles(e.target.files);
                if (e.target) e.target.value = '';
            }}
          />
        </div>
      </div>
      <p className="mt-4 text-sm text-[var(--color-text-dimmer)]">You can upload multiple images at once.</p>
    </div>
  );
};

export default MultiImageUploader;