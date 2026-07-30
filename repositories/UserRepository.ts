import { supabase } from '../services/db/supabaseService'

export const UserRepository = {
  async getById(id: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle() as any
    if (error) throw error
    return data
  },

  async getByEmail(email: string) {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle() as any
    if (error) throw error
    return data
  },

  async upsert(user: any) {
    const { data, error } = await supabase.from('users').upsert(user).select().single() as any
    if (error) throw error
    return data
  },

  async list(limit = 20, offset = 0) {
    const { data, error } = await supabase.from('users').select('*').range(offset, offset + limit - 1) as any
    if (error) throw error
    return data
  }
}
