# Filter UX Patterns Research

## Current Implementation Analysis

### 1. Sort Control Pattern (FormControl + Select)
**Location:** `app/browse/page.tsx` lines 566-581

**Structure:**
- Uses Material-UI `FormControl` with `InputLabel` and `Select`
- Label: "Sort by" positioned above using `InputLabel`
- Native Material-UI dropdown (no custom popover)
- Options: Recently Added, First Added, Recently Viewed, Default
- **Behavior:** Immediate application (no "Apply" button)
- **State:** Direct state update on selection

**Styling:**
- `FormControl size="small"`
- `InputLabel` with default Material-UI styling
- `minWidth: 160`
- Standard Material-UI Select appearance

---

### 2. Filter Control Pattern (Chip + Popover)
**Location:** `app/browse/page.tsx` lines 583-637 (Chips) and 776-946 (Popovers)

**Structure:**
- Uses `Chip` component as trigger button
- Uses `Popover` for selection UI
- Label: "Filter by" positioned above using `InputLabel` (static positioning)
- Custom grid-based selection with Card components
- Options displayed as Cards with icons
- **Behavior:** Two-step process (temporary state → Apply button)
- **State:** Temporary state (`tempCuisine`, `tempIngredient`) before applying

**Chip Styling:**
- Height: 40px
- Padding: px: 2
- Font weight: 600
- Selected state: `bgcolor: 'primary.main'` (orange), white text
- Unselected state: `bgcolor: 'background.paper'`, primary text
- Border: 1px solid, changes color on selection
- Icon: `ExpandMoreIcon`
- Delete icon: Shows `ClearIcon` when filter is active

**Popover Styling:**
- `maxWidth: { xs: '90vw', sm: 600 }`
- `borderRadius: 2` (16px)
- `boxShadow: '0 8px 32px rgba(0,0,0,0.12)'`
- Padding: `{ xs: 2, sm: 3 }`
- Grid layout: `xs={6} sm={4} md={3}`

**Card Selection Styling:**
- Selected: `bgcolor: 'hsl(24, 85%, 55%)'` (primary orange), white text
- Unselected: `bgcolor: 'background.paper'`, primary text
- Border: 1px solid, changes on hover/selection
- Hover: `transform: 'scale(1.05)'`, `boxShadow: 2`
- Icon size: `{ xs: 28, sm: 36 }`
- Text: `variant="body2"`, `fontWeight: 600`

**Buttons:**
- Reset: `color="inherit" size="small"`
- View Results: `variant="contained" size="small"`, primary color

---

## Design System Patterns

### Colors
- Primary: `hsl(24, 85%, 55%)` (warm orange)
- Text Primary: `hsl(24, 20%, 15%)` (dark brown)
- Text Secondary: `hsl(24, 10%, 45%)` (muted brown)
- Background Paper: `hsl(0, 0%, 100%)` (white)
- Divider: `hsl(32, 20%, 88%)`

### Typography
- Font Family: Inter, system fonts
- Body2: 14px, line-height 20px, fontWeight 500
- H6: fontWeight 600

### Spacing & Layout
- Border radius: 16px (1rem)
- Grid spacing: `{ xs: 1.5, sm: 2 }`
- Gap between elements: `gap: 1` or `gap: 2`
- Responsive breakpoints: xs (< 600px), sm (≥ 600px)

### Interactions
- Transitions: `'all 0.2s'` or `'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'`
- Hover effects: color change, scale transform, shadow elevation
- Selected state: Primary color background, white text

---

## Key Differences: Sort vs Filter

| Aspect | Sort Control | Filter Control |
|--------|-------------|----------------|
| **Trigger** | Select dropdown | Chip button |
| **Selection UI** | Native dropdown menu | Custom Popover with Cards |
| **Label Position** | InputLabel (Material-UI) | InputLabel (static) |
| **Options Display** | Simple text list | Cards with icons |
| **State Management** | Direct update | Temporary → Apply |
| **Apply Action** | Immediate | "View Results" button |
| **Reset Action** | Clear selection | "Reset" button in popover |
| **Visual Feedback** | Standard Material-UI | Custom selected state styling |

---

## Opportunities for Unified Component

### Common Patterns:
1. **Label Above:** Both use `InputLabel` positioned above
2. **Selection State:** Both track selected value
3. **Clear/Reset:** Both support clearing selection
4. **Styling Consistency:** Both use primary color for active states
5. **Responsive:** Both adapt to mobile/desktop

### Differences to Accommodate:
1. **Selection UI Type:**
   - Simple dropdown (Sort)
   - Rich popover with icons/cards (Filter)

2. **State Management:**
   - Immediate apply (Sort)
   - Temporary state + Apply button (Filter)

3. **Trigger Component:**
   - Select (Sort)
   - Chip (Filter)

---

## Recommendations for Reusable Component

### Component Structure:
```typescript
<FilterControl
  label="Sort by" | "Filter by"
  type="dropdown" | "popover"
  value={selectedValue}
  onChange={handleChange}
  options={options} // Array of { value, label, icon? }
  immediateApply={true | false} // true for sort, false for filter
  // ... other props
/>
```

### Key Features:
1. Unified label positioning (InputLabel)
2. Support both dropdown and popover modes
3. Consistent styling and theming
4. Flexible option rendering (text vs cards with icons)
5. Configurable state management (immediate vs apply button)
6. Built-in reset/clear functionality
7. Responsive design

### Implementation Approach:
- Create base component with shared logic
- Mode-specific sub-components for UI rendering
- Shared styling constants
- Unified state management interface

