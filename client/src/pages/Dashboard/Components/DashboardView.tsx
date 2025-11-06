import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, BarChart3, Trash2, Download, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DashboardData } from '../modules/useDashboardState';
import { ChartRenderer } from '@/pages/Home/Components/ChartRenderer';
import { ResizableTile } from './ResizableTile';
import { InsightRecommendationTile } from './InsightRecommendationTile';
import { useToast } from '@/hooks/use-toast';
import * as htmlToImage from 'html-to-image';
import PptxGenJS from 'pptxgenjs';

interface DashboardViewProps {
  dashboard: DashboardData;
  onBack: () => void;
  onDeleteChart: (chartIndex: number) => void;
}

export function DashboardView({ dashboard, onBack, onDeleteChart }: DashboardViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const containers = Array.from(document.querySelectorAll('.chart-group')) as HTMLElement[];
      if (containers.length === 0) {
        toast({ title: 'Nothing to export', description: 'This dashboard has no content yet.' });
        return;
      }
      // Prepare PPT
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';

      for (let i = 0; i < containers.length; i++) {
        const slide = pptx.addSlide();
        const chartNode = containers[i].querySelector('[data-chart-index]') as HTMLElement | null;
        // Capture chart as image
        let imgData: string | undefined;
        if (chartNode) {
          imgData = await htmlToImage.toPng(chartNode, {
            cacheBust: true,
            backgroundColor: '#FFFFFF',
            style: { boxShadow: 'none' },
            filter: (el) => !String(((el as HTMLElement).className || '')).includes('drag-handle')
          });
        }

        // Layout: image left, text right
        const leftPad = 0.5; // inches
        const topPad = 0.5;
        const imgW = 7.0; // inches
        const imgH = 4.2;
        if (imgData) {
          slide.addImage({ data: imgData, x: leftPad, y: topPad, w: imgW, h: imgH });
        }

        const rightX = leftPad + imgW + 0.4;
        const colW = 3.2;
        const chartData = dashboard.charts[i];
        slide.addText(chartData.title || `Chart ${i + 1}`, { x: rightX, y: topPad, w: colW, fontSize: 16, bold: true, color: '1F2937' });
        if (chartData.keyInsight) {
          slide.addText('Key Insight', { x: rightX, y: topPad + 0.4, w: colW, fontSize: 12, bold: true, color: '0B63F6' });
          slide.addText(chartData.keyInsight, { x: rightX, y: topPad + 0.7, w: colW, h: 2.0, fontSize: 11, color: '111827', wrap: true });
        }
        if (chartData.recommendation) {
          const recY = topPad + 2.9;
          slide.addText('Recommendation', { x: rightX, y: recY, w: colW, fontSize: 12, bold: true, color: '059669' });
          slide.addText(chartData.recommendation, { x: rightX, y: recY + 0.3, w: colW, h: 1.8, fontSize: 11, color: '111827', wrap: true });
        }
      }

      await pptx.writeFile({ fileName: `${dashboard.name || 'dashboard'}.pptx` });
      toast({ title: 'Export complete', description: 'Your PowerPoint has been downloaded.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Export failed', description: 'Please try again or contact support.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };
  if (dashboard.charts.length === 0) {
    return (
      <div className="h-[calc(100vh-10vh)] bg-white max-w-90vw">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{dashboard.name}</h1>
            <p className="text-muted-foreground">No charts in this dashboard yet</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-96 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Charts Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            This dashboard doesn't have any charts yet. Go back to your data analysis 
            and add charts to this dashboard using the plus button on any chart.
          </p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboards
          </Button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10vh)] bg-white overflow-x-hidden">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{dashboard.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Created {dashboard.createdAt.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span>{dashboard.charts.length} chart{dashboard.charts.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <Button onClick={handleExport} className="ml-auto mt-2" disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PPT
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 overflow-x-hidden">
        {dashboard.charts.map((chart, index) => {
          const ChartGroup = ({ chart, index }: { chart: typeof dashboard.charts[0], index: number }) => {
            const containerRef = useRef<HTMLDivElement>(null);
            const [isCollapsed, setIsCollapsed] = useState(false);
            const [chartPosition, setChartPosition] = useState<{ x: number; y: number } | null>(null);
            const [chartSize, setChartSize] = useState<{ width: number; height: number } | null>(null);
            const [insightPosition, setInsightPosition] = useState<{ x: number; y: number } | null>(null);
            const [recommendationPosition, setRecommendationPosition] = useState<{ x: number; y: number } | null>(null);
            const [autoLayoutEnabled, setAutoLayoutEnabled] = useState(true);
            
            // Load saved positions from localStorage on mount
            useEffect(() => {
              const chartId = `dashboard-tile-size:${dashboard.id}:chart:${index}`;
              const insightId = `dashboard-tile-size:${dashboard.id}:insight:${index}`;
              const recId = `dashboard-tile-size:${dashboard.id}:rec:${index}`;
              
              let hasManualPositioning = false;
              
              try {
                const chartSaved = localStorage.getItem(chartId);
                if (chartSaved) {
                  const parsed = JSON.parse(chartSaved);
                  if (parsed.posX !== undefined && parsed.posY !== undefined) {
                    setChartPosition({ x: parsed.posX, y: parsed.posY });
                  }
                  if (parsed.width && parsed.height) {
                    const width = typeof parsed.width === 'number' ? parsed.width : (typeof parsed.width === 'string' ? parseInt(parsed.width) : 600);
                    const height = typeof parsed.height === 'number' ? parsed.height : (typeof parsed.height === 'string' ? parseInt(parsed.height) : 330);
                    setChartSize({ width, height });
                  } else {
                    // Set default size if not saved
                    setChartSize({ width: 600, height: 330 });
                  }
                } else {
                  // Set default size if nothing saved
                  setChartSize({ width: 600, height: 330 });
                }
                
                if (chart.keyInsight) {
                  const insightSaved = localStorage.getItem(insightId);
                  if (insightSaved) {
                    const parsed = JSON.parse(insightSaved);
                    if (parsed.posX !== undefined && parsed.posY !== undefined) {
                      setInsightPosition({ x: parsed.posX, y: parsed.posY });
                      hasManualPositioning = true;
                    }
                  }
                }
                
                if (chart.recommendation) {
                  const recSaved = localStorage.getItem(recId);
                  if (recSaved) {
                    const parsed = JSON.parse(recSaved);
                    if (parsed.posX !== undefined && parsed.posY !== undefined) {
                      setRecommendationPosition({ x: parsed.posX, y: parsed.posY });
                      hasManualPositioning = true;
                    }
                  }
                }
                
                // Only disable auto-layout if user has manually positioned tiles
                // Otherwise, enable auto-layout to prevent overlaps
                if (hasManualPositioning) {
                  setAutoLayoutEnabled(false);
                } else {
                  setAutoLayoutEnabled(true);
                }
              } catch (e) {
                console.error('Error loading saved positions:', e);
                // Set default size on error
                if (!chartSize) {
                  setChartSize({ width: 600, height: 330 });
                }
                // Enable auto-layout on error to prevent overlaps
                setAutoLayoutEnabled(true);
              }
            }, [dashboard.id, index, chart.keyInsight, chart.recommendation]);
            
            useEffect(() => {
              const updateContainerSize = () => {
                if (!containerRef.current) return;
                
                const container = containerRef.current;
                
                // If collapsed, set a minimal height
                if (isCollapsed) {
                  container.style.minHeight = '60px';
                  container.style.height = 'auto';
                  return;
                }
                
                const tileContainers = container.querySelectorAll('[data-tile-container]') as NodeListOf<HTMLElement>;
                if (tileContainers.length === 0) return;
                
                // Find the inner container where tiles are positioned
                const innerContainer = container.querySelector('.relative.w-full') as HTMLElement;
                if (!innerContainer) return;
                
                let maxBottom = 0;
                let maxRight = 0;
                let minTop = Infinity;
                let minLeft = Infinity;
                
                tileContainers.forEach((containerEl) => {
                  // Get the draggable element (the actual tile)
                  const draggableElement = containerEl.firstElementChild as HTMLElement;
                  if (!draggableElement) return;
                  
                  // Get the position relative to the inner container
                  const tileRect = draggableElement.getBoundingClientRect();
                  const innerRect = innerContainer.getBoundingClientRect();
                  
                  const relativeTop = tileRect.top - innerRect.top;
                  const relativeLeft = tileRect.left - innerRect.left;
                  const relativeBottom = tileRect.bottom - innerRect.top;
                  const relativeRight = tileRect.right - innerRect.left;
                  
                  minTop = Math.min(minTop, relativeTop);
                  minLeft = Math.min(minLeft, relativeLeft);
                  maxBottom = Math.max(maxBottom, relativeBottom);
                  maxRight = Math.max(maxRight, relativeRight);
                });
                
                // Calculate required dimensions with padding
                const padding = 20; // Extra padding to ensure tiles aren't cut off
                const requiredHeight = Math.max(0, maxBottom - Math.min(0, minTop)) + padding;
                const requiredWidth = Math.max(0, maxRight - Math.min(0, minLeft)) + padding;
                
                // Get the layout width from the parent flex container
                const parentFlexContainer = container.closest('.flex.flex-col');
                let layoutWidth = 1200;
                if (parentFlexContainer) {
                  layoutWidth = (parentFlexContainer as HTMLElement).clientWidth;
                } else {
                  const sidebarWidth = document.querySelector('.w-64') ? 256 : (document.querySelector('.w-16') ? 64 : 0);
                  // Account for padding (p-6 = 48px on each side = 96px total)
                  layoutWidth = window.innerWidth - sidebarWidth - 96;
                }
                
                // Ensure we don't exceed the available width
                // Account for container padding (p-4 = 16px on each side = 32px total)
                const containerPadding = 32;
                const maxAllowedWidth = Math.max(0, layoutWidth - containerPadding);
                const calculatedWidth = Math.min(requiredWidth + 40, maxAllowedWidth);
                
                // Dynamically set container height based on tile positions
                // Ensure minimum height but allow it to grow as tiles move
                const minContainerHeight = Math.max(400, requiredHeight);
                const minContainerWidth = Math.min(Math.max(800, calculatedWidth), maxAllowedWidth);
                
                // Update container height to accommodate all tiles
                container.style.minHeight = `${minContainerHeight}px`;
                container.style.height = 'auto'; // Allow height to be flexible
                container.style.minWidth = `${minContainerWidth}px`;
                container.style.maxWidth = `${maxAllowedWidth}px`;
                container.style.width = '100%';
                container.style.overflowX = 'hidden'; // Prevent horizontal overflow
                
                // Also update inner container to ensure it can accommodate tiles
                innerContainer.style.minHeight = `${requiredHeight}px`;
                innerContainer.style.overflowX = 'hidden'; // Prevent horizontal overflow
                innerContainer.style.maxWidth = '100%'; // Ensure it doesn't exceed parent
                
                // Auto-layout: Adjust insight and recommendation tiles based on chart size
                // Get actual chart position and size from DOM
                const chartContainer = tileContainers[0];
                const insightContainer = tileContainers[1];
                const recommendationContainer = tileContainers[2];
                
                if (autoLayoutEnabled && chartContainer && innerContainer) {
                  const chartTile = chartContainer.firstElementChild as HTMLElement;
                  if (chartTile) {
                    // Re-get innerRect to ensure we have the latest position
                    const currentInnerRect = innerContainer.getBoundingClientRect();
                    const chartRect = chartTile.getBoundingClientRect();
                    const chartRelativeLeft = chartRect.left - currentInnerRect.left;
                    const chartRelativeTop = chartRect.top - currentInnerRect.top;
                    const chartWidth = chartRect.width;
                    const chartHeight = chartRect.height;
                    const chartEndX = chartRelativeLeft + chartWidth;
                    const chartEndY = chartRelativeTop + chartHeight;
                    
                    // Update chart position and size state
                    setChartPosition({ x: chartRelativeLeft, y: chartRelativeTop });
                    setChartSize({ width: chartWidth, height: chartHeight });
                    
                    // Calculate available space
                    const gap = 20;
                    const minTileWidth = 320;
                    const remainingWidth = maxAllowedWidth - chartEndX - gap;
                    
                    if (insightContainer && recommendationContainer) {
                      // Both insight and recommendation exist
                      const canFitSideBySide = remainingWidth >= (minTileWidth * 2 + gap);
                      
                      if (canFitSideBySide && remainingWidth > 0) {
                        // Layout: Side by side to the right of chart (same Y as chart)
                        const tileWidth = Math.min((remainingWidth - gap) / 2, 400);
                        
                        setInsightPosition({ x: chartEndX + gap, y: chartRelativeTop });
                        setRecommendationPosition({ x: chartEndX + gap + tileWidth + gap, y: chartRelativeTop });
                      } else if (remainingWidth >= minTileWidth) {
                        // Layout: Stacked to the right of chart
                        const tileWidth = Math.min(remainingWidth - gap, 400);
                        
                        setInsightPosition({ x: chartEndX + gap, y: chartRelativeTop });
                        setRecommendationPosition({ x: chartEndX + gap, y: chartEndY + gap });
                      } else {
                        // Layout: Stacked below chart (no overlap)
                        setInsightPosition({ x: chartRelativeLeft, y: chartEndY + gap });
                        const insightHeight = 150; // Default height
                        setRecommendationPosition({ x: chartRelativeLeft, y: chartEndY + gap + insightHeight + gap });
                      }
                    } else if (insightContainer) {
                      // Only insight exists
                      if (remainingWidth >= minTileWidth) {
                        // Place to the right if space available
                        setInsightPosition({ x: chartEndX + gap, y: chartRelativeTop });
                      } else {
                        // Place below chart
                        setInsightPosition({ x: chartRelativeLeft, y: chartEndY + gap });
                      }
                    } else if (recommendationContainer) {
                      // Only recommendation exists
                      if (remainingWidth >= minTileWidth) {
                        // Place to the right if space available
                        setRecommendationPosition({ x: chartEndX + gap, y: chartRelativeTop });
                      } else {
                        // Place below chart
                        setRecommendationPosition({ x: chartRelativeLeft, y: chartEndY + gap });
                      }
                    }
                  }
                }
              };
              
              // Initial calculation with delay to ensure all tiles are rendered
              const timeoutId = setTimeout(updateContainerSize, 300);
              
              // Watch for changes in container and tiles
              const observer = new ResizeObserver(() => {
                setTimeout(updateContainerSize, 50);
              });
              
              const mutationObserver = new MutationObserver(() => {
                setTimeout(updateContainerSize, 50);
              });
              
              if (containerRef.current) {
                observer.observe(containerRef.current);
                mutationObserver.observe(containerRef.current, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['style', 'class']
                });
              }
              
              // Update on drag interactions
              const handleInteraction = () => {
                setTimeout(updateContainerSize, 100);
              };
              
              // Listen for drag events to update container size in real-time
              const handleMouseMove = () => {
                updateContainerSize();
              };
              
              window.addEventListener('mouseup', handleInteraction);
              window.addEventListener('mousemove', handleMouseMove);
              window.addEventListener('resize', handleInteraction);
              
              return () => {
                clearTimeout(timeoutId);
                observer.disconnect();
                mutationObserver.disconnect();
                window.removeEventListener('mouseup', handleInteraction);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('resize', handleInteraction);
              };
            }, [isCollapsed, autoLayoutEnabled, chartSize]);
            
            return (
              <div
                ref={containerRef}
                className="rounded-lg border border-border bg-white/70 p-4 relative chart-group"
              >
              <Collapsible
                key={`${chart.title}-${index}`}
                open={!isCollapsed}
                onOpenChange={(open) => setIsCollapsed(!open)}
              >
                <CollapsibleTrigger asChild>
                  <div className="relative mb-2 cursor-pointer">
                    <div className="flex items-center justify-between hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors w-full">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1 flex-1 pr-2">
                        {chart.title || `Chart ${index + 1}`}
                      </h3>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCollapsed(!isCollapsed);
                          }}
                          title={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChart(index);
                          }}
                          title="Delete chart"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="relative w-full overflow-x-hidden">
                  <div data-tile-container>
                    <ResizableTile 
                      id={`${dashboard.id}:chart:${index}`} 
                      minWidth={360} 
                      minHeight={300} 
                      className="flex-none" 
                      boundsSelector={`.chart-group:nth-of-type(${index + 1})`}
                      defaultWidth={600}
                      defaultHeight={330}
                      persist={true}
                      onPositionChange={(pos) => {
                        setChartPosition(pos);
                        // When chart is manually moved, disable auto-layout temporarily
                        setAutoLayoutEnabled(false);
                        setTimeout(() => setAutoLayoutEnabled(true), 1000);
                      }}
                      onSizeChange={(size) => {
                        setChartSize(size);
                        // When chart is resized, trigger auto-layout update
                        if (autoLayoutEnabled) {
                          // Trigger container size update which will recalculate layout
                          setTimeout(() => {
                            if (containerRef.current) {
                              const event = new Event('resize');
                              window.dispatchEvent(event);
                            }
                          }, 100);
                        }
                      }}
                    >
                      <div className="relative group h-full" data-chart-index={index}>
                        <ChartRenderer
                          chart={chart}
                          index={index}
                          isSingleChart={false}
                          showAddButton={false}
                          useChartOnlyModal
                          fillParent
                        />
                      </div>
                    </ResizableTile>
                  </div>

                  {chart.keyInsight && (
                    <div data-tile-container>
                      <ResizableTile 
                        id={`${dashboard.id}:insight:${index}`} 
                        minWidth={320} 
                        minHeight={150} 
                        className="flex-none" 
                        boundsSelector={`.chart-group:nth-of-type(${index + 1})`}
                        defaultWidth={600}
                        defaultHeight={150}
                        persist={true}
                        autoPosition={autoLayoutEnabled && insightPosition ? insightPosition : null}
                        onPositionChange={(pos) => {
                          setInsightPosition(pos);
                          // When manually moved, disable auto-layout
                          setAutoLayoutEnabled(false);
                          setTimeout(() => setAutoLayoutEnabled(true), 1000);
                        }}
                      >
                        <InsightRecommendationTile variant="insight" text={chart.keyInsight} />
                      </ResizableTile>
                    </div>
                  )}

                  {chart.recommendation && (
                    <div data-tile-container>
                      <ResizableTile 
                        id={`${dashboard.id}:rec:${index}`} 
                        minWidth={320} 
                        minHeight={150} 
                        className="flex-none" 
                        boundsSelector={`.chart-group:nth-of-type(${index + 1})`}
                        defaultWidth={600}
                        defaultHeight={150}
                        persist={true}
                        autoPosition={autoLayoutEnabled && recommendationPosition ? recommendationPosition : null}
                        onPositionChange={(pos) => {
                          setRecommendationPosition(pos);
                          // When manually moved, disable auto-layout
                          setAutoLayoutEnabled(false);
                          setTimeout(() => setAutoLayoutEnabled(true), 1000);
                        }}
                      >
                        <InsightRecommendationTile variant="recommendation" text={chart.recommendation} />
                      </ResizableTile>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
              </div>
            );
          };
          return <ChartGroup key={`${chart.title}-${index}`} chart={chart} index={index} />;
        })}
      </div>
      </div>
    </div>
  );
}
