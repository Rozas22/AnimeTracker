import { supabase } from './supabase';

// Simple UUID generator fallback
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const getVisitorId = () => {
    let visitorId = localStorage.getItem('analytics_visitor_id');
    if (!visitorId) {
        visitorId = generateUUID();
        localStorage.setItem('analytics_visitor_id', visitorId);
    }
    return visitorId;
};

export const trackEvent = async (eventType, eventData = {}) => {
    try {
        // Exclude admin traffic if flag is set
        if (localStorage.getItem('ignore_analytics') === 'true') {
            return;
        }

        const visitorId = getVisitorId();
        
        // Try to get user info if logged in (saved from AniList OAuth)
        const anilistToken = localStorage.getItem('anilist_token');
        let userId = null;
        
        // This relies on the app having previously saved the user object to localStorage,
        // which Callback.jsx or App.jsx might be doing. If not, we can pass it manually or just use ID if available.
        // We will just try to parse local user or pass from app context later.
        
        // Better: We let the app pass `user_id` inside eventData if available, then extract it.
        if (eventData.userId) {
            userId = eventData.userId.toString();
            delete eventData.userId;
        } else {
             // Fallback: see if App saved user id in local storage
             const savedUser = localStorage.getItem('current_user_id');
             if (savedUser) userId = savedUser;
        }

        const { error } = await supabase
            .from('analytics_events')
            .insert([
                {
                    visitor_id: visitorId,
                    event_type: eventType,
                    event_data: eventData,
                    user_id: userId
                }
            ]);

        if (error) {
            console.error('Analytics tracking error:', error);
        }
    } catch (err) {
        console.error('Failed to track event:', err);
    }
};
