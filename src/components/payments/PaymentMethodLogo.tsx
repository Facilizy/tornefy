import * as React from "react";
import { cn } from "@/lib/utils";

export type PaymentMethodLogoKind =
  | "auto"
  | "pix"
  | "card"
  | "boleto"
  | "gpay"
  | "applepay";

function Svg({
  className,
  children,
  viewBox = "0 0 24 24",
}: {
  className?: string;
  viewBox?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={viewBox}
      className={cn("h-6 w-6", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function PaymentMethodLogo({
  kind,
  className,
}: {
  kind: PaymentMethodLogoKind;
  className?: string;
}) {
  // Monochrome (currentColor) marks to avoid external assets and keep theme.
  switch (kind) {
    case "pix":
      return (
        <Svg className={className} viewBox="0 0 24 24">
          <path
            d="M7.2 4.8C8.2 3.8 9.6 3.2 11 3.2h2c1.4 0 2.8.6 3.8 1.6l1.4 1.4c.6.6.6 1.6 0 2.2l-1.6 1.6c-1 1-2.6 1-3.6 0l-.7-.7c-.6-.6-1.6-.6-2.2 0l-.7.7c-1 1-2.6 1-3.6 0L5.2 8.4c-.6-.6-.6-1.6 0-2.2L7.2 4.8Z"
            className="stroke-current"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M16.8 19.2c-1 1-2.4 1.6-3.8 1.6h-2c-1.4 0-2.8-.6-3.8-1.6l-1.4-1.4c-.6-.6-.6-1.6 0-2.2l1.6-1.6c1-1 2.6-1 3.6 0l.7.7c.6.6 1.6.6 2.2 0l.7-.7c1-1 2.6-1 3.6 0l1.6 1.6c.6.6.6 1.6 0 2.2l-1.4 1.4Z"
            className="stroke-current"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case "card":
      return (
        <Svg className={className}>
          <rect
            x="3"
            y="6"
            width="18"
            height="12"
            rx="2.5"
            className="stroke-current"
            strokeWidth="1.8"
          />
          <path d="M3 10h18" className="stroke-current" strokeWidth="1.8" />
          <path
            d="M7 15h5"
            className="stroke-current"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </Svg>
      );

    case "boleto":
      return (
        <Svg className={className}>
          <rect
            x="5"
            y="4"
            width="14"
            height="16"
            rx="2.5"
            className="stroke-current"
            strokeWidth="1.8"
          />
          <path
            d="M8 9v7M11 9v7M14 9v7M17 9v7"
            className="stroke-current"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </Svg>
      );

    case "gpay":
      return (
        <Svg className={className} viewBox="0 0 24 24">
          <path
            d="M6.2 16.6c-1.9 0-3.4-1.4-3.4-3.3S4.3 10 6.2 10c1.1 0 1.8.4 2.4 1l-1 1c-.3-.3-.7-.5-1.4-.5-.9 0-1.7.8-1.7 1.8s.8 1.8 1.7 1.8c.7 0 1.1-.3 1.4-.6.2-.2.3-.4.3-.7H6.2v-1.3h3.3c.1.2.1.5.1.8 0 2-1.4 3.4-3.4 3.4Z"
            className="fill-current"
          />
          <path
            d="M12.7 16.6c-1.8 0-3.2-1.3-3.2-3.1s1.4-3.1 3.2-3.1 3.2 1.3 3.2 3.1-1.4 3.1-3.2 3.1Zm0-1.4c.9 0 1.6-.7 1.6-1.7s-.7-1.7-1.6-1.7-1.6.7-1.6 1.7.7 1.7 1.6 1.7Z"
            className="fill-current"
          />
          <path
            d="M18.9 16.6c-1.8 0-3.2-1.3-3.2-3.1s1.4-3.1 3.2-3.1c.9 0 1.6.4 2 1l-1.3.8c-.2-.3-.4-.4-.7-.4-.8 0-1.4.7-1.4 1.7s.6 1.7 1.4 1.7c.4 0 .6-.2.8-.5l1.3.8c-.4.7-1.2 1.1-2.1 1.1Z"
            className="fill-current"
          />
          <path
            d="M11.2 20.2V10.8h1.6v.9h.1c.3-.5 1-.9 1.8-.9 1.7 0 2.9 1.4 2.9 3.1 0 1.7-1.2 3.1-2.9 3.1-.7 0-1.4-.3-1.7-.8h-.1v4h-1.7Zm3.2-4.6c.9 0 1.5-.8 1.5-1.7 0-1-.6-1.7-1.5-1.7-.9 0-1.5.8-1.5 1.7 0 1 .6 1.7 1.5 1.7Z"
            className="fill-current"
          />
        </Svg>
      );

    case "applepay":
      return (
        <Svg className={className} viewBox="0 0 24 24">
          <path
            d="M15.9 6.7c-.5.6-1.3 1-2.1 1-.1-.8.2-1.6.7-2.1.5-.6 1.4-1 2.1-1 .1.8-.2 1.6-.7 2.1Z"
            className="fill-current"
          />
          <path
            d="M19.1 16.9c-.6 1.4-1.4 2.8-2.5 2.8-1 0-1.3-.6-2.5-.6s-1.6.6-2.6.6c-1.1 0-2-1.2-2.6-2.6-1.4-3.2-.8-5.9.6-7.1.9-.8 1.9-.9 2.5-.9 1 0 1.8.6 2.5.6.6 0 1.6-.7 2.8-.6.5 0 1.9.2 2.8 1.5-.1.1-1.7 1-1.7 2.9 0 2.3 2 3 2.1 3-.1.3-.2.4-.4.9Z"
            className="fill-current"
          />
        </Svg>
      );

    case "auto":
    default:
      return (
        <Svg className={className}>
          <path
            d="M12 2.8a6.2 6.2 0 0 0-6.2 6.2v1.2H5a2 2 0 0 0-2 2v6.3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6.3a2 2 0 0 0-2-2h-.8V9A6.2 6.2 0 0 0 12 2.8Zm-4.4 7.4V9A4.4 4.4 0 0 1 12 4.6 4.4 4.4 0 0 1 16.4 9v1.2H7.6Z"
            className="fill-current"
          />
        </Svg>
      );
  }
}
