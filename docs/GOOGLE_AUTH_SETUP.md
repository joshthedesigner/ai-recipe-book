# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth authentication for your RecipeBook application.

## Overview

Google OAuth allows users to sign in using their Google account, providing a seamless authentication experience without managing passwords.

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create or Select a Project**
   - If you don't have a project, click "Select a project" → "New Project"
   - Give it a name like "RecipeBook" and click "Create"
   - Wait for the project to be created and select it

3. **Enable Google+ API** (if not already enabled)
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click on it and press "Enable"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select "External" user type and click "Create"
   - Fill in the required fields:
     - **App name**: RecipeBook (or your app name)
     - **User support email**: Your email address
     - **App logo**: (Optional) Upload your app logo
     - **App domain**: Leave blank for development
     - **Authorized domains**: (Optional) Add your production domain
     - **Developer contact information**: Your email address
   - Click "Save and Continue"
   - **Scopes**: Click "Add or Remove Scopes"
     - Add these scopes:
       - `email`
       - `profile`
       - `openid`
   - Click "Save and Continue"
   - **Test users** (for development): Click "Add Users" and add your test email addresses
   - Click "Save and Continue"
   - Review and click "Back to Dashboard"

5. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Web application" as the application type
   - **Name**: RecipeBook Web Client (or any name you prefer)
   - **Authorized JavaScript origins**: Add these URLs:
     ```
     http://localhost:3000
     https://your-production-domain.com (if deployed)
     ```
   - **Authorized redirect URIs**: Add these URLs:
     ```
     http://localhost:3000/api/auth/callback
     https://your-production-domain.com/api/auth/callback (if deployed)
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - Click "Create"
   - **Important**: Copy your Client ID and Client Secret - you'll need these for Supabase

## Step 2: Configure Supabase

1. **Go to Your Supabase Project**
   - Navigate to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Enable Google Auth Provider**
   - Go to "Authentication" → "Providers"
   - Find "Google" in the list
   - Toggle it to "Enabled"

3. **Add Google OAuth Credentials**
   - Paste your **Client ID** from Google Cloud Console
   - Paste your **Client Secret** from Google Cloud Console
   - **Redirect URL**: Copy the Supabase callback URL shown on this page
     - It should look like: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Make sure this URL is added to your Google OAuth "Authorized redirect URIs" (if you didn't add it in Step 1)

4. **Save Changes**
   - Click "Save" to apply the changes

## Step 3: Update Your Environment Variables (Optional)

You don't need to add Google credentials to your `.env.local` file since Supabase handles the OAuth flow. However, make sure these Supabase variables are set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Test the Integration

1. **Start Your Development Server**
   ```bash
   npm run dev
   ```

2. **Test Sign In**
   - Navigate to `http://localhost:3000/login`
   - Click the "Continue with Google" button
   - You should be redirected to Google's sign-in page
   - Sign in with a Google account (make sure it's added as a test user if your OAuth app is in testing mode)
   - After successful authentication, you should be redirected back to your app at `/browse`

3. **Verify User Data**
   - Check your Supabase Dashboard → "Authentication" → "Users"
   - You should see the new user with their Google profile information

## Troubleshooting

### Error: "Access blocked: RecipeBook's request is invalid"

**Cause**: Google OAuth consent screen is not properly configured or the app is in testing mode and the user is not added as a test user.

**Solution**:
- Ensure the OAuth consent screen is properly filled out
- Add the user's email as a test user in Google Cloud Console
- For production, publish your OAuth consent screen

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in your Google OAuth credentials doesn't match the one being used.

**Solution**:
- Double-check that both URLs are added to "Authorized redirect URIs" in Google Cloud Console:
  - Your app's callback: `http://localhost:3000/api/auth/callback`
  - Supabase's callback: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Make sure there are no trailing slashes
- Wait a few minutes after adding the URLs for Google to propagate the changes

### Error: "Authentication failed. Please try again."

**Cause**: The OAuth code exchange failed or there's an issue with the callback handler.

**Solution**:
- Check your browser console and server logs for detailed error messages
- Verify your Supabase credentials are correct
- Make sure the callback route at `/app/api/auth/callback/route.ts` is working

### Users Can Sign In But Data Isn't Saved

**Cause**: Your Supabase database might have Row Level Security (RLS) policies that prevent Google OAuth users from accessing/creating data.

**Solution**:
- Check your RLS policies in Supabase Dashboard → "Table Editor" → Select table → "Policies"
- Ensure authenticated users have the necessary permissions
- You may need to update policies to handle OAuth users

### Google Sign-In Button Doesn't Work

**Cause**: The AuthContext might not be properly loaded or there's a client-side error.

**Solution**:
- Check browser console for JavaScript errors
- Verify that `signInWithGoogle` is properly exported from AuthContext
- Ensure the `@supabase/ssr` package is installed: `npm install @supabase/ssr`

## Security Best Practices

1. **Never commit credentials**: Keep your Client ID and Secret secure, never commit them to Git
2. **Use environment variables**: Store sensitive data in `.env.local` (though not needed for Google OAuth as Supabase handles it)
3. **HTTPS in production**: Always use HTTPS for your production OAuth redirect URIs
4. **Limit OAuth scopes**: Only request the minimum scopes needed (email and profile)
5. **Review OAuth consent screen**: Make sure your OAuth consent screen clearly explains what your app does
6. **Monitor OAuth usage**: Check Google Cloud Console for any suspicious activity

## Publishing Your App (Production)

When you're ready to move to production:

1. **Publish OAuth Consent Screen**
   - Go to Google Cloud Console → "OAuth consent screen"
   - Click "Publish App"
   - Follow the verification process if required

2. **Update Authorized URIs**
   - Add your production domain to both:
     - Authorized JavaScript origins
     - Authorized redirect URIs
   - Remove or keep localhost URIs based on your needs

3. **Update Supabase Settings**
   - Make sure your production redirect URL is saved in Supabase Auth settings

4. **Test in Production**
   - Test the complete OAuth flow in your production environment
   - Verify users can sign in and access protected resources

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

## Support

If you continue to experience issues:
1. Check the Supabase logs in your dashboard
2. Check browser console for client-side errors
3. Review server logs for API route errors
4. Ensure all packages are up to date: `npm update`

