import { Box, Button, Typography, Container } from '@mui/material';
import Link from 'next/link';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import NotFoundIcon from '@mui/icons-material/ErrorOutline';

export default function NotFound() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <NotFoundIcon sx={{ fontSize: 64, color: 'error.main' }} />
        <Typography variant="h4" component="h1" gutterBottom>
          404 - Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The page you're looking for doesn't exist.
        </Typography>
        <Button
          variant="contained"
          component={Link}
          href="/browse"
          startIcon={<RestaurantIcon />}
          sx={{ mt: 2 }}
        >
          Go to Recipes
        </Button>
      </Box>
    </Container>
  );
}

