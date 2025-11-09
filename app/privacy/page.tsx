'use client';

import { Box, Container, Typography, Paper } from '@mui/material';
import TopNav from '@/components/TopNav';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      <Container maxWidth="md" sx={{ py: 6, flex: 1 }}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
            Privacy Policy
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Last Updated: November 9, 2025
          </Typography>

          <Box sx={{ '& > *': { mb: 3 } }}>
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                1. Introduction
              </Typography>
              <Typography variant="body1" paragraph>
                Welcome to RecipeBook. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our recipe management service.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                2. Information We Collect
              </Typography>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                Account Information
              </Typography>
              <Typography variant="body1" paragraph>
                When you create an account, we collect:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Email address</Typography>
                <Typography component="li" variant="body1">Display name</Typography>
                <Typography component="li" variant="body1">Password (encrypted)</Typography>
                <Typography component="li" variant="body1">Profile information (if provided)</Typography>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                Content You Create
              </Typography>
              <Typography variant="body1" paragraph>
                We store the recipes, ingredients, instructions, and images you add to your recipe book.
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                Usage Data
              </Typography>
              <Typography variant="body1" paragraph>
                We collect information about how you use our service, including pages visited, features used, 
                and interaction patterns to improve our service.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                3. How We Use Your Information
              </Typography>
              <Typography variant="body1" paragraph>
                We use your information to:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Provide and maintain our recipe management service</Typography>
                <Typography component="li" variant="body1">Enable you to share recipes with friends</Typography>
                <Typography component="li" variant="body1">Send you important updates about our service</Typography>
                <Typography component="li" variant="body1">Improve and optimize our platform</Typography>
                <Typography component="li" variant="body1">Prevent fraud and abuse</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                4. Data Sharing and Disclosure
              </Typography>
              <Typography variant="body1" paragraph>
                We do not sell your personal information. We only share your data in these limited circumstances:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">
                  <strong>With Friends:</strong> When you accept a friend request, they can view your shared recipes
                </Typography>
                <Typography component="li" variant="body1">
                  <strong>Service Providers:</strong> We use trusted third-party services (like Supabase for authentication 
                  and OpenAI for recipe generation) that help us operate our platform
                </Typography>
                <Typography component="li" variant="body1">
                  <strong>Legal Requirements:</strong> If required by law or to protect our rights
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                5. Data Security
              </Typography>
              <Typography variant="body1" paragraph>
                We implement industry-standard security measures to protect your data, including:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Encrypted connections (HTTPS)</Typography>
                <Typography component="li" variant="body1">Secure password hashing</Typography>
                <Typography component="li" variant="body1">Regular security audits</Typography>
                <Typography component="li" variant="body1">Access controls and authentication</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                6. Your Rights and Choices
              </Typography>
              <Typography variant="body1" paragraph>
                You have the right to:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Access your personal data</Typography>
                <Typography component="li" variant="body1">Update or correct your information</Typography>
                <Typography component="li" variant="body1">Delete your account and associated data</Typography>
                <Typography component="li" variant="body1">Export your recipes</Typography>
                <Typography component="li" variant="body1">Control who can view your recipes</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                7. Cookies and Tracking
              </Typography>
              <Typography variant="body1" paragraph>
                We use essential cookies to maintain your session and preferences. We also use analytics tools 
                (PostHog) to understand how our service is used and improve it. You can disable non-essential 
                cookies through your browser settings.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                8. Data Retention
              </Typography>
              <Typography variant="body1" paragraph>
                We retain your data for as long as your account is active. If you delete your account, 
                we will delete your personal data within 30 days, except where we are required to retain 
                it for legal purposes.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                9. Children's Privacy
              </Typography>
              <Typography variant="body1" paragraph>
                RecipeBook is not intended for users under 13 years of age. We do not knowingly collect 
                information from children under 13.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                10. Changes to This Policy
              </Typography>
              <Typography variant="body1" paragraph>
                We may update this privacy policy from time to time. We will notify you of any material 
                changes by email or through a notice on our platform.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                11. Contact Us
              </Typography>
              <Typography variant="body1" paragraph>
                If you have questions about this privacy policy or your data, please contact us at:
              </Typography>
              <Typography variant="body1" paragraph>
                Email: privacy@recipebook.app
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Footer */}
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
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
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
              © {new Date().getFullYear()} RecipeBook
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

