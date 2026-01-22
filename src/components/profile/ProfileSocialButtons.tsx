import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Instagram, MessageCircle, Twitter, Youtube } from "lucide-react";

type SocialLinks = {
  discord_url?: string | null;
  discord_contact?: string | null;
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

function extractHandle(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(safeUrl(url));
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[0] ? parts[0].replace(/^@/, "") : "";
    return last ? `@${last}` : null;
  } catch {
    return null;
  }
}

export function ProfileSocialButtons({
  links,
  className,
}: {
  links: SocialLinks;
  className?: string;
}) {
  const items = [
    links.discord_url
      ? {
          key: "discord",
          label: "Discord",
          href: safeUrl(links.discord_url),
          sub: links.discord_contact || null,
          icon: <MessageCircle className="h-4 w-4" />,
        }
      : null,
    links.twitter_url
      ? {
          key: "twitter",
          label: "X",
          href: safeUrl(links.twitter_url),
          sub: extractHandle(links.twitter_url),
          icon: <Twitter className="h-4 w-4" />,
        }
      : null,
    links.instagram_url
      ? {
          key: "instagram",
          label: "Instagram",
          href: safeUrl(links.instagram_url),
          sub: extractHandle(links.instagram_url),
          icon: <Instagram className="h-4 w-4" />,
        }
      : null,
    links.youtube_url
      ? {
          key: "youtube",
          label: "YouTube",
          href: safeUrl(links.youtube_url),
          sub: null,
          icon: <Youtube className="h-4 w-4" />,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    href: string;
    sub: string | null;
    icon: React.ReactNode;
  }>;

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 justify-start md:justify-end", className)}>
      {items.map((it) => (
        <a
          key={it.key}
          href={it.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-2xl bg-background/40 backdrop-blur",
              "hover:bg-accent/30 hover:border-primary/30",
              "active:scale-[0.98] motion-reduce:transform-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "motion-reduce:transition-none"
            )}
            aria-label={it.label}
          >
            {it.icon}
          </Button>
          <div className="hidden md:flex flex-col -space-y-0.5">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors motion-reduce:transition-none">
              {it.label}
            </span>
            {it.sub ? (
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors motion-reduce:transition-none">
                {it.sub}
              </span>
            ) : null}
          </div>
        </a>
      ))}
    </div>
  );
}
