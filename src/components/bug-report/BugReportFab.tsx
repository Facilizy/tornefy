import { useState } from "react";
import { Bug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BugReportDialog } from "@/components/bug-report/BugReportDialog";

export function BugReportFab({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          // mobile: fica acima do widget; desktop: fica ao lado do widget
          "fixed bottom-4 right-4 sm:bottom-24 md:bottom-4 md:right-[22rem]",
          "h-12 w-12 rounded-full border-destructive/40 bg-background/70 backdrop-blur",
          "text-destructive hover:bg-destructive/10",
          "shadow-lg z-50",
          className
        )}
        aria-label="Reportar bug"
        title="Reportar bug"
      >
        <Bug className="h-5 w-5" />
      </Button>

      <BugReportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
