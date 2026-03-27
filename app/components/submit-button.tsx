"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { NoemaLoader } from "@/app/components/noema-loader";

type SubmitButtonProps = {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
  form?: string;
  name?: string;
  value?: string;
  confirmMessage?: string;
  loadingVariant?: "spinner" | "idea-network" | "noema";
};

export function SubmitButton({
  children,
  className,
  pendingText = "Kasitellaan...",
  disabled,
  form,
  name,
  value,
  confirmMessage,
  loadingVariant = "noema"
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
        {pending ? (
          loadingVariant === "spinner" ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <NoemaLoader label={pendingText} />
          )
        ) : null}
        <span>{pending ? pendingText : children}</span>
      </span>
    </button>
  );
}
