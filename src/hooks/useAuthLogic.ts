import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { consumePostAuthAction } from "./useAuthRedirects";

export interface AuthFormData {
    email: "";
    password: "";
    fullName: "";
    username: "";
    role: "player" | "organizer";
    inviteCode: "";
    preferredGames: string[];
}

// Valid organizer invite codes
const VALID_ORGANIZER_CODES = ["TORNEFYPREMIUM"];

export function useAuthLogic(isOAuthCompletion: boolean) {
    const navigate = useNavigate();
    const location = useLocation();

    const getAuthModeFromUrl = () => {
        const mode = new URLSearchParams(location.search).get("mode");
        return mode === "signup" ? "signup" : "login";
    };

    const [isLogin, setIsLogin] = useState(getAuthModeFromUrl() !== "signup");
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        fullName: "",
        username: "",
        role: "player" as "player" | "organizer",
        inviteCode: "",
        preferredGames: ["free_fire"] as string[],
    });

    const [forgotPassword, setForgotPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showSignupPassword, setShowSignupPassword] = useState(false);

    const [signupAwaitingEmail, setSignupAwaitingEmail] = useState(false);
    const signupEmail = useMemo(() => formData.email.trim(), [formData.email]);
    const [emailCtaClicked, setEmailCtaClicked] = useState(false);

    // Sync mode from URL (if not OAuth completion)
    useEffect(() => {
        if (isOAuthCompletion) return;
        setIsLogin(getAuthModeFromUrl() !== "signup");
    }, [location.search, isOAuthCompletion]);

    // Reset state on mode switch
    useEffect(() => {
        setAcceptedTerms(false);
        setCurrentStep(1);
        setSignupAwaitingEmail(false);
        setEmailCtaClicked(false);
        setShowLoginPassword(false);
        setShowSignupPassword(false);
    }, [isLogin, forgotPassword]);

    // OAuth Compeltion Prefill
    useEffect(() => {
        if (!isOAuthCompletion) return;

        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return; // not logged in

            // If username exists, completion is done
            const { data: profileData } = await supabase
                .from("profiles")
                .select("username")
                .eq("id", session.user.id)
                .maybeSingle();

            if (profileData?.username) {
                if (!consumePostAuthAction(navigate)) navigate("/");
                return;
            }

            const meta: any = session.user.user_metadata || {};
            const fullName = meta.full_name || meta.name || "";
            const avatarUrl = meta.avatar_url || meta.picture || meta.avatar || "";

            setIsLogin(false);
            setForgotPassword(false);
            setCurrentStep(2);
            setFormData((prev) => ({
                ...prev,
                fullName: fullName || prev.fullName,
                username: prev.username,
                role: prev.role || "player",
                preferredGames: prev.preferredGames?.length ? prev.preferredGames : ["free_fire"],
            }));

            // Background avatar update
            if (avatarUrl) {
                await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", session.user.id).catch(() => { });
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOAuthCompletion]);

    const setAuthMode = (mode: "login" | "signup") => {
        if (isOAuthCompletion) return;
        const params = new URLSearchParams(location.search);
        params.delete("complete");
        params.set("mode", mode);
        navigate(`/auth?${params.toString()}`, { replace: true });
        setForgotPassword(false);
        setIsLogin(mode === "login");
    };

    const validatePassword = (password: string): boolean => {
        if (password.length < 8) {
            toast.error("A senha deve ter no mínimo 8 caracteres");
            return false;
        }
        if (!/[A-Z]/.test(password)) {
            toast.error("A senha deve conter pelo menos uma letra maiúscula");
            return false;
        }
        if (!/[a-z]/.test(password)) {
            toast.error("A senha deve conter pelo menos uma letra minúscula");
            return false;
        }
        if (!/[0-9]/.test(password)) {
            toast.error("A senha deve conter pelo menos um número");
            return false;
        }
        if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
            toast.error("A senha deve conter pelo menos um caractere especial");
            return false;
        }
        return true;
    };

    const goToNextStep = () => {
        if (currentStep === 1) {
            if (!formData.email.trim()) {
                toast.error("Informe seu e-mail");
                return;
            }
            if (!formData.password) {
                toast.error("Informe sua senha");
                return;
            }
            setCurrentStep(2);
            return;
        }

        if (currentStep === 2) {
            if (!formData.username || formData.username.trim().length < 3) {
                toast.error("Defina um username com pelo menos 3 caracteres");
                return;
            }

            if (formData.role === "organizer") {
                const code = formData.inviteCode.trim();
                if (!code) {
                    toast.error("Informe o código de indicação");
                    return;
                }
                if (code.toLowerCase() !== "tornefypremium") {
                    toast.error("Código de indicação inválido");
                    return;
                }
            }

            setCurrentStep(3);
        }
    };

    const goToPrevStep = () => {
        setCurrentStep((prev) => (prev === 1 ? 1 : (prev - 1) as 1 | 2 | 3));
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (forgotPassword) {
                const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
                    redirectTo: `${window.location.origin}/auth`,
                });

                if (error) throw error;
                toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
                setForgotPassword(false);
            } else if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });

                if (error) throw error;
                toast.success("Login realizado com sucesso!");
                if (!consumePostAuthAction(navigate)) navigate("/");
            } else {
                // Sign Up or OAuth Completion
                if (isOAuthCompletion) {
                    const { data: { session } } = await supabase.auth.getSession();

                    if (!session?.user) {
                        toast.error("Sessão inválida. Faça login novamente.");
                        navigate("/auth?mode=login", { replace: true });
                        return;
                    }

                    if (!acceptedTerms) {
                        toast.error("Você precisa aceitar os termos e diretrizes da plataforma");
                        return;
                    }

                    const desiredUsername = (formData.username || "").trim();
                    if (!desiredUsername || desiredUsername.length < 3) {
                        toast.error("Defina um username com pelo menos 3 caracteres");
                        return;
                    }

                    const { data: usernameOwner, error: usernameLookupError } = await supabase
                        .from("profiles")
                        .select("id")
                        .eq("username", desiredUsername)
                        .maybeSingle();

                    if (usernameLookupError) throw usernameLookupError;
                    if (usernameOwner?.id && usernameOwner.id !== session.user.id) {
                        toast.error("Este username já está em uso. Tente outro.");
                        return;
                    }

                    if (!formData.preferredGames || formData.preferredGames.length === 0) {
                        toast.error("Selecione pelo menos um jogo preferido");
                        return;
                    }

                    if (formData.role === "organizer") {
                        const code = formData.inviteCode.trim();
                        if (!code || code.toLowerCase() !== "tornefypremium") {
                            toast.error("Código de indicação inválido para criar conta de organizador");
                            return;
                        }
                    }

                    const uid = session.user.id;
                    const { error: upsertError } = await supabase
                        .from("profiles")
                        .upsert(
                            {
                                id: uid,
                                full_name: formData.fullName || null,
                                username: desiredUsername,
                                role: formData.role,
                                preferred_games: formData.preferredGames,
                            } as any,
                            { onConflict: "id" }
                        );

                    if (upsertError) throw upsertError;

                    // Role assignment
                    await (supabase as any)
                        .from("user_roles")
                        .upsert(
                            { user_id: uid, role: formData.role, assigned_at: new Date().toISOString() },
                            { onConflict: "user_id" }
                        ).catch(() => { });

                    toast.success("Perfil completo! Bem-vindo(a).");
                    if (!consumePostAuthAction(navigate)) navigate("/");
                    return;
                }

                // Normal Signup
                if (!validatePassword(formData.password)) {
                    setLoading(false);
                    return;
                }

                if (!acceptedTerms) {
                    toast.error("Você precisa aceitar os termos e diretrizes da plataforma");
                    setLoading(false);
                    return;
                }

                // ... (validations repeated from goToNextStep but final check) ...
                if (!formData.username || formData.username.trim().length < 3) {
                    toast.error("Defina um username com pelo menos 3 caracteres");
                    setLoading(false);
                    return;
                }

                const { error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.fullName,
                            username: formData.username,
                            role: formData.role,
                            preferred_games: formData.preferredGames,
                        },
                        emailRedirectTo: `${window.location.origin}/auth?mode=login`,
                    },
                });

                if (error) throw error;

                setSignupAwaitingEmail(true);
                toast.success("Conta criada! Verifique seu e-mail para confirmar.");
            }
        } catch (error: any) {
            toast.error(error.message || "Erro ao autenticar");
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = async (provider: "google" | "discord") => {
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth?complete=1`,
                },
            });
            if (error) throw error;
            if (data?.url) window.location.assign(data.url);
        } catch (e: any) {
            toast.error(e?.message || `Erro ao entrar com ${provider}`);
            setLoading(false);
        }
    };

    const getWebmailUrlForEmail = (email: string) => {
        const at = email.lastIndexOf("@");
        if (at <= 0) return null;
        const domain = email.slice(at + 1).trim().toLowerCase();
        if (!domain) return null;

        const known: Record<string, string> = {
            "gmail.com": "https://mail.google.com/",
            "googlemail.com": "https://mail.google.com/",
            "outlook.com": "https://outlook.live.com/mail/",
            "hotmail.com": "https://outlook.live.com/mail/",
            "live.com": "https://outlook.live.com/mail/",
            "msn.com": "https://outlook.live.com/mail/",
            "yahoo.com": "https://mail.yahoo.com/",
            "ymail.com": "https://mail.yahoo.com/",
        };
        return known[domain] || null;
    };

    const handleOpenEmailProvider = () => {
        const url = getWebmailUrlForEmail(signupEmail);
        if (!url) {
            setAuthMode("login");
            return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
        setEmailCtaClicked(true);
    };

    return {
        isLogin,
        loading,
        formData,
        setFormData,
        forgotPassword,
        setForgotPassword,
        acceptedTerms,
        setAcceptedTerms,
        currentStep,
        setCurrentStep,
        showLoginPassword,
        setShowLoginPassword,
        showSignupPassword,
        setShowSignupPassword,
        signupAwaitingEmail,
        emailCtaClicked,
        setAuthMode,
        goToNextStep,
        goToPrevStep,
        handleAuth,
        handleOAuthLogin,
        handleOpenEmailProvider,
        getWebmailUrlForEmail,
        signupEmail
    };
}
