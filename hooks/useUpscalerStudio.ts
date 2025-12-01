/// <reference lib="dom" />
import { useState, useCallback } from 'react';
import { UpscalerImage, UpscalerSettings, Toast as ToastType, DownloadSettings } from '../types';
import { upscaleImage, upscaleAllImages, getDefaultUpscalerSettings, UpscaleTask } from '../services/upscalerService';
import { uploadImageFromDataUrl } from '../services/imageUploadService';
import { generateSetId, generateShortId, getTimestamp, getExtensionFromDataUrl } from '../services/imageUtils';
import { logUserAction } from '../services/loggingService';

declare const JSZip: any;

type UpscalerStudioHookProps = {
    addToast: (message: string, type: ToastType['type']) => void;
    setConfirmAction: (action: any) => void;
    setDownloadProgress: (progress: { visible: boolean; message: string; progress: number }) => void;
    withMultiDownloadWarning: (action: () => void) => void;
    downloadSettings: DownloadSettings;
};

export const useUpscalerStudio = ({
    addToast,
    setConfirmAction,
    setDownloadProgress,
    withMultiDownloadWarning,
    downloadSettings,
}: UpscalerStudioHookProps) => {
    const [upscalerImages, setUpscalerImages] = useState<UpscalerImage[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isUpscaling, setIsUpscaling] = useState(false);
    const [settings, setSettings] = useState<UpscalerSettings>(getDefaultUpscalerSettings());

    const isBusy = isUpscaling;

    const handleImagesUpload = useCallback((files: File[]) => {
        if (files.length === 0) return;
        if (!sessionId) setSessionId(generateSetId());

        const readFileAsDataURL = (file: File): Promise<{ file: File; src: string }> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ file, src: reader.result as string });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        Promise.all(files.map(readFileAsDataURL))
            .then(results => {
                const newImages: UpscalerImage[] = results.map(({ file, src }) => ({
                    id: `up-${generateShortId()}-${Date.now()}`,
                    src,
                    file,
                    filename: `${file.name.substring(0, file.name.lastIndexOf('.')) || file.name}_${generateShortId()}.${file.name.substring(file.name.lastIndexOf('.') + 1)}`,
                }));
                setUpscalerImages(prev => [...newImages, ...prev]);
            })
            .catch(error => {
                console.error("Error reading files:", error);
                addToast("There was an error uploading one or more images.", "error");
            });
    }, [sessionId, addToast]);

    const handleRemoveImage = (id: string) => setUpscalerImages(prev => prev.filter(img => img.id !== id));

    const handleClearAll = () => {
        setConfirmAction({
            title: "Clear Upscaler Studio?",
            message: "This will remove all images from the Upscaler Studio. This action cannot be undone.",
            confirmText: "Clear All",
            onConfirm: () => {
                setUpscalerImages([]);
                setSessionId(null);
            }
        });
    };

    const handleUpdateSettings = (newSettings: Partial<UpscalerSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const ensurePublicUrl = async (imageId: string): Promise<string | null> => {
        const image = upscalerImages.find(img => img.id === imageId);
        if (!image) return null;
        if (image.publicUrl) return image.publicUrl;

        try {
            const url = await uploadImageFromDataUrl(image.src, image.filename);
            setUpscalerImages(prev => prev.map(img => img.id === imageId ? { ...img, publicUrl: url } : img));
            return url;
        } catch (error) {
            addToast(`Failed to upload image ${image.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            return null;
        }
    };

    const handleUpscaleSingle = async (id: string) => {
        const image = upscalerImages.find(img => img.id === id);
        if (!image || image.isUpscaling) return;

        logUserAction('UPSCALE_SINGLE', { id, sessionId, model: settings.model });
        setUpscalerImages(prev => prev.map(img => img.id === id ? { ...img, isUpscaling: true, upscaleFailed: false } : img));

        try {
            const publicUrl = await ensurePublicUrl(id);
            if (!publicUrl) {
                throw new Error("Failed to get public URL for the image.");
            }

            const upscaledUrl = await upscaleImage(publicUrl, settings);
            setUpscalerImages(prev => prev.map(img =>
                img.id === id
                    ? { ...img, upscaledSrc: upscaledUrl, isUpscaling: false, upscaleFailed: false, appliedSettings: { ...settings } }
                    : img
            ));
            addToast("Image upscaled successfully!", "success");
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Error upscaling image.', 'error');
            setUpscalerImages(prev => prev.map(img => img.id === id ? { ...img, isUpscaling: false, upscaleFailed: true } : img));
        }
    };

    // Count of images that haven't been upscaled yet
    const pendingUpscaleCount = upscalerImages.filter(img => !img.upscaledSrc && !img.isUpscaling).length;

    const handleUpscaleAll = async () => {
        const imagesToUpscale = upscalerImages.filter(img => !img.isUpscaling);

        if (imagesToUpscale.length === 0) {
            return addToast("No images to upscale.", "info");
        }

        executeUpscaleAll(imagesToUpscale);
    };

    const handleUpscaleNewOnly = async () => {
        const newImages = upscalerImages.filter(img => !img.upscaledSrc && !img.isUpscaling);

        if (newImages.length === 0) {
            return addToast("All images have already been upscaled.", "info");
        }

        executeUpscaleAll(newImages);
    };

    const executeUpscaleAll = async (toProcess: UpscalerImage[]) => {
        logUserAction('UPSCALE_ALL', { count: toProcess.length, sessionId, model: settings.model });
        setIsUpscaling(true);
        setUpscalerImages(prev => prev.map(img =>
            toProcess.some(p => p.id === img.id) ? { ...img, isUpscaling: true, upscaleFailed: false } : img
        ));
        addToast(`Upscaling ${toProcess.length} images...`, "info");

        try {
            const tasks: UpscaleTask[] = [];
            for (const image of toProcess) {
                const publicUrl = await ensurePublicUrl(image.id);
                if (publicUrl) {
                    tasks.push({
                        id: image.id,
                        imageUrl: publicUrl,
                        settings: { ...settings },
                    });
                }
            }

            if (tasks.length !== toProcess.length) {
                addToast("Some images failed to upload and were skipped.", "warning");
            }

            if (tasks.length > 0) {
                await upscaleAllImages(
                    tasks,
                    (id, upscaledUrl) => {
                        setUpscalerImages(prev => prev.map(img =>
                            img.id === id
                                ? { ...img, upscaledSrc: upscaledUrl, isUpscaling: false, upscaleFailed: false, appliedSettings: { ...settings } }
                                : img
                        ));
                    },
                    (error) => {
                        const idMatch = error.match(/image (.*?):/);
                        if (idMatch && idMatch[1]) {
                            const failedId = idMatch[1];
                            setUpscalerImages(prev => prev.map(img =>
                                img.id === failedId ? { ...img, isUpscaling: false, upscaleFailed: true } : img
                            ));
                        }
                        addToast(error, 'error');
                    }
                );
            }

            addToast("Upscaling complete!", "success");
        } catch (e) {
            addToast(e instanceof Error ? e.message : 'Error upscaling images.', 'error');
        } finally {
            setIsUpscaling(false);
            setUpscalerImages(prev => prev.map(img => ({ ...img, isUpscaling: false })));
        }
    };

    const handleDownloadSingle = (id: string) => {
        withMultiDownloadWarning(async () => {
            const image = upscalerImages.find(img => img.id === id);
            if (!image) {
                addToast("Could not find image to download.", "error");
                return;
            }

            const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));
            setDownloadProgress({ visible: true, message: `Preparing: ${baseName}.zip`, progress: 0 });

            try {
                const zip = new JSZip();

                // Add original image
                const originalExt = getExtensionFromDataUrl(image.src);
                zip.file(`${baseName}_original.${originalExt}`, image.src.split(',')[1], { base64: true });
                setDownloadProgress({ visible: true, message: 'Adding original image...', progress: 25 });

                // Add upscaled image if available
                if (image.upscaledSrc) {
                    const upscaledBlob = await fetch(image.upscaledSrc).then(res => res.blob());
                    const upscaledExt = image.upscaledSrc.includes('.png') ? 'png' : 'jpg';
                    zip.file(`${baseName}_upscaled.${upscaledExt}`, upscaledBlob);
                    setDownloadProgress({ visible: true, message: 'Adding upscaled image...', progress: 50 });
                }

                // Add metadata if enabled
                if (downloadSettings.includeMetadataFiles && image.appliedSettings) {
                    const info = {
                        type: "upscaler_studio_image",
                        model: image.appliedSettings.model,
                        scale_factor: image.appliedSettings.scaleFactor,
                        upscale_mode: image.appliedSettings.upscaleMode,
                        target_resolution: image.appliedSettings.targetResolution,
                    };
                    zip.file(`${baseName}.txt`, JSON.stringify(info, null, 2));
                }
                setDownloadProgress({ visible: true, message: 'Compressing...', progress: 75 });

                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `${baseName}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

                setDownloadProgress({ visible: false, message: '', progress: 0 });
            } catch (err) {
                addToast("Error creating ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    };

    const handleDownloadAll = () => {
        withMultiDownloadWarning(async () => {
            if (upscalerImages.length === 0) {
                addToast("No images to download.", "info");
                return;
            }
            setDownloadProgress({ visible: true, message: 'Starting download...', progress: 0 });
            const currentSessionId = sessionId || generateSetId();
            if (!sessionId) setSessionId(currentSessionId);

            try {
                const zip = new JSZip();
                let filesProcessed = 0;

                for (const image of upscalerImages) {
                    const baseName = image.filename.substring(0, image.filename.lastIndexOf('.'));

                    // Add original image
                    const originalExt = getExtensionFromDataUrl(image.src);
                    zip.file(`${baseName}_original.${originalExt}`, image.src.split(',')[1], { base64: true });

                    // Add upscaled image if available
                    if (image.upscaledSrc) {
                        const upscaledBlob = await fetch(image.upscaledSrc).then(res => res.blob());
                        const upscaledExt = image.upscaledSrc.includes('.png') ? 'png' : 'jpg';
                        zip.file(`${baseName}_upscaled.${upscaledExt}`, upscaledBlob);
                    }

                    // Add metadata if enabled
                    if (downloadSettings.includeMetadataFiles && image.appliedSettings) {
                        const info = {
                            type: "upscaler_studio_image",
                            model: image.appliedSettings.model,
                            scale_factor: image.appliedSettings.scaleFactor,
                            upscale_mode: image.appliedSettings.upscaleMode,
                            target_resolution: image.appliedSettings.targetResolution,
                        };
                        zip.file(`${baseName}.txt`, JSON.stringify(info, null, 2));
                    }

                    filesProcessed++;
                    setDownloadProgress({
                        visible: true,
                        message: `Zipping: ${image.filename}`,
                        progress: (filesProcessed / upscalerImages.length) * 100
                    });
                }

                setDownloadProgress({ visible: true, message: 'Compressing ZIP...', progress: 99 });
                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `AI_Studio_Upscaler_${currentSessionId}_${getTimestamp()}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

                setDownloadProgress({ visible: false, message: '', progress: 0 });
            } catch (err) {
                addToast("Error creating ZIP file.", "error");
                setDownloadProgress({ visible: false, message: '', progress: 0 });
            }
        });
    };

    return {
        upscalerImages,
        setUpscalerImages,
        sessionId,
        setSessionId,
        isUpscaling,
        isBusy,
        settings,
        pendingUpscaleCount,
        handleImagesUpload,
        handleRemoveImage,
        handleClearAll,
        handleUpdateSettings,
        handleUpscaleSingle,
        handleUpscaleAll,
        handleUpscaleNewOnly,
        handleDownloadSingle,
        handleDownloadAll,
    };
};
