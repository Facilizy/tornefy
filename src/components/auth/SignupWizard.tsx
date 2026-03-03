import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Mail } from "lucide-react";
import { SignupStep1 } from "./signup/Step1";
import { SignupStep2 } from "./signup/Step2";
import { SignupStep3 } from "./signup/Step3";

interface SignupWizardProps {
    currentStep: 1 | 2 | 3;
    formData: any;
    setFormData: any;
    loading: boolean;
    showPassword: boolean;
    setShowPassword: any;
    acceptedTerms: boolean;
    setAcceptedTerms: any;
    signupAwaitingEmail: boolean;
    signupEmail: string;
    emailCtaClicked: boolean;
    goToNextStep: () => void;
    goToPrevStep: () => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    handleOpenEmailProvider: () => void;
    getWebmailUrlForEmail: (email: string) => string | null;
    onSwitchToLogin: () => void;
}

export function SignupWizard({
    currentStep,
    formData,
    setFormData,
    loading,
    showPassword,
    setShowPassword,
    acceptedTerms,
    setAcceptedTerms,
    signupAwaitingEmail,
    signupEmail,
    emailCtaClicked,
    goToNextStep,
    goToPrevStep,
    onSubmit,
    handleOpenEmailProvider,
    getWebmailUrlForEmail,
    onSwitchToLogin,
}: SignupWizardProps) {
    if (signupAwaitingEmail) {
        return (
            <div className="space-y-6 py-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-border">
                    <Mail className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Verifique seu e-mail</h3>
                    <p className="text-sm text-muted-foreground">
                        Enviamos um link de confirmação para <span className="font-medium text-foreground">{signupEmail || "seu e-mail"}</span>.
                    </p>
                </div>

                <div className="space-y-2">
                    <Button
                        type="button"
                        className="w-full"
                        onClick={handleOpenEmailProvider}
                        disabled={!signupEmail}
                    >
                        Entrar no e-mail
                    </Button>

                    {(emailCtaClicked || !getWebmailUrlForEmail(signupEmail)) && (
                        <Button type="button" variant="outline" className="w-full" onClick={onSwitchToLogin}>
                            Fazer login
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit}>
            {/* HUD */}
            <div className="space-y-3 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cadastro · Passo {currentStep}/3
                </p>
                <Progress
                    value={(currentStep / 3) * 100}
                    className="h-2 bg-muted overflow-hidden"
                    aria-label="Progresso do cadastro"
                />
            </div>

            <div className="animate-fade-in">
                {currentStep === 1 && (
                    <SignupStep1
                        formData={formData}
                        setFormData={setFormData}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                    />
                )}
                {currentStep === 2 && (
                    <SignupStep2 formData={formData} setFormData={setFormData} />
                )}
                {currentStep === 3 && (
                    <SignupStep3
                        formData={formData}
                        setFormData={setFormData}
                        acceptedTerms={acceptedTerms}
                        setAcceptedTerms={setAcceptedTerms}
                    />
                )}
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={goToPrevStep}
                    disabled={currentStep === 1 || loading}
                    className="flex-1"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>

                {currentStep < 3 ? (
                    <Button
                        type="button"
                        onClick={goToNextStep}
                        disabled={loading}
                        className="flex-1"
                    >
                        Prosseguir
                    </Button>
                ) : (
                    <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-primary hover:bg-primary/90"
                    >
                        {loading ? "Criando..." : "Criar conta"}
                    </Button>
                )}
            </div>
        </form>
    );
}
