import React from 'react';
import { useAdCloner } from '../../hooks/useAdCloner';
import AdClonerUploader from './AdClonerUploader';
import AdClonerResults from './AdClonerResults';
import SettingsModal from './SettingsModal';
import { ActiveCropper } from '../../App';

type AdClonerStudioProps = {
    logic: ReturnType<typeof useAdCloner>;
    onUpload: (file: File, cropper: NonNullable<ActiveCropper>) => void;
    onShowHelp: () => void;
};

const AdClonerStudio: React.FC<AdClonerStudioProps> = ({ logic, onUpload, onShowHelp }) => {

    return (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12">
            <AdClonerUploader logic={logic} onUpload={onUpload} />
            <AdClonerResults logic={logic} onUpload={onUpload} onShowHelp={onShowHelp} />
            
            {logic.settingsModalOpen && (
                <SettingsModal
                    settings={logic.settings}
                    onClose={() => logic.setSettingsModalOpen(false)}
                    onSave={logic.setSettings}
                />
            )}
        </div>
    );
};

export default AdClonerStudio;