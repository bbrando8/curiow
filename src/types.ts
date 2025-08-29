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

// ---- Nuovi tipi contenuto Gem ----
export interface MiniThreadContentStep {
  title: string;
  body: string;
}
export interface MiniThreadContent {
  template: 'mini_thread';
  steps: MiniThreadContentStep[];
  payoff: string;
  claims_to_verify?: string[];
  summary?: string; // aggiunto
}
export interface MythVsRealityContent {
  template: 'myth_vs_reality';
  myth: string;
  reality: string;
  evidence: string;
  why_it_matters: string;
  claims_to_verify?: string[];
  summary?: string; // aggiunto
}
export interface FactCardContent {
  template: 'fact_card';
  hook: string;
  facts: string[];
  implication: string;
  action: string;
  claims_to_verify?: string[];
  summary?: string; // aggiunto
}
export interface ProsConsContent {
  template: 'pros_cons';
  scenario: string;
  pros: string[];
  cons: string[];
  advice: string;
  claims_to_verify?: string[];
  summary?: string; // aggiunto
}
export interface QuickExplainerContent {
  template: 'quick_explainer';
  analogy: string;
  definition: string;
  example: string;
  anti_example: string;
  takeaway: string;
  claims_to_verify?: string[];
  summary?: string; // aggiunto
}
export type GemContent =
  MiniThreadContent |
  MythVsRealityContent |
  FactCardContent |
  ProsConsContent |
  QuickExplainerContent |
  { template: string; summary?: string; [key: string]: any };
// ---- fine nuovi tipi ----

export interface Gem {
  id:string;
  topic: Topic;
  title: string;
  /** @deprecated Spostato in content.description */
  description?: string;
  imageUrl: string;
  videoUrl?: string; // nuovo campo opzionale per il video
  userQuestions: UserQuestion[];
  tags: string[];
  suggestedQuestions: string[];
  sources: Source[]; // legacy / backdoor
  search_results?: Source[]; // nuovo campo principale per le fonti
  content?: GemContent; // nuovo campo opzionale per template strutturati (incluso description a livello content)
  channelId?: string; // opzionale: riferimento al canale
}

export interface Channel {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    isActive: boolean;
    emoji?: string; // opzionale: emoji per visualizzazione UI
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

// Tipo per i modelli LLM e i loro costi
export interface LLMModel {
  id: string;
  name: string; // Nome del modello (es. "gpt-4", "claude-3-opus")
  inputCostPerMilion?: number; // Costo per milione di token di input in dollari (opzionale per modelli a costo fisso)
  outputCostPerMilion?: number; // Costo per milione di token di output in dollari (opzionale per modelli a costo fisso)
  fixCost?: number; // Costo fisso per singola elaborazione in dollari (per modelli che non usano pricing per token)
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean; // Per disabilitare modelli obsoleti
}
