'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  Typography,
  Alert,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AppButton from '@/components/AppButton';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    // Check for auth error from callback
    const authError = searchParams.get('error');
    if (authError === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message || 'Failed to sign in. Please check your credentials.');
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    const { error } = await signInWithGoogle();

    if (error) {
      setError(error.message || 'Failed to sign in with Google. Please try again.');
      setGoogleLoading(false);
    }
    // Note: If successful, user will be redirected to Google OAuth flow
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        {/* Logo & Title */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ mb: 2 }}>
            <img src="/logo.svg" alt="RecipeBook Logo" style={{ width: '80px', height: 'auto' }} />
          </Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            RecipeBook
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create your recipe legacy. Share it with the people you love.
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          <AppButton
            fullWidth
            variant="primary"
            size="large"
            type="submit"
            disabled={loading || googleLoading}
            sx={{ mb: 3 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </AppButton>
        </form>

        {/* Divider */}
        <Divider sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            or
          </Typography>
        </Divider>

        {/* Google Sign In - Secondary Option */}
        <AppButton
          fullWidth
          variant="secondary"
          size="large"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          startIcon={<GoogleIcon />}
          sx={{ mb: 3 }}
        >
          {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </AppButton>

        {/* Terms and Privacy Agreement */}
        <Box sx={{ textAlign: 'center', mt: 2, mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            By continuing, you agree to RecipeBook's{' '}
            <Link href="/terms" passHref legacyBehavior>
              <MuiLink sx={{ cursor: 'pointer', color: 'primary.main' }}>
                Terms of Service
              </MuiLink>
            </Link>
            . Read our{' '}
            <Link href="/privacy" passHref legacyBehavior>
              <MuiLink sx={{ cursor: 'pointer', color: 'primary.main' }}>
                Privacy Policy
              </MuiLink>
            </Link>
            .
          </Typography>
        </Box>

        {/* Sign Up Link */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link href="/signup" passHref legacyBehavior>
              <MuiLink sx={{ fontWeight: 600, cursor: 'pointer' }}>
                Sign up
              </MuiLink>
            </Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

