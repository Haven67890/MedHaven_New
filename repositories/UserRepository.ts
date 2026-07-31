import { supabase } from '../services/db/supabaseService'

type UserRecord = { id: string; email?: string | null; [key: string]: unknown }

export const UserRepository = {
  async getById(id: string): Promise<UserRecord | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle() as any
    if (error) throw error
    return data as UserRecord | null
  },

  async getByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle() as any
    if (error) throw error
    return data as UserRecord | null
  },

  async upsert(user: Partial<UserRecord>): Promise<UserRecord> {
    const { data, error } = await supabase.from('users').upsert(user).select().single() as any
    if (error) throw error
    return data as UserRecord
  },

  async list(limit = 20, offset = 0): Promise<UserRecord[]> {
    const { data, error } = await supabase.from('users').select('*').range(offset, offset + limit - 1) as any
    if (error) throw error
    return data as UserRecord[]
  }
}
