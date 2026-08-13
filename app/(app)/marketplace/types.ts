export interface MarketplaceListing {
  id: string
  seller_id: string
  title: string
  description: string
  price: string | number
  category: 'books' | 'electronics' | 'equipment' | 'clothing' | 'other'
  image_url: string | null
  contact_method: string
  status: 'active' | 'sold' | 'removed'
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string | null
    email: string | null
  } | null
}
