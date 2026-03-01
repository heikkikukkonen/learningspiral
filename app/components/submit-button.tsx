"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
};

export function SubmitButton({
  children,
  className,
  pendingText = "Loading...",
  disabled,
  name,
  value
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      name={name}
      value={value}
    >
      <span className="submit-button-content">
        {pending ? <span className="spinner" aria-hidden="true" /> : null}
        <span>{pending ? pendingText : children}</span>
      </span>
    </button>
  );
}
