import React from 'react';

interface InsightRecommendationTileProps {
  variant: 'insight' | 'recommendation';
  text: string;
}

export function InsightRecommendationTile({ variant, text }: InsightRecommendationTileProps) {
  const isInsight = variant === 'insight';
  const containerClasses = isInsight
    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
  const titleClasses = isInsight
    ? 'text-blue-900 dark:text-blue-100'
    : 'text-green-900 dark:text-green-100';
  const textClasses = isInsight
    ? 'text-blue-800 dark:text-blue-200'
    : 'text-green-800 dark:text-green-200';

  return (
    <div className={`h-full p-4 rounded-md border ${containerClasses}`}>
      <h3 className={`text-sm font-semibold mb-2 ${titleClasses}`}>{isInsight ? 'Key Insight' : 'Recommendation'}</h3>
      <p className={`text-sm leading-relaxed ${textClasses}`}>{text}</p>
    </div>
  );
}


