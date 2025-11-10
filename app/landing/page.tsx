'use client';

import { Box, Container, Typography, Grid, AppBar, Toolbar, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { useRouter } from 'next/navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PeopleIcon from '@mui/icons-material/People';
import AppButton from '@/components/AppButton';
import Footer from '@/components/Footer';

export default function LandingPage() {
  const router = useRouter();

  const faqs = [
    {
      question: 'How much does RecipeAssist cost?',
      answer: 'RecipeAssist is completely free to use with unlimited recipes and features. There are no limits, no trials, and no hidden fees. We believe everyone should have access to preserve and share their culinary heritage.'
    },
    {
      question: 'How does AI help with my recipes?',
      answer: 'RecipeAssist uses AI to extract recipes from images, videos, and websites - turning photos of cookbook pages or URLs into organized digital recipes. You can also chat with our AI assistant for cooking advice, ingredient substitutions, and technique tips.'
    },
    {
      question: 'What languages does RecipeAssist support?',
      answer: 'RecipeAssist can automatically translate recipes to and from virtually any language. Import a recipe in Italian, German, or Japanese, and read it in English - or vice versa!'
    },
    {
      question: 'Are my recipes private?',
      answer: 'Yes! Your recipes are completely private by default. Just like keeping a binder of recipes at home in your kitchen, your RecipeAssist is your own personal space. You control exactly what you share and with whom.'
    },
    {
      question: 'How does friend sharing work?',
      answer: 'You can add friends by searching for their email address. Once they accept your friend request, you can browse each other\'s recipe collections. Your recipes remain private unless you explicitly share them with friends.'
    }
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
                alt="RecipeAssist Logo" 
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
                RecipeAssist
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

      {/* Hero Section */}
      <Box sx={{ bgcolor: 'hsl(0, 0%, 100%)', pt: { xs: 'calc(64px - 12px)', md: 'calc(96px - 12px)' }, pb: 0 }}>
        <Container maxWidth="lg" sx={{ pb: 0 }}>
          <Box sx={{ textAlign: 'center', pb: 0 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 700,
                color: 'hsl(24, 85%, 55%)',
                mb: 2,
                lineHeight: 1.2,
              }}
            >
              A recipe assistant for everyone.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '1.125rem', md: '1.25rem' },
                color: 'hsl(24, 20%, 15%)',
                mb: 4,
                lineHeight: 1.6,
                maxWidth: '800px',
                mx: 'auto',
              }}
            >
              Save recipes from anywhere, organize with AI, and share with the people you love.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 'calc(16px + 12px)', justifyContent: 'center' }}>
              <AppButton
                variant="primary"
                size="large"
                onClick={() => router.push('/signup')}
              >
                Get Started Free
              </AppButton>
              <AppButton
                variant="secondary"
                size="large"
                onClick={() => router.push('/login')}
              >
                Sign In
              </AppButton>
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontSize: '16px',
                color: 'hsl(24, 85%, 55%)',
                fontWeight: 600,
                mb: 'calc(32px + 48px)',
              }}
            >
              ✨ 100% Free. Unlimited recipes. No credit card required.
            </Typography>
            
            {/* Hero Image - Cropped and overlapping into tan section */}
            <Box
              sx={{
                maxWidth: '600px',
                mx: 'auto',
                borderRadius: '1rem 1rem 0 0',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
                border: '1px solid',
                borderColor: 'divider',
                borderBottom: 'none',
                position: 'relative',
                zIndex: 1,
                mb: 0,
                maxHeight: '400px',
              }}
            >
              <img
                src="/hero-app-screenshot.png"
                alt="RecipeAssist app showing recipe collection"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'cover',
                  objectPosition: 'top',
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Simple 3 Value Props Section */}
      <Box sx={{ 
        position: 'relative',
        zIndex: 2,
        bgcolor: 'hsl(32, 40%, 98%)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
        mt: '-1px',
      }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Grid container spacing={4}>
          {/* Value Prop 1 */}
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'hsl(32, 40%, 95%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <MenuBookIcon sx={{ fontSize: 40, color: 'hsl(24, 85%, 55%)' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  color: 'hsl(24, 20%, 15%)',
                  mb: 1,
                }}
              >
                Import from anywhere
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.9375rem',
                  color: 'text.secondary',
                  lineHeight: 1.6,
                }}
              >
                Import recipes from websites, YouTube videos, scan physical recipes, or create your own.
              </Typography>
            </Box>
          </Grid>

          {/* Value Prop 2 */}
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'hsl(32, 40%, 95%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <FavoriteIcon sx={{ fontSize: 40, color: 'hsl(24, 85%, 55%)' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  color: 'hsl(24, 20%, 15%)',
                  mb: 1,
                }}
              >
                Never lose a recipe
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.9375rem',
                  color: 'text.secondary',
                  lineHeight: 1.6,
                }}
              >
                Cloud-synced across all your devices. Search, organize, and find any recipe in seconds.
              </Typography>
            </Box>
          </Grid>

          {/* Value Prop 3 */}
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'hsl(32, 40%, 95%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <PeopleIcon sx={{ fontSize: 40, color: 'hsl(24, 85%, 55%)' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  color: 'hsl(24, 20%, 15%)',
                  mb: 1,
                }}
              >
                Share & collaborate
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.9375rem',
                  color: 'text.secondary',
                  lineHeight: 1.6,
                }}
              >
                Invite friends to view your recipes and build your culinary legacy together.
              </Typography>
            </Box>
          </Grid>
        </Grid>
        </Container>
      </Box>

      {/* Why RecipeAssist Section */}
      <Box sx={{ bgcolor: 'hsl(0, 0%, 100%)', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/mapo.png"
                  alt="Delicious mapo tofu recipe"
                  style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  fontWeight: 700,
                  color: 'hsl(24, 20%, 15%)',
                  mb: 3,
                }}
              >
                Stop Searching. Start Cooking.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '1.125rem',
                  color: 'hsl(24, 20%, 15%)',
                  mb: 3,
                  lineHeight: 1.7,
                }}
              >
                RecipeAssist is your personal digital cookbook that goes everywhere you do. 
                Import recipes from websites and YouTube, scan photos of cookbook pages, or create your own - all in one beautiful place.
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                {[
                  'Cloud-synced across all your devices',
                  'AI-powered recipe extraction and generation',
                  'Share with friends and family',
                  'Completely free with unlimited recipes'
                ].map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 24, color: 'hsl(24, 85%, 55%)' }} />
                    <Typography variant="body1" sx={{ fontSize: '1rem', color: 'hsl(24, 20%, 15%)' }}>
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <AppButton
                variant="primary"
                size="large"
                onClick={() => router.push('/signup')}
              >
                Start Your Recipe Collection
              </AppButton>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: 'hsl(24, 20%, 15%)',
              mb: 2,
            }}
          >
            Frequently Asked Questions
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: '1.125rem',
              color: 'text.secondary',
            }}
          >
            Everything you need to know about RecipeAssist
          </Typography>
        </Box>

        {faqs.map((faq, index) => (
          <Accordion
            key={index}
            elevation={0}
            sx={{
              mb: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '0.5rem !important',
              '&:before': { display: 'none' },
              '&.Mui-expanded': {
                margin: '0 0 8px 0',
              }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                '& .MuiAccordionSummary-content': {
                  my: 1.5,
                }
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'hsl(24, 20%, 15%)',
                }}
              >
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.9375rem',
                  color: 'text.secondary',
                  lineHeight: 1.7,
                }}
              >
                {faq.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>

      {/* Final CTA Section */}
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
              Less Chaos. More Cooking.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem' },
                color: 'text.secondary',
                mb: 4,
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              Start preserving your culinary memories today. Free forever, with unlimited recipes.
            </Typography>
            <AppButton
              variant="primary"
              size="large"
              onClick={() => router.push('/signup')}
              sx={{
                mb: 2,
              }}
            >
              Get Started Free
            </AppButton>
            <Typography
              variant="body2"
              sx={{
                fontSize: '16px',
                color: 'hsl(24, 85%, 55%)',
                fontWeight: 600,
              }}
            >
              No payment required • Unlimited recipes • No trials
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
}
