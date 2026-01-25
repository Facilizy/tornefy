import { cn } from "@/lib/utils";

type DefaultAvatarMarkProps = {
  className?: string;
  title?: string;
};

/**
 * Marca padrão para quando não existir avatar/logo.
 * Usa `currentColor` para respeitar tokens sem hardcode de cores.
 */
export function DefaultAvatarMark({
  className,
  title = "Marca padrão Tornefy",
}: DefaultAvatarMarkProps) {
  return (
    <svg
      width="21"
      height="16"
      viewBox="0 0 21 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn("h-5 w-5", className)}
    >
      <path
        d="M10.9305 3.20587C9.44571 3.20587 8.57488 3.81975 8.31811 5.04774L6.19164 15.0616C7.77358 15.0615 9.14006 13.9554 9.47016 12.4082L10.5622 7.29151C10.6069 7.06838 10.696 6.95669 10.8298 6.9566C10.9191 6.9566 11.0085 7.05153 11.0978 7.24119L14.0284 14.1238C14.1512 14.4252 14.3243 14.6595 14.5476 14.827C14.782 14.9944 15.0108 15.0947 15.2341 15.1282C15.4573 15.1729 15.7253 15.1952 16.0379 15.1952C17.4667 15.1952 18.3094 14.5702 18.5662 13.32L20.693 3.3395C19.1115 3.3395 17.7455 4.44637 17.4175 5.9935L16.3225 11.1599C16.2889 11.3496 16.2051 11.4445 16.0712 11.4445C15.9931 11.4444 15.915 11.3495 15.8369 11.1599L12.873 4.21028C12.5827 3.54053 11.9351 3.20587 10.9305 3.20587Z"
        fill="currentColor"
      />
      <path
        d="M0.0438442 -1.90735e-06C-0.214623 1.20648 0.705191 2.34431 1.93904 2.34441H3.56097C3.73317 2.34441 3.86169 2.50289 3.8259 2.67133L1.90271 11.7217C3.66011 11.7217 5.17813 10.4925 5.54347 8.77348L6.90947 2.34441H8.86598C10.2643 2.34434 11.4725 1.36732 11.7656 -1.90735e-06H0.0438442Z"
        fill="currentColor"
      />
    </svg>
  );
}
