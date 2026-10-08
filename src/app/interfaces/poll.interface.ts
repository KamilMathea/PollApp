/**
 * Interface representing the state of an individual question form field in the survey creation modal.
 */
export interface QuestionForm {
  questionText: string;
  allowMultiple: boolean;
  answerOptions: string[];
}

/**
 * Represents an individual answer option within a poll question.
 */
export interface PollOption {
  id?: number;
  question_id?: number;
  option_text: string;
  votes?: Vote[];
}

/**
 * Represents a single question belonging to a poll, including its configuration and answer options.
 */
export interface Question {
  id?: number;
  poll_id?: number;
  question_text: string;
  allow_multiple: boolean;
  poll_options: PollOption[];
}

/**
 * Represents a complete poll entity, including its metadata, questions, and associated category.
 */
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

/**
 * Represents a survey category.
 */
export interface Category {
  id: number;
  name: string;
}

/**
 * Represents a single vote record associated with a specific poll option.
 */
export interface Vote {
  id?: number;
  option_id: number;
  created_at?: string;
}