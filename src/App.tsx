import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Gem, User, SavedList, Channel, Filter, ListWithItems, UserRole } from './types';
import { auth, googleProvider, getIdToken, trackEvent } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import * as firestoreService from './services/firestoreService';
import * as feedbackService from './services/feedbackService';
import Header from './components/Header';
import GemCard from './components/GemCard';
import GemDetailView from './components/GemDetailView';
import LoginModal from './components/LoginModal';
import SavedView from './components/SavedView';
import ProfileView from './components/ProfileView';
import TopicManagement from './components/admin/TopicManagement';
import GemsManagement from './components/admin/GemsManagement';
import UserManagement from './components/admin/UserManagement';
import ChannelManagement from './components/admin/ChannelManagement';
import FeedbackManagement from './components/admin/FeedbackManagement';
import FeedbackButton from './components/FeedbackButton';
import FeedbackModal from './components/FeedbackModal';
import OnboardingModal from './components/OnboardingModal';
import { SparklesIcon } from './components/icons';
import SaveToListModal from './components/SaveToListModal';
import AdminConfirmationModal from './components/admin/AdminConfirmationModal';
import GemSearchPage from './components/GemSearchPage';
import TokenCounterManagement from './components/admin/TokenCounterManagement';
import AdminLayout from './components/admin/AdminLayout';
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
// Import admin utils in development
import './utils/adminUtils';
import './utils/migratePermissions';
import './utils/migrateChannels';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getDefaultPermissions } from './services/roleService';

const App: React.FC = () => {
  const [gems, setGems] = useState<Gem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stati per infinite scroll
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreGems, setHasMoreGems] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userLists, setUserLists] = useState<ListWithItems[]>([]);
  const [authReady, setAuthReady] = useState(false);

  const [filter, setFilter] = useState<Filter>({ type: 'all' });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  // Stati modali salvataggio / rimozione
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [gemToSaveId, setGemToSaveId] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [gemToRemoveId, setGemToRemoveId] = useState<string | null>(null);

  // Stati per la modale di onboarding
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const onboardingTriggerRef = React.useRef<HTMLDivElement | null>(null);

  // Stati per il sistema di feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const feedbackButtonRef = React.useRef<any>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Tracciamento page_view ad ogni cambio di route
  useEffect(() => {
    trackEvent('page_view', { page_path: location.pathname });
  }, [location.pathname]);

  const handleSelectGem = async (gemId: string) => {
    setSelectedGemId(gemId);
    navigate(`/gem/${gemId}`);
    trackEvent('select_content', { content_type: 'gem', item_id: gemId });
  };

  // Caricamento iniziale delle gems con paginazione
  const loadInitialGems = useCallback(async () => {
    setIsLoading(true);
    try {
      const INITIAL_PAGE_SIZE = 7;
      const result = await firestoreService.fetchGemsPaginated(undefined, INITIAL_PAGE_SIZE);
      setGems(result.gems);
      setLastVisible(result.lastVisible);
      setHasMoreGems(result.gems.length === INITIAL_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading initial gems:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Caricamento di più gems per infinite scroll
  const loadMoreGems = useCallback(async () => {
    if (!hasMoreGems) return;
    if (isLoadingMore) return;
    if (!lastVisible) return;

    setIsLoadingMore(true);
    try {
      const PAGE_SIZE = 7;
      const result = await firestoreService.fetchGemsPaginated(lastVisible, PAGE_SIZE);
      if (result.gems.length > 0) {
        setGems(prev => {
          const existingIds = new Set(prev.map(g => g.id));
          const newUnique = result.gems.filter(g => !existingIds.has(g.id));
          return newUnique.length ? [...prev, ...newUnique] : prev;
        });
        setLastVisible(result.lastVisible);
        setHasMoreGems(result.gems.length === PAGE_SIZE);
        trackEvent('load_more', { batch_size: result.gems.length });
      } else {
        setHasMoreGems(false);
      }
    } catch (error) {
      console.error('Error loading more gems:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreGems, isLoadingMore, lastVisible]);

  // Intersection Observer per infinite scroll
  useEffect(() => {
    if (!firebaseUser || !hasMoreGems || isLoadingMore) return;
    if (isLoading) return; // attendi fine caricamento iniziale

    const attachObserver = () => {
      const trigger = loadMoreTriggerRef.current;
      if (!trigger) {
        // Ritenta una volta al prossimo frame se il sentinel non è ancora montato
        requestAnimationFrame(() => {
          const retryTrigger = loadMoreTriggerRef.current;
          if (retryTrigger) startObserver(retryTrigger);
        });
        return;
      }
      startObserver(trigger);
    };

    const startObserver = (trigger: HTMLDivElement) => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreGems && !isLoadingMore) {
            loadMoreGems();
          }
        },
        { root: null, threshold: 0.1, rootMargin: '200px 0px 200px 0px' }
      );
      observer.observe(trigger);
      observerRef.current = observer;
    };

    const observerRef = { current: null as IntersectionObserver | null };
    attachObserver();

    return () => {
      if (observerRef.current && loadMoreTriggerRef.current) {
        observerRef.current.unobserve(loadMoreTriggerRef.current);
        observerRef.current.disconnect();
      }
    };
  }, [firebaseUser, hasMoreGems, isLoadingMore, loadMoreGems, gems, isLoading]);

  // Fallback: listener scroll (utile per il primo batch che talvolta non attiva l'observer)
  useEffect(() => {
    if (!firebaseUser || !hasMoreGems) return;
    if (isLoadingMore) return;
    const onScroll = () => {
      if (!loadMoreTriggerRef.current) return;
      if (isLoadingMore) return;
      const rect = loadMoreTriggerRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.top - vh < 150 && hasMoreGems) {
        loadMoreGems();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [firebaseUser, hasMoreGems, isLoadingMore, loadMoreGems, gems.length]);

  // Caricamento iniziale e reset quando cambia il filtro o l'utente si logga
  useEffect(() => {
    if (firebaseUser) {
      setGems([]);
      setLastVisible(undefined);
      setHasMoreGems(true);
      loadInitialGems();
    }
  }, [firebaseUser, filter.type, filter.value]);

  // Caricamento dati iniziali (solo per utenti non loggati e canali) - attende authReady
  useEffect(() => {
    if (!authReady) return; // aspetta inizializzazione auth
    if (firebaseUser) return; // se loggato, non fare il fetch non-loggato

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const fetchedChannels = await firestoreService.fetchChannels();
        setChannels(fetchedChannels);
        const result = await firestoreService.fetchGemsPaginated(undefined, 7);
        setGems(result.gems);
        setLastVisible(result.lastVisible);
        setHasMoreGems(result.gems.length === 7);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [firebaseUser, authReady]);

  // Carica i canali anche per utenti loggati (prima venivano caricati solo se non loggati)
  useEffect(() => {
    if (!firebaseUser) return; // solo per utenti autenticati
    if (channels.length > 0) return; // evita refetch inutile
    (async () => {
      try {
        const fetchedChannels = await firestoreService.fetchChannels();
        setChannels(fetchedChannels);
      } catch (e) {
        console.error('Errore fetch canali (utente loggato):', e);
      }
    })();
  }, [firebaseUser, channels.length]);

  // Auth state listener
  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          setFirebaseUser(currentUser);
          if (!authReady) setAuthReady(true);
          if (currentUser) {
              try {
                  await currentUser.getIdToken();
              } catch (error) {
                  console.error('Errore nel recupero del JWT token:', error);
              }
              let userProfile = await firestoreService.fetchUserProfile(currentUser.uid);
              if (!userProfile) {
                  const email = currentUser.email || 'no-email@example.com';
                  const [firstName, lastName] = email.split('@')[0].split('.') || [email, ''];
                  await firestoreService.createUserProfile(currentUser.uid, email, firstName, lastName || '');
                  userProfile = await firestoreService.fetchUserProfile(currentUser.uid);
              }
              // Normalizzazione profili legacy senza permissions completi
              if (userProfile) {
                  const needsPermissionsUpdate = !userProfile.permissions || (userProfile.permissions as any).canViewDashboard === undefined;
                  const needsRoleDefault = !userProfile.role;
                  if (needsPermissionsUpdate || needsRoleDefault) {
                      const role = userProfile.role || 'user';
                      const defaultPerms = getDefaultPermissions(role as any);
                      await firestoreService.updateUserProfile(currentUser.uid, {
                        role: role,
                        permissions: { ...defaultPerms, ...(userProfile.permissions || {}) },
                        updatedAt: new Date()
                      } as any);
                      userProfile = await firestoreService.fetchUserProfile(currentUser.uid);
                      console.log('[FixLegacyUser] Aggiornati permessi/ruolo utente legacy');
                  }
              }
              const newUserLists = await firestoreService.fetchUserListsNew(currentUser.uid);
              setUser(userProfile);
              setUserLists(newUserLists);
              setShowLoginModal(false);
          } else {
              setUser(null);
              setUserLists([]);
              setFilter({ type: 'all' });
          }
      });
      return () => unsubscribe();
  }, [authReady]);

  const handleSignUpAttempt = async (email: string, pass: string, firstName: string, lastName: string) => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await firestoreService.createUserProfile(userCredential.user.uid, email, firstName, lastName);
      trackEvent('sign_up', { method: 'password', user_id: userCredential.user.uid });
      setShowLoginModal(false); // Chiudi il modal dopo il successo
  };

  const handleLoginAttempt = async (email: string, pass: string) => {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      trackEvent('login', { method: 'password', user_id: userCredential.user.uid });
      setShowLoginModal(false); // Chiudi il modal dopo il successo
      return userCredential;
  };

  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Log del JWT token
      const idToken = await user.getIdToken();
      console.log('JWT Token (Google Login):', idToken);

      // Controlla se il profilo utente esiste già
      let userProfile = await firestoreService.fetchUserProfile(user.uid);

      if (!userProfile) {
        // Se è la prima volta che l'utente accede con Google, crea il profilo
        const email = user.email || 'no-email@example.com';
        const firstName = user.displayName?.split(' ')[0] || 'Nome';
        const lastName = user.displayName?.split(' ').slice(1).join(' ') || 'Cognome';

        await firestoreService.createUserProfile(user.uid, email, firstName, lastName);
      }

      trackEvent('login', { method: 'google', user_id: user.uid });
      setShowLoginModal(false); // Chiudi il modal dopo il successo
    } catch (error: any) {
      console.error('Errore nell\'autenticazione Google:', error);
      throw new Error('Errore nell\'autenticazione con Google: ' + error.message);
    }
  };

  const handleLogout = () => {
    trackEvent('logout');
    signOut(auth);
  };

  const handleNavigate = (view: 'feed' | 'saved' | 'profile' | 'dashboard' | 'topics') => {
    console.log('Navigating to:', view); // Debug log
    window.scrollTo(0, 0);
    // mappa view a route
    switch(view){
      case 'feed': navigate('/'); break;
      case 'saved': navigate('/saved'); break;
      case 'profile': navigate('/profile'); break;
      case 'dashboard': navigate('/admin/gems'); break;
      case 'topics': navigate('/admin/topics'); break;
      default: navigate('/');
    }
  };
  
  const handleLoginRequest = () => {
    if(!firebaseUser) setShowLoginModal(true);
  }

  const allFavoriteIds = useMemo(() => {
    return Array.from(new Set(userLists.flatMap(list => list.gemIds)));
  }, [userLists]);

  const handleSaveRequest = (gemId: string) => {
    setGemToSaveId(gemId);
    setIsSaveModalOpen(true);
  };

  const handleRemoveRequest = (gemId: string) => {
    setGemToRemoveId(gemId);
    setShowRemoveConfirm(true);
  };

  const handleConfirmRemove = async () => {
    if (!firebaseUser || !gemToRemoveId) return;
    try {
      const containingLists = userLists.filter(l => l.gemIds.includes(gemToRemoveId));
      for (const list of containingLists) {
        await firestoreService.removeGemFromUserList(firebaseUser.uid, list.id, gemToRemoveId);
      }
      // Aggiorna stato locale
      const updatedLists = userLists.map(list => list.gemIds.includes(gemToRemoveId)
        ? { ...list, gemIds: list.gemIds.filter(id => id !== gemToRemoveId), itemCount: list.itemCount - 1, updatedAt: new Date() }
        : list);
      setUserLists(updatedLists);
    } catch (e) {
      console.error('Errore rimozione gem:', e);
      alert('Errore nella rimozione dalla lista');
    } finally {
      setGemToRemoveId(null);
      setShowRemoveConfirm(false);
    }
  };

  // Aggiorna le liste dell'utente con la nuova struttura
  const updateUserLists = async (updatedLists: ListWithItems[]) => {
      if (!firebaseUser) return;
      setUserLists(updatedLists);
      // Non serve più salvare nel documento utente, le liste sono in collezioni separate
  };

  const handleSaveToList = async (listId: string) => {
    if (!gemToSaveId || !firebaseUser) return;

    try {
      await firestoreService.addGemToUserList(firebaseUser.uid, listId, gemToSaveId);
      trackEvent('add_to_list', { list_id: listId, gem_id: gemToSaveId });
      // Aggiorna lo stato locale
      const updatedLists = userLists.map(list => {
        if (list.id === listId && !list.gemIds.includes(gemToSaveId)) {
          return {
            ...list,
            gemIds: [...list.gemIds, gemToSaveId],
            itemCount: list.itemCount + 1,
            updatedAt: new Date()
          };
        }
        return list;
      });
      setUserLists(updatedLists);
    } catch (error) {
      console.error('Error saving to list:', error);
      alert('Errore nel salvare nella lista');
    }
  };
  
  const handleCreateListAndSave = async (listName: string) => {
      if (!gemToSaveId || !firebaseUser) return;

      try {
        const newListId = await firestoreService.createNewList(firebaseUser.uid, listName);
        await firestoreService.addGemToUserList(firebaseUser.uid, newListId, gemToSaveId);
        trackEvent('create_list', { list_id: newListId, gem_id: gemToSaveId });
        // Aggiungi la nuova lista allo stato locale
        const newList: ListWithItems = {
          id: newListId,
          name: listName,
          isPublic: false,
          createdBy: firebaseUser.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
          gemIds: [gemToSaveId],
          itemCount: 1,
          userRole: 'owner'
        };
        setUserLists([...userLists, newList]);
      } catch (error) {
        console.error('Error creating list and saving:', error);
        alert('Errore nella creazione della lista');
      }
  };

  // Crea una nuova lista tramite il servizio e ricarica le liste
  const handleCreateNewList = async (listName: string) => {
    if (!firebaseUser) return;

    try {
      await firestoreService.createNewList(firebaseUser.uid, listName);
      trackEvent('create_list', { list_name: listName });
      // Ricarica le liste dopo la creazione
      const updatedLists = await firestoreService.fetchUserListsNew(firebaseUser.uid);
      setUserLists(updatedLists);
    } catch (error) {
      console.error('Error creating new list:', error);
      throw error; // Rilancia l'errore per gestirlo nel componente
    }
  };

  const handleToggleFavorite = async (gemId: string) => {
    if (!firebaseUser) return;

    const favoritesList = userLists.find(list => list.name === 'Preferiti' || list.id === 'default');
    if (!favoritesList) return;

    const isFav = favoritesList.gemIds.includes(gemId);

    try {
      if (isFav) {
        await firestoreService.removeGemFromUserList(firebaseUser.uid, favoritesList.id, gemId);
      } else {
        await firestoreService.addGemToUserList(firebaseUser.uid, favoritesList.id, gemId);
      }

      // Aggiorna lo stato locale
      const updatedLists = userLists.map(list => {
        if (list.id === favoritesList.id) {
          return {
            ...list,
            gemIds: isFav
              ? list.gemIds.filter(id => id !== gemId)
              : [...list.gemIds, gemId],
            itemCount: isFav ? list.itemCount - 1 : list.itemCount + 1,
            updatedAt: new Date()
          };
        }
        return list;
      });
      setUserLists(updatedLists);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Errore nel modificare i preferiti');
    }
  };
  
  const handleAddUserQuestion = async (gemId: string, question: string) => {
      await firestoreService.addUserQuestion(gemId, question);
  };

  // Funzioni mancanti reintrodotte
  const navigateToSearch = (params: { term?: string; tags?: string[] }) => {
    const { term, tags } = params;
    let path = '/gem-search';
    if (tags && tags.length) {
      path += '/' + encodeURIComponent(tags.join(','));
    }
    if (term) {
      path += `?q=${encodeURIComponent(term)}`;
    }
    navigate(path);
  };

  const handleSelectTag = (tag: string) => {
    // naviga a pagina ricerca con il tag
    navigateToSearch({ tags: [tag] });
  };

  const handleBackToFeed = () => {
    if (window.history.length > 1) navigate(-1); else navigate('/');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    if (!firebaseUser) return;
    setUser(updatedUser);
    await firestoreService.updateUserProfile(firebaseUser.uid, {
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
    });
  };

  const handleOnboardingLogin = () => { setShowOnboardingModal(false); setShowLoginModal(true); };
  const handleOnboardingSignUp = () => { setShowOnboardingModal(false); setShowLoginModal(true); };

  const getCurrentSection = (): string => {
    const path = location.pathname;
    if (path === '/') return 'Feed principale';
    if (path.startsWith('/gem/')) {
      const id = path.split('/gem/')[1];
      const gem = gems.find(g=>g.id===id);
      return `Dettaglio gem: ${gem?.title || id}`;
    }
    if (path === '/saved') return 'Liste salvate';
    if (path === '/profile') return 'Profilo utente';
    if (path.startsWith('/admin')) return 'Sezione amministrazione';
    return 'Sezione sconosciuta';
  };

  const handleFeedbackSubmit = async (section: string, message: string) => {
    if (!firebaseUser || !user) return;

    try {
      const userName = `${user.firstName} ${user.lastName}`;
      await feedbackService.createFeedback(
        firebaseUser.uid,
        user.email,
        userName,
        section,
        message
      );
      trackEvent('feedback_submit', { section });
      // Mostra animazione di successo sul pulsante invece dell'alert
      if (feedbackButtonRef.current?.showSuccess) {
        feedbackButtonRef.current.showSuccess();
      }
    } catch (error) {
      console.error('Errore nell\'invio del feedback:', error);
      throw error; // Permette alla modale di gestire l'errore
    }
  };

  const filteredGems = useMemo(() => {
    switch (filter.type) {
      case 'all':
        return gems;
      case 'favorites':
        return gems.filter(g => allFavoriteIds.includes(g.id));
      case 'channel':
        return gems.filter(g => g.channelId === filter.value);
      case 'topic':
        return gems.filter(g => g.topic === filter.value);
      case 'tag':
        return gems.filter(g => g.tags?.includes(filter.value));
      default:
        return gems;
    }
  }, [gems, filter, allFavoriteIds]);

  // Effetto per l'Intersection Observer della modale di onboarding
  useEffect(() => {
    // Attiva l'observer solo se l'utente non �� loggato e non ha già visto la modale in questa sessione
    if (firebaseUser || hasSeenOnboarding || isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShowOnboardingModal(true);
          setHasSeenOnboarding(true);
          observer.disconnect(); // Smette di osservare dopo aver mostrato la modale una volta
        }
      },
      {
        root: null, // Osserva rispetto al viewport
        threshold: 0.5, // Si attiva quando il 50% dell'elemento è visibile
      }
    );

    const trigger = onboardingTriggerRef.current;
    if (trigger) {
      observer.observe(trigger);
    }

    return () => {
      if (trigger) {
        observer.unobserve(trigger);
      }
    };
  }, [firebaseUser, hasSeenOnboarding, isLoading, filteredGems]); // Le dipendenze assicurano che l'observer si riattivi se il filtro cambia


  // Verifica se l'utente può vedere il pulsante feedback
  const canShowFeedbackButton = useMemo(() => {
    return user && (user.role === UserRole.ADMIN || user.role === UserRole.BETATESTER);
  }, [user]);

  /* HO SPOSTATO LA DICHIARAZIONE DI filteredGems PRIMA DELLO USEEFFECT PER RISOLVERE IL BUG */

  // Limita le gems visualizzate per utenti non loggati
  const GEMS_LIMIT_FOR_UNLOGGED_USERS = 7;
  let displayedGems: Gem[];
  if (!firebaseUser) {
    const normalGems = filteredGems.filter(g => !g.isSpecial).slice(0, GEMS_LIMIT_FOR_UNLOGGED_USERS);
    const specialGem = filteredGems.find(g => g.isSpecial);
    displayedGems = specialGem ? [...normalGems, specialGem] : normalGems;
  } else {
    displayedGems = filteredGems;
  }

  const renderFeed = () => (
    <>
      <Header
        isLoggedIn={!!firebaseUser}
        user={user}
        onLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        selectedFilter={filter}
        onSelectFilter={setFilter}
        onNavigate={handleNavigate}
        channels={channels}
        showFilters={true}
        onSearch={(term)=> navigateToSearch({ term })}
      />
      <main className="max-w-xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {isLoading && gems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 pt-20">
            <SparklesIcon className="w-16 h-16 animate-pulse text-indigo-400" />
            <p className="mt-4 text-lg font-semibold">Stiamo preparando Curiow per te...</p>
            <p className="mt-1 text-sm">Un momento, stiamo cercando spunti interessanti.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {displayedGems.map((gem, index) => (
              <React.Fragment key={gem.id}>
                {gem.isSpecial ? (
                  <div className="p-8 text-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl my-8">
                    <h2 className="text-3xl font-bold text-white mb-3">{gem.title}</h2>
                    <p className="text-indigo-300 text-lg mb-6">{(gem as any).content?.description || ''}</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg transform hover:scale-105"
                      >
                        Registrati o Accedi
                      </button>
                    </div>
                  </div>
                ) : (
                  <GemCard
                    gem={gem}
                    isLoggedIn={!!firebaseUser}
                    isFavorite={allFavoriteIds.includes(gem.id)}
                    onSaveRequest={handleSaveRequest}
                    onRemoveRequest={handleRemoveRequest}
                    onSelect={handleSelectGem}
                    onLoginRequest={handleLoginRequest}
                    onTagClick={(t)=>handleSelectTag(t)}
                  />
                )}

                {/* Card onboarding trigger invisibile */}
                {!firebaseUser && index === 3 && !hasSeenOnboarding && (
                  <div ref={onboardingTriggerRef} style={{ height: '1px' }} />
                )}

                {/* Card promozionale dopo la 7a gem (index 6) solo per non loggati */}
                {!firebaseUser && index === (GEMS_LIMIT_FOR_UNLOGGED_USERS - 1) && (
                  <div className="mt-6 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-white via-indigo-50 to-indigo-100 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 shadow-sm text-center">
                    <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mb-2">Vuoi vedere molte più gem?</h3>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-4">Accedi o registrati gratis per sbloccare l'intero feed, salvare idee e creare liste personalizzate.</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="px-5 py-2.5 text-sm font-semibold rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow"
                      >Accedi / Registrati</button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            {firebaseUser && !isLoading && hasMoreGems && (
              <div className="flex flex-col items-center py-12 gap-3">
                <div ref={loadMoreTriggerRef} style={{ height: 40, width: '100%' }} />
                {isLoadingMore ? (
                  <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
                    <SparklesIcon className="w-8 h-8 animate-pulse text-indigo-400" />
                    <p className="mt-2 text-sm">Caricamento altre gemme...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-slate-400 text-sm">Scorri per caricare altre gemme</div>
                    <button
                      type="button"
                      onClick={() => loadMoreGems()}
                      className="text-indigo-500 hover:text-indigo-600 text-xs font-medium underline"
                    >Carica altre</button>
                  </>
                )}
              </div>
            )}

            {firebaseUser && !hasMoreGems && gems.length > 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                🎉 Hai visto tutte le gemme disponibili!
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );

  const FeedPage = () => renderFeed();

  const SavedPage: React.FC = () => {
    if(!firebaseUser) return <Navigate to="/" replace />;
    return <SavedView
      allGems={gems}
      allFavoriteIds={allFavoriteIds}
      savedLists={userLists}
      onUpdateLists={updateUserLists}
      onSelectGem={handleSelectGem}
      onToggleFavorite={handleToggleFavorite}
      onLoginRequest={handleLoginRequest}
      onBack={() => navigate(-1)}
      onCreateList={handleCreateNewList}
    />;
  };

  const ProfilePage: React.FC = () => {
    if(!firebaseUser || !user) return <Navigate to="/" replace />;
    return <ProfileView user={user} onUpdateUser={handleUpdateUser} onBack={() => navigate(-1)} onNavigate={() => navigate('/admin/gems')} />;
  };

  const GemDetailPage: React.FC = () => {
    const { id } = useParams();
    const gem = gems.find(g=>g.id===id);
    const [singleGem, setSingleGem] = React.useState<Gem | null>(gem || null);
    const [loadingGem, setLoadingGem] = React.useState(!gem);

    // Aggiorna selectedGemId solo se cambia
    useEffect(()=>{ if(id && id !== selectedGemId) setSelectedGemId(id); },[id, selectedGemId]);

    const shallowQuestionsEqual = (a:any[]|undefined,b:any[]|undefined) => {
      if(a===b) return true; if(!a||!b) return false; if(a.length!==b.length) return false; return a.every((q,i)=>q.id===b[i].id && q.answer===b[i].answer && q.question===b[i].question && q.isGenerating===b[i].isGenerating);
    };

    // Carica gem se non presente
    useEffect(()=>{
      if(!singleGem && id){
        (async()=>{
          setLoadingGem(true);
          const fetched = await firestoreService.fetchGemById(id);
            if(fetched) setSingleGem(fetched);
          setLoadingGem(false);
        })();
      }
    },[id, singleGem]);

    // Listener domande utente - ISOLATO dal resto della logica
    useEffect(()=>{
      if(!id) return;

      console.log('Setting up listener for gem:', id);

      const unsubscribe = firestoreService.listenToUserQuestions(id, (questions)=>{
        console.log('Received questions update for gem:', id, questions.length);

        // Aggiorna solo la gem singola, NON l'array principale
        setSingleGem(prev=>{
          if(!prev) return prev;
          if(!shallowQuestionsEqual((prev as any).userQuestions, questions)) {
            return { ...prev, userQuestions: questions } as Gem;
          }
          return prev;
        });

        // Aggiorna l'array principale SOLO se necessario e SENZA scatenare re-render
        setGems(prev=>{
          const updated = prev.map(g=>{
            if(g.id===id){
              if(!shallowQuestionsEqual((g as any).userQuestions, questions)){
                return { ...g, userQuestions: questions } as Gem;
              }
            }
            return g;
          });

          // Controllo se è davvero cambiato qualcosa
          const hasChanges = prev.some((g, index) => g !== updated[index]);
          if (!hasChanges) return prev; // Evita aggiornamenti inutili
          return updated;
        });

      });

      return () => {
        console.log('Cleaning up listener for gem:', id);
        unsubscribe();
      };
    }, [id]);

    if(loadingGem) return <div className="p-8 text-center text-slate-500">Caricamento gem...</div>;
    if(!singleGem) return <div className="p-8 text-center text-slate-500">Gem non trovata.</div>;

    return <GemDetailView
      gem={singleGem}
      isFavorite={allFavoriteIds.includes(singleGem.id)}
      isLoggedIn={!!firebaseUser}
      user={user}
      onBack={handleBackToFeed}
      onSaveRequest={handleSaveRequest}
      onRemoveRequest={handleRemoveRequest}
      onAddUserQuestion={handleAddUserQuestion}
      onTagSelect={(t)=>handleSelectTag(t)}
      onLogin={() => setShowLoginModal(true)}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
      selectedFilter={filter}
      onSelectFilter={setFilter}
      channels={channels}
      currentUserId={firebaseUser?.uid}
    />;
  };

  const RequireAdmin: React.FC<{children: React.ReactElement}> = ({children}) => {
    if(!firebaseUser || !user || user.role !== UserRole.ADMIN) return <Navigate to="/" replace />;
    return children;
  };

  // Componenti content per routing annidato admin
  const AdminGemsContent = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;
    return <GemsManagement currentUser={safeCurrentUser} onBack={() => navigate(-1)} />;
  };

  const AdminUsersContent = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;
    return <UserManagement currentUser={safeCurrentUser} onBack={() => navigate(-1)} />;
  };

  const AdminTopicsContent = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;
    return <TopicManagement currentUser={safeCurrentUser} onBack={() => navigate(-1)} />;
  };

  const AdminChannelsContent = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;
    return <ChannelManagement currentUser={safeCurrentUser} onBack={() => navigate(-1)} />;
  };

  const AdminFeedbackContent = () => {
    return <FeedbackManagement onBack={() => navigate(-1)} />;
  };

  const AdminTokenCounterContent = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;
    return <TokenCounterManagement currentUser={safeCurrentUser} onBack={() => navigate(-1)} />;
  };

  // Helper per creare currentUser sicuro
  const createSafeCurrentUser = () => {
    if (!user || !firebaseUser) return null;
    return { ...user, uid: firebaseUser.uid };
  };

  const AdminGemsPage = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;

    return (
      <RequireAdmin>
        <AdminGemsContent />
      </RequireAdmin>
    );
  };

  const AdminUsersPage = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;

    return (
      <RequireAdmin>
        <AdminUsersContent />
      </RequireAdmin>
    );
  };

  const AdminTopicsPage = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;

    return (
      <RequireAdmin>
        <AdminTopicsContent />
      </RequireAdmin>
    );
  };

  const AdminChannelsPage = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;

    return (
      <RequireAdmin>
        <AdminChannelsContent />
      </RequireAdmin>
    );
  };

  const AdminFeedbackPage = () => (
    <RequireAdmin>
      <AdminFeedbackContent />
    </RequireAdmin>
  );

  const AdminTokenCounterPage = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;
    return (
      <RequireAdmin>
        <AdminTokenCounterContent />
      </RequireAdmin>
    );
  };

  // Scroll lock durante apertura LoginModal
  useEffect(() => {
    if (showLoginModal) {
      const scrollY = window.scrollY;
      (document.body as any).dataset.curiowScrollY = String(scrollY);
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const stored = (document.body as any).dataset.curiowScrollY;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (stored) {
        window.scrollTo(0, parseInt(stored, 10));
        delete (document.body as any).dataset.curiowScrollY;
      }
    }
  }, [showLoginModal]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/gem/:id" element={<GemDetailPage />} />
          <Route path="/gem-search" element={<GemSearchPage
            isLoggedIn={!!firebaseUser}
            user={user}
            allFavoriteIds={allFavoriteIds}
            onLogin={() => setShowLoginModal(true)}
            onSelectGem={handleSelectGem}
            onSaveRequest={handleSaveRequest}
            onRemoveRequest={handleRemoveRequest}
          />} />
          <Route path="/gem-search/:tagParam" element={<GemSearchPage
            isLoggedIn={!!firebaseUser}
            user={user}
            allFavoriteIds={allFavoriteIds}
            onLogin={() => setShowLoginModal(true)}
            onSelectGem={handleSelectGem}
            onSaveRequest={handleSaveRequest}
            onRemoveRequest={handleRemoveRequest}
          />} />
          <Route path="/admin" element={<AdminLayout currentUser={createSafeCurrentUser()} />}>
            <Route index element={<Navigate to="/admin/gems" replace />} />
            <Route path="gems" element={<AdminGemsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="topics" element={<AdminTopicsPage />} />
            <Route path="channels" element={<AdminChannelsPage />} />
            <Route path="feedback" element={<AdminFeedbackPage />} />
            <Route path="token-counter" element={<AdminTokenCounterPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Pulsante feedback flottante per admin e betatester */}
        {canShowFeedbackButton && (
          <FeedbackButton
            ref={feedbackButtonRef}
            onClick={() => setShowFeedbackModal(true)}
          />
        )}

        {showLoginModal && <LoginModal
            onLoginAttempt={handleLoginAttempt}
            onSignUpAttempt={handleSignUpAttempt}
            onGoogleAuth={handleGoogleAuth}
            onCancel={() => setShowLoginModal(false)}
        />}

        {showOnboardingModal && (
          <OnboardingModal
            isOpen={showOnboardingModal}
            onLoginRequest={handleOnboardingLogin}
            onSignUpRequest={handleOnboardingSignUp}
            onClose={() => setShowOnboardingModal(false)}
          />
        )}

        {showFeedbackModal && (
          <FeedbackModal
            section={getCurrentSection()}
            onSubmit={handleFeedbackSubmit}
            onCancel={() => setShowFeedbackModal(false)}
            onSuccess={() => {
              if (feedbackButtonRef.current?.showSuccess) {
                feedbackButtonRef.current.showSuccess();
              }
            }}
          />
        )}

        {isSaveModalOpen && gemToSaveId && (
            <SaveToListModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                lists={userLists.filter(l => l.id !== 'default')}
                gemId={gemToSaveId}
                onSaveToList={handleSaveToList}
                onCreateAndSave={handleCreateListAndSave}
                onToggleDefaultFavorite={handleToggleFavorite}
                isSavedToDefault={userLists.find(l=>l.id==='default')?.gemIds.includes(gemToSaveId) ?? false}
            />
        )}


        {showRemoveConfirm && gemToRemoveId && (
          <AdminConfirmationModal
            isOpen={showRemoveConfirm}
            onClose={() => { setShowRemoveConfirm(false); setGemToRemoveId(null); }}
            onConfirm={handleConfirmRemove}
            title="Rimuovi dalla/e lista/e"
            message="Questa gem verrà rimossa da tutte le tue liste in cui è presente. Confermi?"
            actionText="Rimuovi"
            actionType="danger"
          />
        )}
    </div>
  );
};

export default App;
