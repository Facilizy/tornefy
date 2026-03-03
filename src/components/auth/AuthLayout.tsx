import { LanguageSelector } from "@/components/LanguageSelector";
import TornefyLogo from "@/components/TornefyLogo";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
}

export function AuthLayout({ children, title }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Simple Header for Auth */}
            <header className="absolute top-0 left-0 right-0 z-50 p-6">
                <div className="container mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <TornefyLogo className="h-8" />
                    </Link>
                    <LanguageSelector />
                </div>
            </header>

            <div className="relative overflow-hidden flex-1 flex flex-col justify-center">
                {/* Background effect */}
                <div className="pointer-events-none absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
                <div className="pointer-events-none absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

                <div className="container mx-auto px-4 py-24 relative z-10">
                    <div className="flex justify-center">
                        <div className="w-full max-w-md">
                            <div className="bg-card/50 border border-border rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                                <h2 className="text-2xl font-semibold mb-6 text-center">
                                    {title}
                                </h2>
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
