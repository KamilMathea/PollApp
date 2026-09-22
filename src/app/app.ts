import { Component, ElementRef, ViewChild, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { Category, Poll } from './interfaces/poll.interface';
import { SupabaseService } from './services/supabase';

@Component({
  imports: [RouterOutlet, FormsModule, DatePipe],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly supabaseService: SupabaseService = inject(SupabaseService);

  @ViewChild('surveyModal') private surveyModal!: ElementRef<HTMLDialogElement>;

  protected readonly title = signal('PollApp');
  protected readonly isOpen = signal(false);
  protected readonly selectedCategory = signal('All Surveys');
  protected readonly activeTab = signal<'active' | 'past'>('active');
  protected readonly polls = signal<Poll[]>([]);
  protected readonly dbCategories = signal<Category[]>([]);
  protected readonly isDropdownOpen = signal(false);
  protected readonly selectedModalCategory = signal<Category | null>(null);
  protected readonly surveyTitle = signal('');
  protected readonly endDate = signal('');
  protected readonly description = signal('');

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadCategories(),
      this.loadPolls()
    ]);
  }

  protected async loadCategories(): Promise<void> {
    const data = await this.supabaseService.getCategories();
    this.dbCategories.set(data);
  }

  protected async loadPolls(): Promise<void> {
    const data = await this.supabaseService.getPolls();
    this.polls.set(data);
  }

  protected readonly endingSoonPolls = computed(() => {
    const now = new Date().getTime();
    return this.polls()
      .filter((p) => p.expires_at && new Date(p.expires_at).getTime() > now)
      .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
      .slice(0, 3);
  });

  protected readonly filteredPolls = computed(() => {
    const now = new Date().getTime();
    const tab = this.activeTab();
    const cat = this.selectedCategory();

    return this.polls().filter((p) => {
      const isExpired = p.expires_at ? new Date(p.expires_at).getTime() < now : false;
      const matchesTab = tab === 'active' ? !isExpired : isExpired;
      const matchesCat = cat === 'All Surveys' || cat === '' || p.category?.name === cat;

      return matchesTab && matchesCat;
    });
  });

  protected setTab(tab: 'active' | 'past'): void {
    this.activeTab.set(tab);
  }

  protected toggleDropdown(): void {
    this.isOpen.update((v) => !v);
  }

  protected selectCategory(categoryName: string, event: Event): void {
    event.stopPropagation();
    this.selectedCategory.set(categoryName);
    this.isOpen.set(false);
  }

  protected openModal(): void {
    this.surveyModal.nativeElement.showModal();
  }

  protected closeModal(): void {
    this.resetForm();
    this.surveyModal.nativeElement.close();
  }

  protected toggleModalDropdown(): void {
    this.isDropdownOpen.update((v) => !v);
  }

  protected selectModalCategory(category: Category): void {
    this.selectedModalCategory.set(category);
    this.isDropdownOpen.set(false);
  }

  protected updateTitle(val: string): void {
    this.surveyTitle.set(val);
  }

  protected updateEndDate(val: string): void {
    this.endDate.set(val);
  }

  protected updateDescription(val: string): void {
    this.description.set(val);
  }

  private resetForm(): void {
    this.surveyTitle.set('');
    this.endDate.set('');
    this.description.set('');
    this.selectedModalCategory.set(null);
  }

  protected async onSubmitPoll(): Promise<void> {
    const payload = this.buildPollPayload();
    const result = await this.supabaseService.createPoll(payload);

    if (result) {
      await this.loadPolls();
      this.closeModal();
    }
  }

  private buildPollPayload() {
    const selectedCat = this.selectedModalCategory();

    return {
      title: this.surveyTitle(),
      description: this.description() || null,
      category_id: selectedCat ? selectedCat.id : null,
      expires_at: this.endDate() ? new Date(this.endDate()).toISOString() : null,
    };
  }

  protected formatRemainingTime(expiresAt?: string): string {
    if (!expiresAt) return 'No deadline';
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `Ends in ${days} day${days > 1 ? 's' : ''}`;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `Ends in ${hours} hour${hours > 1 ? 's' : ''}`;
  }
}