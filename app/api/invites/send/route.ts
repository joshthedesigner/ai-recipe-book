/**
 * Send Invite Email API Route
 * 
 * POST /api/invites/send
 * 
 * Purpose: Send invitation email to a user being invited to a recipe group
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/db/supabaseServer';
import { generateInviteEmail, generateInviteEmailText } from '@/utils/emailTemplates';

// Force dynamic rendering - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { inviteeEmail, role, groupId } = await request.json();

    // Validate required fields
    if (!inviteeEmail || !groupId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Force role to 'read' - users can only have write access in their own recipe books
    const enforcedRole = 'read' as 'read' | 'write';

    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('recipe_groups')
      .select('name, owner_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // Verify user is the group owner
    if (group.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only group owners can send invites' },
        { status: 403 }
      );
    }

    // Get inviter name
    const inviterName = user.user_metadata?.name || user.email || 'A user';

    // Generate signup URL
    // Prioritize NEXT_PUBLIC_APP_URL (production URL) over VERCEL_URL (which can be preview URLs)
    // Only use VERCEL_URL if NEXT_PUBLIC_APP_URL is not set and we're in production
    const baseUrl = 
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : null) ||
      'http://localhost:3000';
    const signupUrl = `${baseUrl}/signup`;
    
    console.log('Signup URL:', signupUrl);
    console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
    console.log('VERCEL_URL:', process.env.VERCEL_URL);
    console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

    // Generate email content
    const emailData = {
      inviterName,
      groupName: group.name,
      role: enforcedRole,
      inviteeEmail,
      signupUrl,
    };

    const { subject, html } = generateInviteEmail(emailData);
    const text = generateInviteEmailText(emailData);

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. Email not sent.');
      return NextResponse.json({
        success: true,
        message: 'Invite created (email sending not configured)',
        emailPreview: { subject, to: inviteeEmail },
      });
    }

    // Validate and format from email
    let fromEmail = process.env.RESEND_FROM_EMAIL || 'RecipeBook <onboarding@resend.dev>';
    
    // Clean up any whitespace and validate format
    fromEmail = fromEmail.trim();
    
    // Validate format: should be either "email@domain.com" or "Name <email@domain.com>"
    const emailFormatRegex = /^(.+?)\s*<(.+?)>$|^(.+)$/;
    const match = fromEmail.match(emailFormatRegex);
    
    if (!match) {
      console.error('Invalid RESEND_FROM_EMAIL format:', fromEmail);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email configuration. Please check RESEND_FROM_EMAIL format.',
          details: 'Format must be: "email@example.com" or "Name <email@example.com>"',
        },
        { status: 500 }
      );
    }
    
    // Send email via Resend
    console.log('Attempting to send email to:', inviteeEmail);
    console.log('From:', fromEmail);
    
    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data: sentEmail, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: inviteeEmail,
      subject,
      html,
      text,
    });

    if (emailError) {
      console.error('Resend API Error:', JSON.stringify(emailError, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: emailError.message || JSON.stringify(emailError),
        },
        { status: 500 }
      );
    }
    
    console.log('Email sent successfully! ID:', sentEmail?.id);

    return NextResponse.json({
      success: true,
      message: 'Invitation email sent successfully',
      emailId: sentEmail?.id,
    });

  } catch (error) {
    console.error('Error in send invite route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while processing your request',
      },
      { status: 500 }
    );
  }
}

