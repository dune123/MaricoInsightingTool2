# Chart Rendering Example

## Your Data Structure

Based on your backend response, here's how your data structure maps to the chart rendering:

```typescript
// Your backend response structure:
{
  aggregate: "mean",
  data: [
    { "Month": "Jan", "PA TOM": 150 },
    { "Month": "Feb", "PA TOM": 165 },
    { "Month": "Mar", "PA TOM": 142 },
    // ... more data points
  ],
  title: "Monthly Trend of PA TOM",
  type: "line",
  x: "Month",
  y: "PA TOM"
}
```

## How It Works

The `ChartRenderer` component receives this data and:

1. **X-Axis**: Uses the `x` field ("Month") as the dataKey and displays it as the axis label
2. **Y-Axis**: Uses the `y` field ("PA TOM") as the dataKey and displays it as the axis label  
3. **Data**: Maps through the `data` array to plot points
4. **Title**: Shows "Monthly Trend of PA TOM" as the chart title
5. **Type**: Renders as a line chart

## Updated Features

The chart components now include:

- **Axis Labels**: Both X and Y axis names are prominently displayed
- **X-Axis Label**: Shows at the bottom of the chart
- **Y-Axis Label**: Shows rotated 90 degrees on the left side
- **Styling**: Labels use the theme colors and proper font weights

## Usage in MessageBubble

When your backend sends a response with charts, the `MessageBubble` component automatically renders them:

```tsx
{message.charts && message.charts.length > 0 && (
  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    {message.charts.map((chart, idx) => (
      <ChartRenderer 
        key={idx} 
        chart={chart} 
        index={idx}
        isSingleChart={message.charts!.length === 1}
      />
    ))}
  </div>
)}
```

## Chart Types Supported

- **Line Charts**: Perfect for trends over time (like your monthly data)
- **Bar Charts**: Good for comparing categories
- **Area Charts**: Shows trends with filled areas
- **Scatter Charts**: For correlation analysis
- **Pie Charts**: For proportional data

Your "Monthly Trend of PA TOM" data is perfect for a line chart, which will show the trend over time with clear axis labels.
