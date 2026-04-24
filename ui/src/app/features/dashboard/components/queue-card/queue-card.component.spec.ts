import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueueCardComponent } from './queue-card.component';
import { QueueWithActiveTask } from '../../../queue/models/queue.model';
import { Task } from '../../../queue/models/task.model';

describe('QueueCardComponent', () => {
  let component: QueueCardComponent;
  let fixture: ComponentFixture<QueueCardComponent>;

  const mockQueue: QueueWithActiveTask = {
    id: 'q1',
    user_id: 'u1',
    name: 'Work',
    description: 'Work Desc',
    created_at: '2026-04-10',
    updated_at: '2026-04-10',
    activeTask: undefined
  };

  const mockTask: Task = {
    id: 't1',
    queue_id: 'q1',
    title: 'Active Task',
    impact: 5,
    urgency: 5,
    relevance: 5,
    effort: 1,
    priority: 7.0,
    status: 'Active',
    created_at: '2026-04-10',
    updated_at: '2026-04-10'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueueCardComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(QueueCardComponent);
    component = fixture.componentInstance;
    component.queue = mockQueue;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display queue name and description', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain('Work');
    expect(compiled.querySelector('p')?.textContent).toContain('Work Desc');
  });

  it('should show "No active task" when activeTask is undefined', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No active task');
  });

  it('should show active task info when provided', () => {
    // Create a new component instance to avoid ExpressionChangedAfterItHasBeenCheckedError
    fixture = TestBed.createComponent(QueueCardComponent);
    component = fixture.componentInstance;
    component.queue = { ...mockQueue, activeTask: mockTask };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Active Task');
    expect(compiled.textContent).toContain('7.00');
  });

  it('should emit edit event on onEdit', () => {
    const spy = vi.spyOn(component.edit, 'emit');
    component.onEdit(new MouseEvent('click'));
    expect(spy).toHaveBeenCalledWith(mockQueue);
  });

  it('should emit delete event on onDelete', () => {
    const spy = vi.spyOn(component.delete, 'emit');
    component.onDelete(new MouseEvent('click'));
    expect(spy).toHaveBeenCalledWith(mockQueue);
  });
});
