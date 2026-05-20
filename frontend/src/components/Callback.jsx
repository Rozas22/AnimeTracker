import React, { useEffect, useState, useRef } from 'react';
import { Loader, AlertTriangle, CheckCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function Callback({ onTokenSuccess, onTokenError }) {
  const [status, setStatus] = useState('exchanging'); // 'exchanging' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const exchangeAttempted = useRef(false);

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
      const targetUrl = `${API_BASE_URL}/api/auth/token`;
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        }).catch(error => {
          console.log('Error de conexión:', error, 'al intentar conectar con:', targetUrl);
          throw error;
        });

        if (response.headers.get('content-type')?.includes('text/html')) {
          throw new Error(`El servidor devolvió HTML en lugar de JSON al conectar con ${targetUrl}. Revisa que la variable de entorno VITE_API_URL sea correcta.`);
        }

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
        // Ignorar silenciosamente errores de código usado (doble montaje StrictMode)
        const errMsg = error.message?.toLowerCase() || '';
        if (errMsg.includes('invalid_grant') || errMsg.includes('used')) {
          console.log('Ignorando error de código usado (posible montaje doble de React StrictMode).');
          return;
        }

        console.error('Error al intercambiar token:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Error de red o del servidor al conectar con AniList.');
        onTokenError && onTokenError(error.message);
      }
    };

    if (!exchangeAttempted.current) {
      exchangeAttempted.current = true;
      exchangeCode();
    }
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
