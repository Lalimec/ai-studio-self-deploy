/**
 * Pending Approval Screen Component
 *
 * Displayed when a user has successfully authenticated but is waiting
 * for admin approval to use the application.
 */

import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

interface PendingApprovalScreenProps {
  email: string;
  displayName: string | null;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  email,
  displayName,
}) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-black opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      {/* Content card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative z-10">
        {/* Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg
              className="w-10 h-10 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Account Pending Approval
          </h1>
        </div>

        {/* User info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {displayName?.charAt(0)?.toUpperCase() || email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {displayName && (
                <p className="font-semibold text-gray-800 truncate">{displayName}</p>
              )}
              <p className="text-sm text-gray-600 truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Your account has been created and is currently waiting for admin approval.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>What happens next?</strong>
                  <br />
                  An administrator will review your request. You'll receive an email once
                  your account is approved. This typically takes 1-2 business days.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">Account Created</p>
                <p className="text-sm text-gray-600">You successfully signed in</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div>
                <p className="font-medium text-gray-800">Pending Approval</p>
                <p className="text-sm text-gray-600">
                  Waiting for administrator review
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-gray-300 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-500">Access Granted</p>
                <p className="text-sm text-gray-500">Start creating with AI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSignOut}
            className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            Sign Out
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Check Approval Status
          </button>
        </div>

        {/* Contact info */}
        <div className="mt-6 text-center border-t pt-6">
          <p className="text-gray-600 text-sm mb-1">Need help?</p>
          <p className="text-gray-500 text-xs">
            Contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-white bg-opacity-10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-2xl animate-pulse delay-1000"></div>
    </div>
  );
};
