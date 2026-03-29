"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
  form?: string;
  name?: string;
  value?: string;
  confirmMessage?: string;
};

export function SubmitButton({
  children,
  className,
  pendingText = "Kasitellaan...",
  disabled,
  form,
  name,
  value,
  confirmMessage
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      form={form}
      name={name}
      value={value}
      onClick={(event) => {
        if (!confirmMessage || pending || disabled) return;
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <span className="submit-button-content">
        <span>{pending ? pendingText : children}</span>
      </span>
    </button>
  );
}
