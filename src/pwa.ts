import { registerSW } from "virtual:pwa-register";

// Registra o Service Worker do PWA
// - autoUpdate: mantém o SW atualizado em background
export function registerPWA() {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // aqui poderíamos mostrar um toast para o usuário atualizar
    },
    onOfflineReady() {
      // aqui poderíamos avisar que está pronto para uso offline
    },
  });
}
