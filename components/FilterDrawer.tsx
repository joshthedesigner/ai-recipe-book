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
  filterCourse: string;
  // Available options
  availableCuisines: string[];
  availableIngredients: string[];
  availableCourses: string[];
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
  onCourseChange: (value: string) => void;
  onReset?: () => void; // Optional reset callback
}

export default function FilterDrawer({
  open,
  onClose,
  sortBy,
  filterCuisine,
  filterMainIngredient,
  filterCourse,
  availableCuisines,
  availableIngredients,
  availableCourses,
  sortOptions,
  onSortChange,
  onCuisineChange,
  onIngredientChange,
  onCourseChange,
  onReset,
}: FilterDrawerProps) {
  const [expandedSections, setExpandedSections] = useState({
    sort: true,
    cuisines: true,
    ingredients: true,
    courses: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Calculate filter counts for each section
  const getFilterCount = (sectionKey: keyof typeof expandedSections): number => {
    switch (sectionKey) {
      case 'sort':
        // Count as 1 if sort is not the default (RECENTLY_ADDED)
        return sortBy !== sortOptions.RECENTLY_ADDED ? 1 : 0;
      case 'cuisines':
        // Count as 1 if a cuisine filter is selected
        return filterCuisine ? 1 : 0;
      case 'ingredients':
        // Count as 1 if an ingredient filter is selected
        return filterMainIngredient ? 1 : 0;
      case 'courses':
        // Count as 1 if a course filter is selected
        return filterCourse ? 1 : 0;
      default:
        return 0;
    }
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
    const count = getFilterCount(sectionKey);
    
    return (
      <Box>
        <Box
          onClick={() => toggleSection(sectionKey)}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1.5,
            px: 0,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '16px' }}>
            {title}{count > 0 ? ` (${count})` : ''}
          </Typography>
          <Box
            component="div"
            onClick={(e) => {
              e.stopPropagation();
              toggleSection(sectionKey);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            {isExpanded ? <RemoveIcon /> : <AddIcon />}
          </Box>
        </Box>
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
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
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

          {/* Course Type Section */}
          <CollapsibleSection title="Course type" sectionKey="courses">
            <RadioGroup
              value={filterCourse}
              onChange={(e) => onCourseChange(e.target.value)}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value=""
                control={<Radio />}
                label="All Courses"
                sx={{ mb: 1 }}
              />
              {availableCourses.map((course) => (
                <FormControlLabel
                  key={course}
                  value={course.toLowerCase()}
                  control={<Radio />}
                  label={course.charAt(0).toUpperCase() + course.slice(1)}
                  sx={{ mb: 1 }}
                />
              ))}
            </RadioGroup>
          </CollapsibleSection>

        </Box>

        {/* Footer with Reset and Done Buttons */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
          }}
        >
          {onReset && (
            <AppButton
              variant="secondary"
              fullWidth
              onClick={onReset}
              disabled={!filterCuisine && !filterMainIngredient && sortBy === sortOptions.RECENTLY_ADDED}
            >
              Reset
            </AppButton>
          )}
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

