/**
 * Ad Creative Studio Service
 * Handles Plainly Videos API integration for batch rendering
 */

import { endpoints } from './endpoints';
import { PlainlyParameter, PlainlyProject, WebhookPassthrough } from '../types';
import { uploadImageFromDataUrl } from './imageUploadService';
import { uploadVideoToGCS } from './videoUploadService';
import { logUserAction } from './loggingService';

interface PlainlyBatchData {
  parameters: Record<string, string>;
  webhookPassthrough: string;
}

interface PlainlyRenderRequest {
  projectId: string;
  reference: string;
  templateIds: string[];
  batchData: PlainlyBatchData[];
  webhook: {
    url: string;
    onFailure: boolean;
    onInvalid: boolean;
  };
}

/**
 * Upload a file (image, video, audio) to Google Cloud Storage and return the public URL
 */
async function uploadAsset(file: File, type: 'image' | 'video' | 'audio'): Promise<string> {
  try {
    if (type === 'image') {
      // Convert file to data URL for upload
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // uploadImageFromDataUrl returns the URL directly
      const imageUrl = await uploadImageFromDataUrl(dataUrl, file.name);
      return imageUrl;
    } else if (type === 'video' || type === 'audio') {
      // For videos and audio, use the video upload service (takes File, returns URL directly)
      const fileUrl = await uploadVideoToGCS(file);
      return fileUrl;
    }

    throw new Error(`Unsupported asset type: ${type}`);
  } catch (error) {
    console.error(`Error uploading ${type}:`, error);
    throw new Error(`Failed to upload ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload all parameter files and return updated parameters with public URLs
 */
export async function uploadParameterAssets(
  parameters: PlainlyParameter[],
  onProgress?: (current: number, total: number) => void
): Promise<PlainlyParameter[]> {
  const updatedParameters: PlainlyParameter[] = [];
  const filesToUpload = parameters.filter(p => p.file && (p.type === 'image' || p.type === 'video' || p.type === 'music' || p.type === 'speech'));

  let uploadedCount = 0;

  for (const param of parameters) {
    if (param.file && (param.type === 'image' || param.type === 'video' || param.type === 'music' || param.type === 'speech')) {
      try {
        // Determine upload type (music and speech are audio files)
        const uploadType = param.type === 'music' || param.type === 'speech' ? 'audio' : param.type;
        const publicUrl = await uploadAsset(param.file, uploadType);

        updatedParameters.push({
          ...param,
          value: publicUrl,
        });

        uploadedCount++;
        if (onProgress) {
          onProgress(uploadedCount, filesToUpload.length);
        }
      } catch (error) {
        console.error(`Error uploading ${param.displayName}:`, error);
        throw new Error(`Failed to upload ${param.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Keep text and card parameters as-is
      updatedParameters.push(param);
    }
  }

  return updatedParameters;
}

/**
 * Trigger Plainly Videos batch render
 */
export async function triggerPlainlyBatchRender(
  project: PlainlyProject,
  parameters: PlainlyParameter[],
  passthroughFields: WebhookPassthrough,
  apiKey: string
): Promise<any> {
  try {
    logUserAction('PLAINLY_BATCH_RENDER_START', {
      projectId: project.id,
      templateCount: project.templates.length,
      parameterCount: parameters.length,
    });

    // Build parameters object
    const parametersObj: Record<string, string> = {};
    parameters.forEach(param => {
      if (param.value) {
        parametersObj[param.name] = param.value;
      }
    });

    // Build webhook passthrough (as JSON string)
    const webhookPassthrough = JSON.stringify(passthroughFields);

    // Build batch data
    const batchData: PlainlyBatchData[] = [{
      parameters: parametersObj,
      webhookPassthrough: webhookPassthrough,
    }];

    // Build request payload
    const requestPayload: PlainlyRenderRequest = {
      projectId: project.id,
      reference: 'ai-studio-v2-ad-creative',
      templateIds: project.templates.map(t => t.id),
      batchData: batchData,
      webhook: {
        url: 'https://n8n.cemil.al/webhook/235de745-f4e2-4a4c-8622-be7c2ec6318a/plainly-render-records',
        onFailure: false,
        onInvalid: false,
      },
    };

    // Determine the API endpoint - use proxy in development, direct in production with server
    const isDevelopment = import.meta.env.DEV;
    const apiEndpoint = isDevelopment
      ? '/plainly-proxy/api/v2/renders'
      : endpoints.plainlyRender;

    // Make API request with Basic Auth
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${apiKey}:`)}`,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Plainly API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    logUserAction('PLAINLY_BATCH_RENDER_SUCCESS', {
      projectId: project.id,
      resultId: result.id || 'unknown',
    });

    return result;
  } catch (error) {
    logUserAction('PLAINLY_BATCH_RENDER_ERROR', {
      projectId: project.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('Error triggering Plainly batch render:', error);
    throw error;
  }
}

/**
 * Validate that all required parameters are filled
 */
export function validateParameters(parameters: PlainlyParameter[]): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  parameters.forEach(param => {
    if (!param.value && !param.file) {
      missingFields.push(param.displayName || param.name);
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate webhook passthrough fields
 */
export function validatePassthroughFields(fields: WebhookPassthrough): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  if (!fields.adName.trim()) missingFields.push('Ad Name');
  if (!fields.code.trim()) missingFields.push('Code');
  if (!fields.appCode) missingFields.push('App Code');
  if (!fields.designer) missingFields.push('Designer');

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
