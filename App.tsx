/// <reference lib="dom" />
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import {
    GeneratedImage, GeneratedBabyImage, Toast as ToastType,
    DisplayImage, StudioImage, ImageStudioResultImage, VariationState,
    NanoBananaWebhookSettings, UserProfile
} from './types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/firebaseConfig';
import { getUserProfile, createUserProfile, updateLastLogin } from './services/userService';
import { LoginScreen } from './components/LoginScreen';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { UserGallery } from './components/UserGallery';

import { useHairStudio } from './hooks/useHairStudio';
import { useBabyStudio } from './hooks/useBabyStudio';
import { useVideoStudio } from './hooks/useVideoStudio';
import { useTimelineStudio } from './hooks/useTimelineStudio';
import { useImageStudioLogic } from './hooks/useImageStudioLogic';
import { useAdCloner } from './hooks/useAdCloner';
import { useVideoAnalyzerStudio } from './hooks/useVideoAnalyzerStudio';
import { logUserAction } from './services/loggingService';

import { 
    MALE_HAIRSTYLES, FEMALE_HAIRSTYLES, AVANT_GARDE_HAIRSTYLES, MALE_BEARDS, FEMALE_ACCESSORIES, 
    HAIR_COLORS, BOLD_HAIR_COLORS, COMPLEX_NATURAL_HAIR_COLORS, MULTICOLOR_BOLD_HAIR_COLORS,
    BABY_AGES, BABY_COMPOSITIONS, BABY_BACKGROUNDS, BABY_CLOTHING_STYLES_UNISEX,
    BABY_CLOTHING_STYLES_BOY, BABY_CLOTHING_STYLES_GIRL, BABY_ACTIONS
} from './constants';

import ImageCropper from './components/ImageCropper';
import Lightbox from './components/Lightbox';
import ToastContainer from './components/ToastContainer';
import ConfirmationDialog from './components/ConfirmationDialog';
import HelpModal from './components/HelpModal';
import DownloadProgressModal from './components/DownloadProgressModal';
import CropChoiceModal from './components/CropChoiceModal';
import MultiCropView from './components/MultiCropView';
import GlobalSettingsModal from './components/GlobalSettingsModal';

import HairStudio from './components/hairStudio/HairStudio';
import BabyStudio from './components/babyStudio/BabyStudio';
import VideoStudio from './components/videoStudio/VideoStudio';
import TimelineStudio from './components/timelineStudio/TimelineStudio';
import ImageStudio from './components/ImageStudio';
import AdClonerStudio from './components/adCloner/AdClonerStudio';
import VideoAnalyzerStudio from './components/videoAnalyzer/VideoAnalyzerStudio';
import { HairStudioIcon, BabyIcon, ImageStudioIcon, VideoStudioIcon, TimelineStudioIcon, PrepareMagicIcon, AdClonerIcon, VideoAnalyzerIcon, SettingsIcon } from './components/Icons';
import { ImageStudioConfirmationDialog } from './components/imageStudio/ImageStudioConfirmationDialog';

type AppMode = 'hairStudio' | 'babyStudio' | 'imageStudio' | 'adCloner' | 'videoAnalyzer' | 'videoStudio' | 'timelineStudio';

export type ActiveCropper = {
    type: 'hair' | 'parent1' | 'parent2' | 'adCloner-ad' | 'adCloner-subject' | 'adCloner-refine';
    id?: string;
} | null;

function App() {
  const [appMode, setAppMode] = useState<AppMode>('hairStudio');

  // --- Firebase Authentication State ---
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showUserGallery, setShowUserGallery] = useState(false);

  // --- Shared State ---
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [isCropping, setIsCropping] = useState(false);
  const [activeCropper, setActiveCropper] = useState<ActiveCropper>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<any | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ visible: false, message: '', progress: 0 });
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showBetaFeatures, setShowBetaFeatures] = useState(() => {
    try {
        const stored = localStorage.getItem('showBetaFeatures');
        return stored ? JSON.parse(stored) : false;
    } catch (error) {
        return false;
    }
  });

  const [nanoBananaWebhookSettings, setNanoBananaWebhookSettings] = useState<NanoBananaWebhookSettings>(() => {
    try {
        const stored = localStorage.getItem('nanoBananaWebhookSettings');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                hair: parsed.hair !== undefined ? parsed.hair : true,
                baby: parsed.baby !== undefined ? parsed.baby : true,
                image: parsed.image !== undefined ? parsed.image : true,
                adCloner: parsed.adCloner !== undefined ? parsed.adCloner : true,
                videoAnalyzer: parsed.videoAnalyzer !== undefined ? parsed.videoAnalyzer : true,
            };
        }
    } catch (error) {
        console.error("Could not load Nano Banana webhook settings from localStorage", error);
    }
    // Default settings
    return {
        hair: true,
        baby: true,
        image: true,
        adCloner: true,
        videoAnalyzer: true,
    };
  });

  const handleSetNanoBananaWebhookSetting = (studio: keyof NanoBananaWebhookSettings, enabled: boolean) => {
    const newSettings = { ...nanoBananaWebhookSettings, [studio]: enabled };
    setNanoBananaWebhookSettings(newSettings);
    try {
        localStorage.setItem('nanoBananaWebhookSettings', JSON.stringify(newSettings));
    } catch (error) {
        console.error("Could not save Nano Banana webhook settings to localStorage", error);
    }
  };

  const handleSetShowBetaFeatures = (enabled: boolean) => {
    setShowBetaFeatures(enabled);
    try {
        localStorage.setItem('showBetaFeatures', JSON.stringify(enabled));
    } catch (error) {
        console.error("Could not save beta features setting to localStorage", error);
    }
  };

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user && user.email) {
        try {
          // Check if user profile exists
          let profile = await getUserProfile(user.email);

          if (!profile) {
            // Create new user profile
            profile = await createUserProfile(user.email, user.displayName, user.photoURL);
            console.log('New user profile created:', profile);
          } else {
            // Update last login
            await updateLastLogin(user.email);
            console.log('User logged in:', user.email);
          }

          setUserProfile(profile);
        } catch (error) {
          console.error('Error loading user profile:', error);
          showToast('error', 'Failed to load user profile');
        }
      } else {
        setUserProfile(null);
      }

      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!showBetaFeatures && (appMode === 'adCloner' || appMode === 'videoAnalyzer')) {
        setAppMode('hairStudio');
    }
  }, [showBetaFeatures, appMode]);

  // --- Toast Management ---
  const addToast = useCallback((message: string, type: ToastType['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  // --- Shared Utilities ---
   const withMultiDownloadWarning = useCallback((action: () => void) => {
    const hasSeenWarning = localStorage.getItem('hasSeenMultiDownloadWarning');
    if (!hasSeenWarning) {
        setConfirmAction({
            title: "Multiple File Download",
            message: "This action will download multiple files. Your browser may ask for permission to allow this. Please click 'Allow' if prompted.",
            confirmText: "Got it, Continue", cancelText: "Cancel", confirmVariant: 'primary',
            onConfirm: () => {
                localStorage.setItem('hasSeenMultiDownloadWarning', 'true');
                action();
            },
        });
    } else { action(); }
  }, []);

  // --- Studio Hooks ---
  const hairStudioLogic = useHairStudio({ addToast, setConfirmAction, withMultiDownloadWarning, setDownloadProgress, useNanoBananaWebhook: nanoBananaWebhookSettings.hair });
  const babyStudioLogic = useBabyStudio({ addToast, setConfirmAction, withMultiDownloadWarning, setDownloadProgress, useNanoBananaWebhook: nanoBananaWebhookSettings.baby });
  const videoStudioLogic = useVideoStudio({ addToast, setConfirmAction, setDownloadProgress, withMultiDownloadWarning });
  const timelineStudioLogic = useTimelineStudio({ addToast, setConfirmAction, setDownloadProgress, withMultiDownloadWarning });
  const imageStudioLogic = useImageStudioLogic(addToast, setConfirmAction, setDownloadProgress, withMultiDownloadWarning, nanoBananaWebhookSettings.image);
  const adClonerLogic = useAdCloner({ addToast, setConfirmAction, withMultiDownloadWarning, setDownloadProgress, useNanoBananaWebhook: nanoBananaWebhookSettings.adCloner });
  const videoAnalyzerLogic = useVideoAnalyzerStudio({ addToast, setConfirmAction, setDownloadProgress, withMultiDownloadWarning, useNanoBananaWebhook: nanoBananaWebhookSettings.videoAnalyzer });
  
  useEffect(() => {
    const isModalOpen = isCropping || timelineStudioLogic.isCropping || lightboxIndex !== null || confirmAction || showHelpModal || downloadProgress.visible || timelineStudioLogic.showCropChoice || timelineStudioLogic.isLightboxOpen || !!imageStudioLogic.pendingFiles || imageStudioLogic.croppingFiles || adClonerLogic.settingsModalOpen || showGlobalSettings;
    if (isModalOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isCropping, timelineStudioLogic.isCropping, lightboxIndex, confirmAction, showHelpModal, downloadProgress.visible, timelineStudioLogic.showCropChoice, timelineStudioLogic.isLightboxOpen, imageStudioLogic.pendingFiles, imageStudioLogic.croppingFiles, adClonerLogic.settingsModalOpen, showGlobalSettings]);

  // --- Unified Cropping Logic ---
  const handleImageUpload = useCallback((file: File, cropper: NonNullable<ActiveCropper>) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageToCrop(src);
      setActiveCropper(cropper);
      setIsCropping(true);

      if (cropper?.type === 'hair') {
        hairStudioLogic.setOriginalFile(file);
      } else if (cropper?.type === 'parent1') {
        babyStudioLogic.setParent1(p => ({ ...p, id: 'parent1', file, originalSrc: src, filename: file.name }));
      } else if (cropper?.type === 'parent2') {
        babyStudioLogic.setParent2(p => ({ ...p, id: 'parent2', file, originalSrc: src, filename: file.name }));
      } else if (cropper?.type === 'adCloner-ad') {
          adClonerLogic.setAdImage(p => ({ ...p, file, originalSrc: src }));
      } else if (cropper?.type === 'adCloner-subject' && cropper.id) {
          adClonerLogic.onSubjectUpload(file, src, cropper.id);
      } else if (cropper?.type === 'adCloner-refine' && cropper.id) {
          adClonerLogic.onRefineImageUpload(file, src, cropper.id);
      }
    };
    reader.readAsDataURL(file);
  }, [hairStudioLogic, babyStudioLogic, adClonerLogic]);
  
  const handleCropConfirm = (croppedImageDataUrl: string, aspectRatio: number) => {
    if (activeCropper?.type === 'hair') {
      hairStudioLogic.onCropConfirm(croppedImageDataUrl, aspectRatio);
    } else if (activeCropper?.type === 'parent1' || activeCropper?.type === 'parent2') {
      babyStudioLogic.onCropConfirm(croppedImageDataUrl, activeCropper.type);
    } else if (activeCropper?.type === 'adCloner-ad' || activeCropper?.type === 'adCloner-subject' || activeCropper?.type === 'adCloner-refine') {
        adClonerLogic.onCropConfirm(croppedImageDataUrl, activeCropper);
    }
    setIsCropping(false);
    setActiveCropper(null);
  };
  
  const handleCropCancel = () => {
      setIsCropping(false);
      if (activeCropper?.type === 'hair' && !hairStudioLogic.croppedImage) {
          hairStudioLogic.setOriginalFile(null);
      } else if (activeCropper?.type === 'parent1' && !babyStudioLogic.parent1.croppedSrc) {
          babyStudioLogic.setParent1({...babyStudioLogic.initialParentState, id: 'parent1'});
      } else if (activeCropper?.type === 'parent2' && !babyStudioLogic.parent2.croppedSrc) {
          babyStudioLogic.setParent2({...babyStudioLogic.initialParentState, id: 'parent2'});
      } else if (activeCropper?.type === 'adCloner-ad' || activeCropper?.type === 'adCloner-subject' || activeCropper?.type === 'adCloner-refine') {
          adClonerLogic.onCropCancel(activeCropper);
      }
      setActiveCropper(null);
  };

  // --- Cross-Studio Interactions ---
  const handleImportToStudio = (source: 'hair' | 'baby' | 'imageStudio' | 'adCloner') => {
    let sourceImages: DisplayImage[] = [];
    if (source === 'hair') sourceImages = hairStudioLogic.generatedImages;
    if (source === 'baby') sourceImages = babyStudioLogic.generatedImages;
    if (source === 'imageStudio') sourceImages = imageStudioLogic.generationResults.filter(r => r.status === 'success').map(r => ({ src: r.url!, filename: imageStudioLogic.getDownloadFilename(r), imageGenerationPrompt: r.prompt! }));
    if (source === 'adCloner') {
        // FIX: Added explicit 'VariationState' type annotation to the 'state' parameter to resolve 'unknown' type errors.
        sourceImages = Object.values(adClonerLogic.variationStates)
            .filter((state: VariationState) => state.activeImageIndex > -1)
            .map((state: VariationState, index) => ({
                src: state.imageHistory[state.activeImageIndex],
                filename: `ad-cloner-var-${index + 1}.jpg`,
                imageGenerationPrompt: 'Generated from Ad Cloner variation.'
            }));
    }
    
    if (sourceImages.length === 0) return addToast(`No images in the selected studio to import.`, 'info');
    
    logUserAction('IMPORT_TO_VIDEOSTUDIO', { source, count: sourceImages.length });

    videoStudioLogic.setStudioImages(prev => [
      ...sourceImages.map(img => ({
        id: `imported-${Date.now()}-${Math.random()}`,
        src: img.src,
        filename: img.filename,
        videoPrompt: img.videoPrompt,
      })),
      ...prev
    ]);
    if (!videoStudioLogic.sessionId) videoStudioLogic.setSessionId(hairStudioLogic.sessionId || babyStudioLogic.sessionId || imageStudioLogic.setId || adClonerLogic.sessionId);
    addToast(`${sourceImages.length} image(s) imported to Video Studio.`, 'success');
  };

  const handleImportToTimelineStudio = (source: 'hair' | 'baby' | 'imageStudio' | 'adCloner') => {
    let sourceImages: DisplayImage[] = [];
    if (source === 'hair') sourceImages = hairStudioLogic.generatedImages;
    if (source === 'baby') sourceImages = babyStudioLogic.generatedImages;
    if (source === 'imageStudio') sourceImages = imageStudioLogic.generationResults.filter(r => r.status === 'success').map(r => ({ src: r.url!, filename: imageStudioLogic.getDownloadFilename(r), imageGenerationPrompt: r.prompt! }));
    if (source === 'adCloner') {
        // FIX: Added explicit 'VariationState' type annotation to the 'state' parameter to resolve 'unknown' type errors.
        sourceImages = Object.values(adClonerLogic.variationStates)
            .filter((state: VariationState) => state.activeImageIndex > -1)
            .map((state: VariationState, index) => ({
                src: state.imageHistory[state.activeImageIndex],
                filename: `ad-cloner-var-${index + 1}.jpg`,
                imageGenerationPrompt: 'Generated from Ad Cloner variation.'
            }));
    }

    if (sourceImages.length === 0) return addToast(`No images in the selected studio to import.`, 'info');

    Promise.all(sourceImages.map(img => 
        fetch(img.src).then(res => res.blob()).then(blob => new File([blob], img.filename, { type: blob.type }))
    )).then(files => {
        logUserAction('IMPORT_TO_TIMELINE', { source, count: files.length });
        timelineStudioLogic.handleImagesUpload(files);
        addToast(`${files.length} image(s) imported to Timeline Studio.`, 'success');
    });
  };
  
  const adClonerImageCount = useMemo(() => {
    if (!showBetaFeatures) return 0;
    // FIX: Added explicit 'VariationState' type annotation to the 'state' parameter to resolve 'unknown' type errors.
    return Object.values(adClonerLogic.variationStates).filter((state: VariationState) => state.activeImageIndex > -1).length;
}, [adClonerLogic.variationStates, showBetaFeatures]);

  const activeGeneratedImages: DisplayImage[] = useMemo(() => {
      switch (appMode) {
          case 'hairStudio':
              return hairStudioLogic.generatedImages;
          case 'babyStudio':
              return babyStudioLogic.generatedImages;
          case 'videoStudio':
              return videoStudioLogic.studioImages;
          case 'timelineStudio':
              return timelineStudioLogic.timelineImages;
          case 'imageStudio':
              return imageStudioLogic.generationResults.filter(r => r.status === 'success' && r.url).map(r => ({
                  src: r.url!,
                  filename: imageStudioLogic.getDownloadFilename(r),
                  imageGenerationPrompt: r.prompt || 'N/A'
              }));
          case 'adCloner':
              // FIX: Added explicit 'VariationState' type annotation to the 'state' parameter to resolve 'unknown' type errors.
              return Object.values(adClonerLogic.variationStates).flatMap((state: VariationState) =>
                  state.activeImageIndex > -1 ? [{
                      src: state.imageHistory[state.activeImageIndex],
                      filename: 'ad-cloner-image.jpg',
                      imageGenerationPrompt: 'See variation details for prompt.'
                  }] : []
              );
          case 'videoAnalyzer':
              return [];
          default:
              return [];
      }
  }, [appMode, hairStudioLogic.generatedImages, babyStudioLogic.generatedImages, videoStudioLogic.studioImages, timelineStudioLogic.timelineImages, imageStudioLogic.generationResults, imageStudioLogic, adClonerLogic.variationStates]);
  
  const handleImageClick = (id: string) => {
    let index = -1;
    if (appMode === 'imageStudio' || appMode === 'adCloner') {
      index = activeGeneratedImages.findIndex(img => img.src === id);
    } else {
      index = activeGeneratedImages.findIndex(img => ('id' in img ? img.id : img.filename) === id);
    }
    if (index !== -1) setLightboxIndex(index);
  };

  const handleConfirmAction = () => {
    if (confirmAction) {
      confirmAction.onConfirm();
      setConfirmAction(null);
    }
  };

  const handleCancelAction = () => {
    if (confirmAction?.onCancel) confirmAction.onCancel();
    setConfirmAction(null);
  };
  
  const handleSetAppMode = (mode: AppMode) => {
    if (appMode !== mode) {
        logUserAction('SWITCH_STUDIO', { from: appMode, to: mode });
        setAppMode(mode);
    }
  };
                 
  const NavButton: React.FC<{ mode: AppMode, label: string, icon: React.ReactNode}> = ({ mode, label, icon }) => (
      <button 
        onClick={() => handleSetAppMode(mode)} 
        className={`flex items-center justify-center gap-2 group py-2 px-4 rounded-full transition-all text-base sm:text-lg font-semibold ${appMode === mode ? 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)] shadow-md' : 'text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
      >
          {icon}
          {label}
      </button>
  );

  // Show loading spinner during auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login screen
  if (!firebaseUser) {
    return <LoginScreen />;
  }

  // Authenticated but pending approval
  if (userProfile?.status === 'pending') {
    return (
      <PendingApprovalScreen
        email={firebaseUser.email!}
        displayName={userProfile.displayName}
      />
    );
  }

  // Suspended account
  if (userProfile?.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">Account Suspended</h1>
          <p className="text-gray-700 mb-6">
            Your account has been suspended. Please contact support for more information.
          </p>
          <p className="text-sm text-gray-600">{firebaseUser.email}</p>
          <button
            onClick={() => auth.signOut()}
            className="mt-6 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Approved user - show main app
  return (
    <>
      {/* User Gallery Modal */}
      {showUserGallery && userProfile && (
        <UserGallery
          userId={userProfile.email}
          onClose={() => setShowUserGallery(false)}
          onImageClick={(url) => {
            // Could open in lightbox if needed
            window.open(url, '_blank');
          }}
        />
      )}

      <div className='min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-main)] p-4 sm:p-6 lg:p-8 flex flex-col items-center'>
        {/* User info bar */}
        {userProfile && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-white rounded-full shadow-lg px-4 py-2">
            <button
              onClick={() => setShowUserGallery(true)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              title="View my generations"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Gallery
            </button>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-sm text-gray-600">
              {userProfile.credits} credits
            </span>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-sm text-gray-700 font-medium">
              {userProfile.displayName || userProfile.email.split('@')[0]}
            </span>
            <button
              onClick={() => auth.signOut()}
              className="text-sm text-gray-500 hover:text-gray-700"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}

        <button 
        onClick={() => setShowGlobalSettings(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-[var(--color-bg-surface)] rounded-full shadow-lg hover:bg-[var(--color-bg-muted)] transition-colors"
        aria-label="Open settings"
        title="Open settings"
      >
        <SettingsIcon className="h-6 w-6 text-[var(--color-text-dim)]" />
      </button>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <header className={"w-full max-w-7xl mx-auto mb-8 text-center"}>
        <div className="flex items-center justify-center gap-4 mb-4">
            <PrepareMagicIcon className="h-12 w-12 text-[var(--color-primary-accent)]" />
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary-accent)] to-[var(--color-secondary)]">
                AI Studio
            </h1>
        </div>
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap mb-2 bg-[var(--color-bg-surface)] p-2 rounded-full max-w-max mx-auto">
            <NavButton mode="hairStudio" label="Hair" icon={<HairStudioIcon className="h-6 w-6" />} />
            <NavButton mode="babyStudio" label="Baby" icon={<BabyIcon className="h-6 w-6" />} />
            <NavButton mode="imageStudio" label="Image" icon={<ImageStudioIcon className="h-6 w-6" />} />
            {showBetaFeatures && <NavButton mode="adCloner" label="Ad Cloner" icon={<AdClonerIcon className="h-6 w-6" />} />}
            {showBetaFeatures && <NavButton mode="videoAnalyzer" label="Video Analyzer" icon={<VideoAnalyzerIcon className="h-6 w-6" />} />}
            <NavButton mode="videoStudio" label="Video" icon={<VideoStudioIcon className="h-6 w-6" />} />
            <NavButton mode="timelineStudio" label="Timeline" icon={<TimelineStudioIcon className="h-6 w-6" />} />
        </div>
        <p className={`mt-4 text-lg text-[var(--color-text-dim)]`}>
            {appMode === 'hairStudio' && 'Virtually try on new hairstyles in seconds.'}
            {appMode === 'babyStudio' && 'See what your future baby could look like.'}
            {appMode === 'videoStudio' && 'Bring your images to life with custom video prompts.'}
            {appMode === 'imageStudio' && 'Batch generate image variations with multiple models.'}
            {appMode === 'timelineStudio' && 'Create video transitions between a sequence of images.'}
            {appMode === 'adCloner' && showBetaFeatures && 'Deconstruct and generate creative variations of any ad.'}
            {appMode === 'videoAnalyzer' && showBetaFeatures && 'Analyze video ads and generate creative variations.'}
        </p>
      </header>
      
      <main className="w-full flex-grow flex justify-center">
        {appMode === 'hairStudio' ? (
            <HairStudio
                logic={hairStudioLogic}
                onUpload={(file) => handleImageUpload(file, { type: 'hair' })}
                onRecrop={() => { setImageToCrop(hairStudioLogic.croppedImage); setActiveCropper({ type: 'hair' }); setIsCropping(true); }}
                onShowHelp={() => setShowHelpModal(true)}
                onImageClick={handleImageClick}
            />
        ) : appMode === 'babyStudio' ? (
          <BabyStudio
            logic={babyStudioLogic}
            onImageUpload={(file, parent) => handleImageUpload(file, { type: parent })}
            onRecrop={(parent) => {
                const src = parent === 'parent1' ? babyStudioLogic.parent1.originalSrc : babyStudioLogic.parent2.originalSrc;
                if (src) { setImageToCrop(src); setActiveCropper({ type: parent }); setIsCropping(true); }
            }}
            onImageClick={handleImageClick}
            onShowHelp={() => setShowHelpModal(true)}
            onDownloadSingle={babyStudioLogic.handleDownloadSingle}
          />
        ) : appMode === 'videoStudio' ? (
            <VideoStudio 
                logic={videoStudioLogic}
                hairImages={hairStudioLogic.generatedImages}
                babyImages={babyStudioLogic.generatedImages}
                imageStudioImages={imageStudioLogic.generationResults.filter(r => r.status === 'success').map(r => ({ src: r.url!, filename: imageStudioLogic.getDownloadFilename(r), imageGenerationPrompt: r.prompt! }))}
                adClonerImageCount={adClonerImageCount}
                showBetaFeatures={showBetaFeatures}
                onImport={handleImportToStudio}
                onImageClick={handleImageClick}
            />
        ) : appMode === 'timelineStudio' ? (
            <TimelineStudio
                logic={timelineStudioLogic}
                hairImages={hairStudioLogic.generatedImages}
                babyImages={babyStudioLogic.generatedImages}
                imageStudioImages={imageStudioLogic.generationResults.filter(r => r.status === 'success').map(r => ({ src: r.url!, filename: imageStudioLogic.getDownloadFilename(r), imageGenerationPrompt: r.prompt! }))}
                adClonerImageCount={adClonerImageCount}
                showBetaFeatures={showBetaFeatures}
                onImport={handleImportToTimelineStudio}
            />
        ) : appMode === 'adCloner' && showBetaFeatures ? (
            <AdClonerStudio
              logic={adClonerLogic}
              onUpload={handleImageUpload}
              onShowHelp={() => setShowHelpModal(true)}
            />
        ) : appMode === 'videoAnalyzer' && showBetaFeatures ? (
            <VideoAnalyzerStudio
                logic={videoAnalyzerLogic}
                onShowHelp={() => setShowHelpModal(true)}
                onImageClick={handleImageClick}
            />
        ) : (
            <ImageStudio
                logic={imageStudioLogic}
                onImageClick={handleImageClick}
                onShowHelp={() => setShowHelpModal(true)}
            />
        )}
      </main>

      {isCropping && imageToCrop && (
          <ImageCropper 
            imageSrc={imageToCrop} 
            onCropConfirm={handleCropConfirm} 
            onCancel={handleCropCancel} 
          />
      )}
      
      {timelineStudioLogic.showCropChoice && (
        <CropChoiceModal 
            onCrop={() => timelineStudioLogic.handleCropChoice('crop')}
            onCancel={() => {
                timelineStudioLogic.setShowCropChoice(false);
                timelineStudioLogic.setFilesForCrop(null);
            }}
        />
      )}

      {timelineStudioLogic.isCropping && timelineStudioLogic.filesForCrop && (
          <MultiCropView
            files={timelineStudioLogic.filesForCrop}
            onConfirm={timelineStudioLogic.handleCropConfirm}
            onCancel={timelineStudioLogic.handleCropCancel}
          />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={activeGeneratedImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          setCurrentIndex={setLightboxIndex}
          mode={appMode}
        />
      )}

      {confirmAction && <ConfirmationDialog {...confirmAction} onConfirm={handleConfirmAction} onCancel={handleCancelAction} />}
      
      {appMode === 'imageStudio' && imageStudioLogic.pendingFiles && (
        <ImageStudioConfirmationDialog
            isOpen={!!imageStudioLogic.pendingFiles}
            onCancel={imageStudioLogic.handleCancelUpload}
            onConfirm={imageStudioLogic.handleConfirmClearAndUpload}
        />
      )}
      
      {downloadProgress.visible && <DownloadProgressModal {...downloadProgress} />}
      {showHelpModal && <HelpModal 
          onClose={() => setShowHelpModal(false)} 
          maleCategories={MALE_HAIRSTYLES} 
          femaleCategories={FEMALE_HAIRSTYLES} 
          avantGardeCategory={AVANT_GARDE_HAIRSTYLES} 
          maleBeards={MALE_BEARDS} 
          femaleAccessories={FEMALE_ACCESSORIES} 
          hairColors={HAIR_COLORS} 
          boldHairColors={BOLD_HAIR_COLORS} 
          complexNaturalHairColors={COMPLEX_NATURAL_HAIR_COLORS} 
          multicolorBoldHairColors={MULTICOLOR_BOLD_HAIR_COLORS}
          babyAges={BABY_AGES}
          babyCompositions={BABY_COMPOSITIONS}
          babyBackgrounds={BABY_BACKGROUNDS}
          babyClothingUnisex={BABY_CLOTHING_STYLES_UNISEX}
          babyClothingBoy={BABY_CLOTHING_STYLES_BOY}
          babyClothingGirl={BABY_CLOTHING_STYLES_GIRL}
          babyActions={BABY_ACTIONS}
      />}
      {showGlobalSettings && (
        <GlobalSettingsModal
            isOpen={showGlobalSettings}
            onClose={() => setShowGlobalSettings(false)}
            showBetaFeatures={showBetaFeatures}
            onToggleBetaFeatures={handleSetShowBetaFeatures}
            nanoBananaWebhookSettings={nanoBananaWebhookSettings}
            onToggleNanoBananaWebhookSetting={handleSetNanoBananaWebhookSetting}
        />
      )}
    </div>
    </>
  );
}

export default App;