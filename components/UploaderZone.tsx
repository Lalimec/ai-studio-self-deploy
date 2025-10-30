/// <reference lib="dom" />
import React, { useState, useCallback } from 'react';

interface UploaderZoneProps {
  onFileUpload: (file: File) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const UploaderZone: React.FC<UploaderZoneProps> = ({ onFileUpload, children, className = '', disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files && files[0] && files[0].type.startsWith('image/')) {
      onFileUpload(files[0]);
    }
  }, [onFileUpload]);

  const onDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);
  
  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) e.dataTransfer.dropEffect = 'copy';
  }, [disabled]);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [disabled, handleFileChange]);

  const finalClassName = `relative flex items-center justify-center border-2 border-dashed rounded-xl p-4 transition-colors ${
    disabled
      ? 'cursor-not-allowed border-[var(--color-border-muted)] bg-[var(--color-bg-muted)]/50'
      : isDragging
      ? 'border-[var(--color-primary-accent)] bg-[var(--color-bg-surface)]'
      : 'cursor-pointer border-[var(--color-border-default)] hover:border-[var(--color-primary)]'
  } ${className}`;

  return (
    <label
      className={finalClassName}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-disabled={disabled}
    >
      {children}
      <input 
        type="file" 
        className="sr-only" 
        accept="image/png, image/jpeg, image/webp"
        onChange={(e) => {
            handleFileChange(e.target.files);
            if (e.target) e.target.value = '';
        }}
        disabled={disabled}
      />
    </label>
  );
};

export default UploaderZone;