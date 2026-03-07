(function () {
  const VERSION = '1.3.2';
  let deferredInstallPrompt = null;
  function getBanner() { return document.getElementById('pwa-banner'); }
  function isStandalone() { return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; }
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
  function dismissInstallBanner() {
    const banner = getBanner();
    if (banner) banner.style.display = 'none';
    window.appStore?.writeText(window.appStore.keys.installDismissed, '1');
  }
  function showInstallBanner() {
    if (isStandalone()) return;
    if (window.appStore?.readText(window.appStore.keys.installDismissed)) return;
    const banner = getBanner();
    if (banner) banner.style.display = 'flex';
  }
  async function installPWA() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') dismissInstallBanner();
      deferredInstallPrompt = null;
      return;
    }
    const msg = isIos()
      ? 'In Safari, tap Share, then “Add to Home Screen.”'
      : 'Use your browser menu and choose “Install app” or “Add to Home Screen.”';
    if (typeof window.showToast === 'function') window.showToast(msg); else alert(msg);
  }
  function checkVersion() {
    const cached = window.appStore?.readText(window.appStore.keys.version);
    if (cached && cached !== VERSION) {
      window.appStore?.writeText(window.appStore.keys.version, VERSION);
      window.location.reload();
      return;
    }
    window.appStore?.writeText(window.appStore.keys.version, VERSION);
  }
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstallPrompt = event; showInstallBanner(); });
  window.addEventListener('appinstalled', dismissInstallBanner);
  window.addEventListener('DOMContentLoaded', () => { checkVersion(); setTimeout(showInstallBanner, 1200); });
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker registration failed', error));
  });
  window.installPWA = installPWA;
  window.dismissInstallBanner = dismissInstallBanner;
  window.showInstallBanner = showInstallBanner;
})();
