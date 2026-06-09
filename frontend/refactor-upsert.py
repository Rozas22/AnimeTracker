import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """  const syncSupabaseUser = async (viewer) => {
    try {
      console.log('Synchronizing user with Supabase:', viewer.id, viewer.name);
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('quiz_points')
        .eq('anilist_id', viewer.id)
        .single();
        
      if (selectError && selectError.code !== 'PGRST116') {
         console.error('Supabase select error:', selectError);
      }
      
      console.log('Supabase user data found:', existingUser);

      if (existingUser) {
         setQuizPoints(existingUser.quiz_points || 0);
         // Upsert/Update username
         await supabase.from('users').update({ username: viewer.name, last_updated_at: new Date() }).eq('anilist_id', viewer.id);
      } else {
         console.log('User not found in Supabase, inserting...');
         const { error: insertError } = await supabase
           .from('users')
           .insert([{ anilist_id: viewer.id, username: viewer.name, quiz_points: 0 }]);
           
         if (insertError) console.error('Supabase insert error:', insertError);
         else setQuizPoints(0);
      }
    } catch (e) {
      console.error('Error in syncSupabaseUser:', e);
    }
  };"""

replacement = """  const syncSupabaseUser = async (viewer) => {
    try {
      console.log('Synchronizing user with Supabase:', viewer.id, viewer.name);
      
      const { data, error } = await supabase
        .from('users')
        .upsert({ 
          anilist_id: viewer.id.toString(), 
          username: viewer.name 
        }, { onConflict: 'anilist_id' })
        .select('quiz_points')
        .single();

      if (error) {
        console.error('Error al sincronizar con Supabase:', error);
      } else {
        console.log('Usuario sincronizado correctamente', data);
        if (data) setQuizPoints(data.quiz_points || 0);
      }
    } catch (e) {
      console.error('Error in syncSupabaseUser:', e);
    }
  };"""

code = code.replace(target, replacement)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("syncSupabaseUser replaced!")