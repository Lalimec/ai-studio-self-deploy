/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { stitchVideos } from '../services/videoStitcher';
import { PiSpinnerIcon } from './Icons';

const StitchTester: React.FC = () => {
    const [urlsInput, setUrlsInput] = useState('');
    const [stitchedVideoUrl, setStitchedVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState({ percent: 0, message: '' });

    // Clean up object URL when component unmounts or video changes
    useEffect(() => {
        return () => {
            if (stitchedVideoUrl) {
                URL.revokeObjectURL(stitchedVideoUrl);
            }
        };
    }, [stitchedVideoUrl]);

    const handleStitch = async () => {
        const urlArray = urlsInput.split('\n').map(u => u.trim()).filter(Boolean);
        if (urlArray.length < 2) {
            setError('Please provide at least two video URLs, each on a new line.');
            return;
        }

        setIsLoading(true);
        setError(null);
        if (stitchedVideoUrl) {
            URL.revokeObjectURL(stitchedVideoUrl);
        }
        setStitchedVideoUrl(null);
        setProgress({ percent: 0, message: '' });

        try {
            const blob = await stitchVideos(urlArray, (percent, message) => {
                setProgress({ percent, message });
            });
            const objectUrl = URL.createObjectURL(blob);
            setStitchedVideoUrl(objectUrl);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred during stitching.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
            <div className="w-full bg-[var(--color-bg-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border-muted)] flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-[var(--color-text-main)] text-center">Video Stitching Tester</h2>
                <div>
                    <label htmlFor="video-urls" className="block text-sm font-medium text-[var(--color-text-light)] mb-2">
                        Video URLs (one per line)
                    </label>
                    <textarea
                        id="video-urls"
                        value={urlsInput}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUrlsInput(e.target.value)}
                        rows={5}
                        className="prompt-textarea w-full bg-[var(--color-bg-base)] border-2 border-[var(--color-border-muted)] rounded-lg p-2 text-sm text-[var(--color-text-light)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors resize-y"
                        placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mp4"
                        disabled={isLoading}
                    />
                </div>
                <button
                    onClick={handleStitch}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-muted)] disabled:cursor-wait text-[var(--color-text-on-primary)] font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                >
                    {isLoading && <PiSpinnerIcon className="animate-spin w-6 h-6" />}
                    <span>{isLoading ? 'Stitching...' : 'Test Stitch'}</span>
                </button>
            </div>

            {isLoading && (
                <div className="w-full text-center p-4 bg-[var(--color-bg-surface)] rounded-lg">
                    <p className="text-[var(--color-primary-accent)] font-semibold mb-2">{progress.message}</p>
                    <div className="w-full bg-[var(--color-bg-muted)] rounded-full h-2.5">
                        <div
                            className="bg-gradient-to-r from-[var(--color-primary-accent)] to-[var(--color-secondary)] h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress.percent}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {error && (
                <div className="w-full p-4 bg-red-900/50 border border-[var(--color-destructive)] rounded-lg text-red-300 text-center">
                    <p className="font-bold">An Error Occurred</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {stitchedVideoUrl && (
                <div className="w-full bg-[var(--color-bg-surface)] p-4 rounded-2xl shadow-lg border border-[var(--color-border-muted)]">
                    <h3 className="text-xl font-bold text-[var(--color-text-main)] mb-4 text-center">Stitched Video Result</h3>
                    <video
                        key={stitchedVideoUrl}
                        src={stitchedVideoUrl}
                        controls
                        autoPlay
                        className="w-full rounded-lg"
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}
        </div>
    );
};

export default StitchTester;