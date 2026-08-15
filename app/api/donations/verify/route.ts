import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { transaction_id, tx_ref, amount, donor_name, donor_email } = body

    if (!transaction_id && !tx_ref) {
      return NextResponse.json(
        { success: false, error: "Missing transaction reference or transaction ID." },
        { status: 400 }
      )
    }

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY?.trim()
    if (!secretKey) {
      console.error("FLUTTERWAVE_SECRET_KEY is not configured.")
      return NextResponse.json(
        { success: false, error: "Server payment configuration error." },
        { status: 500 }
      )
    }

    // Call Flutterwave's Verify Transaction API server-side
    const verifyId = transaction_id || tx_ref
    const flwRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(verifyId)}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    )

    if (!flwRes.ok) {
      const errorText = await flwRes.text()
      console.error("Flutterwave verification API error:", flwRes.status, errorText)
      return NextResponse.json(
        { success: false, error: "Failed to verify transaction with payment provider." },
        { status: 400 }
      )
    }

    const flwData = await flwRes.json()

    if (flwData.status !== "success" || flwData.data?.status !== "successful") {
      return NextResponse.json(
        { success: false, error: "Transaction verification failed or transaction not successful." },
        { status: 400 }
      )
    }

    const verifiedTxRef = flwData.data.tx_ref || tx_ref
    const verifiedAmount = flwData.data.amount ?? amount
    const verifiedEmail = donor_email?.trim() || flwData.data.customer?.email || null
    const verifiedName = donor_name?.trim() || flwData.data.customer?.name || null

    // Record the verified donation in Supabase using service-role client
    const supabase = createServiceClient()
    const { data: donation, error: dbError } = await supabase
      .from("donations")
      .upsert(
        {
          transaction_ref: verifiedTxRef,
          amount: Number(verifiedAmount),
          donor_name: verifiedName,
          donor_email: verifiedEmail,
          status: "successful",
        },
        { onConflict: "transaction_ref" }
      )
      .select()
      .single()

    if (dbError) {
      console.error("Database error saving donation:", dbError)
      return NextResponse.json(
        { success: false, error: "Failed to record donation record." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      donation: {
        id: donation.id,
        amount: donation.amount,
        donor_name: donation.donor_name,
        donor_email: donation.donor_email,
        transaction_ref: donation.transaction_ref,
        status: donation.status,
        created_at: donation.created_at,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error"
    console.error("Donation verification handler error:", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
