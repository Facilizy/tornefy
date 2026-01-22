import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setSeo } from "@/lib/seo";
import { useI18n } from "@/i18n";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    setSeo({
      title: `404 • ${t("404.title")}`,
      description: t("404.subtitle"),
      canonical: window.location.origin + location.pathname,
    });
  }, [location.pathname, t]);

  return (
    <MainLayout>
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Card className="border-border bg-card/50 p-6 md:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">404</p>
                <h1 className="mt-1 text-2xl md:text-3xl font-black uppercase text-foreground">
                  {t("404.title")}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{t("404.subtitle")}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => navigate(-1)}>
                {t("404.back")}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link to="/">{t("404.goHome")}</Link>
              </Button>
            </div>

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("404.quickLinks")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild type="button" variant="ghost" className="h-9">
                  <Link to="/">{t("nav.home")}</Link>
                </Button>
                <Button asChild type="button" variant="ghost" className="h-9">
                  <Link to="/scrims">{t("nav.scrims")}</Link>
                </Button>
                <Button asChild type="button" variant="ghost" className="h-9">
                  <Link to="/equipes">{t("nav.teams")}</Link>
                </Button>
              </div>
            </div>
          </Card>

          <p className="mt-4 text-xs text-muted-foreground">
            Rota: <span className="font-mono">{location.pathname}</span>
          </p>
        </div>
      </main>
    </MainLayout>
  );
};

export default NotFound;
