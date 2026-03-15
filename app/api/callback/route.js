import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/callback
 *
 * Safaricom calls this URL after the customer completes (or cancels) payment.
 * We parse the result and update the payment record in Supabase.
 */
export async function POST(request) {
  try {
    const rawBody = await request.text();
    let body = null;
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('Invalid JSON body:', parseError);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      }
    }

    // ── Parse Safaricom callback body ────────────────────────────────────────
    const stkCallback = body?.Body?.stkCallback;

    if (!stkCallback) {
      console.error('Invalid callback body:', body);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    if (!CheckoutRequestID) {
      console.error('Missing CheckoutRequestID in callback body');
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const isSuccess = ResultCode === 0;

    // ── Extract metadata (only present on success) ───────────────────────────
    let receiptNumber = null;
    let transactionDate = null;
    let phoneNumber = null;
    let paidAmount = null;

    if (isSuccess && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            receiptNumber = item.Value;
            break;
          case 'TransactionDate':
            transactionDate = String(item.Value);
            break;
          case 'PhoneNumber':
            phoneNumber = String(item.Value);
            break;
          case 'Amount':
            paidAmount = item.Value;
            break;
        }
      }
    }

    // ── Update Supabase record ───────────────────────────────────────────────
    const updatePayload = {
      status: isSuccess ? 'completed' : 'failed',
      result_code: ResultCode,
      result_desc: ResultDesc,
      updated_at: new Date().toISOString(),
      ...(receiptNumber && { receipt_number: receiptNumber }),
      ...(transactionDate && { transaction_date: transactionDate }),
      ...(phoneNumber && { phone: phoneNumber }),
      ...(paidAmount !== null && { amount_paid: paidAmount }),
    };

    const { error } = await supabase
      .from('payments')
      .update(updatePayload)
      .eq('checkout_request_id', CheckoutRequestID);

    if (error) {
      console.error('Supabase update error:', error);
    }

    console.log(
      `Callback processed | CheckoutRequestID: ${CheckoutRequestID} | Status: ${updatePayload.status} | Receipt: ${receiptNumber ?? 'N/A'}`
    );

    // n8n polls /api/status directly — no forwarding needed here.

    // Safaricom expects this exact response — always return 200
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('Callback processing error:', err);
    // Still return 200 so Safaricom doesn't keep retrying
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
