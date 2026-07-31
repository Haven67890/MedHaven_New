import { supabase } from '../services/db/supabaseService'

type UserRecord = { id: string; email?: string | null; [key: string]: unknown }

type QueryResult = { data: UserRecord | UserRecord[] | null; error: { message: string } | null }

function unwrap(result: QueryResult): { data: UserRecord | UserRecord[] | null; error: Error | null } {
  if (result.error) {
    return { data: null, error: new Error(result.error.message) }
  }
  return { data: result.data, error: null }
}

export const UserRepository = {
  async getById(id: string): Promise<UserRecord | null> {
    const result = await supabase.from('users').select('*').eq('id', id).maybeSingle()
    const { data, error } = unwrap(result as unknown as QueryResult)
    if (error) throw error
    return data as UserRecord | null
  },

  async getByEmail(email: string): Promise<UserRecord | null> {
    const result = await supabase.from('users').select('*').eq('email', email).maybeSingle()
    const { data, error } = unwrap(result as unknown as QueryResult)
    if (error) throw error
    return data as UserRecord | null
  },

  async upsert(user: Partial<UserRecord>): Promise<UserRecord> {
    const result = await supabase.from('users').upsert(user).select().single()
    const { data, error } = unwrap(result as unknown as QueryResult)
    if (error) throw error
    return data as UserRecord
  },

  async list(limit = 20, offset = 0): Promise<UserRecord[]> {
    const result = await supabase.from('users').select('*').range(offset, offset + limit - 1)
    const { data, error } = unwrap(result as unknown as QueryResult)
    if (error) throw error
    return (data as UserRecord[]) ?? []
  }
}
