import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export const metadata: Metadata = {
  title: "Create account",
  description: "Prepare your MedHaven account.",
}

export default function RegisterPage() {
  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Registration will be enabled when authentication is introduced.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Registration preview" className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="register-name">Full name</FieldLabel>
              <Input id="register-name" autoComplete="name" placeholder="Your full name" disabled />
            </Field>
            <Field>
              <FieldLabel htmlFor="register-email">Email address</FieldLabel>
              <Input id="register-email" type="email" autoComplete="email" placeholder="name@example.com" disabled />
            </Field>
            <Field>
              <FieldLabel htmlFor="register-password">Password</FieldLabel>
              <Input id="register-password" type="password" autoComplete="new-password" placeholder="Create a password" disabled />
            </Field>
          </FieldGroup>
          <Button type="button" disabled className="w-full">Create account</Button>
          <FieldDescription className="text-center">This presentation-only form does not create an account or store information.</FieldDescription>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">
        Already have an account?&nbsp;<Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link>
      </CardFooter>
    </Card>
  )
}
