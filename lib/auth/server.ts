import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isEmailVerified } from "@/lib/auth/redirects"

export async function requireVerifiedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { supabase, user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  if (!isEmailVerified(user)) {
    return { supabase, user: null, response: NextResponse.json({ error: "Email verification required" }, { status: 403 }) }
  }

  return { supabase, user, response: null }
}
