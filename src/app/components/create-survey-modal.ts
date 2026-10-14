import { Component, ElementRef, ViewChild, inject, signal, output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category, QuestionForm } from '../interfaces/poll.interface';
import { SupabaseService } from '../services/supabase';
import { getLetterPrefix, buildPollPayload } from '../utils/poll.utils';

/**
 * Modal component responsible for creating new surveys with dynamic questions and options.
 */
@Component({
    selector: 'app-create-survey-modal',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './create-survey-modal.html'
})
export class CreateSurveyModal {
    private readonly supabaseService: SupabaseService = inject(SupabaseService);

    @ViewChild('surveyModal') private surveyModal!: ElementRef<HTMLDialogElement>;

    /**
     * Event emitted when a new poll is successfully created.
     */
    readonly pollCreated = output<number>();

    /**
     * List of available survey categories.
     */
    readonly dbCategories = signal<Category[]>([]);

    protected readonly isDropdownOpen = signal<boolean>(false);
    protected readonly selectedModalCategory = signal<Category | null>(null);
    protected readonly surveyTitle = signal<string>('');
    protected readonly endDate = signal<string>('');
    protected readonly description = signal<string>('');
    protected readonly questions = signal<QuestionForm[]>([
        { questionText: '', allowMultiple: false, answerOptions: ['', ''] }
    ]);
    protected readonly showSuccessOverlay = signal<boolean>(false);
    protected readonly createdPollId = signal<number | null>(null);
    protected readonly showMaxAnswersHint = signal<boolean>(false);
    protected readonly touchedTitle = signal<boolean>(false);
    protected readonly touchedCategory = signal<boolean>(false);
    protected readonly touchedQuestions = signal<Record<number, boolean>>({});
    protected readonly getLetterPrefix = getLetterPrefix;
    protected readonly touchedAnswers = signal<Record<string, boolean>>({});
    protected readonly minDate = signal<string>(new Date().toISOString().split('T')[0]);

    /**
     * Computed signal checking if all required fields are valid to enable the publish button.
     */
    protected readonly isFormValid = computed(() => {
        const titleValid = this.surveyTitle().trim().length > 0;
        const categoryValid = this.selectedModalCategory() !== null;
        const dateVal = this.endDate();
        const todayStr = new Date().toISOString().split('T')[0];
        const dateValid = !dateVal || dateVal >= todayStr;
        const questionsValid = this.questions().every((q) => {
            const textValid = q.questionText.trim().length > 0;
            const validOptionsCount = q.answerOptions.filter((opt) => opt.trim().length > 0).length;
            return textValid && validOptionsCount >= 2;
        });
        return titleValid && categoryValid && dateValid && questionsValid;
    });

    /**
     * Computed helpers for conditional error visibility.
     */
    protected readonly showTitleError = computed(() => {
        const val = this.surveyTitle();
        return (this.touchedTitle() || val.length > 0) && !val.trim();
    });

    /**
     * Checks if the category selection exhibits a validation error after being touched.
     * @returns True if category error should be shown.
     */
    protected readonly showCategoryError = computed(() => {
        return this.touchedCategory() && this.selectedModalCategory() === null;
    });

    /**
     * Computed signal checking if the selected end date is invalid (lies in the past).
     */
    protected readonly showDateError = computed(() => {
        const dateVal = this.endDate();
        if (!dateVal) return false;
        const todayStr = new Date().toISOString().split('T')[0];
        // Greift nur, wenn ein vollständiges Datum vorliegt und dieses kleiner als heute ist
        return dateVal.length === 10 && dateVal < todayStr;
    });

    /**
     * Checks if a specific question exhibits a validation error after being touched.
     * @param index - Index of the question.
     * @returns True if error should be shown.
     */
    protected showQuestionError(index: number): boolean {
        const q = this.questions()[index];
        return (!!this.touchedQuestions()[index] || q.questionText.length > 0) && !q.questionText.trim();
    }

    /**
     * Checks if a specific answer option exhibits a validation error when touched or typed into.
     * @param qIndex - Index of the question.
     * @param oIndex - Index of the answer option.
     * @returns True if error should be shown.
     */
    protected showAnswerError(qIndex: number, oIndex: number): boolean {
        const opt = this.questions()[qIndex].answerOptions[oIndex] || '';
        const isTouched = this.touchedAnswers()[`${qIndex}_${oIndex}`];
        const validOptionsCount = this.questions()[qIndex].answerOptions.filter((o) => o.trim().length > 0).length;
        return (isTouched || opt.length > 0) && !opt.trim() && validOptionsCount < 2;
    }

    /**
     * Marks a specific answer option input as touched on blur.
     * @param qIndex - Index of the question.
     * @param oIndex - Index of the answer option.
     */
    protected markAnswerTouched(qIndex: number, oIndex: number): void {
        this.touchedAnswers.update((t) => ({ ...t, [`${qIndex}_${oIndex}`]: true }));
    }

    /**
     * Opens the survey creation modal dialog and attaches category options.
     * @param categories - Array of categories fetched from the database.
     */
    openModal(categories: Category[]): void {
        this.dbCategories.set(categories);
        this.toggleScrollLock(true);
        this.surveyModal.nativeElement.showModal();
    }

    /**
     * Closes the creation modal and resets all form fields.
     */
    closeModal(): void {
        this.resetForm();
        this.surveyModal.nativeElement.close();
        this.toggleScrollLock(false);
    }

    /**
     * Toggles the background body scroll locking state.
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
     * Toggles dropdown menu visibility inside the creation form.
     */
    protected toggleModalDropdown(): void {
        this.isDropdownOpen.update((v) => !v);
    }

    /**
     * Sets selected category state from dropdown options and marks it as touched.
     * @param category - Category selected by the user.
     */
    protected selectModalCategory(category: Category): void {
        this.selectedModalCategory.set(category);
        this.touchedCategory.set(true);
        this.isDropdownOpen.set(false);
    }

    /**
     * Marks category dropdown as touched on blur.
     */
    protected markCategoryTouched(): void {
        this.touchedCategory.set(true);
    }

    /**
     * Updates survey title signal state.
     * @param val - Title text string.
     */
    protected updateTitle(val: string): void {
        this.surveyTitle.set(val);
    }

    /**
     * Marks survey title input as touched on blur.
     */
    protected markTitleTouched(): void {
        this.touchedTitle.set(true);
    }

    /**
     * Updates expiration date signal state.
     * @param val - Expiration date string.
     */
    protected updateEndDate(val: string): void {
        this.endDate.set(val);
    }

    /**
     * Updates description signal state.
     * @param val - Description text string.
     */
    protected updateDescription(val: string): void {
        this.description.set(val);
    }

    /**
     * Appends a new question item to the questions list (max limit 6).
     */
    protected addQuestion(): void {
        if (this.questions().length >= 6) return;
        this.questions.update((q) => [
            ...q,
            { questionText: '', allowMultiple: false, answerOptions: ['', ''] }
        ]);
    }

    /**
     * Handles click on question trash button. 
     * For the first question (index 0), it always clears the text.
     * For subsequent questions (index > 0): 
     * - First click clears the text if text is present.
     * - Second click (or if text is already empty) removes the entire question section.
     * @param qIndex - Question index.
     */
    protected handleQuestionTrash(qIndex: number): void {
        if (qIndex === 0) {
            this.updateQuestionText(0, '');
        } else {
            const currentText = this.questions()[qIndex].questionText;
            if (currentText.trim().length > 0) {
                this.updateQuestionText(qIndex, '');
            } else {
                this.removeQuestion(qIndex);
            }
        }
    }

    /**
     * Removes a question form item by index.
     * @param index - Target question index.
     */
    protected removeQuestion(index: number): void {
        if (this.questions().length <= 1) return;
        this.questions.update((q) => q.filter((_, i) => i !== index));
    }

    /**
     * Updates question text string by target index.
     * @param index - Targeted question index.
     * @param val - New question text.
     */
    protected updateQuestionText(index: number, val: string): void {
        this.questions.update((q) => {
            const updated = [...q];
            updated[index] = { ...updated[index], questionText: val };
            return updated;
        });
    }

    /**
     * Marks a specific question text input as touched on blur.
     * @param index - Question index.
     */
    protected markQuestionTouched(index: number): void {
        this.touchedQuestions.update((t) => ({ ...t, [index]: true }));
    }

    /**
     * Toggles multiple choice allowance for a question item.
     * @param index - Targeted question index.
     * @param val - Checkbox selection state.
     */
    protected updateAllowMultiple(index: number, val: boolean): void {
        this.questions.update((q) => {
            const updated = [...q];
            updated[index] = { ...updated[index], allowMultiple: val };
            return updated;
        });
    }

    /**
     * Updates specific answer option string within a targeted question.
     * @param qIndex - Question index.
     * @param oIndex - Option index.
     * @param val - Option text string.
     */
    protected updateAnswerOption(qIndex: number, oIndex: number, val: string): void {
        this.questions.update((q) => {
            const updated = [...q];
            const options = [...updated[qIndex].answerOptions];
            options[oIndex] = val;
            updated[qIndex] = { ...updated[qIndex], answerOptions: options };
            return updated;
        });
    }

    /**
     * Handles click on answer option trash button. Clears input if <= 2 options, removes option otherwise.
     * @param qIndex - Question index.
     * @param oIndex - Option index.
     */
    protected handleAnswerTrash(qIndex: number, oIndex: number): void {
        const currentOptions = this.questions()[qIndex].answerOptions;
        if (currentOptions.length <= 2) {
            this.updateAnswerOption(qIndex, oIndex, '');
        } else {
            this.removeAnswerOption(qIndex, oIndex);
        }
    }

    /**
     * Appends an answer option entry to a question item (max limit 6).
     * @param qIndex - Targeted question index.
     */
    protected addAnswerOption(qIndex: number): void {
        this.showMaxAnswersHint.set(true);
        this.questions.update((q) => {
            if (q[qIndex].answerOptions.length >= 6) return q;
            const updated = [...q];
            const options = [...updated[qIndex].answerOptions, ''];
            updated[qIndex] = { ...updated[qIndex], answerOptions: options };
            return updated;
        });
    }

    /**
     * Removes an answer option entry from a question item.
     * @param qIndex - Question index.
     * @param oIndex - Option index to remove.
     */
    protected removeAnswerOption(qIndex: number, oIndex: number): void {
        this.questions.update((q) => {
            if (q[qIndex].answerOptions.length <= 2) return q;
            const updated = [...q];
            const options = updated[qIndex].answerOptions.filter((_, i) => i !== oIndex);
            updated[qIndex] = { ...updated[qIndex], answerOptions: options };
            return updated;
        });
    }

    /**
     * Resets form signals to default initial state.
     */
    private resetForm(): void {
        this.surveyTitle.set('');
        this.endDate.set('');
        this.description.set('');
        this.selectedModalCategory.set(null);
        this.questions.set([
            { questionText: '', allowMultiple: false, answerOptions: ['', ''] }
        ]);
        this.showMaxAnswersHint.set(false);
        this.showSuccessOverlay.set(false);
        this.createdPollId.set(null);
        this.touchedTitle.set(false);
        this.touchedCategory.set(false);
        this.touchedQuestions.set({});
        this.touchedAnswers.set({});
    }

    /**
     * Marks all fields as touched to trigger error messages if the user clicks publish prematurely.
     */
    private markAllAsTouched(): void {
        this.touchedTitle.set(true);
        this.touchedCategory.set(true);
        const qTouched: Record<number, boolean> = {};
        const aTouched: Record<string, boolean> = {};
        this.questions().forEach((q, qIndex) => {
            qTouched[qIndex] = true;
            q.answerOptions.forEach((_, oIndex) => {
                aTouched[`${qIndex}_${oIndex}`] = true;
            });
        });
        this.touchedQuestions.set(qTouched);
        this.touchedAnswers.set(aTouched);
    }

    /**
     * Submits survey creation form data to Supabase if valid, 
     * or triggers all validation error states if invalid.
     */
    protected async onSubmitPoll(): Promise<void> {
        this.markAllAsTouched();
        if (!this.isFormValid()) return;
        const payload = buildPollPayload(
            this.surveyTitle(),
            this.description(),
            this.selectedModalCategory(),
            this.endDate()
        );
        const qPayload = this.questions().map((q) => ({
            question_text: q.questionText,
            allow_multiple: q.allowMultiple,
            options: q.answerOptions
        }));
        const createdId = await this.supabaseService.createPoll(payload, qPayload);
        if (createdId) {
            this.createdPollId.set(createdId);
            this.showSuccessOverlay.set(true);
        }
    }

    /**
     * Closes success overlay notification and notifies parent about new poll creation.
     */
    protected closeSuccessOverlay(): void {
        const pollId = this.createdPollId();
        this.showSuccessOverlay.set(false);
        this.closeModal();
        if (pollId) {
            this.pollCreated.emit(pollId);
        }
        this.createdPollId.set(null);
    }
}