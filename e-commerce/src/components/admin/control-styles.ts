/** Scoped utility overrides keep the storefront primitives reusable in the admin. */
export const adminControlClasses = [
  "[&_button]:font-[inherit] [&_input]:font-[inherit] [&_select]:font-[inherit] [&_textarea]:font-[inherit]",
  "[&_label]:grid [&_label]:gap-2 [&_label]:text-sm [&_fieldset]:min-w-0 [&_fieldset]:rounded-2xl [&_fieldset]:border [&_fieldset]:border-white/12 [&_fieldset]:p-4 max-[640px]:[&_fieldset]:p-3",
  "[&_input:not([type=hidden])]:min-h-12 [&_input:not([type=hidden])]:w-full [&_input:not([type=hidden])]:rounded-xl [&_input:not([type=hidden])]:border [&_input:not([type=hidden])]:border-white/15 [&_input:not([type=hidden])]:bg-[#171815] [&_input:not([type=hidden])]:p-3 [&_input:not([type=hidden])]:text-sm [&_input:not([type=hidden])]:text-[#f5f6f0]",
  "[&_textarea]:w-full [&_textarea]:max-w-full [&_[role=combobox]]:min-h-12 [&_[role=combobox]]:rounded-xl [&_[role=combobox]]:border [&_[role=combobox]]:border-white/15 [&_[role=combobox]]:bg-[#171815] [&_[role=combobox]]:p-3 [&_[role=combobox]]:text-sm [&_[role=combobox]]:text-[#f5f6f0] [&_[role=combobox][aria-disabled=true]]:pointer-events-none [&_[role=combobox][aria-disabled=true]]:opacity-45",
  "max-[640px]:[&_input:not([type=hidden])]:text-base max-[640px]:[&_textarea]:text-base max-[640px]:[&_[role=combobox]]:text-base",
  "[&_.app-button]:min-h-11! [&_.app-button]:rounded-full! [&_.app-button]:text-xs! [&_.app-button]:tracking-normal! [&_.app-button:not(:disabled):hover]:transform-none! [&_.app-button:not(:disabled):hover]:shadow-none!",
  "[&_.app-button--primary]:border-[#b9f879]! [&_.app-button--primary]:bg-[#b9f879]! [&_.app-button--primary]:text-[#10160a]! [&_.app-button--primary:not(:disabled):hover]:bg-[#cefca0]!",
  "[&_.app-button--outline]:border-white/15! [&_.app-button--outline]:bg-white/2! [&_.app-button--outline]:text-[#f5f6f0]! [&_.app-button--outline:not(:disabled):hover]:border-[#b9f879]/40! [&_.app-button--outline:not(:disabled):hover]:bg-[#35382f]! [&_.app-button--outline:not(:disabled):hover]:text-[#b9f879]!",
  "[&_.app-checkbox]:rounded-lg! [&_.app-checkbox]:px-2.5! [&_.app-checkbox]:py-2! [&_.app-checkbox[aria-checked=true]]:border-[#b9f879]/40! [&_.app-checkbox[aria-checked=true]]:bg-[#b9f879]/8! [&_.app-checkbox:not(:disabled):hover]:border-white/20! [&_.app-checkbox:not(:disabled):hover]:bg-white/5!",
  "[&_:is(input,select,button,a,textarea,[role=combobox]):focus-visible]:outline-2! [&_:is(input,select,button,a,textarea,[role=combobox]):focus-visible]:outline-offset-4! [&_:is(input,select,button,a,textarea,[role=combobox]):focus-visible]:outline-[#b9f879]!",
  "[&_:is(p,h1,h2,h3,legend,dd)]:wrap-anywhere [&_pre]:whitespace-pre-wrap [&_pre]:wrap-anywhere [&_pre]:text-sm",
].join(" ");
