'use client';

import { useState } from 'react';
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
  AppBar,
  Toolbar,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AppButton from '@/components/AppButton';

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const validatePassword = (pwd: string): { valid: boolean; error?: string } => {
    // Minimum 6 characters
    if (pwd.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters long' };
    }

    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    // Strong password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Invalid password');
      return;
    }

    setLoading(true);

    const { error, needsConfirmation } = await signUp(email, password, name);

    if (error) {
      setError(error.message || 'Failed to create account. Please try again.');
    } else {
      setSuccess(true);
      setNeedsConfirmation(needsConfirmation || false);
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
    <>
      {/* Simple Nav with Logo Only */}
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
              width: '100%',
              maxWidth: '1536px',
              mx: 'auto',
              px: { xs: 2, sm: 3 },
            }}
          >
            <Link href="/landing" passHref legacyBehavior>
              <Box
                component="a"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
              >
                <img 
                  src="/logo.svg" 
                  alt="RecipeBook Logo" 
                  style={{ width: '32px', height: 'auto' }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                  }}
                >
                  RecipeBook
                </Typography>
              </Box>
            </Link>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          {/* Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              Welcome to RecipeBook
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link href="/login" passHref legacyBehavior>
                <MuiLink sx={{ fontWeight: 600, cursor: 'pointer' }}>
                  Sign in
                </MuiLink>
              </Link>
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Success Alert */}
          {success && !needsConfirmation && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Account created successfully! Redirecting...
            </Alert>
          )}

          {/* Email Confirmation Alert */}
          {success && needsConfirmation && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Almost there! Check your email
              </Typography>
              <Typography variant="body2">
                We've sent a confirmation email to <strong>{email}</strong>. 
                Click the link in the email to activate your account.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
                Don't see it? Check your spam folder.
              </Typography>
            </Alert>
          )}

          {/* Google Sign In - Primary Option */}
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

          {/* Divider */}
          <Divider sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
          </Divider>

          {/* Signup Form */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              sx={{ mb: 2 }}
            />

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
              autoComplete="new-password"
              helperText="Minimum 6 characters"
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
              {loading ? 'Creating account...' : 'Sign Up'}
            </AppButton>
          </form>

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
        </Container>
      </Box>
    </>
  );
}

