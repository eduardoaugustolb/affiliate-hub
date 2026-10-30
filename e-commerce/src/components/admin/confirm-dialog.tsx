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
      className="fixed inset-0 m-auto max-h-[calc(100svh-2rem)] min-h-0 w-[min(30rem,calc(100vw-2rem))] min-w-0 overflow-y-auto rounded-3xl border border-[#ffffff12] bg-[#080908] p-[clamp(1.25rem,4vw,2rem)] text-[#f5f6f0] shadow-[0_1.5rem_5rem_#0008] backdrop:bg-[#000b] backdrop:backdrop-blur-[4px] motion-safe:transition-[opacity,transform,display] motion-safe:transition-discrete motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:translate-y-3 motion-safe:starting:scale-[0.98] motion-safe:starting:opacity-0"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <div className="grid gap-5 [&>*]:min-w-0">
        <h2
          id={titleId}
          className="text-xl leading-[1.4] [overflow-wrap:anywhere]"
        >
          {" "}
          {title}{" "}
        </h2>
        <p
          id={descriptionId}
          className="text-[#a5a8a0] leading-[1.6] [overflow-wrap:anywhere]"
        >
          {children}
        </p>
        <div className="flex flex-wrap justify-end gap-3 [&>.app-button]:flex-[1_1_auto]">
          <Button
            className="min-h-11! rounded-full! text-xs! tracking-normal! hover:transform-none! hover:shadow-none! focus-visible:outline-[#b9f879]! border-[#ffffff25]! bg-[#ffffff04]! text-[#f5f6f0]! enabled:hover:border-[#b9f87960]! enabled:hover:bg-[#35382f]! enabled:hover:text-[#b9f879]!"
            variant="outline"
            disabled={busy}
            onClick={onConfirm}
          >
            Confirmar exclusão
          </Button>
          <Button
            className="min-h-11! rounded-full! text-xs! tracking-normal! hover:transform-none! hover:shadow-none! focus-visible:outline-[#b9f879]! border-[#b9f879]! bg-[#b9f879]! text-[#10160a]!"
            ref={cancel}
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </dialog>
  );
}
