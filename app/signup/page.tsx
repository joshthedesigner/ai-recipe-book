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
    // Minimum 12 characters
    if (pwd.length < 12) {
      return { valid: false, error: 'Password must be at least 12 characters long' };
    }

    // Must contain lowercase letter
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }

    // Must contain uppercase letter
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }

    // Must contain number
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }

    // Must contain special character
    if (!/[^a-zA-Z0-9]/.test(pwd)) {
      return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' };
    }

    // Check against common weak passwords
    const commonPasswords = [
      'password', 'password123', 'qwerty', '123456', '12345678', 'abc123',
      'password1', 'welcome', 'monkey', '1234567', 'letmein', 'trustno1'
    ];
    if (commonPasswords.some(common => pwd.toLowerCase().includes(common))) {
      return { valid: false, error: 'Password is too common. Please choose a stronger password.' };
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        {/* Logo & Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ mb: 2 }}>
              <img src="/logo.svg" alt="RecipeBook Logo" style={{ width: '80px', height: 'auto' }} />
            </Box>
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
  );
}

