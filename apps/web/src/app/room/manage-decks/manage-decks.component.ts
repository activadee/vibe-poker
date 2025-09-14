import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiCardComponent } from '../../ui/card/card.component';
import { UiButtonDirective } from '../../ui/button.directive';
import { UiInputDirective } from '../../ui/input.directive';
import { UiFocusTrapDirective } from '../../ui/focus-trap.directive';

export interface EditableDeck {
  id: string;
  name: string;
  values: string[];
}

@Component({
  selector: 'app-manage-decks',
  standalone: true,
  imports: [CommonModule, FormsModule, UiCardComponent, UiButtonDirective, UiInputDirective, UiFocusTrapDirective],
  templateUrl: './manage-decks.component.html',
  styleUrls: ['./manage-decks.component.css'],
})
export class ManageDecksComponent {
  @Input() open = false;
  @Input() decks: EditableDeck[] = [];
  @Output() dismiss = new EventEmitter<void>();
  @Output() upsert = new EventEmitter<EditableDeck>();
  @Output() del = new EventEmitter<string>();

  // Simple create form state
  modelId = '';
  modelName = '';
  valuesTextarea = '';

  resetForm() {
    this.modelId = '';
    this.modelName = '';
    this.valuesTextarea = '';
  }

  save() {
    const id = (this.modelId || '').trim();
    const name = (this.modelName || '').trim();
    const values = (this.valuesTextarea || '')
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter((v) => !!v);
    if (!id || !name || values.length === 0) return;
    if (values.length > 50 || values.some((v) => v.length > 8)) return;
    this.upsert.emit({ id, name, values });
    this.resetForm();
    this.dismiss.emit();
  }

  deleteDeck(id: string) {
    const v = (id || '').trim();
    if (!v) return;
    this.del.emit(v);
  }
}
