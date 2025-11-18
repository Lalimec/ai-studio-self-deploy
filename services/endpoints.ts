/**
 * Centralized constants for AI models and external API endpoints.
 * This script is named Constance to provide a single, easily manageable
 * point for all AI-related configurations.
 */

export const models = {
  // Text Models
  text: {
    flash: 'gemini-2.5-flash',
    pro: 'gemini-2.5-pro', // For future use
  },
  // Image Models
  image: {
    // This one is a real Gemini model name
    flash: 'gemini-2.5-flash-image',
    // The following are identifiers used in the UI
    nanoBanana: 'nano-banana',
    seedream: 'seedream',
    flux: 'flux-kontext-pro',
    qwen: 'qwen',
  },
};

export const endpoints = {
  // Video Generation (Seedance)
  videoGeneration: 'https://n8n.cemil.al/webhook/fbe9280c-07a6-451c-abdd-cf261c501856/higgsfield/video-seedance-v1-pro/image-to-video',
  videoStatus: 'https://n8n.cemil.al/webhook/cddfdbbb-8b1a-40c0-9a4b-8fee6dcf3747/higgsfield/check/video-seedance-v1-pro/image-to-video',

  // Video Stitching (ffmpeg)
  videoStitcher: 'https://n8n.cemil.al/webhook/5533f0bb-064a-4757-adcb-56793505fdf3/ffmpeg/stitch',
  
  // Image Upload
  imageUpload: 'https://n8n.cemil.al/webhook/fbe9280c-07a6-451c-abdd-cf261c501856/ai-studio/image-upload-google-bucket',

  // Video Upload (GCS)
  videoUpload: 'https://n8n.cemil.al/webhook/f123280c-0226-451c-abdd-cf26as301856/ai-studio/gcs-upload-google-bucket',

  // Image Generation (External)
  image: {
    seedream: 'https://n8n.cemil.al/webhook/5aff8ad1-c2f0-4d54-a375-3cc47d0f51cd/fal/edit-seedream-4.0',
    flux: 'https://n8n.cemil.al/webhook/3bd7adc2-c5ef-4e89-b43e-b0b0c063f199/fal/edit-flux-kontext',
    // Placeholder for a third-party Gemini Flash Image provider
    nanoBanana: 'https://n8n.cemil.al/webhook/7c6e2f5c-24aa-4650-9152-3d718bd69f8c/higgsfield/edit-nano-banana',
    qwen: 'https://n8n.cemil.al/webhook/5533f0bb-064a-4757-adcb-56793505fdf3/fal/edit-qwen',
    depthMap: 'https://n8n.cemil.al/webhook/3bd7adc2-c5ef-4e89-b43e-b0b0c063f199/fal/marigold-depth',
  }
};

/**
 * Defines the expected request and response schemas for the external API endpoints.
 * This serves as documentation and helps ensure consistency.
 */
export const schemas = {
  videoGeneration: {
    request: {
      prompt: 'string',
      image_url: 'string (public URL)',
      end_image_url: 'string (public URL, optional)',
      aspect_ratio: 'string (e.g., "auto", "16:9")',
      resolution: 'string (e.g., "720p")',
      duration: 'string (e.g., "5")',
    },
    response: {
      success: {
        request_id: 'string',
      },
      error: {
        Error: 'string',
      },
    },
  },
  videoStatus: {
    request: {
      id: 'string (request_id from generation)',
    },
    response: {
      pending: {
        status: '"generating"',
      },
      success: {
        videos: ['string (URL to video)'],
      },
      error: {
        Error: 'string',
        status: 'string (e.g., "failed")',
      },
    },
  },
  videoStitcher: {
    request: {
      video_urls: ['string'],
    },
    response: {
      // The service might return the URL in a JSON object or the video file directly.
      json: {
        url: 'string',
        stitched_video_url: 'string',
      },
      binary: 'video/mp4',
    },
  },
  imageUpload: {
    request: {
      image_url: 'string (data URL)',
      filename: 'string (optional)'
    },
    response: {
      success: {
        image_url: 'string'
      },
      error: {
        error: 'string'
      }
    }
  },
  videoUpload: {
    request: {
      file_url: 'string (data URL)',
      filename: 'string (optional)'
    },
    response: {
      success: {
        file_url: 'string (public GCS URL)'
      },
      error: {
        error: 'string'
      }
    }
  },
  image: {
    seedream: {
      request: {
        prompt: 'string',
        image_url: 'string (public URL)',
        width: 'number',
        height: 'number',
        image_size: 'string',
      },
      response: {
        success: {
          images: ['string (base64 encoded image data)'],
        },
      },
    },
    flux: {
      request: {
        prompt: 'string',
        image_url: 'string (public URL)',
        aspect_ratio: 'string',
      },
      response: {
        success: {
          images: ['string (base64 encoded image data)'],
        },
      },
    },
    nanoBanana: {
      request: {
          prompt: 'string',
          image_urls: 'string[] (public URLs)',
          aspect_ratio: 'string (e.g., "16:9", "auto")',
      },
      response: {
          success: {
              images: ['string (base64 encoded image data)'],
          }
      }
    },
    qwen: {
      request: {
          prompt: 'string',
          image_url: 'string (public URL)',
          num_inference_steps: 'number (default: 30)',
          guidance_scale: 'number (default: 4)',
          num_images: 'number (default: 1)',
          enable_safety_checker: 'boolean (default: false)',
          output_format: 'string (default: "png")',
          negative_prompt: 'string (default: "blurry, ugly")',
          acceleration: 'string (default: "regular")',
      },
      response: {
          success: {
              images: ['string (base64 encoded image data)'],
          }
      }
    },
    depthMap: {
      request: {
          image_url: 'string (public URL)',
          num_inference_steps: 'number (default: 5)',
          ensemble_size: 'number (default: 5)',
      },
      response: {
          success: {
              images: ['string (base64 encoded image data)'],
          }
      }
    }
  },
};


// Alias for easier access and semantic grouping
export const Constance = {
    models,
    endpoints,
    schemas,
};