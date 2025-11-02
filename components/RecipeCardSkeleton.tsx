'use client';

import { Card, CardContent, Box, Skeleton } from '@mui/material';

export default function RecipeCardSkeleton() {
  return (
    <Card 
      elevation={2} 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent>
        {/* Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
          <Skeleton variant="text" width="70%" height={32} />
        </Box>

        {/* Tags */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={80} height={24} />
          <Skeleton variant="rounded" width={50} height={24} />
        </Box>

        {/* Metadata */}
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="50%" height={20} sx={{ mb: 2 }} />

        {/* Footer */}
        <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Skeleton variant="text" width="40%" height={16} />
        </Box>
      </CardContent>
    </Card>
  );
}

