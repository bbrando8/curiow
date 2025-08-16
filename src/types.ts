export enum Topic {
  GENERAL_CULTURE = "Cultura Generale & Curiosità",
  SCIENCE_TECH = "Scienza, Tecnologia & Futuro",
  ART_DESIGN = "Arte, Design & Creatività",
  WELLBEING = "Benessere & Sviluppo Personale",
  ECONOMY = "Economia, Finanza & Società",
}

export enum UserRole {
  USER = "user",
  MODERATOR = "moderator",
  ADMIN = "admin",
  BETATESTER = "betatester"
}

export interface UserPermissions {
  canCreateGems: boolean;
  canEditGems: boolean;
  canDeleteGems: boolean;
  canManageUsers: boolean;
  canModerateContent: boolean;
  canViewDashboard: boolean;
  canManageChannels: boolean;
}

export interface UserQuestion {
  id: string;
  question: string;
  answer: string;
  isGenerating?: boolean;
}

export interface Source {
    uri: string;
    title: string;
}

export interface Gem {
  id:string;
  topic: Topic;
  title: string;
  description: string;
  imageUrl: string;
  userQuestions: UserQuestion[];
  tags: string[];
  suggestedQuestions: string[];
  sources: Source[];
}

export interface Channel {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    isActive: boolean;
}

export interface SavedList {
    id: string;
    name: string;
    gemIds: string[];
}

// Nuovi tipi per la struttura ristrutturata
export interface List {
    id: string;
    name: string;
    description?: string;
    isPublic: boolean;
    createdBy: string; // userId
    createdAt: Date;
    updatedAt: Date;
    color?: string; // Per personalizzazione UI futura
    icon?: string; // Emoji o icona
}

export interface ListItem {
    id: string;
    listId: string;
    gemId: string;
    addedBy: string; // userId
    addedAt: Date;
    order?: number; // Per ordinamento personalizzato
}

export interface ListMember {
    id: string;
    listId: string;
    userId: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: Date;
}

// Tipo per le viste aggregate (per compatibilità con UI esistente)
export interface ListWithItems {
    id: string;
    name: string;
    description?: string;
    isPublic: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    color?: string;
    icon?: string;
    gemIds: string[];
    itemCount: number;
    userRole?: 'owner' | 'editor' | 'viewer';
}

export type Filter =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'topic', value: Topic }
  | { type: 'channel', value: string }
  | { type: 'tag', value: string };

export interface TopicSuggestion {
  id: string;
  title: string; // Titolo generato/modificato
  objective: string; // Sommario generato/modificato (precedentemente 'summary')
  originalSuggestion?: string; // L'idea originale dell'utente
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // UID dell'utente che ha creato l'argomento
  status: 'pending' | 'approved' | 'converted'; // Stato dell'argomento
}

export interface BetaFeedback {
  id: string;
  userId: string;
  userEmail: string;
  userName: string; // Nome completo dell'utente
  section: string;
  message: string;
  status: 'inviato' | 'letto' | 'risolto';
  createdAt: Date;
  updatedAt?: Date;
}
