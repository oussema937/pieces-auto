'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroScrub } from '@/components/ui/hero-scrub';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const tokens = {
  bg: { base: '#0a0c0f', surface: '#111318', elevated: '#181b22', overlay: '#1e2128' },
  border: { subtle: 'rgba(255,255,255,0.06)', default: 'rgba(255,255,255,0.10)', focus: 'rgba(96,165,250,0.5)' },
  text: { primary: '#f1f5f9', secondary: '#94a3b8', tertiary: '#475569', accent: '#60a5fa' },
  accent: {
    blue: '#60a5fa', blueDim: 'rgba(96,165,250,0.12)',
    green: '#34d399', greenDim: 'rgba(52,211,153,0.12)',
    amber: '#fbbf24', amberDim: 'rgba(251,191,36,0.12)',
    red: '#f87171', redDim: 'rgba(248,113,113,0.12)',
  },
};

interface Piece {
  id: number; fichier?: string; photo_path?: string; nom?: string; categorie?: string;
  marque?: string; reference?: string; etat?: string; description?: string;
  prix_estime?: number; analyse_ok?: boolean;
}

const CATEGORIES = ['Toutes', 'Moteur', 'Freinage', 'Transmission', 'Suspension', 'Électrique', 'Carrosserie', 'Refroidissement'];

const Icon = {
  Grid: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Package: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  Refresh: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Cpu: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
};

const get = {
  nom: (r: Piece) => r.nom || 'Non identifié',
  cat: (r: Piece) => r.categorie || '—',
  marque: (r: Piece) => r.marque || '—',
  etat: (r: Piece) => r.etat || 'Inconnu',
  desc: (r: Piece) => r.description || '',
  ref: (r: Piece) => r.reference || '—',
  prix: (r: Piece) => r.prix_estime || null,
};

const etatStyle = (etat: string): { bg: string; text: string; dot: string } => {
  switch (etat) {
    case 'Neuf': return { bg: tokens.accent.greenDim, text: tokens.accent.green, dot: tokens.accent.green };
    case 'Occasion': return { bg: tokens.accent.amberDim, text: tokens.accent.amber, dot: tokens.accent.amber };
    case 'Reconditionné': return { bg: tokens.accent.blueDim, text: tokens.accent.blue, dot: tokens.accent.blue };
    default: return { bg: 'rgba(255,255,255,0.06)', text: tokens.text.secondary, dot: tokens.text.tertiary };
  }
};

function PieceModal({ piece, onClose, onDelete }: { piece: Piece; onClose: () => void; onDelete: (id: number) => void }) {
  const es = etatStyle(get.etat(piece));
  const fields = [
    { label: 'Nom', value: get.nom(piece) },
    { label: 'Catégorie', value: get.cat(piece) },
    { label: 'Marque', value: get.marque(piece) },
    { label: 'Référence', value: get.ref(piece) },
    { label: 'Prix estimé', value: get.prix(piece) ? `${get.prix(piece)} €` : '—' },
  ];
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose} role="dialog" aria-modal="true" aria-label={`Détails — ${get.nom(piece)}`}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: tokens.bg.surface, border: `1px solid ${tokens.border.default}` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${tokens.border.subtle}` }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: tokens.accent.blueDim, color: tokens.accent.blue }}>#{piece.id}</span>
            <h2 className="font-semibold text-base truncate" style={{ color: tokens.text.primary }}>{get.nom(piece)}</h2>
            <span className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: es.bg, color: es.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: es.dot }} />{get.etat(piece)}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" aria-label="Fermer"
            style={{ color: tokens.text.secondary }}
            onMouseEnter={e => (e.currentTarget.style.background = tokens.bg.elevated)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><Icon.X /></button>
        </div>
        <div className="grid grid-cols-2">
          <div className="relative overflow-hidden" style={{ background: tokens.bg.base, minHeight: 280 }}>
            <img src={`${API}/photo/${piece.id}`} alt={get.nom(piece)}
              className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.85 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,12,15,0.9) 0%, transparent 55%)' }} />
            {piece.photo_path && (
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs font-mono truncate" style={{ color: tokens.text.tertiary }}>{piece.photo_path.split('/').pop()}</p>
              </div>
            )}
          </div>
          <div className="p-5 flex flex-col" style={{ background: tokens.bg.elevated }}>
            <p className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: tokens.text.tertiary }}>Caractéristiques</p>
            <div className="flex-1 space-y-0">
              {fields.map((f, i) => (
                <motion.div key={f.label} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${tokens.border.subtle}` }}>
                  <span className="text-xs" style={{ color: tokens.text.tertiary }}>{f.label}</span>
                  <span className="text-sm font-medium text-right max-w-36 truncate" style={{ color: tokens.text.primary }}>{f.value}</span>
                </motion.div>
              ))}
            </div>
            {get.desc(piece) && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: tokens.bg.overlay }}>
                <p className="text-xs mb-1.5 font-medium" style={{ color: tokens.accent.blue }}>Description IA</p>
                <p className="text-xs leading-relaxed" style={{ color: tokens.text.secondary, lineHeight: 1.6 }}>{get.desc(piece)}</p>
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors"
                style={{ border: `1px solid ${tokens.border.default}`, color: tokens.text.secondary }}
                onMouseEnter={e => (e.currentTarget.style.background = tokens.bg.overlay)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Fermer</button>
              <button onClick={() => { onDelete(piece.id); onClose(); }}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                style={{ background: tokens.accent.redDim, color: tokens.accent.red, border: `1px solid rgba(248,113,113,0.2)` }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                <Icon.Trash /> Supprimer
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [tab, setTab] = useState<'dashboard' | 'scan' | 'catalogue'>('dashboard');
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const [scanMsg, setScanMsg] = useState('');
  const [dragging, setDragging] = useState(false);
  const [filtre, setFiltre] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Piece | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<{ id: string; msg: string }[]>([]);
  const [playing, setPlaying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const audio = new Audio('/FUNK SIGILO.mp3');
    audio.volume = 0.3; audio.loop = true;
    audioRef.current = audio;
    const start = () => {
      audio.play().then(() => { setPlaying(true); }).catch(() => {});
      window.removeEventListener('scroll', start);
      window.removeEventListener('click', start);
    };
    window.addEventListener('scroll', start, { passive: true });
    window.addEventListener('click', start);
    return () => { audio.pause(); window.removeEventListener('scroll', start); window.removeEventListener('click', start); };
  }, []);

  const load = async () => {
    try {
      const r = await fetch(`${API}/pieces`);
      setPieces(await r.json());
    } catch { /* silent */ }
  };

  const upload = async () => {
    if (!files?.length) return;
    setLoading(true); setScanPct(5); setScanMsg('Préparation des fichiers...');
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    const steps = [
      { p: 30, m: 'Transfert vers le serveur...' },
      { p: 60, m: 'Analyse IA en cours...' },
      { p: 85, m: 'Enregistrement en base de données...' },
    ];
    let i = 0;
    const t = setInterval(() => { if (i < steps.length) { setScanPct(steps[i].p); setScanMsg(steps[i].m); i++; } }, 1800);
    try {
      await fetch(`${API}/upload-multiple`, {
        method: 'POST',
        body: fd,
        signal: AbortSignal.timeout(120000)
      });
      clearInterval(t); setScanPct(100); setScanMsg('Terminé.');
      await load();
      setTimeout(() => { setLoading(false); setFiles(null); setTab('catalogue'); }, 600);
    } catch { clearInterval(t); setLoading(false); alert('Erreur backend — le serveur se réveille, réessayez dans 30 secondes'); }
  };

  const del = async (id: number) => {
    if (!confirm('Supprimer cette pièce ?')) return;
    setDeletingId(id);
    try {
      await fetch(`${API}/pieces/${id}`, { method: 'DELETE' });
      setPieces(p => p.filter(x => x.id !== id));
      setNotifs(n => [{ id: `d${Date.now()}`, msg: `Pièce #${id} supprimée` }, ...n.slice(0, 4)]);
    } catch { /* silent */ }
    setDeletingId(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); setFiles(e.dataTransfer.files);
  }, []);

  const filtered = pieces.filter(p => {
    const matchCat = filtre === 'Toutes' || get.cat(p) === filtre;
    const q = search.toLowerCase();
    const matchQ = !q || get.nom(p).toLowerCase().includes(q) || get.marque(p).toLowerCase().includes(q) || get.cat(p).toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const catCounts = CATEGORIES.slice(1).map(c => ({ name: c, count: pieces.filter(p => get.cat(p) === c).length }));
  const analysed = pieces.filter(p => p.analyse_ok && get.nom(p) !== 'Non identifié').length;
  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Icon.Grid },
    { id: 'scan', label: 'Importer', icon: Icon.Upload },
    { id: 'catalogue', label: `Catalogue`, icon: Icon.Package },
  ] as const;

  if (!showApp) {
    return (
      <div style={{ background: '#0a0c0f' }}>
        <HeroScrub
          frameCount={300}
          frameUrl={(i) => `https://raw.githubusercontent.com/duthiljean/ferrari-hero-demo/main/${String(i + 1).padStart(4, "0")}.webp`}
          titleTop="PIÈCES" titleBottom="AUTO·IA" accentHex="#60a5fa" bgClassName="bg-[#0a0c0f]"
          badge="VISION IA — GROQ ACTIF" />
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center" style={{ background: '#0a0c0f' }}>
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: tokens.text.tertiary }}>
            Identification automatique par vision IA
          </p>
          <h2 className="text-4xl font-semibold mb-4" style={{ color: tokens.text.primary }}>
            Identifiez vos pièces<br />en quelques secondes
          </h2>
          <p className="text-sm max-w-md mb-10" style={{ color: tokens.text.secondary, lineHeight: 1.7 }}>
            Importez une photo, notre IA analyse et identifie automatiquement la pièce — marque, référence, état et prix estimé.
          </p>
          <motion.button onClick={() => setShowApp(true)}
            className="px-8 py-4 rounded-xl text-sm font-semibold"
            style={{ background: tokens.accent.blue, color: '#0a0c0f', minHeight: 52 }}
            whileHover={{ scale: 1.03, opacity: 0.92 }} whileTap={{ scale: 0.97 }}>
            Accéder à l'application →
          </motion.button>
          <p className="text-xs mt-4" style={{ color: tokens.text.tertiary }}>Groq Vision · Cloud · Base de données</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: tokens.bg.base, color: tokens.text.primary, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <AnimatePresence>
        {selected && <PieceModal piece={selected} onClose={() => setSelected(null)} onDelete={del} />}
      </AnimatePresence>

      <header className="fixed top-0 inset-x-0 z-40 h-14 flex items-center px-6 justify-between"
        style={{ background: `${tokens.bg.base}e6`, borderBottom: `1px solid ${tokens.border.subtle}`, backdropFilter: 'blur(12px)' }}>
        <button onClick={() => setShowApp(false)} className="flex items-center gap-2.5" aria-label="Accueil">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tokens.accent.blueDim }}><Icon.Cpu /></div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: tokens.text.primary }}>Pièces Auto</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: tokens.bg.elevated, color: tokens.text.tertiary }}>v1</span>
        </button>
        <nav className="flex items-center gap-1" role="navigation" aria-label="Navigation principale">
          {navItems.map(({ id, label, icon: Ic }) => (
            <button key={id} onClick={() => setTab(id as typeof tab)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ color: tab === id ? tokens.text.accent : tokens.text.secondary, background: tab === id ? tokens.accent.blueDim : 'transparent', minHeight: 44 }}
              aria-current={tab === id ? 'page' : undefined}>
              <Ic /><span className="hidden sm:inline">{label}</span>
              {id === 'catalogue' && pieces.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: tokens.bg.elevated, color: tokens.text.tertiary }}>{pieces.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs" style={{ background: tokens.accent.greenDim, color: tokens.accent.green }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: tokens.accent.green }} />
            <span className="hidden sm:inline font-medium">En ligne</span>
          </div>
          <button onClick={() => { if (!audioRef.current) return; if (playing) { audioRef.current.pause(); setPlaying(false); } else { audioRef.current.play(); setPlaying(true); } }}
            className="p-2 rounded-lg transition-colors"
            style={{ color: playing ? tokens.accent.blue : tokens.text.secondary, minWidth: 44, minHeight: 44 }}
            aria-label={playing ? 'Pause musique' : 'Lancer musique'}>
            {playing
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
          </button>
          <div className="relative">
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-lg transition-colors"
              style={{ color: tokens.text.secondary, minWidth: 44, minHeight: 44 }}
              aria-label={`Notifications${notifs.length ? ` (${notifs.length})` : ''}`}>
              <Icon.Bell />
              {notifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center"
                  style={{ background: tokens.accent.red, fontSize: 9, fontWeight: 700 }}>{notifs.length}</span>
              )}
            </button>
            <AnimatePresence>
              {showNotif && (
                <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }} className="absolute right-0 top-12 w-72 rounded-xl overflow-hidden shadow-2xl"
                  style={{ background: tokens.bg.elevated, border: `1px solid ${tokens.border.default}` }} role="region" aria-label="Notifications">
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${tokens.border.subtle}` }}>
                    <span className="text-xs font-medium" style={{ color: tokens.text.secondary }}>Journal</span>
                    {notifs.length > 0 && <button onClick={() => setNotifs([])} className="text-xs" style={{ color: tokens.text.tertiary }}>Effacer</button>}
                  </div>
                  {notifs.length === 0
                    ? <p className="px-4 py-6 text-xs text-center" style={{ color: tokens.text.tertiary }}>Aucune notification</p>
                    : notifs.map(n => <div key={n.id} className="px-4 py-3 text-xs" style={{ borderBottom: `1px solid ${tokens.border.subtle}`, color: tokens.text.secondary }}>{n.msg}</div>)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-14">
        <AnimatePresence mode="wait">
          {tab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto px-6 py-10 space-y-8">
              <motion.div className="flex items-end justify-between" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
                <div>
                  <motion.p className="text-xs font-medium mb-1.5 uppercase tracking-widest" style={{ color: tokens.text.tertiary }}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>Pièces automobiles</motion.p>
                  <motion.h1 className="text-2xl font-semibold" style={{ color: tokens.text.primary }}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>Tableau de bord</motion.h1>
                </div>
                <motion.button onClick={() => setTab('scan')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: tokens.accent.blue, color: '#0a0c0f', minHeight: 44 }}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.04, opacity: 0.92 }} whileTap={{ scale: 0.96 }}>
                  <Icon.Upload /> Importer des photos
                </motion.button>
              </motion.div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total pièces', value: pieces.length, accent: tokens.accent.blue, sub: 'en base de données', icon: '▣' },
                  { label: 'Analysées par IA', value: analysed, accent: tokens.accent.green, sub: 'Groq identifiées', icon: '✓' },
                  { label: 'En attente', value: pieces.length - analysed, accent: tokens.accent.amber, sub: 'à analyser', icon: '◎' },
                ].map((k, i) => (
                  <motion.div key={k.label}
                    initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 260, damping: 22 }}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="rounded-xl p-5 cursor-default" style={{ background: tokens.bg.surface, border: `1px solid ${tokens.border.subtle}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs" style={{ color: tokens.text.tertiary }}>{k.label}</p>
                      <span className="text-xs" style={{ color: k.accent }}>{k.icon}</span>
                    </div>
                    <motion.p className="text-3xl font-semibold" style={{ color: k.accent, lineHeight: 1 }}
                      initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 300 }}>{k.value}</motion.p>
                    <p className="text-xs mt-2" style={{ color: tokens.text.tertiary }}>{k.sub}</p>
                    <motion.div className="h-0.5 rounded-full mt-4" style={{ background: k.accent }}
                      initial={{ width: 0 }} animate={{ width: '100%' }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.5, ease: 'easeOut' }} />
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-6">
                <motion.div className="col-span-2 rounded-xl p-5" style={{ background: tokens.bg.surface, border: `1px solid ${tokens.border.subtle}` }}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}>
                  <p className="text-sm font-medium mb-5" style={{ color: tokens.text.primary }}>Répartition par catégorie</p>
                  <div className="space-y-3.5">
                    {catCounts.map((c, i) => (
                      <motion.div key={c.name} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.06, ease: 'easeOut' }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs" style={{ color: tokens.text.secondary }}>{c.name}</span>
                          <span className="text-xs font-mono" style={{ color: tokens.text.tertiary }}>{c.count}</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: tokens.bg.overlay }}>
                          <motion.div initial={{ width: 0 }}
                            animate={{ width: pieces.length ? `${Math.max((c.count / pieces.length) * 100, c.count > 0 ? 4 : 0)}%` : '0%' }}
                            transition={{ duration: 0.7, delay: 0.5 + i * 0.06, ease: [0.34, 1.12, 0.64, 1] }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(to right, ${tokens.accent.blue}99, ${tokens.accent.blue})` }} />
                        </div>
                      </motion.div>
                    ))}
                    {pieces.length === 0 && <p className="text-xs text-center py-4" style={{ color: tokens.text.tertiary }}>Aucune donnée</p>}
                  </div>
                </motion.div>
                <motion.div className="rounded-xl p-5 flex flex-col" style={{ background: tokens.bg.surface, border: `1px solid ${tokens.border.subtle}` }}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}>
                  <p className="text-sm font-medium mb-4" style={{ color: tokens.text.primary }}>Récents</p>
                  <div className="flex-1 space-y-1">
                    {pieces.slice(0, 5).map((p, i) => (
                      <motion.button key={p.id} onClick={() => setSelected(p)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg text-left group" style={{ minHeight: 44 }}
                        initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.07, ease: 'easeOut' }}
                        whileHover={{ x: 3, transition: { duration: 0.15 } }}
                        onMouseEnter={e => (e.currentTarget.style.background = tokens.bg.elevated)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: tokens.text.primary }}>{get.nom(p)}</p>
                          <p className="text-xs truncate mt-0.5" style={{ color: tokens.text.tertiary }}>{get.cat(p)}</p>
                        </div>
                        <span style={{ color: tokens.text.tertiary }} className="shrink-0 ml-2"><Icon.ChevronRight /></span>
                      </motion.button>
                    ))}
                    {pieces.length === 0 && <p className="text-xs text-center py-6" style={{ color: tokens.text.tertiary }}>Aucune pièce</p>}
                  </div>
                  <button onClick={() => setTab('catalogue')}
                    className="mt-4 pt-3 w-full text-xs text-left flex items-center gap-1 transition-colors"
                    style={{ borderTop: `1px solid ${tokens.border.subtle}`, color: tokens.text.tertiary }}
                    onMouseEnter={e => (e.currentTarget.style.color = tokens.text.accent)}
                    onMouseLeave={e => (e.currentTarget.style.color = tokens.text.tertiary)}>
                    Voir tout le catalogue <Icon.ChevronRight />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {tab === 'scan' && (
            <motion.div key="scan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
              className="max-w-2xl mx-auto px-6 py-10 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: tokens.text.tertiary }}>Analyse IA</p>
                <h1 className="text-2xl font-semibold" style={{ color: tokens.text.primary }}>Importer des photos</h1>
                <p className="text-sm mt-1.5" style={{ color: tokens.text.secondary, lineHeight: 1.6 }}>
                  JPG, PNG, WEBP, BMP — sélection multiple. Chaque photo est analysée automatiquement par Groq Vision.
                </p>
              </div>
              {loading ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl p-10 flex flex-col items-center gap-6 relative overflow-hidden"
                  style={{ background: tokens.bg.surface, border: `1px solid ${tokens.border.default}` }}>
                  <div className="absolute top-0 inset-x-0 h-0.5" style={{ background: tokens.bg.overlay }}>
                    <motion.div animate={{ width: `${scanPct}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} className="h-full" style={{ background: tokens.accent.blue }} />
                  </div>
                  <div className="p-4 rounded-full" style={{ background: tokens.bg.elevated }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}><Icon.Cpu /></motion.div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-3xl font-semibold font-mono" style={{ color: tokens.text.primary }}>{scanPct}%</p>
                    <AnimatePresence mode="wait">
                      <motion.p key={scanMsg} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }} className="text-sm" style={{ color: tokens.text.secondary }}>{scanMsg}</motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                <>
                  <motion.div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                    onDrop={onDrop} onClick={() => fileRef.current?.click()}
                    className="rounded-2xl p-12 flex flex-col items-center gap-4 text-center cursor-pointer transition-all"
                    style={{ background: dragging ? `rgba(96,165,250,0.06)` : tokens.bg.surface, border: `1.5px dashed ${dragging ? tokens.accent.blue : tokens.border.default}`, minHeight: 220 }}
                    whileHover={{ borderColor: tokens.accent.blue }} role="button" tabIndex={0} aria-label="Zone de dépôt de fichiers"
                    onKeyDown={e => { if (e.key === 'Enter') fileRef.current?.click(); }}>
                    <input ref={fileRef} type="file" multiple accept="image/*" onChange={e => setFiles(e.target.files)} className="hidden" />
                    <div className="p-4 rounded-xl" style={{ background: tokens.bg.elevated }}><Icon.Upload /></div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: tokens.text.primary }}>Glisser les photos ici</p>
                      <p className="text-xs mt-1" style={{ color: tokens.text.tertiary }}>ou cliquer pour sélectionner</p>
                    </div>
                    <AnimatePresence>
                      {files && files.length > 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                          style={{ background: tokens.accent.greenDim, color: tokens.accent.green }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: tokens.accent.green }} />
                          {files.length} photo{files.length > 1 ? 's' : ''} sélectionnée{files.length > 1 ? 's' : ''}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <AnimatePresence>
                    {files && files.length > 0 && (
                      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        onClick={upload} className="w-full py-3.5 rounded-xl text-sm font-semibold transition-opacity"
                        style={{ background: tokens.accent.blue, color: '#0a0c0f', minHeight: 48 }}
                        whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.98 }}>
                        Analyser {files.length} photo{files.length > 1 ? 's' : ''}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}

          {tab === 'catalogue' && (
            <motion.div key="cat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto px-6 py-10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: tokens.text.tertiary }}>Stock</p>
                  <h1 className="text-2xl font-semibold" style={{ color: tokens.text.primary }}>{pieces.length} pièces</h1>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
                    style={{ border: `1px solid ${tokens.border.default}`, color: tokens.text.secondary, minHeight: 44 }}
                    onMouseEnter={e => (e.currentTarget.style.background = tokens.bg.elevated)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')} aria-label="Actualiser">
                    <Icon.Refresh /> Actualiser
                  </button>
                  <div className="relative flex items-center">
                    <span className="absolute left-3" style={{ color: tokens.text.tertiary }}><Icon.Search /></span>
                    <input type="search" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
                      className="pl-8 pr-4 py-2 rounded-lg text-xs w-52 outline-none"
                      style={{ background: tokens.bg.surface, border: `1px solid ${tokens.border.default}`, color: tokens.text.primary, minHeight: 44 }}
                      aria-label="Rechercher une pièce" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrer par catégorie">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setFiltre(c)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{ background: filtre === c ? tokens.accent.blueDim : 'transparent', color: filtre === c ? tokens.accent.blue : tokens.text.tertiary, border: `1px solid ${filtre === c ? tokens.accent.blue + '40' : tokens.border.subtle}`, minHeight: 32 }}
                    aria-pressed={filtre === c}>
                    {c}
                    {c !== 'Toutes' && <span className="ml-1.5 font-mono" style={{ color: filtre === c ? tokens.accent.blue : tokens.text.tertiary, opacity: 0.7 }}>{pieces.filter(p => get.cat(p) === c).length}</span>}
                  </button>
                ))}
              </div>
              {filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-sm" style={{ color: tokens.text.tertiary }}>Aucune pièce trouvée</p>
                  <button onClick={() => setTab('scan')} className="mt-4 text-xs underline" style={{ color: tokens.text.accent }}>Importer des photos</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  <AnimatePresence>
                    {filtered.map((p, i) => {
                      const es = etatStyle(get.etat(p));
                      return (
                        <motion.div key={p.id}
                          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: Math.min(i * 0.03, 0.3) }} whileHover={{ y: -2 }}
                          className="rounded-xl overflow-hidden group cursor-pointer"
                          style={{ background: tokens.bg.surface, border: `1px solid ${tokens.border.subtle}` }}
                          onClick={() => setSelected(p)}>
                          <div className="relative overflow-hidden" style={{ height: 140, background: tokens.bg.elevated }}>
                            <img src={`${API}/photo/${p.id}`} alt={get.nom(p)}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              style={{ opacity: 0.8 }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,12,15,0.7) 0%, transparent 50%)' }} />
                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                              style={{ background: 'rgba(10,12,15,0.8)', color: es.text, backdropFilter: 'blur(4px)' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: es.dot }} />{get.etat(p)}
                            </div>
                            <motion.button initial={{ opacity: 0 }} whileHover={{ opacity: 1 }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: 'rgba(10,12,15,0.8)', color: tokens.accent.red, minWidth: 28, minHeight: 28 }}
                              onClick={e => { e.stopPropagation(); del(p.id); }} disabled={deletingId === p.id}
                              aria-label={`Supprimer ${get.nom(p)}`}>
                              {deletingId === p.id
                                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Icon.Refresh /></motion.div>
                                : <Icon.Trash />}
                            </motion.button>
                            <span className="absolute bottom-2 right-2 text-xs font-mono" style={{ color: tokens.text.tertiary }}>#{p.id}</span>
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-medium truncate" style={{ color: tokens.text.primary }}>{get.nom(p)}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs truncate" style={{ color: tokens.text.tertiary }}>{get.cat(p)}</p>
                              {get.marque(p) !== '—' && <p className="text-xs truncate ml-2 shrink-0" style={{ color: tokens.text.tertiary }}>{get.marque(p)}</p>}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="h-9 flex items-center justify-between px-6 text-xs"
        style={{ borderTop: `1px solid ${tokens.border.subtle}`, color: tokens.text.tertiary }}>
        <span>Pièces Auto — IA Vision</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}