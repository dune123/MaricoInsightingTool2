import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Resizable, ResizeCallback } from 're-resizable';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { GripVertical } from 'lucide-react';

interface ResizableTileProps {
  id?: string;
  children: ReactNode;
  defaultWidth?: number | string;
  defaultHeight?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  className?: string;
  persist?: boolean;
  boundsSelector?: string; // CSS selector for draggable bounds
}

export function ResizableTile({
  id,
  children,
  defaultWidth,
  defaultHeight,
  minWidth = 260,
  minHeight = 220,
  className = '',
  persist = true,
  boundsSelector = 'parent',
}: ResizableTileProps) {
  const storageKey = useMemo(() => (id ? `dashboard-tile-size:${id}` : ''), [id]);
  const initialWidth: number | string = typeof defaultWidth === 'undefined' ? 'auto' : defaultWidth;
  const initialHeight: number | string = typeof defaultHeight === 'undefined' ? (typeof minHeight === 'number' ? minHeight : 220) : defaultHeight;
  const [size, setSize] = useState<{ width: number | string; height: number | string }>({
    width: initialWidth,
    height: initialHeight,
  });
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined);
  const [boundsElement, setBoundsElement] = useState<HTMLElement | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!persist || !storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.width && parsed.height) {
          let normalizedWidth: number | string = parsed.width;
          let normalizedHeight: number | string = parsed.height;
          if (typeof normalizedWidth === 'string') {
            const px = parseInt(normalizedWidth, 10);
            if (!isNaN(px)) {
              normalizedWidth = px;
            } else {
              normalizedWidth = typeof minWidth === 'number' ? minWidth : 260; // ignore percentages like '100%'
            }
          }
          if (typeof normalizedHeight === 'string') {
            const px = parseInt(normalizedHeight, 10);
            if (!isNaN(px)) {
              normalizedHeight = px;
            } else {
              normalizedHeight = typeof minHeight === 'number' ? minHeight : 220;
            }
          }
          setSize({ width: normalizedWidth, height: normalizedHeight });
          if (typeof parsed.posX === 'number' || typeof parsed.posY === 'number') {
            setPosition({ x: parsed.posX || 0, y: parsed.posY || 0 });
          }
        }
      } catch {}
    }
  }, [persist, storageKey, minWidth, minHeight]);

  // Initialize position to avoid overlapping if no saved position
  useEffect(() => {
    // Check if we have a saved position first
    if (persist && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // If position is saved, don't auto-position
          if (typeof parsed.posX === 'number' || typeof parsed.posY === 'number') {
            return;
          }
        } catch {}
      }
    }
    
    // Only auto-position if we're at default (0,0) and no saved position
    if (position.x !== 0 || position.y !== 0) return;
    
    const initializePosition = () => {
      if (!nodeRef.current) return;
      
      // Find all sibling tiles in the same container
      const chartGroup = nodeRef.current.closest('.chart-group');
      if (!chartGroup) return;
      
      const allTiles = Array.from(chartGroup.querySelectorAll('[data-tile-container] > div')) as HTMLElement[];
      
      // Find this tile's index by checking which container has this nodeRef
      let thisTileIndex = -1;
      const tileContainers = chartGroup.querySelectorAll('[data-tile-container]');
      tileContainers.forEach((container, idx) => {
        if (container.contains(nodeRef.current)) {
          thisTileIndex = idx;
        }
      });
      
      if (thisTileIndex < 0 || thisTileIndex === 0) return; // First tile stays at (0,0)
      
      // Calculate Y position based on previous tiles' heights + gaps
      let calculatedY = 0;
      for (let i = 0; i < thisTileIndex; i++) {
        if (i < allTiles.length) {
          const prevTile = allTiles[i];
          if (prevTile) {
            const prevHeight = prevTile.offsetHeight || (typeof minHeight === 'number' ? minHeight : 220);
            calculatedY += prevHeight + 16; // 16px gap between tiles
          }
        }
      }
      
      // Only set position if we calculated a non-zero Y
      if (calculatedY > 0) {
        setPosition({ x: 0, y: calculatedY });
        // Save initial position
        if (persist && storageKey) {
          const saved = localStorage.getItem(storageKey);
          let base: any = { width: size.width, height: size.height };
          try { base = saved ? JSON.parse(saved) : base; } catch {}
          localStorage.setItem(storageKey, JSON.stringify({ ...base, posX: 0, posY: calculatedY }));
        }
      }
    };
    
    // Wait for DOM to be ready and localStorage to load
    const timeoutId = setTimeout(initializePosition, 200);
    
    return () => clearTimeout(timeoutId);
  }, [persist, storageKey, position, minHeight, size]);

  // Calculate bounds and max width based on parent container (chart-group)
  useEffect(() => {
    const updateBoundsAndMaxWidth = () => {
      if (!nodeRef.current) return;
      
      // Find the chart-group parent container
      let chartGroup: HTMLElement | null = null;
      
      if (boundsSelector && boundsSelector !== 'parent') {
        // If boundsSelector is a CSS selector, try to find the element
        try {
          chartGroup = document.querySelector(boundsSelector) as HTMLElement;
        } catch (e) {
          console.warn('Invalid bounds selector:', boundsSelector);
        }
      }
      
      // Fallback to closest chart-group
      if (!chartGroup) {
        chartGroup = nodeRef.current.closest('.chart-group') as HTMLElement;
      }
      
      if (chartGroup && nodeRef.current) {
        const parentWidth = chartGroup.clientWidth;
        const parentHeight = chartGroup.clientHeight;
        
        // Calculate max width with margin
        const margin = 32; // 16px margin on each side
        const calculatedMaxWidth = parentWidth - margin;
        setMaxWidth(Math.max(calculatedMaxWidth, Number(minWidth))); // Ensure maxWidth is at least minWidth
        
        // Get the inner container where tiles are positioned (relative container)
        const innerContainer = chartGroup.querySelector('.relative.w-full') as HTMLElement;
        
        // Account for the container's padding (p-4 = 16px on chart-group)
        const padding = 16;
        
        // Get the actual size of the tile
        const tileWidth = typeof size.width === 'number' ? size.width : (nodeRef.current.offsetWidth || Number(minWidth));
        const tileHeight = typeof size.height === 'number' ? size.height : (nodeRef.current.offsetHeight || Number(minHeight));
        
        // For react-draggable, bounds object values are relative to the element's starting position
        // We want to allow movement within the entire container, so calculate max travel distance
        // Left: can go to -padding (allowing some overlap)
        // Right: can go right until tile's right edge reaches container's right edge
        // Top: can go up to -padding
        // Bottom: can go down until tile's bottom edge reaches container's bottom edge
        
        // Use the inner container (where tiles are positioned) as the bounds element
        // This allows react-draggable to calculate bounds relative to that container
        const boundsContainer = innerContainer || chartGroup;
        setBoundsElement(boundsContainer);
      }
    };
    
    // Initial calculation with delay to ensure DOM is ready
    const timeoutId = setTimeout(updateBoundsAndMaxWidth, 50);
    
    // Watch for parent container size changes
    const observer = new ResizeObserver(() => {
      updateBoundsAndMaxWidth();
    });
    
    // Set up observer after a short delay to ensure refs are available
    const observerTimeoutId = setTimeout(() => {
      const chartGroup = nodeRef.current?.closest('.chart-group');
      if (chartGroup) {
        observer.observe(chartGroup);
      }
    }, 100);
    
    // Also listen for window resize
    window.addEventListener('resize', updateBoundsAndMaxWidth);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(observerTimeoutId);
      observer.disconnect();
      window.removeEventListener('resize', updateBoundsAndMaxWidth);
    };
  }, [minWidth, minHeight, boundsSelector, size.width, size.height]);

  // If no default width supplied, initialize to parent width once mounted
  useEffect(() => {
    if (typeof defaultWidth === 'undefined' && nodeRef.current && (size.width === 'auto' || size.width === undefined)) {
      const parent = nodeRef.current.parentElement;
      if (parent) {
        const parentWidth = parent.clientWidth;
        if (parentWidth > 0) {
          setSize(prev => ({ ...prev, width: Math.max(parentWidth, Number(minWidth)) }));
        }
      }
    }
  }, [defaultWidth, minWidth]);

  const handleResize: ResizeCallback = () => {
    // Max width is enforced by the Resizable component's maxWidth prop
  };

  const handleResizeStop: ResizeCallback = (_e, dir, _ref, d) => {
    setSize(prev => {
      const newWidth = typeof prev.width === 'string' ? prev.width : Number(prev.width) + d.width;
      const newHeight = typeof prev.height === 'string' ? prev.height : Number(prev.height) + d.height;
      
      // Enforce min and max constraints
      const constrainedWidth = typeof newWidth === 'string' 
        ? newWidth 
        : Math.max(Number(minWidth), Math.min(newWidth, maxWidth || Infinity));
      const constrainedHeight = typeof newHeight === 'string'
        ? newHeight
        : Math.max(Number(minHeight), newHeight);
      
      const next = {
        width: constrainedWidth,
        height: constrainedHeight,
      };
      
      // persist size together with current position
      if (persist && storageKey) {
        const saved = localStorage.getItem(storageKey);
        let base: any = {};
        try { base = saved ? JSON.parse(saved) : {}; } catch {}
        localStorage.setItem(storageKey, JSON.stringify({ ...base, width: (next as any).width, height: (next as any).height, posX: position.x, posY: position.y }));
      }
      return next;
    });
  };

  const onDragStart = () => setIsDragging(true);
  const onDrag = (_e: DraggableEvent, data: DraggableData) => {
    setPosition({ x: data.x, y: data.y });
  };
  const onDragStop = (_e: DraggableEvent, data: DraggableData) => {
    setIsDragging(false);
    setPosition({ x: data.x, y: data.y });
    if (persist && storageKey) {
      const saved = localStorage.getItem(storageKey);
      let base: any = {};
      try { base = saved ? JSON.parse(saved) : {}; } catch {}
      localStorage.setItem(storageKey, JSON.stringify({ ...base, posX: data.x, posY: data.y }));
    }
  };

  // Get bounds - react-draggable accepts HTMLElement refs
  const getBounds = (): string | HTMLElement | {left: number, top: number, right: number, bottom: number} => {
    if (boundsElement) {
      return boundsElement;
    }
    return 'parent';
  };

  return (
    <Draggable
      handle=".drag-handle"
      cancel='[class*="resizable-handle"]'
      bounds={getBounds() as any}
      position={position}
      onStart={onDragStart}
      onDrag={onDrag}
      onStop={onDragStop}
      nodeRef={nodeRef}
    >
      <div ref={nodeRef} style={{ position: 'relative', zIndex: isDragging ? 50 : 'auto' }}>
        <Resizable
          size={size}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
          minWidth={minWidth}
          minHeight={minHeight}
          maxWidth={maxWidth}
          style={{ flex: 'none', boxSizing: 'border-box' }}
          enable={{
            top: true,
            right: true,
            bottom: true,
            left: true,
            topRight: true,
            bottomRight: true,
            bottomLeft: true,
            topLeft: true,
          }}
          handleStyles={{
            top: { cursor: 'ns-resize' },
            right: { cursor: 'ew-resize' },
            bottom: { cursor: 'ns-resize' },
            left: { cursor: 'ew-resize' },
            topRight: { cursor: 'ne-resize' },
            bottomRight: { cursor: 'se-resize' },
            bottomLeft: { cursor: 'sw-resize' },
            topLeft: { cursor: 'nw-resize' },
          }}
          className={`bg-white border border-border rounded-lg shadow-sm overflow-hidden ${className}`}
        >
          <div className="h-full w-full relative flex flex-col pt-8">
            <div
              className="drag-handle absolute left-0 top-0 w-full h-8 flex items-center gap-2 pl-2 text-muted-foreground cursor-grab active:cursor-grabbing bg-gradient-to-b from-muted/70 to-transparent z-10 flex-shrink-0"
              aria-label="Drag tile"
            >
              <GripVertical className="h-4 w-4" />
              <span className="text-xs">Drag</span>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
            {children}
            </div>
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
}


