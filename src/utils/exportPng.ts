import type { Stage } from 'konva/lib/Stage';
import type { Node } from 'konva/lib/Node';
import type { Group } from 'konva/lib/Group';

export const exportPng = (stage: Stage | null, filename: string): void => {
  if (!stage) {
    console.error('Stage is not available');
    return;
  }

  // Find and temporarily hide UI elements that shouldn't be exported
  const transformer = stage.findOne('Transformer');
  
  // Store original visibility states
  const elementsToHide: { node: Node; wasVisible: boolean }[] = [];
  
  // Hide transformer if it exists
  if (transformer) {
    elementsToHide.push({ node: transformer, wasVisible: transformer.visible() });
    transformer.visible(false);
  }
  
  // Hide brush cursor groups (they have listening=false and Circle children)
  const allGroups = stage.find('Group');
  allGroups.forEach(node => {
    const group = node as Group;
    // BrushCursor uses a Group with listening=false
    if (group.listening() === false) {
      const children = group.getChildren();
      const hasCircles = children.some((child) => child.getClassName() === 'Circle');
      if (hasCircles && children.length >= 2) {
        elementsToHide.push({ node: group, wasVisible: group.visible() });
        group.visible(false);
      }
    }
  });
  
  // Force redraw to apply visibility changes
  stage.batchDraw();

  // CRITICAL: Export must be exactly 1024x1024 pixels - pixel perfect
  // The Stage is always 1024x1024, and pixelRatio: 1 ensures we export at native size
  // This is pixel-perfect and must match the template exactly
  const dataURL = stage.toDataURL({
    pixelRatio: 1, // Critical: ensures 1:1 pixel mapping, no scaling
    mimeType: 'image/png',
  });

  // Restore visibility of hidden elements
  elementsToHide.forEach(({ node, wasVisible }) => {
    node.visible(wasVisible);
  });
  
  // Force redraw to restore UI
  stage.batchDraw();

  // Create download link
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

