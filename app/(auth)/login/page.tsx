import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to MedHaven.",
}

export default function LoginPage() {
  return (
    <Card className="border-border shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign-in functionality will be connected in a future phase.</CardDescription>
      </CardHeader>
      <CardContent>
        <form aria-label="Sign in preview" className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-email">Email address</FieldLabel>
              <Input id="login-email" type="email" autoComplete="email" placeholder="name@example.com" disabled />
            </Field>
            <Field>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <span className="text-xs text-muted-foreground">Available soon</span>
              </div>
              <Input id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" disabled />
            </Field>
          </FieldGroup>
          <Button type="button" disabled className="w-full">Sign in</Button>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <Button type="button" variant="outline" disabled className="w-full">Continue with Google</Button>
          <FieldDescription className="text-center">This presentation-only form does not collect or submit credentials.</FieldDescription>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-6 text-sm text-muted-foreground">
        New to MedHaven?&nbsp;<Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">Create an account</Link>
      </CardFooter>
    </Card>
  )
}
