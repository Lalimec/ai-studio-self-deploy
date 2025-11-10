/**
 * User Service
 *
 * Manages user profiles in Firestore.
 * Handles user creation, profile updates, credit management, and access control.
 */

import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { UserProfile, AccessControlSettings } from '../types';

// Get allowed domains from environment or default to lyrebirdstudio.net
const ALLOWED_DOMAINS = import.meta.env.VITE_ALLOWED_DOMAINS?.split(',') || ['lyrebirdstudio.net'];
const ALLOW_EXTERNAL = import.meta.env.VITE_ALLOW_EXTERNAL === 'true';

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (email: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', email);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as UserProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Create new user profile in Firestore
 */
export const createUserProfile = async (
  email: string,
  displayName: string | null,
  photoURL: string | null
): Promise<UserProfile> => {
  try {
    const domain = email.split('@')[1];
    const isInternalUser = ALLOWED_DOMAINS.includes(domain);

    // Get access control settings (if they exist)
    let accessSettings: AccessControlSettings | null = null;
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'access_control'));
      if (settingsDoc.exists()) {
        accessSettings = settingsDoc.data() as AccessControlSettings;
      }
    } catch (error) {
      console.warn('Could not load access control settings, using defaults');
    }

    // Determine initial status and credits
    const status = isInternalUser
      ? (accessSettings?.internalAutoApprove !== false ? 'approved' : 'pending')
      : (accessSettings?.externalAutoApprove === true ? 'approved' : 'pending');

    const credits = isInternalUser
      ? (accessSettings?.internalUserCredits || 10000)
      : (accessSettings?.externalUserCredits || 100);

    const newUser: UserProfile = {
      email,
      displayName,
      photoURL,
      status: status as 'approved' | 'pending',
      isAdmin: false,
      credits,
      usageCount: 0,
      tier: 'free',
      domain,
      isInternalUser,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };

    const docRef = doc(db, 'users', email);
    await setDoc(docRef, newUser);

    console.log('User profile created:', email, {
      status,
      isInternalUser,
      credits,
    });

    return newUser;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Update user's last login timestamp
 */
export const updateLastLogin = async (email: string): Promise<void> => {
  try {
    const docRef = doc(db, 'users', email);
    await updateDoc(docRef, {
      lastLoginAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating last login:', error);
    // Don't throw - this is not critical
  }
};

/**
 * Update user's last activity timestamp
 */
export const updateLastActivity = async (email: string): Promise<void> => {
  try {
    const docRef = doc(db, 'users', email);
    await updateDoc(docRef, {
      lastActivityAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating last activity:', error);
    // Don't throw - this is not critical
  }
};

/**
 * Decrement user credits and increment usage count
 */
export const decrementCredits = async (email: string, amount: number = 1): Promise<void> => {
  try {
    const docRef = doc(db, 'users', email);
    await updateDoc(docRef, {
      credits: increment(-amount),
      usageCount: increment(1),
      lastActivityAt: new Date().toISOString(),
    });

    console.log(`Credits decremented for ${email}:`, -amount);
  } catch (error) {
    console.error('Error decrementing credits:', error);
    throw error;
  }
};

/**
 * Add credits to user account
 */
export const addCredits = async (email: string, amount: number): Promise<void> => {
  try {
    const docRef = doc(db, 'users', email);
    await updateDoc(docRef, {
      credits: increment(amount),
    });

    console.log(`Credits added to ${email}:`, amount);
  } catch (error) {
    console.error('Error adding credits:', error);
    throw error;
  }
};

/**
 * Check if user has sufficient credits
 */
export const hasCredits = async (email: string, required: number = 1): Promise<boolean> => {
  try {
    const profile = await getUserProfile(email);
    if (!profile) {
      return false;
    }

    return profile.credits >= required;
  } catch (error) {
    console.error('Error checking credits:', error);
    return false;
  }
};

/**
 * Check if user is allowed access based on domain
 */
export const checkUserAccess = (email: string): { allowed: boolean; reason?: string } => {
  const domain = email.split('@')[1];
  const isInternalUser = ALLOWED_DOMAINS.includes(domain);

  // Internal users always allowed
  if (isInternalUser) {
    return { allowed: true };
  }

  // Check if external access is enabled
  if (!ALLOW_EXTERNAL) {
    return {
      allowed: false,
      reason: `Access restricted to ${ALLOWED_DOMAINS.join(', ')} users only`,
    };
  }

  // External access enabled
  return { allowed: true };
};

/**
 * Get access control settings
 */
export const getAccessControlSettings = async (): Promise<AccessControlSettings | null> => {
  try {
    const docRef = doc(db, 'settings', 'access_control');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as AccessControlSettings;
  } catch (error) {
    console.error('Error getting access control settings:', error);
    return null;
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (
  email: string,
  preferences: Partial<UserProfile['preferences']>
): Promise<void> => {
  try {
    const docRef = doc(db, 'users', email);
    const current = await getUserProfile(email);

    if (!current) {
      throw new Error('User not found');
    }

    const updatedPreferences = {
      ...current.preferences,
      ...preferences,
    };

    await updateDoc(docRef, {
      preferences: updatedPreferences,
    });

    console.log('User preferences updated:', email);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};
