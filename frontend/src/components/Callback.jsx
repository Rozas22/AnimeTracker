import React, { useEffect, useState } from 'react';
import { Loader, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Callback({ onTokenSuccess, onTokenError }) {
  const [status, setStatus] = useState('exchanging'); // 'exchanging' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setStatus('error');
      setErrorMessage(`AniList retornó un error: ${errorParam}`);
      onTokenError && onTokenError(errorParam);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No se encontró el código de autorización en la URL.');
      return;
    }

    // Exchange the code for the token
    const exchangeCode = async () => {
      try {
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Falló el intercambio de token en el servidor.');
        }

        setStatus('success');
        
        // Notify parent application after a short delay for smooth transitions
        setTimeout(() => {
          onTokenSuccess(data.access_token);
        }, 1500);

      } catch (error) {
        console.error('Error al intercambiar token:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Error de red o del servidor al conectar con AniList.');
        onTokenError && onTokenError(error.message);
      }
    };

    exchangeCode();
  }, [onTokenSuccess, onTokenError]);

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
      {status === 'exchanging' && (
        <>
          <div className="loader"></div>
          <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>Iniciando sesión...</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Intercambiando el código de autorización de forma segura con nuestro servidor...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{ color: 'var(--color-accent-green)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <CheckCircle size={64} />
          </div>
          <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>¡Autenticación Exitosa!</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Hemos recibido tu access token. Redirigiéndote de vuelta...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ color: '#ef4444', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <AlertTriangle size={64} />
          </div>
          <h2 style={{ marginBottom: '1rem', fontFamily: 'var(--font-display)', color: '#fca5a5' }}>
            Error de Autenticación
          </h2>
          <div className="alert alert-error" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <span>{errorMessage}</span>
          </div>
          <a href="/" className="btn-secondary">
            Volver al inicio
          </a>
        </>
      )}
    </div>
  );
}
