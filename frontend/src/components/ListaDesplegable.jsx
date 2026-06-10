import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Tv, Clock, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ListaDesplegable = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState({ COMPLETED: [], CURRENT: [], PLANNING: [] });
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState('COMPLETED');

  useEffect(() => {
    if (isOpen && !hasFetched && userId) {
      fetchLists();
    }
  }, [isOpen, userId, hasFetched]);

  const fetchLists = async () => {
    setLoading(true);
    const query = `
      query ($userId: Int) {
        MediaListCollection(userId: $userId, type: ANIME) {
          lists {
            status
            entries {
              media {
                id
                title { userPreferred }
                coverImage { medium }
              }
              status
              progress
            }
          }
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { userId: parseInt(userId, 10) } })
      });
      const data = await response.json();
      
      const newLists = { COMPLETED: [], CURRENT: [], PLANNING: [] };
      if (data.data?.MediaListCollection?.lists) {
        data.data.MediaListCollection.lists.forEach(listGroup => {
          if (listGroup.status === 'COMPLETED') newLists.COMPLETED = listGroup.entries;
          if (listGroup.status === 'CURRENT') newLists.CURRENT = listGroup.entries;
          if (listGroup.status === 'PLANNING') newLists.PLANNING = listGroup.entries;
        });
      }
      setLists(newLists);
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAnimeList = (animeArray) => {
    if (!animeArray || animeArray.length === 0) {
      return <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginTop: '1rem' }}>No hay animes en esta lista.</div>;
    }
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.8rem', marginTop: '1.5rem' }}>
        {animeArray.map(entry => (
          <div key={entry.media.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', transition: 'transform 0.2s' }} className="anime-mini-card">
            <img 
              src={entry.media.coverImage.medium} 
              alt={entry.media.title.userPreferred} 
              style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold' }} title={entry.media.title.userPreferred}>
              {entry.media.title.userPreferred}
            </span>
            {entry.status === 'CURRENT' && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 'bold' }}>Ep {entry.progress}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '2rem', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}
      >
        <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={20} color="var(--color-anilist-blue)" /> Animes
        </h3>
        {isOpen ? <ChevronUp size={20} color="var(--color-text-secondary)" /> : <ChevronDown size={20} color="var(--color-text-secondary)" />}
      </div>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 1rem', flexDirection: 'column', gap: '1rem' }}>
                <div className="loader" style={{ width: '30px', height: '30px', borderTopColor: 'var(--color-anilist-blue)' }}></div>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Cargando animes...</span>
              </div>
            ) : (
              <div style={{ paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '12px' }}>
                  <button 
                    onClick={() => setActiveTab('COMPLETED')}
                    style={{ background: activeTab === 'COMPLETED' ? 'var(--color-anilist-blue)' : 'transparent', color: activeTab === 'COMPLETED' ? 'white' : 'var(--color-text-secondary)', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 'bold', transition: '0.2s' }}
                  >
                    Vistos ({lists.COMPLETED.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('CURRENT')}
                    style={{ background: activeTab === 'CURRENT' ? 'var(--color-accent-green)' : 'transparent', color: activeTab === 'CURRENT' ? 'white' : 'var(--color-text-secondary)', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 'bold', transition: '0.2s' }}
                  >
                    Viendo ({lists.CURRENT.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('PLANNING')}
                    style={{ background: activeTab === 'PLANNING' ? '#FF9800' : 'transparent', color: activeTab === 'PLANNING' ? 'white' : 'var(--color-text-secondary)', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 'bold', transition: '0.2s' }}
                  >
                    Planeados ({lists.PLANNING.length})
                  </button>
                </div>

                {renderAnimeList(lists[activeTab])}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListaDesplegable;