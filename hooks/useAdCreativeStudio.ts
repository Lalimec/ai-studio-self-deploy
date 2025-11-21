/**
 * Ad Creative Studio Hook
 * Manages state and logic for the Ad Creative Studio
 */

import { useState, useCallback } from 'react';
import {
  PlainlyProject,
  PlainlyParameter,
  WebhookPassthrough,
  Toast
} from '../types';
import {
  uploadParameterAssets,
  triggerPlainlyBatchRender,
  validateParameters,
  validatePassthroughFields
} from '../services/adCreativeService';

interface UseAdCreativeStudioProps {
  addToast: (message: string, type: Toast['type']) => void;
  setConfirmAction: (action: any) => void;
  setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
}

export function useAdCreativeStudio({
  addToast,
  setConfirmAction,
  setDownloadProgress,
}: UseAdCreativeStudioProps) {
  // Project selection
  const [selectedProject, setSelectedProject] = useState<PlainlyProject | null>(null);

  // Parameters (copied from project template)
  const [parameters, setParameters] = useState<PlainlyParameter[]>([]);

  // Webhook passthrough fields
  const [passthroughFields, setPassthroughFields] = useState<WebhookPassthrough>({
    today: new Date().toISOString().slice(0, 10).replace(/-/g, ''), // YYYYMMDD
    appCode: 'CFO',
    code: '',
    designer: 'CA',
    adName: '',
    templateName: '',
  });

  // API Key for Plainly
  const [apiKey, setApiKey] = useState<string>('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [renderResults, setRenderResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Select a project and initialize parameters
   */
  const handleSelectProject = useCallback((project: PlainlyProject) => {
    setSelectedProject(project);
    // Deep copy parameters to avoid mutation
    setParameters(JSON.parse(JSON.stringify(project.parameters)));
    setPassthroughFields(prev => ({
      ...prev,
      templateName: project.templateName,
    }));
    setError(null);
  }, []);

  /**
   * Update a parameter value
   */
  const handleUpdateParameter = useCallback((paramName: string, value: string | File | null) => {
    setParameters(prev => prev.map(param => {
      if (param.name === paramName) {
        if (typeof value === 'string') {
          // Text value
          return { ...param, value, file: null };
        } else if (value instanceof File) {
          // File upload
          return { ...param, file: value, value: null };
        } else {
          // Clear
          return { ...param, value: null, file: null };
        }
      }
      return param;
    }));
  }, []);

  /**
   * Update passthrough field
   */
  const handleUpdatePassthroughField = useCallback((field: keyof WebhookPassthrough, value: string) => {
    setPassthroughFields(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Clear parameter
   */
  const handleClearParameter = useCallback((paramName: string) => {
    setParameters(prev => prev.map(param =>
      param.name === paramName ? { ...param, value: null, file: null } : param
    ));
  }, []);

  /**
   * Reset studio (clear project and parameters)
   */
  const handleReset = useCallback(() => {
    setConfirmAction({
      title: 'Reset Studio',
      message: 'Are you sure you want to reset? This will clear all parameters and project selection.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
      onConfirm: () => {
        setSelectedProject(null);
        setParameters([]);
        setPassthroughFields({
          today: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
          appCode: 'CFO',
          code: '',
          designer: 'CA',
          adName: '',
          templateName: '',
        });
        setRenderResults([]);
        setError(null);
        addToast('Studio reset successfully', 'success');
      },
    });
  }, [setConfirmAction, addToast]);

  /**
   * Trigger batch render
   */
  const handleTriggerRender = useCallback(async () => {
    if (!selectedProject) {
      addToast('Please select a project first', 'error');
      return;
    }

    if (!apiKey.trim()) {
      addToast('Please enter your Plainly API key', 'error');
      return;
    }

    // Validate parameters
    const paramValidation = validateParameters(parameters);
    if (!paramValidation.isValid) {
      addToast(`Missing parameters: ${paramValidation.missingFields.join(', ')}`, 'error');
      return;
    }

    // Validate passthrough fields
    const passthroughValidation = validatePassthroughFields(passthroughFields);
    if (!passthroughValidation.isValid) {
      addToast(`Missing fields: ${passthroughValidation.missingFields.join(', ')}`, 'error');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Step 1: Upload all asset files
      setIsUploading(true);
      setDownloadProgress({
        visible: true,
        message: 'Uploading assets...',
        progress: 0,
      });

      const uploadedParameters = await uploadParameterAssets(parameters, (current, total) => {
        const progress = Math.round((current / total) * 100);
        setDownloadProgress({
          visible: true,
          message: `Uploading assets (${current}/${total})...`,
          progress,
        });
      });

      setIsUploading(false);
      setDownloadProgress({
        visible: false,
        message: '',
        progress: 0,
      });

      // Step 2: Trigger batch render
      setDownloadProgress({
        visible: true,
        message: 'Triggering batch render...',
        progress: 0,
      });

      const result = await triggerPlainlyBatchRender(
        selectedProject,
        uploadedParameters,
        passthroughFields,
        apiKey
      );

      setRenderResults(prev => [...prev, result]);
      setDownloadProgress({
        visible: false,
        message: '',
        progress: 0,
      });

      addToast('Batch render triggered successfully! You will receive results via webhook.', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      addToast(`Error: ${errorMessage}`, 'error');
      setDownloadProgress({
        visible: false,
        message: '',
        progress: 0,
      });
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
    }
  }, [
    selectedProject,
    parameters,
    passthroughFields,
    apiKey,
    addToast,
    setDownloadProgress,
  ]);

  /**
   * Import images from other studios
   */
  const handleImportImages = useCallback((images: { src: string; filename: string }[]) => {
    // Find first available image parameters
    const imageParams = parameters.filter(p => p.type === 'image' && !p.value && !p.file);

    if (imageParams.length === 0) {
      addToast('No available image slots to import into', 'warning');
      return;
    }

    const importCount = Math.min(images.length, imageParams.length);

    // Convert data URLs to files and update parameters
    Promise.all(
      images.slice(0, importCount).map((img, index) =>
        fetch(img.src)
          .then(res => res.blob())
          .then(blob => new File([blob], img.filename, { type: blob.type }))
          .then(file => ({
            paramName: imageParams[index].name,
            file,
          }))
      )
    ).then(results => {
      setParameters(prev => prev.map(param => {
        const imported = results.find(r => r.paramName === param.name);
        if (imported) {
          return { ...param, file: imported.file, value: null };
        }
        return param;
      }));

      addToast(`Imported ${importCount} image(s)`, 'success');
    }).catch(err => {
      addToast(`Error importing images: ${err.message}`, 'error');
    });
  }, [parameters, addToast]);

  return {
    // State
    selectedProject,
    parameters,
    passthroughFields,
    apiKey,
    isGenerating,
    isUploading,
    renderResults,
    error,

    // Actions
    handleSelectProject,
    handleUpdateParameter,
    handleUpdatePassthroughField,
    handleClearParameter,
    handleReset,
    handleTriggerRender,
    handleImportImages,
    setApiKey,
  };
}
