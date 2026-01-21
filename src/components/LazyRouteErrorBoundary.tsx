import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage?: string;
};

export class LazyRouteErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const msg = String((error as any)?.message || error || "");
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("LazyRouteErrorBoundary", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-lg p-6 bg-card border-border">
          <h1 className="text-xl font-black uppercase">Ops, algo falhou</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pode ser cache antigo do app após uma atualização. Recarregue para buscar a versão
            mais recente.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <Button type="button" onClick={this.handleReload}>
              Recarregar
            </Button>
            <Button type="button" variant="outline" onClick={() => this.setState({ hasError: false })}>
              Tentar novamente
            </Button>
          </div>

          {this.state.errorMessage ? (
            <pre className="mt-4 max-h-40 overflow-auto rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
              {this.state.errorMessage}
            </pre>
          ) : null}
        </Card>
      </div>
    );
  }
}
