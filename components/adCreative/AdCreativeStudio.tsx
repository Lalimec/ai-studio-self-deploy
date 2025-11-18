/**
 * AdCreativeStudio Component
 * Main component for Ad Creative Studio
 */

import React, { useState } from 'react';
import { useAdCreativeStudio } from '../../hooks/useAdCreativeStudio';
import { AD_CREATIVE_PROJECTS, AD_CREATIVE_APP_CODES, AD_CREATIVE_DESIGNERS } from '../../constants';
import ProjectSelector from './ProjectSelector';
import ParameterForm from './ParameterForm';
import PassthroughFields from './PassthroughFields';
import { DisplayImage } from '../../types';

interface AdCreativeStudioProps {
  logic: ReturnType<typeof useAdCreativeStudio>;
  hairImages?: DisplayImage[];
  babyImages?: DisplayImage[];
  imageStudioImages?: DisplayImage[];
  onShowHelp?: () => void;
  showBetaFeatures?: boolean;
}

export default function AdCreativeStudio({
  logic,
  hairImages = [],
  babyImages = [],
  imageStudioImages = [],
  onShowHelp,
  showBetaFeatures = false,
}: AdCreativeStudioProps) {
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [currentStep, setCurrentStep] = useState<'project' | 'parameters' | 'passthrough'>('project');

  const {
    selectedProject,
    parameters,
    passthroughFields,
    apiKey,
    isGenerating,
    isUploading,
    renderResults,
    error,
    handleSelectProject,
    handleUpdateParameter,
    handleUpdatePassthroughField,
    handleClearParameter,
    handleReset,
    handleTriggerRender,
    handleImportImages,
    setApiKey,
  } = logic;

  // Calculate total available images for import
  const totalAvailableImages = hairImages.length + babyImages.length + imageStudioImages.length;

  // Handle import from other studios
  const handleImportClick = () => {
    const allImages = [
      ...hairImages.map(img => ({ src: img.src, filename: img.filename })),
      ...babyImages.map(img => ({ src: img.src, filename: img.filename })),
      ...imageStudioImages.map(img => ({ src: img.src, filename: img.filename })),
    ];

    if (allImages.length === 0) {
      return;
    }

    handleImportImages(allImages);
  };

  // Step navigation
  const canGoNext = () => {
    if (currentStep === 'project') return !!selectedProject;
    if (currentStep === 'parameters') return true;
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'project') {
      setCurrentStep('parameters');
    } else if (currentStep === 'parameters') {
      setCurrentStep('passthrough');
    }
  };

  const handlePrevious = () => {
    if (currentStep === 'passthrough') {
      setCurrentStep('parameters');
    } else if (currentStep === 'parameters') {
      setCurrentStep('project');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header with Help and API Key */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onShowHelp && (
            <button
              onClick={onShowHelp}
              className="p-2 rounded-full hover:bg-[var(--color-bg-muted)] transition-colors"
              aria-label="Help"
            >
              <svg className="w-6 h-6 text-[var(--color-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          {totalAvailableImages > 0 && selectedProject && (
            <button
              onClick={handleImportClick}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Import from Studios ({totalAvailableImages})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedProject && (
            <button
              onClick={handleReset}
              disabled={isGenerating}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Reset
            </button>
          )}

          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="px-4 py-2 bg-[var(--color-bg-surface)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-bg-muted)] transition-colors text-sm"
          >
            {apiKey ? '✓ API Key Set' : 'Set API Key'}
          </button>
        </div>
      </div>

      {/* API Key Input */}
      {showApiKeyInput && (
        <div className="mb-6 p-4 bg-[var(--color-bg-surface)] rounded-lg">
          <label className="block text-sm font-medium mb-2 text-[var(--color-text-main)]">
            Plainly API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Plainly API key"
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border)] text-[var(--color-text-main)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <p className="text-xs text-[var(--color-text-dim)] mt-2">
            Your API key is required to trigger batch renders. Get it from your Plainly account.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {/* Step Indicator */}
      {selectedProject && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {['project', 'parameters', 'passthrough'].map((step, index) => (
              <React.Fragment key={step}>
                <button
                  onClick={() => setCurrentStep(step as any)}
                  disabled={isGenerating}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${currentStep === step
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-bg-surface)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-muted)]'
                    }
                    ${isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  `}
                >
                  {index + 1}. {step === 'project' ? 'Project' : step === 'parameters' ? 'Parameters' : 'Passthrough'}
                </button>
                {index < 2 && (
                  <div className="w-8 h-0.5 bg-[var(--color-border)]" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Content based on current step */}
      <div className="mb-8">
        {currentStep === 'project' && (
          <ProjectSelector
            projects={AD_CREATIVE_PROJECTS}
            selectedProject={selectedProject}
            onSelectProject={handleSelectProject}
          />
        )}

        {currentStep === 'parameters' && selectedProject && (
          <ParameterForm
            parameters={parameters}
            onUpdateParameter={handleUpdateParameter}
            onClearParameter={handleClearParameter}
          />
        )}

        {currentStep === 'passthrough' && selectedProject && (
          <PassthroughFields
            fields={passthroughFields}
            onUpdateField={handleUpdatePassthroughField}
            appCodeOptions={AD_CREATIVE_APP_CODES}
            designerOptions={AD_CREATIVE_DESIGNERS}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      {selectedProject && (
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 'project' || isGenerating}
            className="px-6 py-3 bg-[var(--color-bg-surface)] text-[var(--color-text-main)] rounded-lg hover:bg-[var(--color-bg-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          {currentStep === 'passthrough' ? (
            <button
              onClick={handleTriggerRender}
              disabled={isGenerating || !apiKey}
              className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isUploading ? 'Uploading...' : 'Rendering...'}
                </>
              ) : (
                'Trigger Batch Render'
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canGoNext() || isGenerating}
              className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          )}
        </div>
      )}

      {/* Render Results */}
      {renderResults.length > 0 && (
        <div className="mt-8 p-6 bg-[var(--color-bg-surface)] rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-[var(--color-text-main)]">
            Render Results
          </h3>
          <div className="space-y-4">
            {renderResults.map((result, index) => (
              <div key={index} className="p-4 bg-[var(--color-bg-base)] rounded-lg">
                <pre className="text-xs text-[var(--color-text-dim)] overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
