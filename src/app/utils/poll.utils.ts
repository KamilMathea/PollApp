import { Poll } from '../interfaces/poll.interface';

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