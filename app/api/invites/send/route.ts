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

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { inviteeEmail, role, groupId } = await request.json();

    // Validate required fields
    if (!inviteeEmail || !role || !groupId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const signupUrl = `${baseUrl}/signup`;

    // Generate email content
    const emailData = {
      inviterName,
      groupName: group.name,
      role: role as 'read' | 'write',
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

    // Send email via Resend
    const { data: sentEmail, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'RecipeBook <onboarding@resend.dev>',
      to: inviteeEmail,
      subject,
      html,
      text,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: emailError.message,
        },
        { status: 500 }
      );
    }

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
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

