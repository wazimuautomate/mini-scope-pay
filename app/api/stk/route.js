import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getMpesaAccessToken, sendStkPush, formatPhone, buildStkCredentials } from '@/lib/mpesa';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, amount, reference } = body;

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!phone) {
      return NextResponse.json({ success: false, message: 'Phone number is required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number. Use format: 07XX, 2547XX, or +2547XX' },
        { status: 400 }
      );
    }

    // ── Build STK payload ────────────────────────────────────────────────────
    const { shortcode, timestamp, password } = buildStkCredentials();

    const paymentMode = process.env.MPESA_PAYMENT_MODE || 'paybill'; // 'paybill' or 'till'
    const partyB =
      paymentMode === 'till'
        ? process.env.MPESA_TILL_NUMBER
        : process.env.MPESA_PAYBILL_NUMBER;

    if (!partyB) {
      return NextResponse.json(
        { success: false, message: 'Payment destination (till/paybill) not configured' },
        { status: 500 }
      );
    }

    const ref = reference || `PAY_${Date.now()}`;
    const callbackUrl = process.env.MPESA_CALLBACK_URL; // your /api/callback full URL

    if (!callbackUrl) {
      return NextResponse.json(
        { success: false, message: 'Callback URL not configured' },
        { status: 500 }
      );
    }

    const stkData =
      paymentMode === 'till'
        ? {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerBuyGoodsOnline',
            Amount: Math.round(parsedAmount),
            PartyA: formattedPhone,
            PartyB: partyB,
            PhoneNumber: formattedPhone,
            CallBackURL: callbackUrl,
            AccountReference: ref,
            TransactionDesc: `Payment to Till ${partyB}`,
          }
        : {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(parsedAmount),
            PartyA: formattedPhone,
            PartyB: partyB,
            PhoneNumber: formattedPhone,
            CallBackURL: callbackUrl,
            AccountReference: process.env.MPESA_ACCOUNT_NUMBER || ref,
            TransactionDesc: `Payment to Paybill ${partyB}`,
          };

    // ── Get M-Pesa access token ──────────────────────────────────────────────
    const accessToken = await getMpesaAccessToken();

    // ── Send STK push ────────────────────────────────────────────────────────
    const stkResponse = await sendStkPush(accessToken, stkData);

    if (stkResponse?.ResponseCode !== '0') {
      const errorMsg =
        stkResponse?.errorMessage ||
        stkResponse?.ResponseDescription ||
        'STK push failed';
      return NextResponse.json({ success: false, message: errorMsg }, { status: 502 });
    }

    // ── Save pending transaction to Supabase ─────────────────────────────────
    const { error: dbError } = await supabase.from('payments').insert({
      phone: formattedPhone,
      amount: parsedAmount,
      reference: ref,
      checkout_request_id: stkResponse.CheckoutRequestID,
      merchant_request_id: stkResponse.MerchantRequestID,
      status: 'pending',
    });

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      // Don't fail the request — STK was already sent
    }

    return NextResponse.json({
      success: true,
      message: 'STK push sent. Awaiting customer payment.',
      checkout_request_id: stkResponse.CheckoutRequestID,
      reference: ref,
    });
  } catch (err) {
    console.error('STK error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
