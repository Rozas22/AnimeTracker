import React, { useState, useEffect, useRef } from 'react';
import { Gift, ChevronLeft, ChevronRight, Settings, Sparkles, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminPrizeModal from './AdminPrizeModal';

const ADMIN_ID = '7952169';

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function MonthlyPrizeCarousel({ user }) {
  const [prize, setPrize] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef(null);

  const isAdmin = user?.id?.toString() === ADMIN_ID;

  // ─── Carga inicial del premio ───────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // 1. Cargar caché local primero para respuesta instantánea
    try {
      const cached = localStorage.getItem('kurama_monthly_prize');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.title) {
          setPrize(parsed);
          setIsLoading(false);
        }
      }
    } catch (e) {
      console.warn('Error leyendo caché local de premio:', e);
    }

    // 2. Consultar al servidor
    const fetchPrize = async () => {
      try {
        const res = await fetch('/api/prizes');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.prize) {
          setPrize(data.prize);
          try {
            localStorage.setItem('kurama_monthly_prize', JSON.stringify(data.prize));
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Fallo consultando /api/prizes:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPrize();
    return () => { isMounted = false; };
  }, []);

  // ─── Rotación automática cada 4 segundos ─────────────────────────
  const images = (prize?.images && prize.images.length > 0) ? prize.images : [];

  useEffect(() => {
    if (images.length <= 1 || isHovered || isAdminModalOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images.length, isHovered, isAdminModalOpen]);

  // Si el array de fotos cambia o se reduce, asegurar índice válido
  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(0);
    }
  }, [images.length, currentIndex]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const now = new Date();
  const displayMonth = prize?.month ? MONTH_NAMES[prize.month] : MONTH_NAMES[now.getMonth() + 1];
  const displayYear = prize?.year || now.getFullYear();

  // Si no hay premio creado y no es admin, mostrar una tarjeta atractiva por defecto anunciando los premios
  const hasCustomPrize = prize && prize.title;

  return (
    <>
      <div
        className="monthly-prize-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(220, 38, 38, 0.08), rgba(0, 0, 0, 0.4))',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '20px',
          padding: '1.25rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
      >
        {/* Glow de fondo */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '160px',
            height: '160px',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        {/* ─── Encabezado de la tarjeta ─────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            position: 'relative',
            zIndex: 1,
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                color: '#f59e0b',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.4rem'
              }}
            >
              <Gift size={13} />
              Premio de {displayMonth} {displayYear}
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.35rem',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(90deg, #fff, #fbbf24)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.3
              }}
            >
              {hasCustomPrize ? prize.title : '¡Gran Premio de la Liga Mensual!'}
            </h3>
            {hasCustomPrize && prize.description && (
              <p
                style={{
                  margin: '0.35rem 0 0 0',
                  fontSize: '0.88rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.45,
                  maxWidth: '560px'
                }}
              >
                {prize.description}
              </p>
            )}
            {!hasCustomPrize && (
              <p
                style={{
                  margin: '0.35rem 0 0 0',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)'
                }}
              >
                El participante que consiga el 1er puesto este mes se llevará una recompensa exclusiva.
              </p>
            )}
          </div>

          {/* Botón restringido SOLO para el Admin */}
          {isAdmin && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.2))',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                color: '#f59e0b',
                padding: '0.5rem 0.9rem',
                borderRadius: '12px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)',
                flexShrink: 0
              }}
              title="Panel de Administrador para modificar el premio y fotos"
            >
              <Settings size={15} />
              Gestionar Premio
            </button>
          )}
        </div>

        {/* ─── Carrusel de Imágenes ─────────────────────────────────── */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}
        >
          {images.length > 0 ? (
            <>
              {/* Imagen activa con animación suave */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentIndex}
                  src={images[currentIndex]}
                  alt={`Premio del mes foto ${currentIndex + 1}`}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeInOut' }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/600x300?text=Premio+del+Mes';
                  }}
                />
              </AnimatePresence>

              {/* Degradado sutil inferior para legibilidad */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '60px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                  pointerEvents: 'none'
                }}
              />

              {/* Flecha Izquierda */}
              {images.length > 1 && (
                <button
                  onClick={handlePrev}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.55)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
                    backdropFilter: 'blur(4px)',
                    transition: '0.2s'
                  }}
                  aria-label="Foto anterior"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Flecha Derecha */}
              {images.length > 1 && (
                <button
                  onClick={handleNext}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.55)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
                    backdropFilter: 'blur(4px)',
                    transition: '0.2s'
                  }}
                  aria-label="Siguiente foto"
                >
                  <ChevronRight size={20} />
                </button>
              )}

              {/* Indicador de posición (Badge 1 / 3) */}
              {images.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    zIndex: 2,
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  {currentIndex + 1} / {images.length}
                </div>
              )}

              {/* Dots indicadores */}
              {images.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '6px',
                    zIndex: 2
                  }}
                >
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      style={{
                        width: idx === currentIndex ? '22px' : '7px',
                        height: '7px',
                        borderRadius: '4px',
                        background: idx === currentIndex ? '#f59e0b' : 'rgba(255, 255, 255, 0.4)',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      aria-label={`Ir a foto ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Estado vacío cuando aún no hay fotos subidas */
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: 'var(--color-text-secondary)'
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                  color: '#f59e0b'
                }}
              >
                <Gift size={32} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff', marginBottom: '0.25rem' }}>
                Premio de este mes en preparación
              </div>
              <div style={{ fontSize: '0.8rem', maxWidth: '320px', margin: '0 auto' }}>
                {isAdmin
                  ? 'Como administrador, pulsa en "Gestionar Premio" para subir las fotos y la descripción.'
                  : '¡Compite en los Quizzes diarios y sube en el ranking para reclamarlo al final del mes!'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal de Administración ──────────────────────────────── */}
      {isAdmin && (
        <AdminPrizeModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          currentPrize={prize}
          user={user}
          onSaveSuccess={(updatedPrize) => {
            setPrize(updatedPrize);
            setCurrentIndex(0);
          }}
        />
      )}
    </>
  );
}
