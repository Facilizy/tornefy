import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

interface SignupStep3Props {
    formData: any;
    setFormData: any;
    acceptedTerms: boolean;
    setAcceptedTerms: any;
}

const GAMES = [
    { id: "free_fire", name: "Free Fire", logo: "/game-logos/free-fire.png" },
    { id: "blood_strike", name: "Blood Strike", logo: "/game-logos/blood-strike.png" },
    { id: "farlight_84", name: "Farlight 84", logo: "/game-logos/farlight-84.png" },
    { id: "prime_rush", name: "Prime Rush", logo: "/game-logos/prime-rush.png" },
    { id: "pubg_mobile", name: "PUBG Mobile", logo: "/game-logos/pubg-mobile.png" },
];

export function SignupStep3({
    formData,
    setFormData,
    acceptedTerms,
    setAcceptedTerms,
}: SignupStep3Props) {
    const setPreferredGames = (games: string[]) => {
        setFormData((prev: any) => ({ ...prev, preferredGames: games }));
    };

    return (
        <div className="space-y-5 pt-2">
            <div className="space-y-3">
                <Label>Jogos favoritos</Label>
                <ToggleGroup
                    type="multiple"
                    value={formData.preferredGames}
                    onValueChange={(value) => setPreferredGames(value)}
                    className="grid grid-cols-1 gap-3"
                >
                    {GAMES.map((game) => (
                        <ToggleGroupItem
                            key={game.id}
                            value={game.id}
                            aria-label={game.name}
                            className="w-full justify-start gap-3 px-3 py-3 h-auto rounded-lg border border-border bg-background/30 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                            <img
                                src={game.logo}
                                alt={game.name}
                                loading="lazy"
                                className="w-8 h-8 rounded object-cover"
                            />
                            <span className="flex-1 font-medium text-left">{game.name}</span>
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-background/30 p-3">
                <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(v) => setAcceptedTerms(Boolean(v))}
                    className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    Aceito os{" "}
                    <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
                        Termos de Uso
                    </Link>
                    {" "}e a{" "}
                    <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                        Política de Privacidade
                    </Link>
                </Label>
            </div>
        </div>
    );
}
