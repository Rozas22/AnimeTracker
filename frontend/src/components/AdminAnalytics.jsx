import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Users, Target, Play, BarChart2, Calendar, TrendingUp } from 'lucide-react';

const AdminAnalytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all events for the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: events, error: fetchError } = await supabase
                .from('analytics_events')
                .select('*')
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            // Process data
            const uniqueUsersDaily = new Map();
            const uniqueUsersWeekly = new Set();
            let quizzesStarted = 0;
            let quizzesFinished = 0;
            const quizTypes = new Map();

            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            events.forEach(ev => {
                const dateObj = new Date(ev.created_at);
                const dayKey = dateObj.toISOString().split('T')[0];

                if (ev.event_type === 'page_view') {
                    // Daily Uniques
                    if (!uniqueUsersDaily.has(dayKey)) {
                        uniqueUsersDaily.set(dayKey, new Set());
                    }
                    uniqueUsersDaily.get(dayKey).add(ev.visitor_id);

                    // Weekly Uniques
                    if (dateObj >= oneWeekAgo) {
                        uniqueUsersWeekly.add(ev.visitor_id);
                    }
                }

                if (ev.event_type === 'quiz_start') {
                    quizzesStarted++;
                }

                if (ev.event_type === 'quiz_finish') {
                    quizzesFinished++;
                }
            });

            // Format daily chart data
            const chartData = Array.from(uniqueUsersDaily.entries())
                .sort((a, b) => a[0].localeCompare(b[0])) // sort by date
                .slice(-7) // last 7 days
                .map(([date, users]) => ({
                    date: date.substring(5), // MM-DD
                    count: users.size
                }));

            const maxDaily = Math.max(...chartData.map(d => d.count), 1);

            setStats({
                chartData,
                maxDaily,
                weeklyUniques: uniqueUsersWeekly.size,
                todayUniques: uniqueUsersDaily.get(new Date().toISOString().split('T')[0])?.size || 0,
                quizzesStarted,
                quizzesFinished,
                completionRate: quizzesStarted > 0 ? Math.round((quizzesFinished / quizzesStarted) * 100) : 0
            });

        } catch (err) {
            console.error('Failed to load analytics:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="loader"></div>
                <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Cargando panel de administración...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--color-accent-red)' }}>
                <p>Error cargando analíticas: {error}</p>
                <button className="btn-primary" onClick={fetchAnalytics} style={{ marginTop: '1rem' }}>Reintentar</button>
            </div>
        );
    }

    return (
        <div className="admin-analytics" style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <BarChart2 size={28} style={{ color: 'var(--color-accent-purple)' }} />
                <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 700 }}>Panel de Analíticas</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        <Users size={16} /> Usuarios Únicos (Hoy)
                    </div>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.todayUniques}</span>
                </div>

                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        <Calendar size={16} /> Usuarios Únicos (7 días)
                    </div>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.weeklyUniques}</span>
                </div>

                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        <Play size={16} /> Quizzes Jugados
                    </div>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.quizzesStarted}</span>
                </div>

                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        <Target size={16} /> Tasa de Finalización
                    </div>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: stats.completionRate > 50 ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }}>
                        {stats.completionRate}%
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{stats.quizzesFinished} finalizados</span>
                </div>
            </div>

            <div className="card" style={{ padding: '2rem', background: 'var(--color-bg-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
                    <TrendingUp size={20} /> Tráfico Diario (Últimos 7 días)
                </h3>
                
                {stats.chartData.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>No hay suficientes datos aún.</p>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '200px', paddingTop: '1rem' }}>
                        {stats.chartData.map((d, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{d.count}</span>
                                <div style={{ 
                                    width: '100%', 
                                    height: `${(d.count / stats.maxDaily) * 150}px`, 
                                    background: 'var(--color-accent-purple)', 
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 1s cubic-bezier(0.1, 0.8, 0.2, 1)'
                                }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{d.date}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default AdminAnalytics;
