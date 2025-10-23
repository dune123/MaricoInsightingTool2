import { Insight } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface InsightCardProps {
  insights: Insight[];
}

export function InsightCard({ insights }: InsightCardProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <Card className="bg-primary/5 border-l-4 border-l-primary shadow-sm" data-testid="insight-card">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Key Insights</h3>
        </div>
        <ul className="space-y-3">
          {insights.map((insight) => (
            <li key={insight.id} className="flex gap-3" data-testid={`insight-${insight.id}`}>
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center mt-0.5">
                {insight.id}
              </span>
              <p className="text-sm text-foreground leading-relaxed flex-1">{insight.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
