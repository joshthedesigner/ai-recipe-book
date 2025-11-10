'use client';

import { Box, Container, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function Footer() {
  const router = useRouter();

  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 3, 
        px: 2, 
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Typography
            variant="body2"
            sx={{ 
              color: 'primary.main',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => router.push('/privacy')}
          >
            Privacy Policy
          </Typography>
          <Typography variant="body2" color="text.secondary">
            •
          </Typography>
          <Typography
            variant="body2"
            sx={{ 
              color: 'primary.main',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => router.push('/terms')}
          >
            Terms of Service
          </Typography>
          <Typography variant="body2" color="text.secondary">
            •
          </Typography>
          <Typography
            variant="body2"
            component="a"
            href="mailto:Support@Recipeassist.app"
            sx={{ 
              color: 'primary.main',
              cursor: 'pointer',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            Support@Recipeassist.app
          </Typography>
          <Typography variant="body2" color="text.secondary">
            •
          </Typography>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} RecipeAssist
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

