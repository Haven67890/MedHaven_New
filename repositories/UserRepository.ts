import { supabase } from '../services/db/supabaseService'

export type ProfileRecord = {
  id: string
  full_name?: string | null
  email?: string | null
  role_id?: string | number | null
  level?: string | null
  department_id?: string | number | null
  faculty_id?: string | number | null
  university_id?: string | number | null
  avatar_url?: string | null
  [key: string]: unknown
}

type QueryResult = {
  data: ProfileRecord | ProfileRecord[] | null
  error: { message: string } | null
}

function unwrap(result: QueryResult): { data: ProfileRecord | ProfileRecord[] | null; error: Error | null } {
  if (result.error) {
    return { data: null, error: new Error(result.error.message) }
  }

  return { data: result.data, error: null }
}

export const UserRepository = {
  async getById(id: string): Promise<ProfileRecord | null> {
    const result = await supabase
      .from('profiles')
      .select('id, full_name, email, role_id, level, department_id, faculty_id, university_id, avatar_url')
      .eq('id', id)
      .maybeSingle()

    const { data, error } = unwrap(result as unknown as QueryResult)
    if (error) throw error
    return data as ProfileRecord | null
  },

  async getByEmail(email: string): Promise<ProfileRecord | null> {
    const result = await supabase
      .from('profiles')
      .select('id, full_name, email, role_id, level, department_id, faculty_id, university_id, avatar_url')
      .eq('email', email)
      .maybeSingle()

    const { data, error } = unwrap(result as unknown as QueryResult)
    if (error) throw error
    return data as ProfileRecord | null
  },

  async upsert(user: Partial<ProfileRecord>): Promise<ProfileRecord> {
    const result = await supabase
      .from('profiles')
      .upsert(user)
      .select('id, full_name, email, role_id, level, department_id, faculty_id, university_id, avatar_url')
      .single()

    const { data, error } = unwrap(result as unknown as QueryResult)
    if (error) throw error
    return data as ProfileRecord
  },

  async list(limit = 20, offset = 0): Promise<ProfileRecord[]> {
    const result = await supabase
      .from('profiles')
      .select('id, full_name, email, role_id, level, department_id, faculty_id, university_id, avatar_url')
      .range(offset, offset + limit - 1)

    const { data, error } = unwrap(result as unknown as QueryResult)
    if (error) throw error
    return (data as ProfileRecord[]) ?? []
  }
}
