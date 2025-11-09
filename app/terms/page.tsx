'use client';

import { Box, Container, Typography, Paper } from '@mui/material';
import TopNav from '@/components/TopNav';
import { useRouter } from 'next/navigation';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopNav />

      <Container maxWidth="md" sx={{ py: 6, flex: 1 }}>
        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
            Terms of Service
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Last Updated: November 9, 2025
          </Typography>

          <Box sx={{ '& > *': { mb: 3 } }}>
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                1. Agreement to Terms
              </Typography>
              <Typography variant="body1" paragraph>
                By accessing or using RecipeBook, you agree to be bound by these Terms of Service and our Privacy Policy. 
                If you do not agree to these terms, please do not use our service.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                2. Description of Service
              </Typography>
              <Typography variant="body1" paragraph>
                RecipeBook is a digital recipe management platform that allows you to:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Store and organize your recipes</Typography>
                <Typography component="li" variant="body1">Generate new recipes using AI</Typography>
                <Typography component="li" variant="body1">Share recipes with friends</Typography>
                <Typography component="li" variant="body1">Search and browse your recipe collection</Typography>
                <Typography component="li" variant="body1">Import recipes from URLs, images, and videos</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                3. User Accounts
              </Typography>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                Account Creation
              </Typography>
              <Typography variant="body1" paragraph>
                You must create an account to use RecipeBook. You agree to:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Provide accurate and complete information</Typography>
                <Typography component="li" variant="body1">Maintain the security of your password</Typography>
                <Typography component="li" variant="body1">Accept responsibility for all activities under your account</Typography>
                <Typography component="li" variant="body1">Notify us immediately of any unauthorized access</Typography>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                Account Termination
              </Typography>
              <Typography variant="body1" paragraph>
                We reserve the right to suspend or terminate your account if you violate these terms or engage in 
                fraudulent, abusive, or illegal activity.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                4. User Content
              </Typography>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                Your Recipes
              </Typography>
              <Typography variant="body1" paragraph>
                You retain all rights to the recipes and content you create or upload. By using our service, 
                you grant us a license to store, process, and display your content as necessary to provide the service.
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mt: 3 }}>
                Content Standards
              </Typography>
              <Typography variant="body1" paragraph>
                You agree not to upload content that:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Violates any laws or regulations</Typography>
                <Typography component="li" variant="body1">Infringes on intellectual property rights</Typography>
                <Typography component="li" variant="body1">Contains harmful, threatening, or abusive material</Typography>
                <Typography component="li" variant="body1">Includes spam or unauthorized advertising</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                5. Intellectual Property
              </Typography>
              <Typography variant="body1" paragraph>
                The RecipeBook platform, including its design, features, and functionality, is owned by us and 
                protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, 
                or reverse engineer any part of our service.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                6. AI-Generated Content
              </Typography>
              <Typography variant="body1" paragraph>
                RecipeBook uses artificial intelligence to help generate recipes and extract recipe information 
                from various sources. AI-generated content is provided "as is" and:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">May not always be accurate or suitable for your needs</Typography>
                <Typography component="li" variant="body1">Should be reviewed before use, especially for dietary restrictions or allergies</Typography>
                <Typography component="li" variant="body1">Is your responsibility to verify and test</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                7. Sharing and Friends
              </Typography>
              <Typography variant="body1" paragraph>
                When you add friends on RecipeBook:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Friends can view your shared recipes</Typography>
                <Typography component="li" variant="body1">You can view your friends' shared recipes</Typography>
                <Typography component="li" variant="body1">You can remove friends at any time</Typography>
                <Typography component="li" variant="body1">Be respectful and don't abuse the friend system</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                8. Prohibited Activities
              </Typography>
              <Typography variant="body1" paragraph>
                You agree not to:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Use automated systems (bots) to access the service</Typography>
                <Typography component="li" variant="body1">Attempt to gain unauthorized access to our systems</Typography>
                <Typography component="li" variant="body1">Interfere with or disrupt the service</Typography>
                <Typography component="li" variant="body1">Collect user data without permission</Typography>
                <Typography component="li" variant="body1">Use the service for any illegal purpose</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                9. Disclaimer of Warranties
              </Typography>
              <Typography variant="body1" paragraph>
                RecipeBook is provided "as is" and "as available" without warranties of any kind, either express or 
                implied. We do not guarantee that:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">The service will be uninterrupted or error-free</Typography>
                <Typography component="li" variant="body1">Defects will be corrected</Typography>
                <Typography component="li" variant="body1">The service is free of viruses or harmful components</Typography>
                <Typography component="li" variant="body1">Results from using the service will meet your expectations</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                10. Limitation of Liability
              </Typography>
              <Typography variant="body1" paragraph>
                To the maximum extent permitted by law, RecipeBook shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred 
                directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                11. Health and Safety
              </Typography>
              <Typography variant="body1" paragraph>
                RecipeBook provides recipes for informational purposes only. We are not responsible for:
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                <Typography component="li" variant="body1">Food safety or preparation quality</Typography>
                <Typography component="li" variant="body1">Allergic reactions or dietary issues</Typography>
                <Typography component="li" variant="body1">Nutritional accuracy of recipes</Typography>
                <Typography component="li" variant="body1">Any health issues resulting from recipe use</Typography>
              </Box>
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                Always verify recipes are safe for your specific dietary needs and restrictions.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                12. Modifications to Service
              </Typography>
              <Typography variant="body1" paragraph>
                We reserve the right to modify, suspend, or discontinue any part of RecipeBook at any time, 
                with or without notice. We will not be liable to you or any third party for any modification, 
                suspension, or discontinuation of the service.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                13. Changes to Terms
              </Typography>
              <Typography variant="body1" paragraph>
                We may update these Terms of Service from time to time. Continued use of the service after 
                changes constitutes acceptance of the new terms. We will notify you of material changes via 
                email or through the platform.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                14. Governing Law
              </Typography>
              <Typography variant="body1" paragraph>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
                in which RecipeBook operates, without regard to its conflict of law provisions.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mt: 4, mb: 2 }}>
                15. Contact Information
              </Typography>
              <Typography variant="body1" paragraph>
                If you have questions about these Terms of Service, please contact us at:
              </Typography>
              <Typography variant="body1" paragraph>
                Email: support@recipebook.app
              </Typography>
            </Box>

            <Box sx={{ mt: 5, p: 3, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                By using RecipeBook, you acknowledge that you have read, understood, and agree to be bound by 
                these Terms of Service and our Privacy Policy.
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
              onClick={() => router.push('/privacy')}
            >
              Privacy Policy
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

