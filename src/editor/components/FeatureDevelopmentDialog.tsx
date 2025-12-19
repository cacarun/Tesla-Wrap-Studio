interface FeatureDevelopmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeatureDevelopmentDialog = ({ isOpen, onClose }: FeatureDevelopmentDialogProps) => {
  if (!isOpen) return null;

  const galleryBaseUrl = import.meta.env.VITE_GALLERY_URL || 
    window.location.origin.replace('studio', 'gallery') || 
    'https://gallery.tesla-wrap.com';

  const handleVisitGallery = () => {
    window.open(galleryBaseUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-tesla-red/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-tesla-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          {/* Content */}
          <h3 className="text-xl font-semibold text-white text-center mb-3">
            Feature in Development
          </h3>
          <p className="text-white/70 text-center text-sm mb-4 leading-relaxed">
            This feature is currently in development and will be ready soon!
          </p>
          <p className="text-white/60 text-center text-xs leading-relaxed mb-3">
            You can already visit the gallery and create your 100% free profile to save and publish templates.
          </p>
          <p className="text-white/70 text-center text-xs leading-relaxed">
            To export the Template to upload to your car, press the <strong className="text-tesla-red">Export PNG</strong> button.
          </p>
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t border-white/10 flex items-center justify-center gap-3 bg-[#161618]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm font-medium"
          >
            Close
          </button>
          <button
            onClick={handleVisitGallery}
            className="px-5 py-2 bg-tesla-red hover:bg-tesla-red/90 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Visit Gallery
          </button>
        </div>
      </div>
    </div>
  );
};
