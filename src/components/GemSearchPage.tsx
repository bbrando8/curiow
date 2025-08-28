import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Header from './Header';
import GemCard from './GemCard';
import { Gem, User } from '../types';
import * as firestoreService from '../services/firestoreService';
import { trackEvent } from '../services/firebase';

interface GemSearchPageProps {
  isLoggedIn: boolean;
  user: User | null;
  allFavoriteIds: string[];
  onLogin: () => void;
  onSelectGem: (gemId: string) => void;
  onSaveRequest: (gemId: string) => void;
  onRemoveRequest: (gemId: string) => void;
}

/**
 * Pagina di ricerca gem: permette ricerca per titolo / descrizione / tag (ricerca testuale) + filtri tag multipli passati nel path.
 * Path: /gem-search oppure /gem-search/:tagParam dove tagParam = tag1,tag2
 * Query param opzionale ?q=term
 */
const GemSearchPage: React.FC<GemSearchPageProps> = ({
  isLoggedIn,
  user,
  allFavoriteIds,
  onLogin,
  onSelectGem,
  onSaveRequest,
  onRemoveRequest,
}) => {
  const navigate = useNavigate();
  const { tagParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams(); // setSearchParams non verrà più usato direttamente per evitare navigazioni durante render

  const initialTags = useMemo(() => {
    if (!tagParam) return [] as string[];
    return decodeURIComponent(tagParam)
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  }, [tagParam]);

  const [allGems, setAllGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>(initialTags);
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('q') || '');
  const [debouncedTerm, setDebouncedTerm] = useState<string>(searchTerm);

  // --- Stati per paginazione client-side dei risultati filtrati ---
  const PAGE_SIZE = 7;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Utility normalizzazione tag (trim + lowercase) DEFINITA PRIMA DELL'USO
  const normalizeTag = useCallback((t: string) => t.trim().toLowerCase(), []);

  // Mantieni activeTags sempre normalizzati (ma conserva visualizzazione originale se servisse in futuro)
  useEffect(() => {
    setActiveTags(prev => {
      const normPrev = prev.map(normalizeTag);
      const unique: string[] = [];
      normPrev.forEach(t => { if(!unique.includes(t)) unique.push(t); });
      return unique;
    });
  }, []); // solo on mount per normalizzare lo stato iniziale

  // Sync a cambi di tagParam (parametri route) -> normalizza
  useEffect(() => {
    const normalized = initialTags.map(normalizeTag);
    setActiveTags(prev => {
      const current = prev.join(',');
      const incoming = normalized.join(',');
      if (current === incoming) return prev;
      return normalized;
    });
  }, [initialTags, normalizeTag]);

  // Debounce searchTerm
  useEffect(() => {
    const h = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // --- Caricamento gems filtrate da Firestore ---
  const [lastVisible, setLastVisible] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    firestoreService.fetchGemsFiltered(debouncedTerm, activeTags, PAGE_SIZE, undefined)
      .then(({ gems, lastVisible }) => {
        if (!cancelled) {
          setAllGems(gems);
          setLastVisible(lastVisible);
          setHasMoreResults(!!lastVisible);
        }
      })
      .catch(err => {
        if (!cancelled) setError('Errore nel caricamento delle gems');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedTerm, activeTags]);

  // Funzione per caricare più risultati (paginazione)
  const loadMoreGems = useCallback(() => {
    if (!lastVisible || isLoadingMore) return;
    setIsLoadingMore(true);
    firestoreService.fetchGemsFiltered(debouncedTerm, activeTags, PAGE_SIZE, lastVisible)
      .then(({ gems, lastVisible: newLast }) => {
        setAllGems(prev => [...prev, ...gems]);
        setLastVisible(newLast);
        setHasMoreResults(!!newLast);
      })
      .catch(() => setError('Errore nel caricamento delle gems'))
      .finally(() => setIsLoadingMore(false));
  }, [debouncedTerm, activeTags, lastVisible, isLoadingMore]);

  // Intersection Observer per infinite scroll
  useEffect(() => {
    if (!hasMoreResults || isLoadingMore || loading) return;
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreResults && !isLoadingMore) {
        loadMoreGems();
      }
    }, { root: null, threshold: 0.1, rootMargin: '200px 0px 200px 0px' });

    observerRef.current.observe(trigger);

    return () => {
      if (observerRef.current && trigger) {
        observerRef.current.unobserve(trigger);
        observerRef.current.disconnect();
      }
    };
  }, [hasMoreResults, isLoadingMore, loadMoreGems, loading, allGems.length]);

  // Fallback scroll listener (in caso il primo batch non attivi l'observer)
  useEffect(() => {
    if (!hasMoreResults || isLoadingMore) return;
    const onScroll = () => {
      if (!loadMoreTriggerRef.current) return;
      const rect = loadMoreTriggerRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.top - vh < 150) {
        loadMoreGems();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasMoreResults, isLoadingMore, loadMoreGems]);

  // Effetto unico: sincronizza URL (path + query) su cambi di activeTags o debouncedTerm
  useEffect(() => {
    console.debug('[GemSearch][syncURL] activeTags=', activeTags, 'debouncedTerm=', debouncedTerm, 'initialTags(fromRoute)=', initialTags);
    const currentQ = searchParams.get('q') || '';
    const tagString = activeTags.join(',');
    const pathTagString = initialTags.join(',');
    const needsTagUpdate = tagString !== pathTagString;
    const needsQUpdate = debouncedTerm !== currentQ;
    if (!needsTagUpdate && !needsQUpdate) return;
    let path = '/gem-search';
    if (activeTags.length) path += '/' + encodeURIComponent(tagString);
    if (debouncedTerm) path += `?q=${encodeURIComponent(debouncedTerm)}`;
    console.debug('[GemSearch][syncURL] navigate ->', path);
    navigate(path, { replace: true });
  }, [activeTags, debouncedTerm, initialTags, navigate, searchParams]);

  // Calcola i tag disponibili (top frequenze) dalle gem filtrate solo per qualità UX
  const tagFrequencies = useMemo(() => {
    const freq: Record<string, number> = {};
    allGems.forEach(g => {
      (g.tags || []).forEach(t => { const nt = normalizeTag(t); freq[nt] = (freq[nt] || 0) + 1; });
    });
    const entries = Object.entries(freq)
      .filter(([t]) => !activeTags.map(normalizeTag).includes(t))
      .sort((a,b) => b[1]-a[1])
      .slice(0, 24);
    return entries.map(([tag, count]) => ({ tag, count }));
  }, [allGems, activeTags, normalizeTag]);

  // Gems visibili paginate
  const displayedGems = useMemo(() => allGems.slice(0, visibleCount), [allGems, visibleCount]);

  const handleAddTag = useCallback((tag: string) => {
    setActiveTags(prev => prev.some(p => normalizeTag(p) === normalizeTag(tag)) ? prev : [...prev, tag.trim()]);
    trackEvent('search_add_tag_filter', { tag: normalizeTag(tag) });
  }, [normalizeTag]);

  const handleRemoveTag = useCallback((tag: string) => {
    const norm = normalizeTag(tag);
    setActiveTags(prev => prev.filter(t => normalizeTag(t) !== norm));
    trackEvent('search_remove_tag_filter', { tag: norm });
  }, [normalizeTag]);

  const handleClearAll = () => {
    if (activeTags.length === 0 && !debouncedTerm) return;
    setActiveTags([]);
    setSearchTerm('');
    trackEvent('search_clear_all');
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); trackEvent('search_submit', { q: debouncedTerm, tags: activeTags.join(',') }); };

  const emptyState = !loading && displayedGems.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        onLogin={onLogin}
        onLogout={()=>{}}
        onNavigate={(view)=>{ if(view==='feed') navigate('/'); else if(view==='saved') navigate('/saved'); else if(view==='profile') navigate('/profile'); else if(view==='dashboard') navigate('/admin/gems'); }}
        showFilters={false}
      />
      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">Ricerca Gem</h1>
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={e=>setSearchTerm(e.target.value)}
              placeholder="Cerca per titolo o tag..."
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 shadow-sm"
              aria-label="Campo di ricerca gem"
            />
            {searchTerm && (
              <button type="button" onClick={()=>setSearchTerm('')} className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 whitespace-nowrap">Reset</button>
            )}
            <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap">Cerca</button>
          </div>
        </form>

        {(activeTags.length > 0 || debouncedTerm) && (
          <div className="flex flex-wrap gap-2 mb-6 items-center">
            {debouncedTerm && (
              <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs font-medium">Termine: {debouncedTerm}</span>
            )}
            {activeTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={()=>handleRemoveTag(tag)}
                className="group flex items-center gap-1 pl-3 pr-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-700/40 transition-colors"
                aria-label={`Rimuovi filtro tag ${tag}`}
              >{tag}<span className="text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400">×</span></button>
            ))}
            <button type="button" onClick={handleClearAll} className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Pulisci tutto</button>
          </div>
        )}

        {tagFrequencies.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Tag suggeriti</h2>
            <div className="flex flex-wrap gap-2">
              {tagFrequencies.map(({tag, count}) => (
                <button
                  key={tag}
                  type="button"
                  onClick={()=>handleAddTag(tag)}
                  className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-200 text-xs font-medium transition-colors"
                  aria-label={`Aggiungi filtro tag ${tag}`}
                >{tag}<span className="ml-1 text-[10px] opacity-60">{count}</span></button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">Caricamento gem...</div>
        )}
        {error && (
          <div className="py-8 text-center text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        {emptyState && (
          <div className="py-20 text-center text-slate-500 dark:text-slate-400 text-sm">Nessun risultato. Prova a modificare i termini o i tag.</div>
        )}

        <div className="space-y-6">
          {displayedGems.map(gem => (
            <GemCard
              key={gem.id}
              gem={gem as any}
              isLoggedIn={isLoggedIn}
              isFavorite={allFavoriteIds.includes(gem.id)}
              onSaveRequest={onSaveRequest}
              onRemoveRequest={onRemoveRequest}
              onSelect={onSelectGem}
              onLoginRequest={onLogin}
              onTagClick={handleAddTag}
            />
          ))}

          {/* Sentinel per infinite scroll */}
          {displayedGems.length > 0 && hasMoreResults && (
            <div className="flex flex-col items-center py-10 gap-3">
              <div ref={loadMoreTriggerRef} style={{ height: 40, width: '100%' }} />
              {isLoadingMore ? (
                <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  <p className="mt-2 text-xs">Caricamento altre gem...</p>
                </div>
              ) : (
                <>
                  <div className="text-slate-400 text-xs">Scorri per caricare altre gem</div>
                  <button
                    type="button"
                    onClick={loadMoreGems}
                    className="text-indigo-500 hover:text-indigo-600 text-xs font-medium underline"
                  >Carica altre</button>
                </>
              )}
            </div>
          )}

          {!hasMoreResults && !loading && displayedGems.length > 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">��� Hai visto tutti i risultati.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GemSearchPage;
