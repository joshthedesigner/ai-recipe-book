/**
 * Send Friend Invite API Route
 * 
 * POST /api/friends/send-invite
 * 
 * Purpose: Send friend request email
 * ROLLBACK NOTE: Delete this file to remove Friends API endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/db/supabaseServer';
import { friendInviteEmail } from '@/utils/emailTemplates';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Feature flag check (server-side, no NEXT_PUBLIC_ prefix)
    if (process.env.FRIENDS_FEATURE_ENABLED !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Feature not available' },
        { status: 404 }
      );
    }

    const { recipientEmail } = await request.json();

    // Validate email
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prevent self-invites
    if (user.email?.toLowerCase() === recipientEmail.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Cannot send friend request to yourself' },
        { status: 400 }
      );
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from('friends')
      .select('id, status')
      .eq('requester_id', user.id)
      .eq('invited_email', recipientEmail.toLowerCase())
      .single();

    if (existingInvite) {
      if (existingInvite.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'Friend request already sent to this email' },
          { status: 400 }
        );
      }
      if (existingInvite.status === 'accepted') {
        return NextResponse.json(
          { success: false, error: 'Already friends with this user' },
          { status: 400 }
        );
      }
    }

    // Create pending friend invite
    const { data: invite, error: insertError } = await supabase
      .from('friends')
      .insert({
        requester_id: user.id,
        invited_email: recipientEmail.toLowerCase(),
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating friend invite:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create friend request',
          details: insertError.message || insertError.hint || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Send email
    const senderName = user.user_metadata?.name || user.email || 'A user';
    
    const baseUrl = 
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : null) ||
      'http://localhost:3000';

    const { subject, html, text } = friendInviteEmail(
      senderName,
      recipientEmail,
      invite.id,
      baseUrl
    );

    // Development mode: Log email details instead of sending
    const acceptLink = `${baseUrl}/friends?friend_invite=${invite.id}`;
    
    if (!process.env.RESEND_API_KEY || process.env.NODE_ENV === 'development') {
      console.log('\n========== FRIEND INVITE EMAIL ==========');
      console.log('To:', recipientEmail);
      console.log('From:', senderName);
      console.log('Subject:', subject);
      console.log('Accept Link:', acceptLink);
      console.log('Invite ID:', invite.id);
      console.log('==========================================\n');
      console.log('📧 Copy the accept link above and paste in a new browser window to test!');
      console.log('   (Login as the recipient to accept the invite)\n');
      
      return NextResponse.json({
        success: true,
        message: 'Friend request sent! (Dev mode - check server console for accept link)',
        inviteId: invite.id,
        acceptLink: acceptLink,
      });
    }

    // Send email via Resend
    const fromEmail = (process.env.RESEND_FROM_EMAIL || 'RecipeBook <onboarding@resend.dev>').trim();
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data: sentEmail, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
      text,
    });

    if (emailError) {
      console.error('Resend API Error:', emailError);
      // Don't fail the request - invite is created
      return NextResponse.json({
        success: true,
        message: 'Friend request created but email failed to send',
        inviteId: invite.id,
      });
    }

    console.log('Friend invite email sent successfully! ID:', sentEmail?.id);

    return NextResponse.json({
      success: true,
      message: 'Friend request sent successfully',
      inviteId: invite.id,
      emailId: sentEmail?.id,
    });

  } catch (error) {
    console.error('Error in send friend invite route:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

