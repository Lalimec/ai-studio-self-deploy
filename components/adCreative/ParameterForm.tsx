/**
 * ParameterForm Component
 * Displays parameter inputs with file uploaders for Ad Creative Studio
 */

import React, { useRef } from 'react';
import { PlainlyParameter, PlainlyParameterType } from '../../types';

interface ParameterFormProps {
  parameters: PlainlyParameter[];
  onUpdateParameter: (paramName: string, value: string | File | null) => void;
  onClearParameter: (paramName: string) => void;
}

export default function ParameterForm({
  parameters,
  onUpdateParameter,
  onClearParameter,
}: ParameterFormProps) {
  // Group parameters by type
  const imageParams = parameters.filter(p => p.type === 'image');
  const videoParams = parameters.filter(p => p.type === 'video');
  const audioParams = parameters.filter(p => p.type === 'music' || p.type === 'speech');
  const textParams = parameters.filter(p => p.type === 'text' || p.type === 'card');

  return (
    <div className="w-full max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-[var(--color-text-main)]">
        Configure Parameters
      </h2>

      <div className="space-y-8">
        {/* Image Parameters */}
        {imageParams.length > 0 && (
          <ParameterSection
            title="Images"
            type="image"
            parameters={imageParams}
            onUpdateParameter={onUpdateParameter}
            onClearParameter={onClearParameter}
          />
        )}

        {/* Video Parameters */}
        {videoParams.length > 0 && (
          <ParameterSection
            title="Videos"
            type="video"
            parameters={videoParams}
            onUpdateParameter={onUpdateParameter}
            onClearParameter={onClearParameter}
          />
        )}

        {/* Audio Parameters */}
        {audioParams.length > 0 && (
          <ParameterSection
            title="Audio"
            type="audio"
            parameters={audioParams}
            onUpdateParameter={onUpdateParameter}
            onClearParameter={onClearParameter}
          />
        )}

        {/* Text/Card Parameters */}
        {textParams.length > 0 && (
          <TextParameterSection
            parameters={textParams}
            onUpdateParameter={onUpdateParameter}
            onClearParameter={onClearParameter}
          />
        )}
      </div>
    </div>
  );
}

interface ParameterSectionProps {
  title: string;
  type: 'image' | 'video' | 'audio';
  parameters: PlainlyParameter[];
  onUpdateParameter: (paramName: string, value: File | null) => void;
  onClearParameter: (paramName: string) => void;
}

function ParameterSection({
  title,
  type,
  parameters,
  onUpdateParameter,
  onClearParameter,
}: ParameterSectionProps) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-[var(--color-text-main)]">
        {title}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {parameters.map(param => (
          <FileUploader
            key={param.name}
            param={param}
            type={type}
            onUpdateParameter={onUpdateParameter}
            onClearParameter={onClearParameter}
          />
        ))}
      </div>
    </div>
  );
}

interface FileUploaderProps {
  param: PlainlyParameter;
  type: 'image' | 'video' | 'audio';
  onUpdateParameter: (paramName: string, value: File | null) => void;
  onClearParameter: (paramName: string) => void;
}

function FileUploader({
  param,
  type,
  onUpdateParameter,
  onClearParameter,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);

  // Check if parameter has a default value (like endcard)
  const hasDefaultValue = param.name === 'varEndcard' && param.value && !param.file;
  const hasFile = param.file || (param.value && !hasDefaultValue);

  // Get accept attribute based on type
  const getAcceptAttribute = () => {
    switch (type) {
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'audio':
        return 'audio/*';
      default:
        return '*/*';
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    onUpdateParameter(param.name, file);

    // Generate preview for images
    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle clear
  const handleClear = () => {
    onClearParameter(param.name);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get icon based on type
  const getIcon = () => {
    if (type === 'image') {
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (type === 'video') {
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium mb-1 text-[var(--color-text-main)] truncate" title={param.displayName || param.name}>
        {param.displayName || param.name}
      </label>

      <div
        onClick={() => (!hasFile && !hasDefaultValue) && fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-2 transition-all cursor-pointer
          ${isDragging
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : hasDefaultValue
              ? 'border-blue-500 bg-blue-500/10'
              : hasFile
                ? 'border-green-500 bg-green-500/10'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-bg-base)]'
          }
          aspect-[4/5] flex flex-col items-center justify-center
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptAttribute()}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {hasDefaultValue ? (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <div className="text-blue-500 mb-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-center text-[var(--color-text-main)] mb-1 font-medium">
              Default
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="text-xs text-blue-500 hover:text-blue-600 underline"
            >
              Upload Custom
            </button>
          </div>
        ) : hasFile ? (
          <div className="flex flex-col items-center justify-center w-full h-full">
            {preview ? (
              <img
                src={preview}
                alt={param.displayName || param.name}
                className="w-full h-full object-cover rounded mb-1"
              />
            ) : (
              <div className="text-green-500 mb-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <p className="text-xs text-center text-[var(--color-text-main)] mb-1 font-medium truncate w-full px-1" title={param.file?.name || 'Uploaded'}>
              {param.file?.name || 'Uploaded'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-xs text-red-500 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-[var(--color-text-dim)]">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xs text-center">
              Upload
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TextParameterSectionProps {
  parameters: PlainlyParameter[];
  onUpdateParameter: (paramName: string, value: string) => void;
  onClearParameter: (paramName: string) => void;
}

function TextParameterSection({
  parameters,
  onUpdateParameter,
  onClearParameter,
}: TextParameterSectionProps) {
  return (
    <div className="bg-[var(--color-bg-surface)] rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-[var(--color-text-main)]">
        Text & Card Parameters
      </h3>

      <div className="space-y-4">
        {parameters.map(param => (
          <div key={param.name}>
            <label className="block text-sm font-medium mb-2 text-[var(--color-text-main)]">
              {param.displayName || param.name}
            </label>
            <div className="relative">
              <input
                type="text"
                value={param.value || ''}
                onChange={(e) => onUpdateParameter(param.name, e.target.value)}
                placeholder={`Enter ${param.displayName || param.name}`}
                className="w-full px-4 py-2 pr-10 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border)] text-[var(--color-text-main)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              {param.value && (
                <button
                  onClick={() => onClearParameter(param.name)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] hover:text-red-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
