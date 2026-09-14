import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('PollApp');
  protected readonly isOpen = signal(false);
  protected readonly selectedCategory = signal('');

  protected readonly categories = [
    'All Surveys',
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];

  protected toggleDropdown(): void {
    this.isOpen.update((value) => !value);
  }

  protected selectCategory(category: string, event: Event): void {
    event.stopPropagation();
    this.selectedCategory.set(category);
    this.isOpen.set(false);
  }
}