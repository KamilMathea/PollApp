import { Poll, Question, PollOption, Category } from '../interfaces/poll.interface';

/**
 * Formats remaining duration until poll expiration into readable text.
 * @param expiresAt - Expiration ISO timestamp string.
 * @returns Human readable remaining time string.
 */
export function formatRemainingTime(expiresAt?: string): string {
    if (!expiresAt) return 'No deadline';
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `Ends in ${days} day${days > 1 ? 's' : ''}`;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `Ends in ${hours} hour${hours > 1 ? 's' : ''}`;
}

/**
 * Converts a zero-based index into an uppercase alphabetical prefix (e.g. 0 -> 'A.', 1 -> 'B.').
 * @param index - Zero-based index of the option.
 * @returns Formatted letter prefix string.
 */
export function getLetterPrefix(index: number): string {
    return String.fromCharCode(65 + index) + '.';
}

/**
 * Checks if a poll already contains any submitted votes in the database.
 * @param poll - Poll object to inspect.
 * @returns True if at least one vote exists in any option.
 */
export function hasExistingVotes(poll: Poll | null): boolean {
    if (!poll?.questions) return false;
    return poll.questions.some((q) =>
        q.poll_options?.some((opt) => opt.votes && opt.votes.length > 0)
    );
}

/**
 * Calculates total votes count for a specific question.
 */
export function getQuestionTotalVotes(question: Question, selectedOptionIds: number[]): number {
    if (!question.poll_options) return 0;
    const dbVotes = question.poll_options.reduce(
        (sum, opt) => sum + (opt.votes?.length || 0),
        0
    );
    const localPreviewVotes = question.poll_options.filter(
        (opt) => opt.id && selectedOptionIds.includes(opt.id)
    ).length;
    return dbVotes + localPreviewVotes;
}

/**
 * Calculates percentage of votes for a single option relative to its question.
 */
export function getOptionPercentage(
    option: PollOption,
    question: Question,
    selectedOptionIds: number[]
): string {
    const total = getQuestionTotalVotes(question, selectedOptionIds);
    if (!total) return '0%';
    const dbCount = option.votes?.length || 0;
    const localCount = option.id && selectedOptionIds.includes(option.id) ? 1 : 0;
    const count = dbCount + localCount;
    const percent = Math.round((count / total) * 100);
    return `${percent}%`;
}

/**
 * Builds payload object for poll table insertion.
 */
export function buildPollPayload(title: string, description: string, category: Category | null, endDate: string) {
    return {
        title: title,
        description: description || null,
        category_id: category ? category.id : null,
        expires_at: endDate ? new Date(endDate).toISOString() : null,
    };
}