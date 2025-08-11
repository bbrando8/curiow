import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Gem, User, SavedList, Channel, Filter, Topic, ListWithItems } from './types';
import { TOPICS } from './constants';
import { auth, googleProvider } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import * as firestoreService from './services/firestoreService';
import Header from './components/Header';
import GemCard from './components/GemCard';
import GemDetailView from './components/GemDetailView';
import LoginModal from './components/LoginModal';
import SavedView from './components/SavedView';
import ProfileView from './components/ProfileView';
import AdminDashboard from './components/admin/AdminDashboard';
import TopicManagement from './components/admin/TopicManagement';
import { SparklesIcon } from './components/icons';
import SaveToListModal from './components/SaveToListModal';
// Import admin utils in development
import './utils/adminUtils';

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
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [gemToSaveId, setGemToSaveId] = useState<string | null>(null);

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
  };
  
  const handleLoginAttempt = async (email: string, pass: string) => {
      await signInWithEmailAndPassword(auth, email, pass);
  };

  const handleGoogleAuth = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Controlla se il profilo utente esiste già
      let userProfile = await firestoreService.fetchUserProfile(user.uid);

      if (!userProfile) {
        // Se è la prima volta che l'utente accede con Google, crea il profilo
        const email = user.email || 'no-email@example.com';
        const firstName = user.displayName?.split(' ')[0] || 'Nome';
        const lastName = user.displayName?.split(' ').slice(1).join(' ') || 'Cognome';

        await firestoreService.createUserProfile(user.uid, email, firstName, lastName);
      }

      // Il resto della logica di login è gestita automaticamente dall'listener onAuthStateChanged
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

  const handleSelectGem = (gemId: string) => {
      setSelectedGemId(gemId);
      handleNavigate('detail');
  };
  
  const handleBackToFeed = () => {
      setSelectedGemId(null);
      handleNavigate('feed');
  };
  
  const handleSelectTag = (tag: string) => {
      setFilter({ type: 'tag', value: tag });
      handleBackToFeed();
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

  const filteredGems = gems.filter(gem => {
      if (!gem.tags) return false; // Safety check
      switch (filter.type) {
        case 'all':
            return true;
        case 'favorites':
            return firebaseUser ? allFavoriteIds.includes(gem.id) : false;
        case 'topic':
            return gem.topic === filter.value;
        case 'channel':
            const channel = channels.find(c => c.id === filter.value);
            if (channel) {
                return gem.tags.some(tag => channel.filterTags.includes(tag.toLowerCase()));
            }
            return false;
        case 'tag':
            return gem.tags.map(t => t.toLowerCase()).includes(filter.value.toLowerCase());
        default:
            return true;
      }
  });
  
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
            {filteredGems.length > 0 ? (
                filteredGems.map(gem => (
                    <GemCard
                        key={gem.id}
                        gem={gem}
                        isLoggedIn={!!firebaseUser}
                        isFavorite={allFavoriteIds.includes(gem.id)}
                        onSaveRequest={handleSaveRequest}
                        onSelect={handleSelectGem}
                        onLoginRequest={handleLoginRequest}
                    />
                ))
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
        case 'detail':
            return selectedGem ? (
                <GemDetailView
                    gem={selectedGem}
                    isFavorite={allFavoriteIds.includes(selectedGem.id)}
                    onBack={handleBackToFeed}
                    onSaveRequest={handleSaveRequest}
                    onAddUserQuestion={handleAddUserQuestion}
                    onTagSelect={handleSelectTag}
                />
            ) : renderFeed(); // Fallback to feed if no gem selected
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {renderContent()}
        {showLoginModal && <LoginModal 
            onLoginAttempt={handleLoginAttempt}
            onSignUpAttempt={handleSignUpAttempt}
            onGoogleAuth={handleGoogleAuth}
            onCancel={() => setShowLoginModal(false)}
        />}
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
    </div>
  );
};

export default App;
