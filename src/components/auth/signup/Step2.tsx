import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SignupStep2Props {
    formData: any;
    setFormData: any;
}

export function SignupStep2({ formData, setFormData }: SignupStep2Props) {
    return (
        <div className="space-y-4 pt-2">
            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    type="text"
                    placeholder="seu_username"
                    value={formData.username}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            username: e.target.value.toLowerCase().replace(/\s/g, ""),
                        })
                    }
                    className="bg-background/50 border-border"
                />
            </div>

            <div className="space-y-3">
                <Label>Tipo de Conta</Label>
                <RadioGroup
                    value={formData.role}
                    onValueChange={(value: "player" | "organizer") =>
                        setFormData({ ...formData, role: value })
                    }
                    className="flex gap-4"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="player" id="player" />
                        <Label htmlFor="player" className="cursor-pointer">
                            Jogador
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="organizer" id="organizer" />
                        <Label htmlFor="organizer" className="cursor-pointer">
                            Organizador
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            {formData.role === "organizer" && (
                <div className="space-y-2">
                    <Label htmlFor="inviteCode">Código de Indicação</Label>
                    <Input
                        id="inviteCode"
                        type="text"
                        placeholder="Digite o código de indicação"
                        value={formData.inviteCode}
                        onChange={(e) =>
                            setFormData({ ...formData, inviteCode: e.target.value })
                        }
                        className="bg-background/50 border-border"
                    />
                </div>
            )}
        </div>
    );
}
