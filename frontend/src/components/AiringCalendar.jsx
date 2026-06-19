import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 0, name: 'Domingo' }
];

const AiringCalendar = ({ animeList }) => {
  const [expandedDay, setExpandedDay] = useState(new Date().getDay()); // Default to today

  const airingData = useMemo(() => {
    const buckets = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    
    // Filter CURRENT and having nextAiringEpisode
    const airingList = animeList?.filter(entry => entry.status === 'CURRENT' && entry.media?.nextAiringEpisode?.airingAt) || [];
    
    airingList.forEach(entry => {
      const airingAt = entry.media.nextAiringEpisode.airingAt * 1000;
      const date = new Date(airingAt);
      const dayOfWeek = date.getDay(); // 0-6
      
      buckets[dayOfWeek].push({
        id: entry.media.id,
        title: entry.media.title.userPreferred,
        cover: entry.media.coverImage.large,
        episode: entry.media.nextAiringEpisode.episode,
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: airingAt
      });
    });

    // Sort each bucket by time
    Object.keys(buckets).forEach(day => {
      buckets[day].sort((a, b) => a.timestamp - b.timestamp);
    });

    return buckets;
  }, [animeList]);

  const totalAiring = Object.values(airingData).flat().length;

  if (totalAiring === 0 && (!animeList || animeList.length === 0)) {
    return null; // Still loading or empty
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: 0 }}>
        <Calendar size={20} style={{ color: 'var(--accent)' }} />
        Calendario de Emisión
      </h2>
      
      <div className="airing-calendar-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {DAYS_OF_WEEK.map((day) => {
          const isExpanded = expandedDay === day.id;
          const items = airingData[day.id] || [];
          const hasItems = items.length > 0;
          const isToday = new Date().getDay() === day.id;

          return (
            <div key={day.id} className="airing-day-group" style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              overflow: 'hidden'
            }}>
              <button 
                onClick={() => setExpandedDay(isExpanded ? null : day.id)}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '1rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {hasItems ? (
                    <div className="neon-dot pulse-anim" style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: 'var(--accent)',
                      boxShadow: '0 0 8px var(--accent)'
                    }} />
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                  )}
                  <span style={{ 
                    fontWeight: isToday ? 'bold' : 'normal', 
                    color: isToday ? 'var(--accent)' : (hasItems ? 'var(--color-text-primary)' : 'var(--color-text-secondary)')
                  }}>
                    {day.name}
                  </span>
                  {hasItems && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      background: 'rgba(255,255,255,0.1)', 
                      padding: '0.1rem 0.5rem', 
                      borderRadius: '12px',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {items.length}
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--color-text-secondary)' }} /> : <ChevronDown size={18} style={{ color: 'var(--color-text-secondary)' }} />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {hasItems ? items.map(anime => (
                        <div key={anime.id} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1rem',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '0.75rem',
                          borderRadius: '8px'
                        }}>
                          <img 
                            src={anime.cover} 
                            alt={anime.title} 
                            style={{ 
                              width: '40px', 
                              height: '56px', 
                              objectFit: 'cover', 
                              borderRadius: '4px' 
                            }} 
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              marginBottom: '0.2rem'
                            }}>
                              {anime.title}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem', 
                              fontSize: '0.8rem', 
                              color: 'var(--accent)' 
                            }}>
                              <Clock size={12} />
                              <span>{anime.time} • Ep {anime.episode}</span>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.9rem',
                          background: 'rgba(0,0,0,0.1)',
                          borderRadius: '8px'
                        }}>
                          No hay episodios programados para este día.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AiringCalendar;
