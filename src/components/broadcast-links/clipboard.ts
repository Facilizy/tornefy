import { toast } from "sonner";

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copiado!");
  } catch {
    toast.error("Não foi possível copiar. Copie manualmente.");
  }
}
