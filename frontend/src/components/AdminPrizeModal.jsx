import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, Trash2, Image, Sparkles, AlertCircle, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ADMIN_ID = '7952169';

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function AdminPrizeModal({ isOpen, onClose, currentPrize, onSaveSuccess, user }) {
  const now = new Date();
  const [month, setMonth] = useState(currentPrize?.month || (now.getMonth() + 1));
  const [year, setYear] = useState(currentPrize?.year || now.getFullYear());
  const [title, setTitle] = useState(currentPrize?.title || '');
  const [description, setDescription] = useState(currentPrize?.description || '');
  const [images, setImages] = useState(currentPrize?.images || []);
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sincronizar datos si cambia el premio inicial al abrir
  useEffect(() => {
    if (isOpen) {
      setMonth(currentPrize?.month || (now.getMonth() + 1));
      setYear(currentPrize?.year || now.getFullYear());
      setTitle(currentPrize?.title || '');
      setDescription(currentPrize?.description || '');
      setImages(currentPrize?.images || []);
      setUrlInput('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentPrize]);

  // Guardia estricta de seguridad
  if (!isOpen || user?.id?.toString() !== ADMIN_ID) {
    return null;
  }

  // ─── Compresión y optimización de imagen local ──────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    setIsProcessingFile(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Redimensionar para optimizar peso (máx 1200px de ancho/alto)
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a JPEG optimizado
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.84);
        setImages((prev) => [...prev, optimizedDataUrl]);
        setIsProcessingFile(false);
      };
      img.onerror = () => {
        setErrorMsg('Error al procesar la imagen seleccionada.');
        setIsProcessingFile(false);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setErrorMsg('No se pudo leer el archivo.');
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);

    // Resetear el input para permitir subir el mismo archivo de nuevo si se desea
    e.target.value = '';
  };

  // ─── Añadir por URL directa ─────────────────────────────────────
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('El enlace debe comenzar con https://');
      return;
    }

    setImages((prev) => [...prev, trimmed]);
    setUrlInput('');
    setErrorMsg('');
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // ─── Guardar cambios ────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Por favor escribe un título para el premio.');
      return;
    }

    if (images.length === 0) {
      setErrorMsg('Debes añadir al menos una imagen para el carrusel.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      adminId: user.id.toString(),
      month: parseInt(month),
      year: parseInt(year),
      title: title.trim(),
      description: description.trim(),
      images: images,
      is_active: true
    };

    try {
      const res = await fetch('/api/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Fallo al guardar en el servidor.');
      }

      // Guardar también en localStorage como respaldo instantáneo
      const savedPrize = data.prize || { ...payload, id: 'local_' + Date.now() };
      try {
        localStorage.setItem('kurama_monthly_prize', JSON.stringify(savedPrize));
      } catch (storageErr) {
        console.warn('No se pudo guardar en localStorage (tamaño):', storageErr);
      }

      setSuccessMsg('¡Premio guardado con éxito!');
      if (onSaveSuccess) {
        onSaveSuccess(savedPrize);
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error al guardar premio:', err);
      // Respaldo local si la tabla aún no existe en Supabase
      const localPrize = { ...payload, id: 'local_' + Date.now() };
      try {
        localStorage.setItem('kurama_monthly_prize', JSON.stringify(localPrize));
        if (onSaveSuccess) onSaveSuccess(localPrize);
        setSuccessMsg('Guardado localmente. Recuerda ejecutar la migración SQL en Supabase para sincronización total.');
        setTimeout(() => onClose(), 1500);
      } catch (fallbackErr) {
        setErrorMsg('Error: ' + (err.message || 'No se pudo guardar el premio.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="modal-overlay" 
        onClick={onClose} 
        style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="modal-content card"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            borderRadius: '20px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            background: 'var(--bg-card, #1a1a24)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={22} style={{ color: '#f59e0b' }} />
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontFamily: 'var(--font-display)', color: '#f59e0b' }}>
                Gestionar Premio Mensual
              </h2>
            </div>
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '0.4rem', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#86efac', padding: '0.75rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Mes y Año */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Mes
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border-glass, rgba(255,255,255,0.15))', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.95rem' }}
                >
                  {MONTH_NAMES.slice(1).map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1} style={{ background: '#1e1e2d', color: '#fff' }}>
                      {mName}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Año
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || now.getFullYear())}
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid var(--border-glass, rgba(255,255,255,0.15))', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Título */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Título del Premio *
              </label>
              <input
                type="text"
                placeholder="Ej: Figura de Kurama Naruto Shippuden / Suscripción Crunchyroll"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-glass, rgba(255,255,255,0.15))', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* Descripción */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Descripción y Reglas (Opcional)
              </label>
              <textarea
                placeholder="Ej: El ganador del 1er puesto de la Liga Mensual recibirá este premio en su domicilio o vía digital."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-glass, rgba(255,255,255,0.15))', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* Subida de Fotos */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                Fotos del Carrusel ({images.length} añadidas)
              </label>

              {/* Botón de subida de archivo */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.1rem',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(255, 152, 0, 0.1))',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '10px',
                    color: '#f59e0b',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: isProcessingFile ? 'wait' : 'pointer',
                    transition: '0.2s'
                  }}
                >
                  <Upload size={16} />
                  {isProcessingFile ? 'Procesando foto...' : 'Subir foto desde dispositivo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isProcessingFile}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Input para URL directa */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="url"
                  placeholder="O pega el enlace de una foto (https://...)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
                  style={{ flex: 1, padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-glass, rgba(255,255,255,0.15))', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.88rem' }}
                />
                <button
                  type="button"
                  onClick={handleAddUrl}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <Plus size={16} /> Añadir
                </button>
              </div>

              {/* Galería de miniaturas añadidas */}
              {images.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '90px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: '#0a0a0f'
                      }}
                    >
                      <img
                        src={imgSrc}
                        alt={`Foto ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=Error'; }}
                      />
                      <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px' }}>
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(239, 68, 68, 0.85)',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        title="Eliminar foto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.15)', color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
                  <Image size={28} style={{ opacity: 0.5, marginBottom: '0.4rem' }} />
                  <div>No has añadido ninguna foto aún. Sube una foto o pega un enlace.</div>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isSaving}
                style={{ flex: 1, padding: '0.85rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={isSaving || isProcessingFile}
                style={{
                  flex: 2,
                  padding: '0.85rem',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="spin-anim" /> Guardando...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Guardar Premio
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
