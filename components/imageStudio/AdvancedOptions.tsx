import React from 'react';
import { PiCaretDownIcon, PiSparkleIcon, PiSpinnerIcon, PiTranslateIcon } from '../Icons';

interface AdvancedOptionsProps {
    isAdvancedOpen: boolean;
    setIsAdvancedOpen: (isOpen: boolean) => void;
    prependPrompt: string;
    setPrependPrompt: (prompt: string) => void;
    appendPrompt: string;
    setAppendPrompt: (prompt: string) => void;
    promptGenerationInstructions: string;
    setPromptGenerationInstructions: (instructions: string) => void;
    isTranslatingInstructions: boolean;
    handleTranslateInstructions: () => void;
    isGeneratingPrompts: boolean;
    handleGeneratePromptList: () => void;
    jsonPrompts: string;
    handleJsonPromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    jsonError: string | null;
    filenameTemplate: string;
    setFilenameTemplate: (template: string) => void;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = (props) => {
    const {
        isAdvancedOpen, setIsAdvancedOpen, prependPrompt, setPrependPrompt, appendPrompt, setAppendPrompt,
        promptGenerationInstructions, setPromptGenerationInstructions,
        isTranslatingInstructions, handleTranslateInstructions, isGeneratingPrompts, handleGeneratePromptList,
        jsonPrompts, handleJsonPromptChange, jsonError,
        filenameTemplate, setFilenameTemplate
    } = props;

    return (
        <section className="w-full bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)]">
            <button 
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex justify-between items-center text-xl font-bold text-[var(--color-text-main)]"
                aria-expanded={isAdvancedOpen}
                aria-controls="advanced-options-panel"
            >
                <span>Advanced Options</span>
                <PiCaretDownIcon className={`w-6 h-6 transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>
            {isAdvancedOpen && (
                <div id="advanced-options-panel" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[var(--color-border-muted)] pt-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="prepend-prompt" className="block text-sm font-medium text-[var(--color-text-light)] mb-1">
                                Prepend Prompt
                            </label>
                            <textarea
                                id="prepend-prompt"
                                value={prependPrompt}
                                onChange={(e) => setPrependPrompt(e.target.value)}
                                rows={3}
                                className="custom-scrollbar block w-full rounded-md border-0 bg-[var(--color-bg-base)] py-2 px-3 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-muted)] placeholder:text-[var(--color-text-dimmer)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm"
                                placeholder="Add to the beginning of all prompts..."
                            />
                        </div>
                        <div>
                            <label htmlFor="append-prompt" className="block text-sm font-medium text-[var(--color-text-light)] mb-1">
                                Append Prompt
                            </label>
                            <textarea
                                id="append-prompt"
                                value={appendPrompt}
                                onChange={(e) => setAppendPrompt(e.target.value)}
                                rows={3}
                                className="custom-scrollbar block w-full rounded-md border-0 bg-[var(--color-bg-base)] py-2 px-3 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-muted)] placeholder:text-[var(--color-text-dimmer)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm"
                                placeholder="Add to the end of all prompts..."
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="prompt-generator" className="block text-sm font-medium text-[var(--color-text-light)] mb-1">
                                Generate Bulk Prompts (AI)
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <input
                                        id="prompt-generator"
                                        type="text"
                                        value={promptGenerationInstructions}
                                        onChange={(e) => setPromptGenerationInstructions(e.target.value)}
                                        className="block w-full rounded-md border-0 bg-[var(--color-bg-base)] py-2 pl-3 pr-10 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-muted)] placeholder:text-[var(--color-text-dimmer)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm"
                                        placeholder="e.g., 10 prompts for different hair colors"
                                    />
                                    <button
                                        onClick={handleTranslateInstructions}
                                        disabled={isTranslatingInstructions || isGeneratingPrompts || !promptGenerationInstructions.trim()}
                                        className={`absolute top-1/2 right-2 -translate-y-1/2 p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-primary-accent)] disabled:text-[var(--color-text-dimmer)] ${isTranslatingInstructions ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed'} transition-colors rounded-md`}
                                        title="Translate to English"
                                        aria-label="Translate instructions to English"
                                    >
                                        {isTranslatingInstructions ? (
                                            <PiSpinnerIcon className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <PiTranslateIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <button
                                    onClick={handleGeneratePromptList}
                                    disabled={isGeneratingPrompts || !promptGenerationInstructions.trim()}
                                    className="flex-shrink-0 flex items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] shadow-sm hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Generate prompts with AI"
                                >
                                    {isGeneratingPrompts ? <PiSpinnerIcon className="w-5 h-5 animate-spin" /> : <PiSparkleIcon className="w-5 h-5" />}
                                    <span className="hidden sm:inline">Generate</span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="json-prompts" className="block text-sm font-medium text-[var(--color-text-light)] mb-1">
                                Bulk Prompts (JSON Array)
                            </label>
                            <textarea
                                id="json-prompts"
                                value={jsonPrompts}
                                onChange={handleJsonPromptChange}
                                rows={5}
                                className={`custom-scrollbar block w-full rounded-md border-0 bg-[var(--color-bg-base)] py-2 px-3 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset sm:text-sm transition-all ${jsonError ? 'ring-[var(--color-destructive)] focus:ring-[var(--color-destructive)]' : 'ring-[var(--color-border-muted)] focus:ring-[var(--color-primary-ring)]'}`}
                                placeholder='["a cute cat", "a happy dog"]'
                            />
                            <p className="mt-1 text-xs text-[var(--color-text-dimmer)]">Overrides the prompts and version count above.</p>
                            {jsonError && <p className="mt-1 text-xs text-[var(--color-destructive)]">{jsonError}</p>}
                        </div>
                        <div>
                            <label htmlFor="filename-template" className="block text-sm font-medium text-[var(--color-text-light)] mb-1">
                                Filename Template
                            </label>
                            <input
                                id="filename-template"
                                type="text"
                                value={filenameTemplate}
                                onChange={(e) => setFilenameTemplate(e.target.value)}
                                className="block w-full rounded-md border-0 bg-[var(--color-bg-base)] py-2 px-3 text-[var(--color-text-light)] shadow-sm ring-1 ring-inset ring-[var(--color-border-muted)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary-ring)] sm:text-sm"
                            />
                            <p className="mt-1 text-xs text-[var(--color-text-dimmer)]">
                                Placeholders: <code className="bg-[var(--color-bg-muted)] px-1 rounded">{'{original_filename}'}</code> <code className="bg-[var(--color-bg-muted)] px-1 rounded">{'{source_count}'}</code> <code className="bg-[var(--color-bg-muted)] px-1 rounded">{'{set_id}'}</code> <code className="bg-[var(--color-bg-muted)] px-1 rounded">{'{version_index}'}</code> <code className="bg-[var(--color-bg-muted)] px-1 rounded">{'{timestamp}'}</code>
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-text-dimmer)]">
                                <span className="italic">Pro Studio: </span><code className="bg-[var(--color-bg-muted)] px-1 rounded">{'{original_filename}'}</code> shows source filename for single image, or "Nsrc" (e.g., "3src") for multiple images.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};