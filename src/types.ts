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
  ADMIN = "admin"
}

export interface UserPermissions {
  canCreateGems: boolean;
  canEditGems: boolean;
  canDeleteGems: boolean;
  canManageUsers: boolean;
  canModerateContent: boolean;
  canViewDashboard: boolean;
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
    emoji: string;
    filterTags: string[];
}

export interface SavedList {
    id: string;
    name: string;
    gemIds: string[];
}

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  permissions: UserPermissions;
  createdAt: Date;
  lastLoginAt?: Date;
}

export type Filter = 
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'topic', value: Topic }
  | { type: 'channel', value: string }
  | { type: 'tag', value: string };

export interface TopicSuggestion {
  id: string;
  text: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // UID dell'utente che ha creato l'argomento
  status: 'pending' | 'approved' | 'converted'; // Stato dell'argomento
}
