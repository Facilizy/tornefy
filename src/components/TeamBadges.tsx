import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Medal, 
  Star, 
  Target, 
  Award, 
  Crown,
  Flame,
  Swords
} from "lucide-react";

interface TeamBadge {
  id: string;
  badge_type: string;
  badge_count: number;
  earned_at: string;
}

interface TeamBadgesProps {
  badges: TeamBadge[];
  compact?: boolean;
}

const BADGE_CONFIG: Record<string, { 
  label: string; 
  icon: React.ComponentType<any>; 
  color: string;
  bgColor: string;
  description: string;
}> = {
  participation: {
    label: "Participações",
    icon: Target,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 border-blue-500/30",
    description: "Treinos participados",
  },
  victory: {
    label: "Vitórias",
    icon: Trophy,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20 border-yellow-500/30",
    description: "1º lugar em partidas",
  },
  top3: {
    label: "Top 3",
    icon: Medal,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20 border-amber-500/30",
    description: "Colocações no top 3",
  },
  top5: {
    label: "Top 5",
    icon: Star,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20 border-purple-500/30",
    description: "Colocações no top 5",
  },
  veteran: {
    label: "Veterano",
    icon: Award,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20 border-emerald-500/30",
    description: "10+ participações",
  },
  champion: {
    label: "Campeão",
    icon: Crown,
    color: "text-yellow-500",
    bgColor: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40",
    description: "5+ vitórias",
  },
  streak: {
    label: "Sequência",
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20 border-orange-500/30",
    description: "Vitórias consecutivas",
  },
};

export const TeamBadges = ({ badges, compact = false }: TeamBadgesProps) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  // Sort badges by importance
  const sortOrder = ["champion", "veteran", "victory", "top3", "top5", "participation", "streak"];
  const sortedBadges = [...badges].sort((a, b) => {
    return sortOrder.indexOf(a.badge_type) - sortOrder.indexOf(b.badge_type);
  });

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {sortedBadges.slice(0, 4).map((badge) => {
          const config = BADGE_CONFIG[badge.badge_type];
          if (!config) return null;
          const Icon = config.icon;
          
          return (
            <div
              key={badge.id}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${config.bgColor}`}
              title={`${config.label}: ${badge.badge_count} ${config.description}`}
            >
              <Icon className={`w-3 h-3 ${config.color}`} />
              <span className={config.color}>{badge.badge_count}</span>
            </div>
          );
        })}
        {badges.length > 4 && (
          <span className="text-xs text-muted-foreground">+{badges.length - 4}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Swords className="w-4 h-4 text-primary" />
        Conquistas
      </h4>
      <div className="flex flex-wrap gap-2">
        {sortedBadges.map((badge) => {
          const config = BADGE_CONFIG[badge.badge_type];
          if (!config) return null;
          const Icon = config.icon;
          
          return (
            <div
              key={badge.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} hover:scale-105 transition-transform cursor-default`}
              title={config.description}
            >
              <Icon className={`w-4 h-4 ${config.color}`} />
              <div className="flex flex-col">
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {badge.badge_count}x
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamBadges;
