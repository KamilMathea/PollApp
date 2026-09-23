export interface PollOption {
  id?: number;
  question_id?: number;
  option_text: string;
}

export interface Question {
  id?: number;
  poll_id?: number;
  question_text: string;
  allow_multiple: boolean;
  poll_options: PollOption[];
}

export interface Poll {
  id?: number;
  title: string;
  description: string;
  category_id: number;
  expires_at: string;
  created_at?: string;
  questions?: Question[];
  category?: Category | null;
}

export interface Category {
  id: number;
  name: string;
}

export interface Vote {
  id?: number;
  option_id: number;
  created_at?: string;
}