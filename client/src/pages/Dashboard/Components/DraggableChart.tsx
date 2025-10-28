import React, { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface DraggableChartProps {
  children: React.ReactNode;
  index: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  className?: string;
}

export function DraggableChart({ children, index, onReorder, className = '' }: DraggableChartProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if clicking on the grip handle
    if (!e.currentTarget.closest('[data-drag-handle]')) return;
    
    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragOffset(0);
    
    // Add global event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const currentY = e.clientY;
    const offset = currentY - dragStartY;
    setDragOffset(offset);
    
    // Find which chart we're hovering over
    const elements = document.querySelectorAll('[data-chart-index]');
    let hoverIndex = -1;
    
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elIndex = parseInt(el.getAttribute('data-chart-index') || '-1');
      
      if (elIndex !== index && currentY >= rect.top && currentY <= rect.bottom) {
        hoverIndex = elIndex;
      }
    });
    
    setDragOverIndex(hoverIndex >= 0 ? hoverIndex : null);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setDragOffset(0);
    setDragStartY(0);
    
    // Trigger reorder if we're hovering over a different chart
    if (dragOverIndex !== null && dragOverIndex !== index) {
      onReorder(index, dragOverIndex);
    }
    
    setDragOverIndex(null);
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className} ${isDragging ? 'z-50' : ''}`}
      data-chart-index={index}
      style={{
        transform: isDragging ? `translateY(${dragOffset}px)` : 'none',
        opacity: isDragging ? 0.8 : 1,
        transition: isDragging ? 'none' : 'transform 0.2s ease',
      }}
    >
      {/* Drag Handle */}
      <div
        ref={dragRef}
        data-drag-handle
        className="absolute top-2 left-2 z-10 w-6 h-6 bg-white/80 hover:bg-white rounded-md shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="w-3 h-3 text-gray-500" />
      </div>

      {/* Drop Indicator */}
      {dragOverIndex !== null && (
        <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-500 rounded-full z-40 animate-pulse" />
      )}

      {/* Chart Content */}
      <div className={`${isDragging ? 'pointer-events-none' : ''}`}>
        {children}
      </div>
    </div>
  );
}
