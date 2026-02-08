'use client';

import { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  ButtonBase,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import AppButton from './AppButton';

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  // Filter state
  sortBy: string;
  filterCuisine: string;
  filterMainIngredient: string;
  // Available options
  availableCuisines: string[];
  availableIngredients: string[];
  // Sort options
  sortOptions: {
    RECENTLY_ADDED: string;
    FIRST_ADDED: string;
    RECENTLY_VIEWED: string;
    DEFAULT: string;
  };
  // Callbacks
  onSortChange: (value: string) => void;
  onCuisineChange: (value: string) => void;
  onIngredientChange: (value: string) => void;
  onReset?: () => void; // Optional reset callback
}

export default function FilterDrawer({
  open,
  onClose,
  sortBy,
  filterCuisine,
  filterMainIngredient,
  availableCuisines,
  availableIngredients,
  sortOptions,
  onSortChange,
  onCuisineChange,
  onIngredientChange,
  onReset,
}: FilterDrawerProps) {
  const [expandedSections, setExpandedSections] = useState({
    sort: true,
    cuisines: true,
    ingredients: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const CollapsibleSection = ({ 
    title, 
    sectionKey, 
    children 
  }: { 
    title: string; 
    sectionKey: keyof typeof expandedSections; 
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <Box>
        <ButtonBase
          onClick={() => toggleSection(sectionKey)}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1.5,
            px: 0,
            '&:hover': {
              bgcolor: 'transparent',
            },
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '16px' }}>
            {title}
          </Typography>
          <IconButton size="small" sx={{ p: 0.5 }}>
            {isExpanded ? <RemoveIcon /> : <AddIcon />}
          </IconButton>
        </ButtonBase>
        {isExpanded && (
          <Box sx={{ pl: 0, pr: 0, pb: 2 }}>
            {children}
          </Box>
        )}
        <Divider sx={{ mt: 1 }} />
      </Box>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: '500px' },
          bgcolor: 'background.default',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {onReset && (
              <Typography
                variant="body2"
                onClick={onReset}
                sx={{
                  color: 'text.secondary',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: 'text.primary',
                  },
                }}
              >
                Reset Filters
              </Typography>
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Filter Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Sort by Section */}
          <CollapsibleSection title="Sort by" sectionKey="sort">
            <RadioGroup
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value={sortOptions.RECENTLY_ADDED}
                control={<Radio />}
                label="Recently Added"
                sx={{ mb: 1 }}
              />
              <FormControlLabel
                value={sortOptions.FIRST_ADDED}
                control={<Radio />}
                label="First Added"
                sx={{ mb: 1 }}
              />
              <FormControlLabel
                value={sortOptions.RECENTLY_VIEWED}
                control={<Radio />}
                label="Recently Viewed"
                sx={{ mb: 1 }}
              />
            </RadioGroup>
          </CollapsibleSection>

          {/* Cuisines Section */}
          <CollapsibleSection title="Cuisines" sectionKey="cuisines">
            <RadioGroup
              value={filterCuisine}
              onChange={(e) => onCuisineChange(e.target.value)}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value=""
                control={<Radio />}
                label="All Cuisines"
                sx={{ mb: 1 }}
              />
              {availableCuisines.map((cuisine) => (
                <FormControlLabel
                  key={cuisine}
                  value={cuisine}
                  control={<Radio />}
                  label={cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  sx={{ mb: 1 }}
                />
              ))}
            </RadioGroup>
          </CollapsibleSection>

          {/* Ingredients Section */}
          <CollapsibleSection title="Ingredients" sectionKey="ingredients">
            <RadioGroup
              value={filterMainIngredient}
              onChange={(e) => onIngredientChange(e.target.value)}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value=""
                control={<Radio />}
                label="All Ingredients"
                sx={{ mb: 1 }}
              />
              {availableIngredients.map((ingredient) => (
                <FormControlLabel
                  key={ingredient}
                  value={ingredient}
                  control={<Radio />}
                  label={ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                  sx={{ mb: 1 }}
                />
              ))}
            </RadioGroup>
          </CollapsibleSection>

        </Box>

        {/* Footer with Done Button */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <AppButton
            variant="primary"
            fullWidth
            onClick={onClose}
          >
            Done
          </AppButton>
        </Box>
      </Box>
    </Drawer>
  );
}

