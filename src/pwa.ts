import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

// Registra o Service Worker do PWA
// - autoUpdate: mantém o SW atualizado em background
export function registerPWA() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast("Atualização disponível", {
        description: "Clique para atualizar o app.",
        action: {
          label: "Atualizar agora",
          onClick: () => {
            updateSW();
            window.location.reload();
          },
        },
      });
    },
    onOfflineReady() {
      // aqui poderíamos avisar que está pronto para uso offline
    },
  });
}
