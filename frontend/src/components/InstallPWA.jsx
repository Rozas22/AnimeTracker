import React, { useState, useEffect } from 'react';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setShowButton(true); // Always show button on iOS if not installed
    }

    // Standard PWA Installation Event (Android/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowButton(false);
    }
    setDeferredPrompt(null);
  };

  if (!showButton) return null;

  return (
    <>
      <button 
        onClick={handleInstallClick}
        className="btn-primary"
        style={{
          width: '100%',
          marginTop: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--color-accent) 0%, #d97706 100%)',
          border: 'none',
          boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Instalar App
      </button>

      {showIOSModal && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-bg-card)',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          zIndex: 10000,
          width: '90%',
          maxWidth: '350px',
          textAlign: 'center'
        }}
        className="fade-in"
        >
          <h4 style={{ marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Instalar en iOS</h4>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Para instalar esta aplicación, pulsa el botón <strong>Compartir</strong> en Safari (el icono del cuadrado con la flecha hacia arriba) y luego selecciona <strong>Añadir a pantalla de inicio</strong>.
          </p>
          <button 
            onClick={() => setShowIOSModal(false)}
            className="btn-secondary"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px' }}
          >
            Entendido
          </button>
        </div>
      )}
    </>
  );
};

export default InstallPWA;
