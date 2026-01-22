import { cn } from "@/lib/utils";
import { Instagram, MessageCircle, Twitter, Youtube } from "lucide-react";

type SocialLinks = {
  discord_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
};

function safeUrl(url: string) {
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `https://${u}`;
}

export function SocialLinksChips({
  links,
  className,
  size = "sm",
}: {
  links: SocialLinks;
  className?: string;
  size?: "sm" | "md";
}) {
  const items = [
    links.discord_url
      ? {
          label: "Discord",
          href: safeUrl(links.discord_url),
          icon: <MessageCircle className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />,
        }
      : null,
    links.twitter_url
      ? {
          label: "X",
          href: safeUrl(links.twitter_url),
          icon: <Twitter className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />,
        }
      : null,
    links.instagram_url
      ? {
          label: "Instagram",
          href: safeUrl(links.instagram_url),
          icon: <Instagram className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />,
        }
      : null,
    links.youtube_url
      ? {
          label: "YouTube",
          href: safeUrl(links.youtube_url),
          icon: <Youtube className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: React.ReactNode }>;

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border bg-background/40 text-muted-foreground backdrop-blur",
            "hover:text-foreground hover:bg-accent/30 hover:border-primary/30",
            "transition-colors motion-reduce:transition-none",
            size === "md" ? "px-3.5 py-1.5 text-sm" : "px-3 py-1 text-xs"
          )}
        >
          <span className="text-foreground/80">{it.icon}</span>
          <span className="whitespace-nowrap">{it.label}</span>
        </a>
      ))}
    </div>
  );
}
