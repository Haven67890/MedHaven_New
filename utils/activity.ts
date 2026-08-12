import { createClient } from "@/lib/supabase/client"

export function logMaterialActivity(userId: string, materialId: string, action: "view" | "download") {
  try {
    const supabase = createClient()
    supabase
      .from("material_activity")
      .insert({
        user_id: userId,
        material_id: materialId,
        action: action,
      })
      .then((res: { error: any }) => {
        if (res.error) {
          console.warn("Failed to log material activity in Supabase:", res.error.message)
        }
      })
      .catch((err: any) => {
        console.warn("Exception while logging material activity:", err)
      })
  } catch (err) {
    console.warn("Error during activity logging initiation:", err)
  }
}
