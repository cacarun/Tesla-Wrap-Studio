import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Car } from 'lucide-react';
import { useEditorStore } from '../state/useEditorStore';
import { carModels } from '../../data/carModels';
import { getVehicleImageUrl } from '../../utils/assets';

// Tesla factory colors
const factoryColors = [
  { name: 'Pearl White Multi-Coat', color: '#F5F5F0' },
  { name: 'Midnight Silver Metallic', color: '#636B6F' },
  { name: 'Deep Blue Metallic', color: '#0A1F44' },
  { name: 'Solid Black', color: '#000000' },
  { name: 'Red Multi-Coat', color: '#A21B1F' },
  { name: 'Quicksilver', color: '#A6A6A6' },
  { name: 'Midnight Cherry Red', color: '#3B0A0A' },
];

interface ModelSelectorProps {
  className?: string;
}

export const ModelSelector = ({ className = '' }: ModelSelectorProps) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);

  const { currentModelId, baseColor, setCurrentModelId, setBaseColor } = useEditorStore();
  const currentModel = carModels.find((m) => m.id === currentModelId) || carModels[0];
  const currentColor = factoryColors.find((c) => c.color === baseColor) || { name: 'Custom', color: baseColor };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setIsColorDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelSelect = (modelId: string) => {
    setCurrentModelId(modelId);
    setIsModelDropdownOpen(false);
  };

  const handleColorSelect = (color: string) => {
    setBaseColor(color);
    setIsColorDropdownOpen(false);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Model Selector */}
      <div className="relative" ref={modelDropdownRef}>
        <button
          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-tesla-black/70 hover:bg-tesla-black text-white text-sm transition-colors"
        >
          <Car className="w-4 h-4 text-tesla-gray" />
          <span className="max-w-[120px] truncate">{currentModel.name}</span>
          <ChevronDown className={`w-4 h-4 text-tesla-gray transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isModelDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-white/10">
              <p className="text-xs text-white/50 px-2">Select Tesla Model</p>
            </div>
            <div className="p-2 grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
              {carModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={`group relative rounded-lg overflow-hidden transition-all duration-150 focus:outline-none ${
                    currentModelId === model.id
                      ? 'ring-2 ring-tesla-red'
                      : 'ring-1 ring-white/10 hover:ring-white/30'
                  }`}
                >
                  <div className="aspect-[4/3] bg-[#2c2c2e] flex items-center justify-center relative overflow-hidden rounded-t-lg">
                    <img
                      src={getVehicleImageUrl(model.folderName)}
                      alt={model.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {currentModelId === model.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-tesla-red rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="px-1.5 py-1.5 bg-[#252527] rounded-b-lg">
                    <span className="text-[9px] font-medium text-white/70 truncate block text-center leading-tight">
                      {model.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Color Selector */}
      <div className="relative" ref={colorDropdownRef}>
        <button
          onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-tesla-black/70 hover:bg-tesla-black text-white text-sm transition-colors"
        >
          <div
            className="w-4 h-4 rounded-full border border-white/20"
            style={{ backgroundColor: baseColor }}
          />
          <span className="max-w-[100px] truncate hidden sm:inline">{currentColor.name}</span>
          <ChevronDown className={`w-4 h-4 text-tesla-gray transition-transform ${isColorDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isColorDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-white/10">
              <p className="text-xs text-white/50 px-2">Base Color</p>
            </div>
            <div className="p-2 space-y-1">
              {factoryColors.map((c) => (
                <button
                  key={c.color}
                  onClick={() => handleColorSelect(c.color)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    baseColor === c.color
                      ? 'bg-tesla-red/20 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-xs">{c.name}</span>
                  {baseColor === c.color && (
                    <svg className="w-4 h-4 ml-auto text-tesla-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
