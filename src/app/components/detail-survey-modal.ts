import { Component, ElementRef, ViewChild, inject, signal, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Poll, PollOption } from '../interfaces/poll.interface';
import { SupabaseService } from '../services/supabase';
import { getLetterPrefix, getOptionPercentage, hasExistingVotes } from '../utils/poll.utils';

/**
 * Modal component responsible for showing survey details, handling user voting, and rendering results.
 */
@Component({
    selector: 'app-detail-survey-modal',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './detail-survey-modal.html'
})
export class DetailSurveyModal {
    private readonly supabaseService: SupabaseService = inject(SupabaseService);

    @ViewChild('surveyDetailModal') private surveyDetailModal!: ElementRef<HTMLDialogElement>;

    /**
     * Event emitted when user requests to open creation modal.
     */
    readonly createRequested = output<void>();

    /**
     * Event emitted when a vote submission finishes successfully.
     */
    readonly voteSubmitted = output<void>();

    protected readonly selectedPoll = signal<Poll | null>(null);
    protected readonly hasVoted = signal<boolean>(false);
    protected readonly selectedOptionIds = signal<number[]>([]);

    protected readonly getLetterPrefix = getLetterPrefix;
    protected readonly getOptionPercentage = getOptionPercentage;

    /**
     * Opens survey detail modal dialog with poll payload.
     * @param poll - Targeted poll instance.
     */
    openSurveyDetail(poll: Poll): void {
        this.selectedOptionIds.set([]);
        this.selectedPoll.set(poll);
        this.hasVoted.set(hasExistingVotes(poll));
        this.toggleScrollLock(true);
        this.surveyDetailModal.nativeElement.showModal();
    }

    /**
     * Closes survey detail modal dialog.
     */
    closeSurveyDetail(): void {
        this.surveyDetailModal.nativeElement.close();
        this.toggleScrollLock(false);
    }

    /**
     * Toggles body scroll lock state.
     * @param lock - True to disable scrolling, false to enable.
     */
    private toggleScrollLock(lock: boolean): void {
        if (lock) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
    }

    /**
     * Toggles choice selection state for options in single or multiple choice mode.
     * @param optionId - ID of option clicked.
     * @param allowMultiple - Whether multiple choices are allowed.
     * @param questionOptions - Options list for single choice handling.
     */
    protected toggleOptionSelection(optionId: number, allowMultiple: boolean, questionOptions: PollOption[]): void {
        const current = this.selectedOptionIds();
        if (allowMultiple) {
            this.updateMultipleSelection(current, optionId);
        } else {
            this.updateSingleSelection(current, optionId, questionOptions);
        }
    }

    /**
     * Updates multi-choice selection array.
     * @param current - Current selected option IDs.
     * @param optionId - Target option ID.
     */
    private updateMultipleSelection(current: number[], optionId: number): void {
        const updated = current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
        this.selectedOptionIds.set(updated);
    }

    /**
     * Updates single-choice selection array replacing previous choice in question.
     * @param current - Current selected option IDs.
     * @param optionId - Target option ID.
     * @param questionOptions - Question options list.
     */
    private updateSingleSelection(current: number[], optionId: number, questionOptions: PollOption[]): void {
        const otherOptionIds = questionOptions.map((o) => o.id!).filter(Boolean);
        const cleaned = current.filter((id) => !otherOptionIds.includes(id));
        const updated = current.includes(optionId) ? cleaned : [...cleaned, optionId];
        this.selectedOptionIds.set(updated);
    }

    /**
     * Submits selected votes to Supabase and notifies parent component.
     */
    protected async submitVote(): Promise<void> {
        const selected = this.selectedOptionIds();
        if (selected.length > 0) {
            const success = await this.supabaseService.submitVotes(selected);
            if (success) {
                this.voteSubmitted.emit();
            }
        }
        this.hasVoted.set(true);
        this.closeSurveyDetail();
    }

    /**
     * Emits event to open create survey modal from detail view.
     */
    protected onRequestCreate(): void {
        this.closeSurveyDetail();
        this.createRequested.emit();
    }
}