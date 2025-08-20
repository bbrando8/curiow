import React, { useState, useEffect, useMemo } from 'react';
import { Gem, User, SavedList, Channel, Filter, ListWithItems, UserRole } from './types';
import { auth, googleProvider, getIdToken } from './services/firebase';
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
import { Routes, Route, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
// Import admin utils in development
import './utils/adminUtils';
import './utils/migratePermissions';
import './utils/migrateChannels';

const App: React.FC = () => {
  const [gems, setGems] = useState<Gem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userLists, setUserLists] = useState<ListWithItems[]>([]);
  const [isMigrated, setIsMigrated] = useState(false);

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

  const handleSelectGem = async (gemId: string) => {
    if (auth.currentUser) {
      const token = await getIdToken();
      console.log('Firebase JWT Token:', token);
    } else {
      console.log('Utente non autenticato, nessun JWT token da mostrare.');
    }
    setSelectedGemId(gemId);
    // navigazione alla pagina dettaglio
    navigate(`/gem/${gemId}`);
  };

  // Fetch initial static-like data
  useEffect(() => {
    const fetchInitialData = async () => {
        setIsLoading(true);
        const [fetchedGems, fetchedChannels] = await Promise.all([
            firestoreService.fetchGems(),
            firestoreService.fetchChannels(),
        ]);
        setGems(fetchedGems);
        setChannels(fetchedChannels);
        setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  // Auth state listener
  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          console.log('Auth state changed - currentUser:', currentUser?.uid);
          setFirebaseUser(currentUser);
          if (currentUser) {
              // Log del JWT token quando lo stato cambia
              try {
                  const idToken = await currentUser.getIdToken();
                  console.log('JWT Token (Auth State Changed):', idToken);
              } catch (error) {
                  console.error('Errore nel recupero del JWT token:', error);
              }

              let userProfile = await firestoreService.fetchUserProfile(currentUser.uid);
              console.log('Fetched user profile:', userProfile);

              // Se il profilo non esiste, creane uno nuovo. Utile per utenti già esistenti in Auth ma non in Firestore.
              if (!userProfile) {
                  console.log(`Creating new profile for user ${currentUser.uid}`);
                  const email = currentUser.email || 'no-email@example.com';
                  const [firstName, lastName] = email.split('@')[0].split('.') || [email, ''];
                  await firestoreService.createUserProfile(currentUser.uid, email, firstName, lastName || '');
                  userProfile = await firestoreService.fetchUserProfile(currentUser.uid);
                  console.log('Created new user profile:', userProfile);
              }

              // Migrazione automatica alle nuove liste
              console.log('Attempting migration to new list structure...');
              const migrationSuccess = await firestoreService.migrateUserToNewListStructure(currentUser.uid);
              setIsMigrated(migrationSuccess);

              // Carica le liste con la nuova struttura
              const newUserLists = await firestoreService.fetchUserListsNew(currentUser.uid);
              setUser(userProfile);
              setUserLists(newUserLists);
              setShowLoginModal(false);

              console.log('Migration completed:', migrationSuccess);
              console.log('Loaded user lists:', newUserLists);
          } else {
              // User is signed out
              setUser(null);
              setUserLists([]);
              setIsMigrated(false);
              setFilter({ type: 'all' });
              // setCurrentView('feed'); // Single-page view rimosso
          }
      });
      return () => unsubscribe();
  }, []);
  
  const handleSignUpAttempt = async (email: string, pass: string, firstName: string, lastName: string) => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await firestoreService.createUserProfile(userCredential.user.uid, email, firstName, lastName);
      setShowLoginModal(false); // Chiudi il modal dopo il successo
  };

  const handleLoginAttempt = async (email: string, pass: string) => {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
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

      setShowLoginModal(false); // Chiudi il modal dopo il successo
    } catch (error: any) {
      console.error('Errore nell\'autenticazione Google:', error);
      throw new Error('Errore nell\'autenticazione con Google: ' + error.message);
    }
  };

  const handleLogout = () => {
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
  const handleSelectTag = (tag: string) => {
    setFilter({ type: 'tag', value: tag });
    // opzionale: torna al feed filtrato se non ci si trova già
    if (!location.pathname.startsWith('/gem/')) return;
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
    // Attiva l'observer solo se l'utente non è loggato e non ha già visto la modale in questa sessione
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
  const displayedGems = !firebaseUser
    ? filteredGems.slice(0, GEMS_LIMIT_FOR_UNLOGGED_USERS)
    : filteredGems;

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
        />
        <main className="max-w-xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {isLoading && gems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 pt-20">
            <SparklesIcon className="w-16 h-16 animate-pulse text-indigo-400"/>
            <p className="mt-4 text-lg font-semibold">Stiamo preparando Curiow per te...</p>
            <p className="mt-1 text-sm">Un momento, stiamo cercando spunti interessanti.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {displayedGems.length > 0 ? (
                <>
                  {displayedGems.map((gem, index) => (
                      <React.Fragment key={gem.id}>
                        <GemCard
                          gem={gem}
                          isLoggedIn={!!firebaseUser}
                          isFavorite={allFavoriteIds.includes(gem.id)}
                          onSaveRequest={handleSaveRequest}
                          onRemoveRequest={handleRemoveRequest}
                          onSelect={handleSelectGem}
                          onLoginRequest={handleLoginRequest}
                        />
                        {/* Trigger per la modale di onboarding dopo la 4a card per utenti non loggati */}
                        {!firebaseUser && index === 3 && !hasSeenOnboarding && (
                          <div ref={onboardingTriggerRef} style={{ height: '1px' }} />
                        )}
                      </React.Fragment>
                  ))}
                  {/* Mostra il blocco di invito al login se l'utente non è loggato e ci sono più gemme disponibili */}
                  {!firebaseUser && filteredGems.length > GEMS_LIMIT_FOR_UNLOGGED_USERS && (
                    <div className="p-8 text-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl my-8">
                      <h2 className="text-3xl font-bold text-white mb-3">Continua a scoprire</h2>
                      <p className="text-indigo-300 text-lg mb-6">
                        Registrati o accedi per sbloccare tutti i contenuti e salvare le tue gemme preferite.
                      </p>
                      <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                          onClick={() => setShowLoginModal(true)}
                          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg transform hover:scale-105"
                        >
                          Registrati o Accedi
                        </button>
                      </div>
                    </div>
                  )}
                </>
            ) : (
                <div className="text-center pt-20 text-slate-500 dark:text-slate-400">
                    <h3 className="text-xl font-semibold">Nessuna gemma trovata</h3>
                    <p className="mt-2">Prova a selezionare un'altra categoria o filtro.</p>
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

    // Listener domande utente
    useEffect(()=>{
      if(!id) return;
      const unsubscribe = firestoreService.listenToUserQuestions(id, (questions)=>{
        setGems(prev=>{
          let changed=false;
            const updated = prev.map(g=>{
              if(g.id===id){
                if(!shallowQuestionsEqual((g as any).userQuestions, questions)){
                  changed=true;
                  return { ...g, userQuestions: questions } as Gem;
                }
              }
              return g;
            });
            return changed?updated:prev;
        });
        setSingleGem(prev=>{
          if(!prev) return prev;
          if(!shallowQuestionsEqual((prev as any).userQuestions, questions)) return { ...prev, userQuestions: questions } as Gem;
          return prev;
        });
      });
      return ()=>unsubscribe();
    },[id]);

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
      onTagSelect={handleSelectTag}
      onLogin={() => setShowLoginModal(true)}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
      selectedFilter={filter}
      onSelectFilter={setFilter}
      channels={channels}
    />;
  };

  const RequireAdmin: React.FC<{children: React.ReactElement}> = ({children}) => {
    if(!firebaseUser || !user || user.role !== UserRole.ADMIN) return <Navigate to="/" replace />;
    return children;
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
        <GemsManagement currentUser={safeCurrentUser} onBack={() => navigate(-1)} />
      </RequireAdmin>
    );
  };

  const AdminUsersPage = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;

    return (
      <RequireAdmin>
        <UserManagement currentUser={safeCurrentUser} onBack={() => navigate(-1)} />
      </RequireAdmin>
    );
  };

  const AdminTopicsPage = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;

    return (
      <RequireAdmin>
        <TopicManagement currentUser={safeCurrentUser} onBack={() => navigate(-1)} />
      </RequireAdmin>
    );
  };

  const AdminChannelsPage = () => {
    const safeCurrentUser = createSafeCurrentUser();
    if (!safeCurrentUser) return <Navigate to="/" replace />;

    return (
      <RequireAdmin>
        <ChannelManagement currentUser={safeCurrentUser} onBack={() => navigate(-1)} />
      </RequireAdmin>
    );
  };

  const AdminFeedbackPage = () => (
    <RequireAdmin>
      <FeedbackManagement onBack={() => navigate(-1)} />
    </RequireAdmin>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/gem/:id" element={<GemDetailPage />} />
          <Route path="/admin" element={<Navigate to="/admin/gems" replace />} />
          <Route path="/admin/gems" element={<AdminGemsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/topics" element={<AdminTopicsPage />} />
          <Route path="/admin/channels" element={<AdminChannelsPage />} />
          <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
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
