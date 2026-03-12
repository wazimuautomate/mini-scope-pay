import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/status?checkout_request_id=ws_CO_XXXXXXXX
 *
 * n8n polls this endpoint until status is 'completed' or 'failed'.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutRequestId = searchParams.get('checkout_request_id');

    if (!checkoutRequestId) {
      return NextResponse.json(
        { success: false, message: 'checkout_request_id query param is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('payments')
      .select('status, receipt_number, amount, phone, reference, result_desc, agent_id, till_number, created_at, updated_at')
      .eq('checkout_request_id', checkoutRequestId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, status: 'not_found', message: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: data.status,              // 'pending' | 'completed' | 'failed'
      receipt_number: data.receipt_number ?? null,
      agent_id: data.agent_id ?? null,
      till_number: data.till_number ?? null,
      amount: data.amount,
      phone: data.phone,
      reference: data.reference,
      result_desc: data.result_desc ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (err) {
    console.error('Status check error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
