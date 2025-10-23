# AI Charting Chatbot - Design Guidelines

## Design Approach
**System-Based Approach**: Material Design principles adapted for data visualization, emphasizing clarity, hierarchy, and functional efficiency. This is a utility-focused application where data comprehension and workflow efficiency are paramount.

## Core Design Principles
1. **Data First**: Charts and insights take visual priority
2. **Clarity Over Decoration**: Minimal visual noise, maximum information density
3. **Trust Through Professionalism**: Clean, corporate aesthetic appropriate for business data
4. **Progressive Disclosure**: Guide users through upload → analysis → exploration

---

## Color Palette

### Light Mode (Primary)
- **Primary Blue**: 217 91% 60% (interactive elements, CTAs, user messages)
- **Surface White**: 0 0% 100% (cards, backgrounds)
- **Background**: 210 20% 98% (page background, subtle warmth)
- **Border Gray**: 214 15% 91% (dividers, card borders)
- **Text Primary**: 222 47% 11% (headings, important text)
- **Text Secondary**: 215 16% 47% (body text, labels)

### Accent Colors (Charts)
- Chart 1: 217 91% 60% (primary blue)
- Chart 2: 142 76% 36% (emerald green)
- Chart 3: 38 92% 50% (amber orange)
- Chart 4: 0 84% 60% (coral red)
- Chart 5: 262 83% 58% (purple)
- Chart 6: 199 89% 48% (cyan)

### Semantic Colors
- **Success**: 142 76% 36% (upload success, positive insights)
- **Warning**: 38 92% 50% (data validation alerts)
- **Error**: 0 84% 60% (upload errors, API failures)
- **Info**: 217 91% 60% (AI assistant messages)

---

## Typography

### Font Families
- **Primary**: 'Inter', system-ui, -apple-system, sans-serif (UI, body text)
- **Data/Code**: 'JetBrains Mono', 'Courier New', monospace (numerical data, code snippets)

### Scale
- **Display**: 2.5rem/3rem, weight 700 (main app title)
- **H1**: 1.875rem/2.25rem, weight 600 (section headers)
- **H2**: 1.5rem/2rem, weight 600 (chart titles)
- **H3**: 1.25rem/1.75rem, weight 500 (insight headings)
- **Body**: 1rem/1.5rem, weight 400 (main content)
- **Small**: 0.875rem/1.25rem, weight 400 (labels, metadata)
- **Caption**: 0.75rem/1rem, weight 500 (chart axes, legends)

---

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 3, 4, 6, 8, 12, 16** for consistent rhythm
- Micro spacing (gaps, padding): 2, 3, 4
- Component spacing: 6, 8
- Section spacing: 12, 16

### Grid Structure
- **Max Width**: 1280px (max-w-7xl) for main container
- **Chat Width**: 768px (max-w-3xl) for optimal reading
- **Chart Columns**: 1 column mobile, 2 columns tablet (md:grid-cols-2)
- **Gutters**: px-4 mobile, px-6 tablet, px-8 desktop

---

## Component Library

### Header
- Height: 64px fixed
- White background (0 0% 100%), shadow-sm
- Logo: BarChart3 icon + "AI Data Analyst" in display font
- Right corner: subtle "Upload New File" text button when in chat mode

### File Upload Zone
- Border: 2px dashed, color 214 15% 91%, rounded-lg
- Background: 210 20% 98%
- Hover state: border color 217 91% 60%, background 217 91% 95%
- Icon: Upload icon 48px, color 217 91% 60%
- Center-aligned with generous padding (py-12, px-8)
- Max width: 600px, centered

### Chart Cards
- White background with shadow-md
- Border: 1px solid 214 15% 91%
- Rounded corners: rounded-xl (12px)
- Padding: p-6
- Chart title: H2 typography, mb-4
- Chart height: 300px desktop, 250px mobile
- Tooltips: white background, shadow-lg, rounded-md, px-3 py-2

### Chat Interface
- Background: 210 20% 98%
- Message container: max-w-3xl, mx-auto
- User message: bg 217 91% 60%, text white, rounded-2xl, ml-auto, max-w-80%
- Assistant message: bg white, text 222 47% 11%, rounded-2xl, mr-auto, max-w-80%
- Message padding: px-4 py-3
- Avatar circles: 32px, user (blue), assistant (gray gradient)

### Insight Cards
- Background: 217 91% 95% (light blue tint)
- Left border: 4px solid 217 91% 60%
- Rounded: rounded-lg
- Padding: p-4
- Numbered list with circle indicators
- Icons: Lightbulb, TrendingUp, AlertCircle (16px, blue)

### Buttons
- Primary: bg 217 91% 60%, text white, px-6 py-2.5, rounded-lg, hover:bg 217 91% 55%
- Secondary: bg white, text 217 91% 60%, border 1px solid 217 91% 60%, px-6 py-2.5, rounded-lg
- Icon buttons: p-2, rounded-md, hover:bg 210 20% 95%

### Input Fields
- Height: 44px (py-3, px-4)
- Border: 1px solid 214 15% 91%, rounded-lg
- Focus: border 217 91% 60%, ring-2 ring 217 91% 20%
- Placeholder: color 215 16% 47%

### Loading States
- Spinner: 217 91% 60%, 24px diameter
- Skeleton: animated pulse, bg 214 15% 91%
- Loading messages: subtle fade-in animation (200ms)

---

## Chart Design Standards

### Recharts Configuration
- Grid: stroke 214 15% 91%, strokeDasharray "3 3"
- Axes: stroke 215 16% 47%, fontSize 12px, fontFamily JetBrains Mono
- Tooltips: bg white, border 214 15% 91%, shadow-xl, rounded-md
- Legend: align bottom, fontSize 14px, wrapperStyle {{ paddingTop: 12 }}
- Responsive: width 100%, height 300px

### Chart-Specific Rules
- **Bar Charts**: barSize 40, radius [4,4,0,0] for rounded tops, top 10 only
- **Line Charts**: strokeWidth 2.5, dot size 4, activeDot size 6
- **Scatter Plots**: dot size 6, opacity 0.7, max 1000 points
- **Pie Charts**: top 5 slices, innerRadius 60%, label fontSize 13px, percentages shown
- **Color Assignment**: Use chart palette in order, ensure sufficient contrast

---

## Interaction Patterns

### Micro-interactions (Minimal)
- Button hover: slight scale (scale-[1.02]), 150ms ease
- Chart hover: highlight active element, show precise tooltip
- File drop: border pulse animation on valid drop
- Message send: subtle slide-up animation (200ms)

### States
- **Empty**: Centered illustration + instructional text
- **Loading**: Spinner + "Analyzing data..." text
- **Success**: Checkmark + brief confirmation (1.5s)
- **Error**: Alert icon + specific error message, red accent

---

## Images

### Hero/Upload Section
- **Type**: Illustrated icon-based, not photographic
- **Style**: Abstract data visualization graphics (charts, graphs, nodes)
- **Placement**: Background of upload zone, subtle opacity 0.05, decorative only
- **Alternative**: Large Upload icon (lucide-react) as primary visual

### Chart Thumbnails
- No static images - all charts are live Recharts components
- Loading state: gray rectangle placeholder with pulse animation

---

## Accessibility & Responsiveness

### Responsive Breakpoints
- Mobile: < 768px (single column, stacked layout)
- Tablet: 768px - 1024px (2-column charts)
- Desktop: > 1024px (2-3 column charts, side-by-side insights)

### Touch Targets
- Minimum 44x44px for all interactive elements
- Adequate spacing between buttons (gap-3 minimum)

### Focus States
- Visible focus rings: ring-2 ring-offset-2 ring 217 91% 60%
- Skip to main content link for keyboard users