-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anime_title TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to quizzes
CREATE POLICY "Allow public read access on quizzes" 
ON public.quizzes FOR SELECT 
USING (true);

-- Allow authenticated users or service role to insert quizzes
CREATE POLICY "Allow insert on quizzes" 
ON public.quizzes FOR INSERT 
WITH CHECK (true);