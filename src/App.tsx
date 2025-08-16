import React, { useState, useEffect, useMemo } from 'react';
import { Gem, User, SavedList, Channel, Filter, Topic, ListWithItems, UserRole } from './types';
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
import AdminDashboard from './components/admin/AdminDashboard';
import TopicManagement from './components/admin/TopicManagement';
import FeedbackButton from './components/FeedbackButton';
import FeedbackModal from './components/FeedbackModal';
import OnboardingModal from './components/OnboardingModal';
import { SparklesIcon } from './components/icons';
import SaveToListModal from './components/SaveToListModal';
// Import admin utils in development
import './utils/adminUtils';
import './utils/migratePermissions';
import './utils/migrateChannels';

type View = 'feed' | 'detail' | 'saved' | 'profile' | 'dashboard' | 'topics';

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
  const [currentView, setCurrentView] = useState<View>('feed');
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  
  // Nuovo stato per la modale del dettaglio
  const [showGemDetailModal, setShowGemDetailModal] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [gemToSaveId, setGemToSaveId] = useState<string | null>(null);

  // Stati per la modale di onboarding
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const onboardingTriggerRef = React.useRef<HTMLDivElement | null>(null);

  // Stati per il sistema di feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const feedbackButtonRef = React.useRef<any>(null);

  const handleSelectGem = async (gemId: string) => {
    if (auth.currentUser) {
      const token = await getIdToken();
      console.log('Firebase JWT Token:', token);
    } else {
      console.log('Utente non autenticato, nessun JWT token da mostrare.');
    }
    setSelectedGemId(gemId);
    setShowGemDetailModal(true);
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
              setCurrentView('feed');
          }
      });
      return () => unsubscribe();
  }, []);
  
  // Listener for user questions on selected gem
  useEffect(() => {
    if (!selectedGemId) return;

    const unsubscribe = firestoreService.listenToUserQuestions(selectedGemId, (questions) => {
        setGems(prevGems => prevGems.map(gem => 
            gem.id === selectedGemId ? { ...gem, userQuestions: questions } : gem
        ));
    });

    return () => unsubscribe();
  }, [selectedGemId]);

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
        // Se �� la prima volta che l'utente accede con Google, crea il profilo
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

  const handleNavigate = (view: View) => {
    console.log('Navigating to:', view); // Debug log
    window.scrollTo(0, 0);
    setCurrentView(view);
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

  const handleSelectTag = (tag: string) => {
      setFilter({ type: 'tag', value: tag });
      setShowGemDetailModal(false);
  };
  
  const handleUpdateUser = async (updatedUser: User) => {
      if (!firebaseUser) return;
      setUser(updatedUser);
      await firestoreService.updateUserProfile(firebaseUser.uid, {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
      });
      alert("Profilo aggiornato!");
  }

  // Funzioni per il sistema di feedback
  const getCurrentSection = (): string => {
    switch (currentView) {
      case 'feed':
        return 'Feed principale';
      case 'detail':
        return `Dettaglio gem: ${selectedGem?.title || 'Sconosciuto'}`;
      case 'saved':
        return 'Liste salvate';
      case 'profile':
        return 'Profilo utente';
      case 'dashboard':
        return 'Dashboard amministratore';
      case 'topics':
        return 'Gestione argomenti';
      default:
        return 'Sezione sconosciuta';
    }
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
    if (filter.type === 'all') return gems;
    if (filter.type === 'channel') return gems.filter(g => g.channelId === filter.id);
    if (filter.type === 'topic') return gems.filter(g => g.topic === filter.id);
    if (filter.type === 'tag') return gems.filter(g => g.tags?.includes(filter.id));
    return gems;
  }, [gems, filter]);

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

  const selectedGem = gems.find(gem => gem.id === selectedGemId);

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

  const renderContent = () => {
    switch (currentView) {
        case 'saved':
            return firebaseUser ? <SavedView
                        allGems={gems}
                        allFavoriteIds={allFavoriteIds}
                        savedLists={userLists}
                        onUpdateLists={updateUserLists}
                        onSelectGem={handleSelectGem}
                        onToggleFavorite={handleToggleFavorite}
                        onLoginRequest={handleLoginRequest}
                        onBack={() => handleNavigate('feed')}
                        onCreateList={handleCreateNewList}
                    /> : renderFeed();
        case 'profile':
            return firebaseUser && user ? <ProfileView user={user} onUpdateUser={handleUpdateUser} onBack={() => handleNavigate('feed')} onNavigate={handleNavigate} /> : renderFeed();
        case 'dashboard':
            return firebaseUser && user ? (
                <AdminDashboard
                    currentUser={{ ...user, id: firebaseUser.uid }}
                    onClose={() => handleNavigate('feed')}
                />
            ) : renderFeed();
        case 'topics':
            return firebaseUser && user ? (
                <TopicManagement
                    currentUser={{ ...user, uid: firebaseUser.uid }}
                    onBack={() => handleNavigate('feed')}
                />
            ) : renderFeed();
        case 'feed':
        default:
            return renderFeed();
    }
  }

  const handleOnboardingLogin = () => {
    setShowOnboardingModal(false);
    setShowLoginModal(true);
  };

  const handleOnboardingSignUp = () => {
    setShowOnboardingModal(false);
    setShowLoginModal(true);
  };

  const handleBackToFeed = () => {
    setShowGemDetailModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {renderContent()}

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

        {/* Modale dettaglio gem a schermo intero */}
        {showGemDetailModal && selectedGem && (
            <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
                <GemDetailView
                    gem={selectedGem}
                    isFavorite={allFavoriteIds.includes(selectedGem.id)}
                    onBack={handleBackToFeed}
                    onSaveRequest={handleSaveRequest}
                    onAddUserQuestion={handleAddUserQuestion}
                    onTagSelect={handleSelectTag}
                />
            </div>
        )}
    </div>
  );
};

export default App;
