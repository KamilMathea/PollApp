export interface Category {
  id: number;
  name: string;
}

export interface PollOption {
  id?: number;
  poll_id?: number;
  option_text: string;
  votes_count?: number; // Hilfsfeld für das spätere Auswerten der Stimmen im UI
}

export interface Vote {
  id?: number;
  option_id: number;
  created_at?: string;
}

export interface Poll {
  id?: number;
  title: string;
  description?: string;
  category_id: number;
  expires_at?: string;
  created_at?: string;
  category?: Category;
  options?: PollOption[];
}