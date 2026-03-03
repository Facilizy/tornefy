import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Shield,
  Bell,
  Sparkles,
  Plug,
  Gamepad2,
  UserRound,
} from "lucide-react";

export type AccountSectionKey =
  | "resumo"
  | "transacoes"
  | "retiradas"
  | "seguranca"
  | "perguntas"
  | "dados"
  | "personalizacao"
  | "integracoes"
  | "organizador";

type SidebarItem =
  | {
      kind: "section";
      key: AccountSectionKey;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      group?: string;
      requiresRole?: "organizer";
    }
  | {
      kind: "action";
      id:
        | "notifications"
        | "faq"
        | "discord"
        | "organizer"
        | "logout";
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      group?: string;
      requiresRole?: "organizer";
      tone?: "normal" | "danger";
    };

const items: SidebarItem[] = [
  { kind: "section", key: "resumo", label: "Resumo", icon: LayoutDashboard, group: "Menu" },
  { kind: "section", key: "transacoes", label: "Transações", icon: FileText, group: "TorneCoins" },
  { kind: "section", key: "retiradas", label: "Minhas retiradas", icon: CreditCard, group: "TorneCoins" },

  { kind: "section", key: "dados", label: "Meus dados", icon: UserRound, group: "Perfil" },
  { kind: "section", key: "personalizacao", label: "Personalização", icon: Sparkles, group: "Perfil" },
  { kind: "section", key: "integracoes", label: "Contas e integrações", icon: Plug, group: "Perfil" },

  { kind: "section", key: "perguntas", label: "Perguntas", icon: MessageSquare, group: "Comunidade" },
  { kind: "action", id: "notifications", label: "Notificações", icon: Bell, group: "Comunidade" },

  { kind: "section", key: "seguranca", label: "Segurança", icon: Shield, group: "Conta" },

  { kind: "section", key: "organizador", label: "Minhas scrims", icon: Gamepad2, group: "Organizador", requiresRole: "organizer" },

  { kind: "action", id: "logout", label: "Sair", icon: LogOut, group: "Conta", tone: "danger" },
];

export function AccountSidebar({
  value,
  onChange,
  onAction,
  role,
  className,
}: {
  value: AccountSectionKey;
  onChange: (next: AccountSectionKey) => void;
  onAction: (actionId: "notifications" | "faq" | "discord" | "organizer" | "logout") => void;
  role?: "player" | "organizer" | "admin" | null;
  className?: string;
}) {
  const visible = items.filter((it) => {
    if (it.requiresRole === "organizer") return role === "organizer" || role === "admin";
    return true;
  });

  const groups = visible.reduce((acc, item) => {
    const g = item.group || "Menu";
    acc[g] ||= [];
    acc[g].push(item);
    return acc;
  }, {} as Record<string, SidebarItem[]>);

  return (
    <aside className={cn("overflow-hidden rounded-xl border border-border bg-card/40", className)}>
      <div className="p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Conta</p>
      </div>
      <ScrollArea className="max-h-none">
        <div className="px-2 pb-3">
          {Object.entries(groups).map(([group, groupItems]) => (
            <div key={group} className="mb-3">
              <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group}
              </div>
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const active = item.kind === "section" ? value === item.key : false;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.kind === "section" ? item.key : item.id}
                      type="button"
                      variant={active ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-2",
                        active && "bg-primary/10 text-primary hover:bg-primary/15",
                        item.kind === "action" && item.tone === "danger" && "hover:text-destructive"
                      )}
                      onClick={() => {
                        if (item.kind === "section") onChange(item.key);
                        else onAction(item.id);
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
