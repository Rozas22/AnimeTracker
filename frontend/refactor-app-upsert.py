import sys

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add quizPoints state
state_target = "const [userData, setUserData] = useState(null);"
state_replacement = """const [userData, setUserData] = useState(null);
  const [quizPoints, setQuizPoints] = useState(0);

  const syncSupabaseUser = async (viewer) => {
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

code = code.replace(state_target, state_replacement)

# Replace setUserData calls
call_target1 = """      setUserData(viewer);
      
      if (viewer.id) {"""
call_replacement1 = """      setUserData(viewer);
      await syncSupabaseUser(viewer);
      
      if (viewer.id) {"""
code = code.replace(call_target1, call_replacement1)

call_target2 = """        setUserData(viewer);
        await fetchUserAnimeList(viewer.id);"""
call_replacement2 = """        setUserData(viewer);
        await syncSupabaseUser(viewer);
        await fetchUserAnimeList(viewer.id);"""
code = code.replace(call_target2, call_replacement2)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.jsx upsert refactored!")