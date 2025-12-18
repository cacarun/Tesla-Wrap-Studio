import { useEditorStore } from '../state/useEditorStore';
import type { ToolType } from '../state/editorTypes';
import { loadImage } from '../../utils/image';

export const ToolsPanel = () => {
  const { activeTool, setActiveTool, addLayer, setSelection } = useEditorStore();

  const nextLayerName = () => {
    const { layers } = useEditorStore.getState();
    let index = 1;
    while (layers.some((l) => l.name === `Layer ${index}`)) {
      index += 1;
    }
    return `Layer ${index}`;
  };

  const tools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    {
      id: 'select',
      label: 'Move Tool',
      shortcut: 'V',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
    },
    {
      id: 'brush',
      label: 'Brush Tool',
      shortcut: 'B',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    {
      id: 'eraser',
      label: 'Eraser Tool',
      shortcut: 'E',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
    {
      id: 'text',
      label: 'Text Tool',
      shortcut: 'T',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
    },
    {
      id: 'rectangle',
      label: 'Rectangle Tool',
      shortcut: 'U',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16v12H4V6z" />
        </svg>
      ),
    },
    {
      id: 'circle',
      label: 'Ellipse Tool',
      shortcut: 'O',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'line',
      label: 'Line Tool',
      shortcut: 'L',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20L20 4" />
        </svg>
      ),
    },
    {
      id: 'star',
      label: 'Star Tool',
      shortcut: 'S',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l2.09 6.26L20 9l-5 3.64L16.18 19 12 15.97 7.82 19 9 12.64 4 9l5.91.26L12 3z" />
        </svg>
      ),
    },
    {
      id: 'image',
      label: 'Image Tool',
      shortcut: 'I',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'texture',
      label: 'Texture Tool',
      shortcut: 'X',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
  ];

  const handleToolSelect = (tool: ToolType) => {
    setActiveTool(tool);
    
    // When switching to brush tool, auto-create or select a brush layer
    if (tool === 'brush' || tool === 'eraser') {
      const { layers } = useEditorStore.getState();
      const existingBrushLayer = layers.find(l => l.type === 'brush');
      
      if (existingBrushLayer) {
        setSelection(existingBrushLayer.id);
      } else {
        addLayer({
          type: 'brush',
          name: nextLayerName(),
          strokes: [],
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        });
      }
      return;
    }
    
    // When selecting shape tools, create a new layer immediately
    if (tool === 'text') {
      addLayer({
        type: 'text',
        name: nextLayerName(),
        text: 'Sample Text',
        fontSize: 48,
        fontFamily: 'Arial',
        fill: '#ffffff',
        align: 'left',
        verticalAlign: 'top',
        fontStyle: 'normal',
        textDecoration: 'none',
        visible: true,
        locked: false,
        opacity: 1,
        x: 100,
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });
      setActiveTool('select');
    }
    
    if (tool === 'rectangle') {
      addLayer({
        type: 'rect',
        name: nextLayerName(),
        width: 200,
        height: 100,
        fill: '#B73038',
        visible: true,
        locked: false,
        opacity: 1,
        x: 100,
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });
      setActiveTool('select');
    }
    
    if (tool === 'circle') {
      addLayer({
        type: 'circle',
        name: nextLayerName(),
        radius: 50,
        fill: '#D7DCDD',
        visible: true,
        locked: false,
        opacity: 1,
        x: 150,
        y: 150,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });
      setActiveTool('select');
    }
    
    if (tool === 'line') {
      addLayer({
        type: 'line',
        name: nextLayerName(),
        points: [100, 100, 300, 200],
        stroke: '#ffffff',
        strokeWidth: 4,
        lineCap: 'round',
        lineJoin: 'round',
        visible: true,
        locked: false,
        opacity: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });
      setActiveTool('select');
    }
    
    if (tool === 'star') {
      addLayer({
        type: 'star',
        name: nextLayerName(),
        numPoints: 5,
        innerRadius: 30,
        outerRadius: 60,
        fill: '#ffffff',
        stroke: '#ffffff',
        strokeWidth: 1,
        visible: true,
        locked: false,
        opacity: 1,
        x: 200,
        y: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });
      setActiveTool('select');
    }
    
    if (tool === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setActiveTool('select');
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          const src = event.target?.result as string;
          try {
            const img = await loadImage(src);
            addLayer({
              type: 'image',
              name: file.name || nextLayerName(),
              src,
              image: img,
              visible: true,
              locked: false,
              opacity: 1,
              x: 100,
              y: 100,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            });
            setActiveTool('select');
          } catch (error) {
            console.error('Failed to load image:', error);
            setActiveTool('select');
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
    
    if (tool === 'texture') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setActiveTool('select');
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          const src = event.target?.result as string;
          try {
            const img = await loadImage(src);
            addLayer({
              type: 'texture',
              name: file.name || nextLayerName(),
              src,
              image: img,
              visible: true,
              locked: false,
              opacity: 1,
              x: 0,
              y: 0,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            });
            setActiveTool('select');
          } catch (error) {
            console.error('Failed to load texture:', error);
            setActiveTool('select');
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  return (
    <div className="h-full panel rounded-l-xl flex flex-col w-16 overflow-x-hidden">
      {/* Tool Buttons */}
      <div className="flex-1 p-1.5 space-y-1 overflow-y-auto overflow-x-hidden">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolSelect(tool.id)}
            className={`w-full p-2 rounded-lg transition-all flex items-center justify-center relative group ${
              activeTool === tool.id
                ? 'bg-tesla-red text-white'
                : 'text-tesla-gray hover:text-tesla-light hover:bg-tesla-dark/30'
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-tesla-black/95 border border-tesla-dark/50 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {tool.label} <span className="text-tesla-gray">({tool.shortcut})</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
