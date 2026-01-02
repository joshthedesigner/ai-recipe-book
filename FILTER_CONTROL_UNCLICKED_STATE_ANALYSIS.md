# FilterControl Unclicked State Analysis

## Current Implementation Differences

### Dropdown Mode (Sort) - Unclicked State:
- **Component**: Material-UI `Select` (inside `FormControl`)
- **Label**: `InputLabel` positioned above the control
- **Height**: Material-UI default (~40px for `size="small"`)
- **Border**: Material-UI default outlined style (1px solid, grey)
- **Background**: Material-UI default (white)
- **Padding**: Material-UI default (internal padding)
- **Icon**: Material-UI built-in dropdown arrow (right side)
- **Font**: Material-UI default typography
- **Font Weight**: Material-UI default (400)
- **Border Radius**: Material-UI default (4px for outlined)
- **Border Color**: Material-UI default (grey/divider color)

### Popover Mode (Filter) - Unclicked State:
- **Component**: Material-UI `Chip`
- **Label**: Inside the Chip (not above)
- **Height**: Explicitly set to `40px`
- **Border**: Explicit `1px solid` with `divider` color
- **Background**: Explicit `background.paper` (white)
- **Padding**: Explicit `px: 2` (16px horizontal)
- **Icon**: Explicit `ExpandMoreIcon` (left side)
- **Font**: Inherited from theme
- **Font Weight**: Explicit `600`
- **Border Radius**: Material-UI Chip default (varies by size)
- **Border Color**: Explicit `divider` when unselected

## Key Visual Differences:

1. **Label Position**: Above (Select) vs Inside (Chip)
2. **Icon Position**: Right side (Select) vs Left side (Chip)
3. **Font Weight**: Default 400 (Select) vs 600 (Chip)
4. **Border Style**: Material-UI outlined (Select) vs Custom 1px (Chip)
5. **Border Radius**: 4px (Select) vs Chip default (different)
6. **Component Shape**: Rectangular outlined field (Select) vs Rounded pill/button (Chip)

## Solution:

To unify the unclicked state, we need to:
1. Make both use the same component OR
2. Style the Select to match the Chip appearance OR
3. Style the Chip to match the Select appearance

**Recommended Approach**: Style the Select to match the Chip's appearance since the Chip styling is more intentional and matches the design system better.

