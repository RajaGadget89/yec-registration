import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get pending emails from outbox
    const { data: pendingEmails, error: fetchError } = await supabase
      .rpc('fn_get_pending_emails', { p_batch_size: 50 })

    if (fetchError) {
      console.error('Failed to fetch pending emails:', fetchError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch pending emails',
          message: fetchError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            sent: 0,
            errors: 0,
            remaining: 0,
            details: { successful: [], failed: [] }
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = {
      sent: 0,
      errors: 0,
      remaining: 0,
      details: { successful: [] as string[], failed: [] as Array<{ id: string; error: string }> }
    }

    // Process each email
    for (const emailItem of pendingEmails) {
      try {
        // Get email template and render HTML
        const { data: templateData, error: templateError } = await supabase
          .from('email_templates')
          .select('subject, html_template')
          .eq('name', emailItem.template)
          .single()

        if (templateError || !templateData) {
          throw new Error(`Template not found: ${emailItem.template}`)
        }

        // For now, we'll use a simple template rendering approach
        // In production, you might want to use a more sophisticated template engine
        const subject = templateData.subject
        const html = templateData.html_template

        // Send email via Resend API
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (!resendApiKey) {
          throw new Error('RESEND_API_KEY not configured')
        }

        const emailFrom = Deno.env.get('EMAIL_FROM') || 'noreply@rajagadget.live'

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: emailFrom,
            to: emailItem.to_email,
            subject: subject,
            html: html,
          }),
        })

        if (!resendResponse.ok) {
          const errorData = await resendResponse.json()
          throw new Error(`Resend API error: ${errorData.message || resendResponse.statusText}`)
        }

        // Mark as sent in database
        const { error: updateError } = await supabase
          .rpc('fn_mark_email_sent', { p_id: emailItem.id })

        if (updateError) {
          console.error(`Failed to mark email ${emailItem.id} as sent:`, updateError)
        }

        // Log to audit system
        await supabase
          .from('audit_logs')
          .insert({
            event_type: 'email.outbox.sent',
            event_data: {
              outboxId: emailItem.id,
              template: emailItem.template,
              recipient: emailItem.to_email,
              subject,
              idempotencyKey: emailItem.idempotency_key
            },
            created_at: new Date().toISOString()
          })

        result.sent++
        result.details.successful.push(emailItem.id)
        
        console.log(`Email sent successfully: ${emailItem.template} to ${emailItem.to_email}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Mark as error in database
        const { error: updateError } = await supabase
          .rpc('fn_mark_email_error', { 
            p_id: emailItem.id, 
            p_error: errorMessage 
          })

        if (updateError) {
          console.error(`Failed to mark email ${emailItem.id} as error:`, updateError)
        }

        // Log to audit system
        await supabase
          .from('audit_logs')
          .insert({
            event_type: 'email.outbox.error',
            event_data: {
              outboxId: emailItem.id,
              template: emailItem.template,
              recipient: emailItem.to_email,
              error: errorMessage,
              idempotencyKey: emailItem.idempotency_key
            },
            created_at: new Date().toISOString()
          })

        result.errors++
        result.details.failed.push({ id: emailItem.id, error: errorMessage })
        
        console.error(`Email failed to send: ${emailItem.template} to ${emailItem.to_email}:`, errorMessage)
      }
    }

    // Get remaining count
    const { data: stats } = await supabase.rpc('fn_get_outbox_stats')
    if (stats && stats.length > 0) {
      result.remaining = stats[0].total_pending || 0
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Email dispatcher error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Email dispatcher failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

