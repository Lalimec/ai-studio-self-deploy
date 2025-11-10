/**
 * Generation Service
 *
 * Manages user generations in Firestore and Google Cloud Storage.
 * Saves generation metadata to Firestore and images to GCS.
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Generation, AppMode } from '../types';
import { uploadImageToGCS } from './imageUploadService';

/**
 * Save a generation to Firestore
 */
export const saveGeneration = async (
  userId: string,
  studioType: AppMode,
  imageDataUrl: string,
  metadata: Partial<Generation>
): Promise<Generation> => {
  try {
    // Upload image to GCS first
    const imageUrl = await uploadImageToGCS(imageDataUrl, userId, studioType);

    // Create generation document
    const generationData: Omit<Generation, 'id'> = {
      userId,
      studioType,
      imageUrl,
      createdAt: new Date().toISOString(),
      creditsUsed: metadata.creditsUsed || 1,
      model: metadata.model || 'unknown',
      prompt: metadata.prompt,
      negativePrompt: metadata.negativePrompt,
      aspectRatio: metadata.aspectRatio,
      dimensions: metadata.dimensions,
      settings: metadata.settings,
      sessionId: metadata.sessionId,
      batchId: metadata.batchId,
      thumbnailUrl: metadata.thumbnailUrl,
      fileSize: metadata.fileSize,
      mimeType: metadata.mimeType || 'image/png',
      isFavorite: false,
      isDeleted: false,
    };

    const docRef = await addDoc(collection(db, 'generations'), generationData);

    const generation: Generation = {
      id: docRef.id,
      ...generationData,
    };

    console.log('Generation saved:', {
      id: docRef.id,
      userId,
      studioType,
      model: generation.model,
    });

    return generation;
  } catch (error) {
    console.error('Error saving generation:', error);
    throw error;
  }
};

/**
 * Get user's recent generations
 */
export const getUserGenerations = async (
  userId: string,
  limitCount: number = 50
): Promise<Generation[]> => {
  try {
    const q = query(
      collection(db, 'generations'),
      where('userId', '==', userId),
      where('isDeleted', '!=', true),
      orderBy('isDeleted'), // Required for compound query
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const generations: Generation[] = [];

    snapshot.forEach((doc) => {
      generations.push({
        id: doc.id,
        ...doc.data(),
      } as Generation);
    });

    console.log(`Loaded ${generations.length} generations for user:`, userId);

    return generations;
  } catch (error) {
    console.error('Error getting user generations:', error);
    throw error;
  }
};

/**
 * Get user's generations filtered by studio type
 */
export const getUserGenerationsByStudio = async (
  userId: string,
  studioType: AppMode,
  limitCount: number = 50
): Promise<Generation[]> => {
  try {
    const q = query(
      collection(db, 'generations'),
      where('userId', '==', userId),
      where('studioType', '==', studioType),
      where('isDeleted', '!=', true),
      orderBy('isDeleted'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const generations: Generation[] = [];

    snapshot.forEach((doc) => {
      generations.push({
        id: doc.id,
        ...doc.data(),
      } as Generation);
    });

    return generations;
  } catch (error) {
    console.error('Error getting generations by studio:', error);
    throw error;
  }
};

/**
 * Get user's favorite generations
 */
export const getUserFavorites = async (
  userId: string,
  limitCount: number = 50
): Promise<Generation[]> => {
  try {
    const q = query(
      collection(db, 'generations'),
      where('userId', '==', userId),
      where('isFavorite', '==', true),
      where('isDeleted', '!=', true),
      orderBy('isDeleted'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const generations: Generation[] = [];

    snapshot.forEach((doc) => {
      generations.push({
        id: doc.id,
        ...doc.data(),
      } as Generation);
    });

    return generations;
  } catch (error) {
    console.error('Error getting user favorites:', error);
    throw error;
  }
};

/**
 * Toggle favorite status for a generation
 */
export const toggleFavorite = async (
  generationId: string,
  currentState: boolean
): Promise<void> => {
  try {
    const docRef = doc(db, 'generations', generationId);
    await updateDoc(docRef, {
      isFavorite: !currentState,
    });

    console.log('Favorite toggled:', generationId, !currentState);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
};

/**
 * Soft delete a generation (marks as deleted but keeps in DB)
 */
export const softDeleteGeneration = async (generationId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'generations', generationId);
    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    });

    console.log('Generation soft deleted:', generationId);
  } catch (error) {
    console.error('Error soft deleting generation:', error);
    throw error;
  }
};

/**
 * Hard delete a generation (permanently removes from DB)
 * Note: This does not delete the image from GCS
 */
export const hardDeleteGeneration = async (generationId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'generations', generationId);
    await deleteDoc(docRef);

    console.log('Generation hard deleted:', generationId);
  } catch (error) {
    console.error('Error hard deleting generation:', error);
    throw error;
  }
};

/**
 * Get a single generation by ID
 */
export const getGeneration = async (generationId: string): Promise<Generation | null> => {
  try {
    const docRef = doc(db, 'generations', generationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Generation;
  } catch (error) {
    console.error('Error getting generation:', error);
    throw error;
  }
};

/**
 * Update generation metadata
 */
export const updateGeneration = async (
  generationId: string,
  updates: Partial<Generation>
): Promise<void> => {
  try {
    const docRef = doc(db, 'generations', generationId);

    // Remove fields that shouldn't be updated
    const { id, userId, createdAt, ...allowedUpdates } = updates;

    await updateDoc(docRef, allowedUpdates);

    console.log('Generation updated:', generationId);
  } catch (error) {
    console.error('Error updating generation:', error);
    throw error;
  }
};

/**
 * Get generation statistics for a user
 */
export const getUserGenerationStats = async (userId: string): Promise<{
  total: number;
  byStudio: Record<string, number>;
  favorites: number;
  recentCount: number;
}> => {
  try {
    // Get all non-deleted generations
    const q = query(
      collection(db, 'generations'),
      where('userId', '==', userId),
      where('isDeleted', '!=', true),
      orderBy('isDeleted')
    );

    const snapshot = await getDocs(q);
    const generations: Generation[] = [];

    snapshot.forEach((doc) => {
      generations.push(doc.data() as Generation);
    });

    // Calculate statistics
    const byStudio: Record<string, number> = {};
    let favorites = 0;

    generations.forEach((gen) => {
      // Count by studio
      byStudio[gen.studioType] = (byStudio[gen.studioType] || 0) + 1;

      // Count favorites
      if (gen.isFavorite) {
        favorites++;
      }
    });

    // Count recent (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = generations.filter(
      (gen) => new Date(gen.createdAt) >= sevenDaysAgo
    ).length;

    return {
      total: generations.length,
      byStudio,
      favorites,
      recentCount,
    };
  } catch (error) {
    console.error('Error getting generation stats:', error);
    throw error;
  }
};
