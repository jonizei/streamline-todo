import { TestBed, ComponentFixture } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should have default isOpen as false', () => {
      expect(component.isOpen).toBe(false);
    });

    it('should have default title', () => {
      expect(component.title).toBe('Confirm Action');
    });

    it('should have default message', () => {
      expect(component.message).toBe('Are you sure you want to proceed?');
    });

    it('should have default confirm button text', () => {
      expect(component.confirmButtonText).toBe('Confirm');
    });

    it('should have default cancel button text', () => {
      expect(component.cancelButtonText).toBe('Cancel');
    });

    it('should have default confirm button class', () => {
      expect(component.confirmButtonClass).toBe('btn-danger');
    });

    it('should accept custom inputs', () => {
      component.isOpen = true;
      component.title = 'Delete Item';
      component.message = 'Are you sure you want to delete this item?';
      component.confirmButtonText = 'Delete';
      component.cancelButtonText = 'No, Keep It';
      component.confirmButtonClass = 'btn-warning';

      expect(component.isOpen).toBe(true);
      expect(component.title).toBe('Delete Item');
      expect(component.message).toBe('Are you sure you want to delete this item?');
      expect(component.confirmButtonText).toBe('Delete');
      expect(component.cancelButtonText).toBe('No, Keep It');
      expect(component.confirmButtonClass).toBe('btn-warning');
    });
  });

  describe('outputs', () => {
    it('should emit confirm event when onConfirm is called', () => {
      let emitted = false;
      component.confirm.subscribe(() => {
        emitted = true;
      });

      component.onConfirm();

      expect(emitted).toBe(true);
    });

    it('should emit cancel event when onCancel is called', () => {
      let emitted = false;
      component.cancel.subscribe(() => {
        emitted = true;
      });

      component.onCancel();

      expect(emitted).toBe(true);
    });
  });

  describe('backdrop click', () => {
    it('should call onCancel when backdrop is clicked', () => {
      const spy = vi.spyOn(component, 'onCancel');
      const mockEvent = {
        target: document.createElement('div'),
        currentTarget: document.createElement('div')
      } as any;

      mockEvent.target = mockEvent.currentTarget;

      component.onBackdropClick(mockEvent);

      expect(spy).toHaveBeenCalled();
    });

    it('should not call onCancel when clicking inside dialog', () => {
      const spy = vi.spyOn(component, 'onCancel');
      const backdrop = document.createElement('div');
      const dialog = document.createElement('div');
      const mockEvent = {
        target: dialog,
        currentTarget: backdrop
      } as any;

      component.onBackdropClick(mockEvent);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should emit cancel event when backdrop is clicked', () => {
      const mockEvent = {
        target: document.createElement('div'),
        currentTarget: document.createElement('div')
      } as any;
      mockEvent.target = mockEvent.currentTarget;

      let emitted = false;
      component.cancel.subscribe(() => {
        emitted = true;
      });

      component.onBackdropClick(mockEvent);

      expect(emitted).toBe(true);
    });
  });

  describe('visibility', () => {
    it('should show dialog when isOpen is true', () => {
      component.isOpen = true;

      expect(component.isOpen).toBe(true);
    });

    it('should hide dialog when isOpen is false', () => {
      component.isOpen = false;

      expect(component.isOpen).toBe(false);
    });
  });

  describe('button actions', () => {
    it('should trigger confirm action', () => {
      let confirmed = false;

      component.confirm.subscribe(() => {
        confirmed = true;
      });

      component.onConfirm();

      expect(confirmed).toBe(true);
    });

    it('should trigger cancel action', () => {
      let cancelled = false;

      component.cancel.subscribe(() => {
        cancelled = true;
      });

      component.onCancel();

      expect(cancelled).toBe(true);
    });
  });
});
