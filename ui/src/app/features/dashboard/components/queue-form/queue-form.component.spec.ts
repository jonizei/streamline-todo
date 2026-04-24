import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueueFormComponent } from './queue-form.component';
import { Queue } from '../../../queue/models/queue.model';

describe('QueueFormComponent', () => {
  let component: QueueFormComponent;
  let fixture: ComponentFixture<QueueFormComponent>;

  const mockQueue: Queue = {
    id: 'q1',
    user_id: 'u1',
    name: 'Work',
    description: 'Work Desc',
    created_at: '2026-04-10',
    updated_at: '2026-04-10'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueueFormComponent, ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(QueueFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values in create mode', () => {
    expect(component.queueForm.value).toEqual({
      name: '',
      description: ''
    });
  });

  it('should initialize form with queue data in edit mode', () => {
    component.queue = mockQueue;
    component.ngOnInit(); // Trigger form update
    expect(component.queueForm.value).toEqual({
      name: 'Work',
      description: 'Work Desc'
    });
  });

  it('should be invalid when name is empty', () => {
    component.queueForm.controls['name'].setValue('');
    expect(component.queueForm.valid).toBe(false);
  });

  it('should be valid when name is provided', () => {
    component.queueForm.controls['name'].setValue('New Queue');
    expect(component.queueForm.valid).toBe(true);
  });

  it('should emit save event on submit when form is valid', () => {
    const spy = vi.spyOn(component.save, 'emit');
    component.queueForm.setValue({
      name: 'Test Queue',
      description: 'Test Desc'
    });
    component.onSubmit();
    expect(spy).toHaveBeenCalledWith({
      name: 'Test Queue',
      description: 'Test Desc'
    });
  });

  it('should not emit save event on submit when form is invalid', () => {
    const spy = vi.spyOn(component.save, 'emit');
    component.queueForm.controls['name'].setValue('');
    component.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should emit cancel event on onCancel', () => {
    const spy = vi.spyOn(component.cancel, 'emit');
    component.onCancel();
    expect(spy).toHaveBeenCalled();
  });
});
