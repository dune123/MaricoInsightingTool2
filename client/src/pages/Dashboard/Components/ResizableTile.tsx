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
  }, [persist, storageKey]);

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
    // keep resize behavior simple; dragging handles manage position
  };

  const handleResizeStop: ResizeCallback = (_e, dir, _ref, d) => {
    setSize(prev => {
      const next = {
        width: typeof prev.width === 'string' ? prev.width : Math.max(Number(prev.width) + d.width, Number(minWidth)),
        height: typeof prev.height === 'string' ? prev.height : Math.max(Number(prev.height) + d.height, Number(minHeight)),
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

  return (
    <Draggable
      handle=".drag-handle"
      cancel='[class*="resizable-handle"]'
      bounds={boundsSelector}
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
          <div className="h-full w-full overflow-auto relative pt-8">
            <div
              className="drag-handle absolute left-0 top-0 w-full h-8 flex items-center gap-2 pl-2 text-muted-foreground cursor-grab active:cursor-grabbing bg-gradient-to-b from-muted/70 to-transparent"
              aria-label="Drag tile"
            >
              <GripVertical className="h-4 w-4" />
              <span className="text-xs">Drag</span>
            </div>
            {children}
          </div>
        </Resizable>
      </div>
    </Draggable>
  );
}


