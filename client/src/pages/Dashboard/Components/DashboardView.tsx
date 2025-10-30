import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, BarChart3, Trash2, Download, Loader2 } from 'lucide-react';
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
      const groups = Array.from(document.querySelectorAll('.chart-group')) as HTMLElement[];
      if (groups.length === 0) {
        toast({ title: 'Nothing to export', description: 'This dashboard has no content yet.' });
        return;
      }
      // Prepare PPT
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';

      for (let i = 0; i < groups.length; i++) {
        const slide = pptx.addSlide();
        const chartNode = groups[i].querySelector('[data-chart-index]') as HTMLElement | null;
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
      <div className="h-[calc(100vh-10vh)] overflow-y-auto bg-white">
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
    <div className="h-[calc(100vh-10vh)] overflow-y-auto bg-white">
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

      <div className="flex flex-col gap-6">
        {dashboard.charts.map((chart, index) => (
          <div key={`${chart.title}-${index}`} className="rounded-lg border border-border bg-white/70 p-4 relative chart-group">
            <div className="relative mb-4">
              <div className="absolute right-0 -top-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDeleteChart(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <ResizableTile id={`${dashboard.id}:chart:${index}`} minWidth={360} minHeight={240} className="flex-none" boundsSelector={'.chart-group'}>
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

              {chart.keyInsight && (
                <ResizableTile id={`${dashboard.id}:insight:${index}`} minWidth={320} minHeight={160} className="flex-none" boundsSelector={'.chart-group'}>
                  <InsightRecommendationTile variant="insight" text={chart.keyInsight} />
                </ResizableTile>
              )}

              {chart.recommendation && (
                <ResizableTile id={`${dashboard.id}:rec:${index}`} minWidth={320} minHeight={160} className="flex-none" boundsSelector={'.chart-group'}>
                  <InsightRecommendationTile variant="recommendation" text={chart.recommendation} />
                </ResizableTile>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
