"use client"

import { useState } from "react"
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3"
import { Heart, CheckCircle2, Shield, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PRESET_AMOUNTS = [1000, 5000, 10000]

type VerifiedDonation = {
  id: string
  amount: number
  donor_name: string | null
  donor_email: string | null
  transaction_ref: string
  created_at: string
}

export default function DonatePage() {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5000)
  const [customAmount, setCustomAmount] = useState<string>("")
  const [donorName, setDonorName] = useState<string>("")
  const [donorEmail, setDonorEmail] = useState<string>("")
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [donationSuccess, setDonationSuccess] = useState<VerifiedDonation | null>(null)

  const effectiveAmount = selectedPreset !== null ? selectedPreset : Number(customAmount) || 0

  const handlePresetSelect = (amount: number) => {
    setSelectedPreset(amount)
    setCustomAmount("")
    setErrorMessage(null)
  }

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value)
    setSelectedPreset(null)
    setErrorMessage(null)
  }

  const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || ""

  const txRef = `MH-DONATE-${Date.now()}-${Math.floor(Math.random() * 10000)}`

  const config = {
    public_key: publicKey,
    tx_ref: txRef,
    amount: effectiveAmount,
    currency: "NGN",
    payment_options: "card,banktransfer,ussd",
    customer: {
      email: donorEmail.trim() || "anonymous@medhaven.org",
      phone_number: "",
      name: donorName.trim() || "Anonymous Supporter",
    },
    customizations: {
      title: "Support MedHaven",
      description: "Donation to support open medical learning tools",
      logo: "/logo.png",
    },
  }

  const handleFlutterwavePayment = useFlutterwave(config)

  const verifyDonationOnServer = async (response: { transaction_id?: number | string; tx_ref?: string; status?: string }) => {
    setIsVerifying(true)
    setErrorMessage(null)
    try {
      const res = await fetch("/api/donations/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: response.transaction_id,
          tx_ref: response.tx_ref || txRef,
          amount: effectiveAmount,
          donor_name: donorName.trim() || null,
          donor_email: donorEmail.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Payment verification failed.")
      }

      setDonationSuccess(data.donation)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to verify donation. Please contact support."
      setErrorMessage(message)
    } finally {
      setIsVerifying(false)
    }
  }

  const startDonation = () => {
    setErrorMessage(null)
    if (!effectiveAmount || effectiveAmount <= 0) {
      setErrorMessage("Please select or enter a valid donation amount.")
      return
    }

    if (!publicKey) {
      setErrorMessage("Payment system public key is not configured.")
      return
    }

    handleFlutterwavePayment({
      callback: (response) => {
        closePaymentModal()
        if (response.status === "successful" || response.status === "completed") {
          void verifyDonationOnServer(response)
        } else {
          setErrorMessage("Payment was not completed.")
        }
      },
      onClose: () => {
        // Modal closed by donor
      },
    })
  }

  const resetForm = () => {
    setDonationSuccess(null)
    setSelectedPreset(5000)
    setCustomAmount("")
    setDonorName("")
    setDonorEmail("")
    setErrorMessage(null)
  }

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <Heart className="size-6 fill-current" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Support MedHaven</h1>
        <p className="mt-2 text-muted-foreground">
          Your donations keep high-quality medical study materials, AI quizzes, and clinical posting guides freely accessible.
        </p>
      </div>

      {donationSuccess ? (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>
            <CardTitle className="text-2xl text-emerald-950 dark:text-emerald-100">Thank You for Your Generosity!</CardTitle>
            <CardDescription className="text-emerald-800/80 dark:text-emerald-300">
              Your donation has been verified and recorded successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-emerald-900 dark:text-emerald-200">
            <div className="rounded-lg border border-emerald-500/20 bg-background/60 p-4 space-y-2">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Amount Donated:</span>
                <span className="font-semibold text-foreground">₦{donationSuccess.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Donor Name:</span>
                <span className="font-medium text-foreground">{donationSuccess.donor_name || "Anonymous"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Donor Email:</span>
                <span className="font-medium text-foreground">{donationSuccess.donor_email || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Transaction Ref:</span>
                <span className="font-mono text-xs text-foreground">{donationSuccess.transaction_ref}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pt-2">
            <Button onClick={resetForm} variant="outline" className="w-full sm:w-auto">
              Make Another Donation
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Choose Donation Amount</CardTitle>
            <CardDescription>Select a preset amount or enter a custom sum in Nigerian Naira (₦).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset amounts */}
            <div className="space-y-2">
              <Label>Preset Amounts</Label>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_AMOUNTS.map((amt) => {
                  const isSelected = selectedPreset === amt
                  return (
                    <Button
                      key={amt}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className={isSelected ? "font-bold ring-2 ring-primary" : ""}
                      onClick={() => handlePresetSelect(amt)}
                    >
                      ₦{amt.toLocaleString()}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Custom amount */}
            <div className="space-y-2">
              <Label htmlFor="custom-amount">Custom Amount (₦)</Label>
              <Input
                id="custom-amount"
                type="number"
                min="100"
                placeholder="e.g. 2500"
                value={customAmount}
                onChange={handleCustomAmountChange}
              />
            </div>

            {/* Donor info (Optional) */}
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4 text-amber-500" />
                <span>Donor Details (Optional — leave blank for anonymous donation)</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="donor-name">Your Name (Optional)</Label>
                <Input
                  id="donor-name"
                  type="text"
                  placeholder="e.g. Dr. Jane Doe"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="donor-email">Your Email (Optional)</Label>
                <Input
                  id="donor-email"
                  type="email"
                  placeholder="e.g. jane@example.com"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {errorMessage}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              onClick={startDonation}
              disabled={isVerifying || effectiveAmount <= 0}
              className="w-full text-base py-6 bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Verifying Payment...
                </>
              ) : (
                <>
                  <Heart className="mr-2 size-5 fill-current" />
                  Donate ₦{effectiveAmount > 0 ? effectiveAmount.toLocaleString() : "0"}
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="size-3.5" />
              <span>Secured by Flutterwave. Verified server-side.</span>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
