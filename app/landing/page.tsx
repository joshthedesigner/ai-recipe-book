'use client';

import { Box, Container, Typography, Button, Grid, Card, CardContent, AppBar, Toolbar } from '@mui/material';
import { useRouter } from 'next/navigation';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LinkIcon from '@mui/icons-material/Link';
import PublicIcon from '@mui/icons-material/Public';
import GroupIcon from '@mui/icons-material/Group';
import AppButton from '@/components/AppButton';

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: <CameraAltIcon sx={{ fontSize: 40 }} />,
      title: 'Snap a Photo',
      description: "Capture handwritten recipes, cookbook pages, or recipe cards. We'll digitize them instantly.",
    },
    {
      icon: <LinkIcon sx={{ fontSize: 40 }} />,
      title: 'Paste a URL',
      description: "Found a recipe online? Just paste the link and we'll save it beautifully to your collection.",
    },
    {
      icon: <PublicIcon sx={{ fontSize: 40 }} />,
      title: 'Auto Translation',
      description: 'Recipes in any language, instantly translated so everyone can cook together.',
    },
    {
      icon: <GroupIcon sx={{ fontSize: 40 }} />,
      title: 'Share with Anyone',
      description: 'Invite friends and loved ones to view or contribute. Build your cookbook together.',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'hsl(32, 40%, 98%)',
        color: 'hsl(24, 20%, 15%)',
      }}
    >
      {/* Navigation Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#ffffff',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar 
          sx={{ 
            minHeight: { xs: 56, sm: 64 }, 
            px: '0 !important',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: '1536px',
              mx: 'auto',
              px: { xs: 2, sm: 3 },
            }}
          >
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <img 
                src="/logo.svg" 
                alt="RecipeBook Logo" 
                style={{ width: '32px', height: 'auto' }}
              />
              <Typography
                variant="h6"
                component="div"
                sx={{
                  color: 'text.primary',
                  fontWeight: 600,
                }}
              >
                RecipeBook
              </Typography>
            </Box>

            {/* CTA Buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <AppButton
                variant="secondary"
                onClick={() => router.push('/login')}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                Sign In
              </AppButton>
              <AppButton
                variant="primary"
                onClick={() => router.push('/signup')}
              >
                Get Started
              </AppButton>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section - Two Column Layout */}
      <Box sx={{ bgcolor: 'hsl(0, 0%, 100%)', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
            {/* Left Column - Text and Buttons */}
            <Grid item xs={12} md={6}>
              <Box>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    fontWeight: 700,
                    color: 'hsl(24, 85%, 55%)',
                    mb: 3,
                    lineHeight: 1.2,
                  }}
                >
                  RecipeBook
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: '1.125rem', md: '1.25rem' },
                    color: 'hsl(24, 20%, 15%)',
                    mb: 4,
                    lineHeight: 1.6,
                  }}
                >
                  Collect, share, and treasure your recipes. Add recipes from anywhere, in any language, and share them with the people you love.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <AppButton
                    variant="primary"
                    size="large"
                    onClick={() => router.push('/signup')}
                  >
                    Get Started
                  </AppButton>
                  <AppButton
                    variant="secondary"
                    size="large"
                    onClick={() => router.push('/login')}
                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                  >
                    Sign In
                  </AppButton>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '14px',
                    color: 'text.secondary',
                    mt: 1.5,
                  }}
                >
                  No payment required. 100% free.
                </Typography>
              </Box>
            </Grid>

            {/* Right Column - Hero Image */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px -4px hsl(24 85% 55% / 0.12)',
                  height: { xs: 300, md: 500 },
                  position: 'relative',
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop"
                  alt="Friends cooking together in a modern kitchen"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        {/* Section Heading */}
        <Box id="features" sx={{ textAlign: 'center', mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' },
              fontWeight: 700,
              color: 'hsl(24, 20%, 15%)',
              mb: 2,
            }}
          >
            Simple. Powerful. Together.
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              fontWeight: 400,
              color: 'hsl(24, 20%, 15%)',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Everything you need to preserve and share your culinary heritage
          </Typography>
        </Box>

        {/* Features Grid */}
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  bgcolor: 'hsl(0, 0%, 100%)',
                  borderRadius: '1rem',
                  boxShadow: '0 4px 24px -2px hsl(24 85% 55% / 0.08)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    boxShadow: '0 8px 32px -4px hsl(24 85% 55% / 0.12)',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '0.75rem',
                      bgcolor: 'hsl(24, 85%, 55%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      mb: 3,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: 'hsl(24, 20%, 15%)',
                      mb: 1.5,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'hsl(24, 20%, 15%)',
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'hsl(0, 0%, 100%)', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                color: 'hsl(24, 20%, 15%)',
                mb: 1,
              }}
            >
              Start Building Your
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                color: 'hsl(24, 85%, 55%)',
                mb: 3,
              }}
            >
              Recipe Legacy
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem' },
                color: 'hsl(24, 20%, 15%)',
                mb: 4,
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              Join thousands preserving memories, one recipe at a time
            </Typography>
            <AppButton
              variant="primary"
              size="large"
              onClick={() => router.push('/signup')}
              sx={{
                px: 5,
                py: 2,
                fontSize: '1.125rem',
              }}
            >
              Get Started
            </AppButton>
            <Typography
              variant="body2"
              sx={{
                fontSize: '14px',
                color: 'text.secondary',
                mt: 1.5,
              }}
            >
              No payment required. 100% free.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
