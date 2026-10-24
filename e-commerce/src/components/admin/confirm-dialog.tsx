"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { useScrollLock } from "@/components/providers/smooth-scroll";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  title,
  children,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useScrollLock(true);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    cancel.current?.focus();
    return () => {
      element?.close();
      queueMicrotask(() => {
        if (trigger instanceof HTMLElement && trigger.isConnected)
          trigger.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="admin admin-panel admin-confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="admin-stack">
        <h2 id={titleId}> {title} </h2>
        <p id={descriptionId} className="admin-muted">
          {children}
        </p>
        <div className="admin-dialog-actions">
          <Button variant="outline" disabled={busy} onClick={onConfirm}>
            Confirmar exclusão
          </Button>
          <Button ref={cancel} disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </dialog>
  );
}
