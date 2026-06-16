export type Role = 'admin' | 'reader';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Book {
  id: string;
  cover_url: string;
  is_available: boolean;
  created_at: string;
  // Computed values
  likes_count?: number;
  borrow_count?: number;
}

export interface Reservation {
  id: string;
  book_id: string;
  user_id: string;
  start_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  status: 'active' | 'returned';
  created_at: string;
  profiles?: Profile;
  books?: Book;
}

export interface Interaction {
  id: string;
  book_id: string;
  user_id: string;
  type: 'like' | 'lesson';
  content: string | null;
  created_at: string;
  profiles?: Profile;
}
