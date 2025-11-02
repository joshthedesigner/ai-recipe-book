'use client';

import { Box, Container, Typography, Button } from '@mui/material';
import TopNav from '@/components/TopNav';
import GridViewIcon from '@mui/icons-material/GridView';

export default function BrowsePage() {
  return (
    <Box>
      <TopNav />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
          }}
        >
          <GridViewIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
          
          <Typography variant="h4" gutterBottom>
            Browse View Coming Soon
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            This is where you'll be able to browse your recipes in a beautiful grid/card view.
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Phase 6 will add:
          </Typography>
          
          <Box sx={{ textAlign: 'left', mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              • Recipe card grid layout
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Search and filter options
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Sort by date, contributor, tags
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Recipe detail modal
            </Typography>
          </Box>
          
          <Button variant="contained" href="/chat">
            Back to Chat
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

