import { useState, useRef, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useEditorStore } from '../state/useEditorStore';

// Prompt suggestions
const PROMPT_SUGGESTIONS = [
  'Ironman',
  'Flash',
  'Lightning McQueen',
  'Spongebob',
  'Racecar',
  'Star Wars',
  'Space X',
  'Batman',
  'Superman',
  'Spider-Man',
  'Cyberpunk',
  'Synthwave',
];

// Mock design images - these will be used to simulate AI generation
const MOCK_DESIGNS = [
  '/mock-design-1.png',
  '/mock-design-2.png',
  '/mock-design-3.png',
];

interface AIPanelProps {
  className?: string;
}

export const AIPanel = ({ className = '' }: AIPanelProps) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  const { addTextureFromSrc, templateImage, clearTextureLayer } = useEditorStore();

  // Convert template image to base64 for preview
  const templateBase64 = useMemo(() => {
    if (!templateImage) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(templateImage, 0, 0, 1024, 1024);
    return canvas.toDataURL('image/png');
  }, [templateImage]);

  // Mock AI generation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please describe your design');
      return;
    }

    if (!templateImage) {
      setError('Template not loaded. Please wait.');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate AI generation progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      // Simulate network delay (2-4 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 2000));
      clearInterval(progressInterval);

      // Pick a random mock design
      const mockDesign = MOCK_DESIGNS[Math.floor(Math.random() * MOCK_DESIGNS.length)];

      // In a real implementation, we would call an AI API here
      // For now, we'll use the mock design
      // Try to load the mock design, fall back to generating a colored placeholder
      try {
        const response = await fetch(mockDesign);
        if (response.ok) {
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          await addTextureFromSrc(dataUrl, `AI: ${prompt.substring(0, 20)}...`);
        } else {
          throw new Error('Mock design not found');
        }
      } catch {
        // Generate a colorful placeholder based on the prompt
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (ctx && templateImage) {
          // Create a gradient based on prompt hash
          const hash = prompt.split('').reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0);
          const hue1 = Math.abs(hash % 360);
          const hue2 = (hue1 + 60) % 360;

          const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
          gradient.addColorStop(0, `hsl(${hue1}, 70%, 50%)`);
          gradient.addColorStop(0.5, `hsl(${hue2}, 80%, 40%)`);
          gradient.addColorStop(1, `hsl(${hue1}, 60%, 30%)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1024, 1024);

          // Add some visual interest
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          for (let i = 0; i < 20; i++) {
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const size = 50 + Math.random() * 150;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }

          // Mask with template
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(templateImage, 0, 0, 1024, 1024);

          const dataUrl = canvas.toDataURL('image/png');
          await addTextureFromSrc(dataUrl, `AI: ${prompt.substring(0, 20)}...`);
        }
      }

      setProgress(100);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Clear the current design
  const handleClear = () => {
    clearTextureLayer();
  };

  return (
    <div className={`panel rounded-xl flex flex-col w-72 overflow-hidden shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-tesla-dark/50 bg-tesla-black/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-white">AI Design Generator</span>
        </div>
        <p className="text-xs text-white/50 mt-1">Describe your wrap design idea</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Template Preview */}
        {templateBase64 && (
          <div className="aspect-square rounded-lg overflow-hidden bg-tesla-black/50 border border-tesla-dark/30">
            <img src={templateBase64} alt="Template" className="w-full h-full object-contain opacity-60" />
          </div>
        )}

        {/* Prompt Input */}
        <div>
          <textarea
            ref={promptInputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., Ironman themed wrap with red and gold..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50 resize-none"
            maxLength={200}
            disabled={loading}
          />
        </div>

        {/* Quick Suggestions */}
        <div className="relative" ref={suggestionsRef}>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
            disabled={loading}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <span>Ideas</span>
            <svg
              className={`w-3 h-3 transition-transform ${showSuggestions ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSuggestions && (
            <div className="absolute top-full left-0 mt-1 w-48 max-h-40 overflow-y-auto bg-[#252528] border border-white/10 rounded-lg shadow-xl z-50 py-1">
              {PROMPT_SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setPrompt(suggestion);
                    setShowSuggestions(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        {loading && (
          <div className="space-y-2">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-white/50 text-center">Generating your design...</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-tesla-dark/50 space-y-2">
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${
            loading || !prompt.trim()
              ? 'bg-white/[0.06] text-white/30 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-400 hover:to-blue-400 shadow-lg shadow-purple-500/20'
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Design</span>
            </>
          )}
        </button>

        <button
          onClick={handleClear}
          disabled={loading}
          className="w-full py-2 text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          Clear Current Design
        </button>
      </div>
    </div>
  );
};
