

import React from 'react';
import { PiCaretDown, PiSparkle, PiSpinner, PiTranslate } from 'react-icons/pi';

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
        <section className="w-full bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-200">
            <button 
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex justify-between items-center text-xl font-bold text-slate-800"
                aria-expanded={isAdvancedOpen}
                aria-controls="advanced-options-panel"
            >
                <span>Advanced Options</span>
                <PiCaretDown className={`w-6 h-6 transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>
            {isAdvancedOpen && (
                <div id="advanced-options-panel" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="prepend-prompt" className="block text-sm font-medium text-slate-700 mb-1">
                                Prepend Prompt
                            </label>
                            <textarea
                                id="prepend-prompt"
                                value={prependPrompt}
                                onChange={(e) => setPrependPrompt(e.target.value)}
                                rows={3}
                                className="block w-full rounded-md border-0 bg-white py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm"
                                placeholder="Add to the beginning of all prompts..."
                            />
                        </div>
                        <div>
                            <label htmlFor="append-prompt" className="block text-sm font-medium text-slate-700 mb-1">
                                Append Prompt
                            </label>
                            <textarea
                                id="append-prompt"
                                value={appendPrompt}
                                onChange={(e) => setAppendPrompt(e.target.value)}
                                rows={3}
                                className="block w-full rounded-md border-0 bg-white py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm"
                                placeholder="Add to the end of all prompts..."
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="prompt-generator" className="block text-sm font-medium text-slate-700 mb-1">
                                Generate Bulk Prompts (AI)
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <input
                                        id="prompt-generator"
                                        type="text"
                                        value={promptGenerationInstructions}
                                        onChange={(e) => setPromptGenerationInstructions(e.target.value)}
                                        className="block w-full rounded-md border-0 bg-white py-2 pl-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm"
                                        placeholder="e.g., 10 prompts for different hair colors"
                                    />
                                    <button
                                        onClick={handleTranslateInstructions}
                                        disabled={isTranslatingInstructions || isGeneratingPrompts || !promptGenerationInstructions.trim()}
                                        className={`absolute top-1/2 right-2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-violet-600 disabled:text-slate-300 ${isTranslatingInstructions ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed'} transition-colors rounded-md`}
                                        title="Translate to English"
                                        aria-label="Translate instructions to English"
                                    >
                                        {isTranslatingInstructions ? (
                                            <PiSpinner className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <PiTranslate className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <button
                                    onClick={handleGeneratePromptList}
                                    disabled={isGeneratingPrompts || !promptGenerationInstructions.trim()}
                                    className="flex-shrink-0 flex items-center justify-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Generate prompts with AI"
                                >
                                    {isGeneratingPrompts ? <PiSpinner className="w-5 h-5 animate-spin" /> : <PiSparkle className="w-5 h-5" />}
                                    <span className="hidden sm:inline">Generate</span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="json-prompts" className="block text-sm font-medium text-slate-700 mb-1">
                                Bulk Prompts (JSON Array)
                            </label>
                            <textarea
                                id="json-prompts"
                                value={jsonPrompts}
                                onChange={handleJsonPromptChange}
                                rows={5}
                                className={`block w-full rounded-md border-0 bg-white py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset sm:text-sm transition-all ${jsonError ? 'ring-red-500 focus:ring-red-600' : 'ring-slate-300 focus:ring-violet-600'}`}
                                placeholder='["a cute cat", "a happy dog"]'
                            />
                            <p className="mt-1 text-xs text-slate-500">Overrides the prompts and version count above.</p>
                            {jsonError && <p className="mt-1 text-xs text-red-600">{jsonError}</p>}
                        </div>
                        <div>
                            <label htmlFor="filename-template" className="block text-sm font-medium text-slate-700 mb-1">
                                Filename Template
                            </label>
                            <input
                                id="filename-template"
                                type="text"
                                value={filenameTemplate}
                                onChange={(e) => setFilenameTemplate(e.target.value)}
                                className="block w-full rounded-md border-0 bg-white py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-violet-600 sm:text-sm"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Placeholders: <code className="bg-slate-200 px-1 rounded">{'{original_filename}'}</code> <code className="bg-slate-200 px-1 rounded">{'{short_id}'}</code> <code className="bg-slate-200 px-1 rounded">{'{set_id}'}</code> <code className="bg-slate-200 px-1 rounded">{'{version_index}'}</code> <code className="bg-slate-200 px-1 rounded">{'{timestamp}'}</code>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};