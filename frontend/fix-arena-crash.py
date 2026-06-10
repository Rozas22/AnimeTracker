import sys

with open('src/components/ArenaView.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix imports to include supabase
import_target = """import { Trophy, Swords, Shield, Star, Crown, Tv, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';"""

import_replacement = """import { Trophy, Swords, Shield, Star, Crown, Tv, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';"""
code = code.replace(import_target, import_replacement)

# Fix props to accept anilistFriends and use it safely
props_target = """const ArenaView = ({ user, friendList, token, supabase, setQuizPoints }) => {"""
props_replacement = """const ArenaView = ({ user, anilistFriends, setQuizPoints }) => {
  const friendList = anilistFriends || [];"""
code = code.replace(props_target, props_replacement)

with open('src/components/ArenaView.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed crashes in ArenaView!")