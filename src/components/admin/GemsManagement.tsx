import React, { useState, useEffect } from 'react';
import { Gem, Topic, Channel, GemContent } from '../../types';
import {
  fetchAllGems,
  createGem,
  updateGem,
  deleteGem,
  searchGems,
  fetchAllChannels,
  addGeneratedQuestion,
  fetchGeneratedQuestionsByGem
} from '../../services/firestoreService';
import { useUserPermissions } from '../../services/roleService';
import AdminPageLayout from './AdminPageLayout';
import AdminConfirmationModal from './AdminConfirmationModal';
import { callCuriowApi } from '../../services/apiService';

interface GemsManagementProps {
  currentUser: { role: any; permissions: any; uid?: string } | null;
  onBack: () => void;
}

interface GemFormData {
  title: string;
  description: string; // sarà salvata in content.description
  channelId: string;
  imageUrl: string;
  tags: string[];
  suggestedQuestions: string[];
  sources: Array<{ uri: string; title: string }>;
}

interface StructuredAIQuestion {
  section: string; // label mostrata
  sectionId?: string; // id originale (myth, reality, ecc.)
  items: { testo: string; tipologia?: string; stepIndex?: number }[];
}

const GemsManagement: React.FC<GemsManagementProps> = ({ currentUser, onBack }) => {
  const [gems, setGems] = useState<(Gem & { id: string })[]>([]);
  const [channels, setChannels] = useState<(Channel & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGem, setEditingGem] = useState<(Gem & { id: string }) | null>(null);

  // Filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'topic' | 'created'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [gemsPerPage, setGemsPerPage] = useState(10);

  // Accordion per descrizioni
  const [expandedGems, setExpandedGems] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState<GemFormData>({
    title: '',
    description: '',
    channelId: '',
    imageUrl: '',
    tags: [],
    suggestedQuestions: [],
    sources: []
  });

  // Stato chiamate AI
  const [aiLoading, setAiLoading] = useState<{ description: boolean; image: boolean; questions: boolean }>({
    description: false,
    image: false,
    questions: false
  });
  const [aiError, setAiError] = useState<string | null>(null);

  // Modal di conferma
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: () => void;
    title: string;
    message: string;
  }>({
    isOpen: false,
    action: () => {},
    title: '',
    message: ''
  });

  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [structuredAIQuestions, setStructuredAIQuestions] = useState<StructuredAIQuestion[]>([]);

  const permissions = useUserPermissions(currentUser);

  useEffect(() => {
    loadGems();
    loadChannels();
  }, []);

  const loadGems = async () => {
    setLoading(true);
    try {
      const fetchedGems = await fetchAllGems();
      setGems(fetchedGems);
    } catch (error) {
      console.error('Error loading gems:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    setLoading(true);
    try {
      const fetchedChannels = await fetchAllChannels();
      setChannels(fetchedChannels);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      setLoading(true);
      try {
        const searchResults = await searchGems(searchTerm);
        setGems(searchResults);
      } catch (error) {
        console.error('Error searching gems:', error);
      } finally {
        setLoading(false);
      }
    } else {
      loadGems();
    }
  };

  const handleCreateGem = async () => {
    try {
      const newGemData: any = {
        title: formData.title,
        topic: (gems[0]?.topic) || 'Cultura Generale & Curiosità', // fallback se UI non gestisce topic
        channelId: formData.channelId,
        imageUrl: formData.imageUrl,
        tags: formData.tags,
        suggestedQuestions: formData.suggestedQuestions,
        sources: formData.sources,
        content: { template: 'article', description: formData.description },
        userQuestions: []
      };
      await createGem(newGemData);
      setShowCreateModal(false);
      resetForm();
      loadGems();
    } catch (error) {
      console.error('Error creating gem:', error);
    }
  };

  const handleUpdateGem = async () => {
    if (!editingGem) return;

    try {
      const updateData: any = {
        title: formData.title,
        channelId: formData.channelId,
        imageUrl: formData.imageUrl,
        tags: formData.tags,
        suggestedQuestions: formData.suggestedQuestions,
        sources: formData.sources,
        content: { ...(editingGem as any).content, template: (editingGem as any).content?.template || 'article', description: formData.description }
      };
      await updateGem(editingGem.id, updateData);
      setEditingGem(null);
      resetForm();
      loadGems();
    } catch (error) {
      console.error('Error updating gem:', error);
    }
  };

  const handleDeleteGem = async (gemId: string) => {
    try {
      await deleteGem(gemId);
      loadGems();
    } catch (error) {
      console.error('Error deleting gem:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      channelId: '',
      imageUrl: '',
      tags: [],
      suggestedQuestions: [],
      sources: []
    });
  };

  const openEditModal = async (gem: Gem & { id: string }) => {
    setStructuredAIQuestions([]);
    setFormData({
      title: gem.title || '',
      description: (gem as any).content?.description || '',
      channelId: (gem as any).channelId || '',
      imageUrl: gem.imageUrl || '',
      tags: gem.tags || [],
      suggestedQuestions: gem.suggestedQuestions || [],
      sources: (gem as any).search_results && (gem as any).search_results.length > 0 ? (gem as any).search_results : gem.sources || []
    });
    setEditingGem(gem);

    // Carica domande generate salvate e raggruppale
    try {
      const saved = await fetchGeneratedQuestionsByGem(gem.id);
      if (saved.length) {
        // Ordina per createdAt asc
        const ordered = [...saved].sort((a,b) => a.createdAt.localeCompare(b.createdAt));
        interface TempGroup { section: string; sectionId: string; items: { testo: string; tipologia?: string; stepIndex?: number }[]; _stepIndex?: number; }
        const groups: TempGroup[] = [];
        const findOrCreate = (label: string, sectionId: string, stepIndex?: number): TempGroup => {
          if (sectionId === 'step' && typeof stepIndex === 'number') {
            let g = groups.find(g => g.sectionId === 'step' && g._stepIndex === stepIndex);
            if (!g) {
              g = { section: `${formatSectionLabel('step')} ${stepIndex + 1}`, sectionId: 'step', items: [], _stepIndex: stepIndex };
              groups.push(g);
            }
            return g;
          }
          let g = groups.find(g => g.section === label && g.sectionId === sectionId);
          if (!g) {
            g = { section: label, sectionId, items: [] };
            groups.push(g);
          }
          return g;
        };
        ordered.forEach(q => {
          const sectionId = q.section || 'general';
            if (sectionId === 'step') {
              const stepIdx = typeof q.stepIndex === 'number' ? q.stepIndex : 0;
              const grp = findOrCreate(`${formatSectionLabel('step')} ${stepIdx + 1}`, 'step', stepIdx);
              if (!grp.items.some(it => it.testo === q.testo)) {
                grp.items.push({ testo: q.testo, tipologia: q.tipologia, stepIndex: stepIdx });
              }
            } else {
              const label = formatSectionLabel(sectionId);
              const grp = findOrCreate(label, sectionId);
              if (!grp.items.some(it => it.testo === q.testo)) {
                grp.items.push({ testo: q.testo, tipologia: q.tipologia });
              }
            }
        });
        // Ordina gruppi: step per stepIndex, poi alfabetico
        const finalGroups = groups.sort((a,b) => {
          if (a.sectionId === 'step' && b.sectionId === 'step') return (a._stepIndex||0) - (b._stepIndex||0);
          if (a.sectionId === 'step') return -1;
          if (b.sectionId === 'step') return 1;
          return a.section.localeCompare(b.section);
        }).map(({ _stepIndex, ...rest }) => rest);
        setStructuredAIQuestions(finalGroups);
      }
    } catch (e) {
      console.error('Errore caricamento domande generate salvate:', e);
    }
  };

  const toggleGemExpansion = (gemId: string) => {
    const newExpanded = new Set(expandedGems);
    if (newExpanded.has(gemId)) {
      newExpanded.delete(gemId);
    } else {
      newExpanded.add(gemId);
    }
    setExpandedGems(newExpanded);
  };

  const renderStructuredContentSummary = (content: GemContent) => {
    if (!content || !(content as any).template) return null;
    const tpl = (content as any).template;
    switch (tpl) {
      case 'mini_thread': {
        const steps = (content as any).steps || [];
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Mini Thread</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              {steps.map((s: any, i: number) => <li key={i}><span className="font-medium">{s.title}</span>{s.body ? ': ' + s.body : ''}</li>)}
            </ol>
            {(content as any).payoff && <p className="text-sm mt-2"><span className="font-semibold">Payoff: </span>{(content as any).payoff}</p>}
          </div>
        );
      }
      case 'myth_vs_reality': {
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Myth vs Reality</p>
            <p className="text-sm"><span className="font-semibold text-red-600">Mito: </span>{(content as any).myth}</p>
            <p className="text-sm"><span className="font-semibold text-emerald-600">Realtà: </span>{(content as any).reality}</p>
            {(content as any).evidence && <p className="text-xs text-gray-600">Evidenze: {(content as any).evidence}</p>}
            {(content as any).why_it_matters && <p className="text-xs text-gray-600">Perché conta: {(content as any).why_it_matters}</p>}
          </div>
        );
      }
      case 'fact_card': {
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Fact Card</p>
            {(content as any).hook && <p className="text-sm font-medium">Hook: {(content as any).hook}</p>}
            {Array.isArray((content as any).facts) && (content as any).facts.length > 0 && (
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {(content as any).facts.map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
            )}
            {(content as any).implication && <p className="text-xs text-gray-600">Implicazione: {(content as any).implication}</p>}
            {(content as any).action && <p className="text-xs text-gray-600">Azione: {(content as any).action}</p>}
          </div>
        );
      }
      case 'pros_cons': {
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Pros & Cons</p>
            {(content as any).scenario && <p className="text-sm"><span className="font-semibold">Scenario: </span>{(content as any).scenario}</p>}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold text-emerald-600 mb-1">Pro</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {((content as any).pros || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-rose-600 mb-1">Contro</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {((content as any).cons || []).map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>
            {(content as any).advice && <p className="text-xs text-gray-600">Consiglio: {(content as any).advice}</p>}
          </div>
        );
      }
      case 'quick_explainer': {
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Quick Explainer</p>
            {(content as any).analogy && <p className="text-sm font-medium">Analogia: {(content as any).analogy}</p>}
            {(content as any).definition && <p className="text-xs text-gray-700">Definizione: {(content as any).definition}</p>}
            {(content as any).example && <p className="text-xs text-gray-700">Esempio: {(content as any).example}</p>}
            {(content as any).anti_example && <p className="text-xs text-gray-700">Non è: {(content as any).anti_example}</p>}
            {(content as any).takeaway && <p className="text-xs text-gray-600">Takeaway: {(content as any).takeaway}</p>}
          </div>
        );
      }
      default:
        return <p className="text-sm text-gray-700 whitespace-pre-wrap">{(content as any).raw || ''}</p>;
    }
  };

  // Filtraggio e ordinamento
  const filteredAndSortedGems = gems
    .filter(gem => {
      if (channelFilter !== 'all' && gem.channelId !== channelFilter) return false;
      if (tagFilter && !gem.tags?.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'topic':
          comparison = a.topic.localeCompare(b.topic);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Paginazione
  const indexOfLastGem = currentPage * gemsPerPage;
  const indexOfFirstGem = indexOfLastGem - gemsPerPage;
  const currentGems = filteredAndSortedGems.slice(indexOfFirstGem, indexOfLastGem);
  const totalPages = Math.ceil(filteredAndSortedGems.length / gemsPerPage);

  const addTag = () => {
    const tagInput = document.getElementById('newTag') as HTMLInputElement;
    if (tagInput && tagInput.value.trim()) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.value.trim()]
      });
      tagInput.value = '';
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  const addSuggestedQuestion = () => {
    const questionInput = document.getElementById('newQuestion') as HTMLInputElement;
    if (questionInput && questionInput.value.trim()) {
      setFormData({
        ...formData,
        suggestedQuestions: [...formData.suggestedQuestions, questionInput.value.trim()]
      });
      questionInput.value = '';
    }
  };

  const removeSuggestedQuestion = (index: number) => {
    setFormData({
      ...formData,
      suggestedQuestions: formData.suggestedQuestions.filter((_, i) => i !== index)
    });
  };

  const addSource = () => {
    const uriInput = document.getElementById('newSourceUri') as HTMLInputElement;
    const titleInput = document.getElementById('newSourceTitle') as HTMLInputElement;
    if (uriInput && titleInput && uriInput.value.trim() && titleInput.value.trim()) {
      setFormData({
        ...formData,
        sources: [...formData.sources, { uri: uriInput.value.trim(), title: titleInput.value.trim() }]
      });
      uriInput.value = '';
      titleInput.value = '';
    }
  };

  const removeSource = (index: number) => {
    setFormData({
      ...formData,
      sources: formData.sources.filter((_, i) => i !== index)
    });
  };

  // Funzioni AI
  const callCreateTextAI = async () => {
    if (aiLoading.description) return;
    setAiError(null);
    setAiLoading(l => ({ ...l, description: true }));
    try {
      const channel = channels.find(c => c.id === formData.channelId);
      const body = {
        apitype: 'create-text',
        argument: editingGem ? editingGem.title : formData.title,
        objective: formData.description || 'Obiettivo da definire',
        channel: channel ? { name: channel.name, id: channel.id } : { name: '', id: formData.channelId }
      };
      const data = await callCuriowApi(body);
      if (data.content?.description) {
        setFormData(fd => ({
          ...fd,
          description: data.content.description,
          sources: Array.isArray(data.search_results)
            ? data.search_results.map((s: any) => ({ uri: s.url, title: s.title }))
            : fd.sources
        }));
      } else {
        const newDesc = data.description || data.text || data.content || null;
        if (newDesc) {
          setFormData(fd => ({ ...fd, description: newDesc }));
        }
      }
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || 'Errore sconosciuto');
    } finally {
      setAiLoading(l => ({ ...l, description: false }));
    }
  };

  const callCreateImageAI = async () => {
    if (aiLoading.image) return;
    if (!formData.description.trim()) {
      alert('Prima di creare l\'immagine inserire una descrizione');
      return;
    }
    setAiError(null);
    setAiLoading(l => ({ ...l, image: true }));
    try {
      const data = await callCuriowApi({ apitype: 'create-image', description: formData.description });
      const img = data.secure_url || data.imageUrl || data.url || data.image || data.result || null;
      if (img) setPendingImageUrl(img);
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || 'Errore sconosciuto');
    } finally {
      setAiLoading(l => ({ ...l, image: false }));
    }
  };

  // helper label sezione
  const formatSectionLabel = (id: string): string => {
    const map: Record<string, string> = {
      myth: 'Mito',
      reality: 'Realtà',
      evidence: 'Evidenze',
      why_it_matters: 'Perché Conta',
      general: 'Generale',
      step: 'Step'
    };
    if (id.startsWith('step ')) return id; // già formattato
    return map[id] || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const callCreateQuestionsAI = async () => {
    if (!editingGem) return;
    if (aiLoading.questions) return;
    setAiError(null);
    setAiLoading(l => ({ ...l, questions: true }));
    try {
      const content: any = (editingGem as any).content || {};
      const { description: _d, claims_to_verify: _c, ...tips } = content;
      const body = {
        apitype: 'create-question',
        description: content.description || formData.description,
        template: content.template || 'article',
        tips,
        gemId: editingGem.id
      };
      const data = await callCuriowApi(body);
      const extraQ = data?.extraData?.questions;
      if (extraQ && typeof extraQ === 'object') {
        const isoNow = new Date().toISOString();
        const collectedStrings: string[] = [];
        const newStructured: StructuredAIQuestion[] = [];
        for (const sectionId of Object.keys(extraQ)) {
          const sectionContent: any = extraQ[sectionId];
          if (sectionId === 'step' && Array.isArray(sectionContent) && Array.isArray(sectionContent[0])) {
            (sectionContent as any[]).forEach((arr: any[], stepIndex: number) => {
              const stepItems: { testo: string; tipologia?: string; stepIndex?: number }[] = [];
              arr.forEach(item => {
                if (item?.testo) {
                  addGeneratedQuestion({
                    createdAt: isoNow,
                    gemId: editingGem.id,
                    section: sectionId,
                    testo: item.testo,
                    tipologia: item.tipologia || '',
                    stepIndex
                  }).catch(console.error);
                  collectedStrings.push(item.testo);
                  stepItems.push({ testo: item.testo, tipologia: item.tipologia, stepIndex });
                }
              });
              if (stepItems.length) {
                newStructured.push({ section: `${formatSectionLabel('step')} ${stepIndex + 1}`, sectionId: 'step', items: stepItems });
              }
            });
          } else if (Array.isArray(sectionContent)) {
            const items: { testo: string; tipologia?: string }[] = [];
            sectionContent.forEach(item => {
              if (item?.testo) {
                addGeneratedQuestion({
                  createdAt: isoNow,
                  gemId: editingGem.id,
                  section: sectionId,
                  testo: item.testo,
                  tipologia: item.tipologia || ''
                }).catch(console.error);
                collectedStrings.push(item.testo);
                items.push({ testo: item.testo, tipologia: item.tipologia });
              }
            });
            if (items.length) newStructured.push({ section: formatSectionLabel(sectionId), sectionId, items });
          }
        }
        if (collectedStrings.length) {
          setFormData(fd => ({ ...fd, suggestedQuestions: [...fd.suggestedQuestions, ...collectedStrings] }));
          // Merge con esistenti evitando duplicati di label
            setStructuredAIQuestions(prev => {
              const merged: StructuredAIQuestion[] = [...prev.map(g => ({ ...g, items: [...g.items] }))];
              newStructured.forEach(group => {
                const idx = merged.findIndex(g => g.section === group.section);
                if (idx >= 0) {
                  // aggiungi solo nuove domande non duplicate
                  group.items.forEach(it => {
                    if (!merged[idx].items.some(e => e.testo === it.testo)) {
                      merged[idx].items.push(it);
                    }
                  });
                } else {
                  merged.push(group);
                }
              });
              return merged;
            });
        }
      } else {
        const questions = data.questions || data.suggestedQuestions || data.result || null;
        if (Array.isArray(questions)) {
          setFormData(fd => ({ ...fd, suggestedQuestions: [...fd.suggestedQuestions, ...questions] }));
        } else if (typeof questions === 'string') {
          setFormData(fd => ({ ...fd, suggestedQuestions: [...fd.suggestedQuestions, questions] }));
        }
      }
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || 'Errore sconosciuto');
    } finally {
      setAiLoading(l => ({ ...l, questions: false }));
    }
  };

  return (
    <AdminPageLayout
      title="Gestione Gems"
      subtitle={`${filteredAndSortedGems.length} gems totali`}
      onBack={onBack}
    >
      {/* Filtri e controlli */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Ricerca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cerca gems
            </label>
            <div className="flex">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Titolo, descrizione, tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                🔍
              </button>
            </div>
          </div>

          {/* Filtro per canale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtra per canale
            </label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tutti i canali</option>
              {channels.map(channel => (
                <option key={channel.id} value={channel.id}>{channel.name}</option>
              ))}
            </select>
          </div>

          {/* Filtro per tag */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtra per tag
            </label>
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Inserisci tag..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Ordinamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordina per
            </label>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'title' | 'topic' | 'created')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="title">Titolo</option>
                <option value="topic">Topic</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Controlli azioni */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={loadGems}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              🔄 Ricarica
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Gems per pagina:</span>
              <select
                value={gemsPerPage}
                onChange={(e) => setGemsPerPage(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {permissions.canCreateGems && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              ➕ Nuova Gem
            </button>
          )}
        </div>
      </div>

      {/* Lista gems */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento gems...</p>
          </div>
        ) : currentGems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nessuna gem trovata.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fonti
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentGems.map((gem) => (
                    <React.Fragment key={gem.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {gem.imageUrl && (
                              <img
                                src={gem.imageUrl}
                                alt={gem.title}
                                className="h-12 w-12 rounded-lg object-cover mr-4"
                              />
                            )}
                            <div>
                              <div className="flex items-center">
                                <h3 className="text-sm font-medium text-gray-900">
                                  {gem.title}
                                </h3>
                                <button
                                  onClick={() => toggleGemExpansion(gem.id)}
                                  className="ml-2 text-gray-400 hover:text-gray-600"
                                >
                                  {expandedGems.has(gem.id) ? '🔽' : '▶️'}
                                </button>
                              </div>
                              <p className="text-sm text-gray-500">
                                {gem.suggestedQuestions?.length || 0} domande suggerite
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {gem.topic}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {gem.tags?.slice(0, 3).map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                {tag}
                              </span>
                            ))}
                            {(gem.tags?.length || 0) > 3 && (
                              <span className="text-xs text-gray-500">
                                +{(gem.tags?.length || 0) - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {((gem as any).search_results && (gem as any).search_results.length > 0 ? (gem as any).search_results : gem.sources)?.length || 0} fonti
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {permissions.canEditGems && (
                              <button
                                onClick={() => openEditModal(gem)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                ✏️
                              </button>
                            )}
                            {permissions.canDeleteGems && (
                              <button
                                onClick={() => setConfirmModal({
                                  isOpen: true,
                                  action: () => handleDeleteGem(gem.id),
                                  title: 'Elimina Gem',
                                  message: `Sei sicuro di voler eliminare la gem "${gem.title}"? Questa azione non può essere annullata.`
                                })}
                                className="text-red-600 hover:text-red-900"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedGems.has(gem.id) && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 bg-gray-50">
                            <div className="max-w-none space-y-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Contenuto:</h4>
                                {gem.content?.template ? (
                                  <div className="p-3 border border-gray-200 rounded bg-white">{renderStructuredContentSummary(gem.content)}</div>
                                ) : (
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{(gem as any).content?.description || ''}</p>
                                )}
                              </div>
                              {(gem.suggestedQuestions?.length || 0) > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">Domande suggerite (flat):</h4>
                                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                    {gem.suggestedQuestions?.map((question, index) => (
                                      <li key={index}>{question}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {/* Nota: la struttura AI dettagliata è visibile solo nel modal di modifica corrente */}
                              {(() => { const sources = (gem as any).search_results && (gem as any).search_results.length > 0 ? (gem as any).search_results : gem.sources; return (sources?.length || 0) > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">Fonti:</h4>
                                  <ul className="space-y-1">
                                    {sources.map((source: any, index: number) => (
                                      <li key={index} className="text-sm">
                                        <a
                                          href={source.uri}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline break-all"
                                        >
                                          {source.title || source.uri}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ); })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginazione */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Mostrando {indexOfFirstGem + 1}-{Math.min(indexOfLastGem, filteredAndSortedGems.length)} di {filteredAndSortedGems.length} gems
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Precedente
                  </button>
                  <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md">
                    {currentPage} di {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Successiva
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal per creare/modificare gem */}
      {(showCreateModal || editingGem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingGem ? 'Modifica Gem' : 'Nuova Gem'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingGem(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Colonna sinistra */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Titolo *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Canale *
                    </label>
                    <select
                      value={formData.channelId}
                      onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Seleziona un canale</option>
                      {channels.map(channel => (
                        <option key={channel.id} value={channel.id}>{channel.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      URL Immagine
                      <button
                        type="button"
                        onClick={callCreateImageAI}
                        title="Genera immagine con AI"
                        className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-1"
                        disabled={aiLoading.image}
                      >
                        {aiLoading.image && <span className="animate-spin inline-block h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full"></span>}
                        {aiLoading.image ? 'Gen' : 'AI'}
                      </button>
                    </label>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://..."
                    />
                    {formData.imageUrl && (
                      <div className="mt-2 text-xs text-gray-500 break-all">Attuale: {formData.imageUrl}</div>
                    )}
                    {pendingImageUrl && (
                      <div className="mt-3 p-3 border rounded-md bg-gray-50">
                        <p className="text-xs font-medium text-gray-700 mb-2">Nuova immagine generata (anteprima)</p>
                        <img src={pendingImageUrl} alt="Anteprima AI" className="w-full max-h-64 object-contain rounded mb-2" />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(fd => ({ ...fd, imageUrl: pendingImageUrl }));
                              setPendingImageUrl(null);
                            }}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Conferma
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingImageUrl(null)}
                            className="px-3 py-1 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        id="newTag"
                        placeholder="Nuovo tag..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Aggiungi
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Colonna destra */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Descrizione * (Saggio / Testo lungo)
                      <button
                        type="button"
                        onClick={callCreateTextAI}
                        title="Genera / migliora testo con AI"
                        className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
                        disabled={aiLoading.description}
                      >
                        {aiLoading.description ? '…' : 'AI'}
                      </button>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Domande Suggerite
                      <button
                        type="button"
                        onClick={callCreateQuestionsAI}
                        title={editingGem ? 'Genera domande con AI' : 'Disponibile solo in modifica'}
                        className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
                        disabled={aiLoading.questions || !editingGem}
                      >
                        {aiLoading.questions ? '…' : 'AI'}
                      </button>
                    </label>
                    {structuredAIQuestions.length > 0 && (
                      <div className="mb-4 space-y-4 border border-indigo-100 rounded-md p-3 bg-indigo-50/40">
                        {structuredAIQuestions.map((group, gi) => (
                          <div key={gi} className="space-y-1">
                            <h5 className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">{group.section}</h5>
                            <ul className="list-disc list-inside space-y-1">
                              {group.items.map((q, qi) => (
                                <li key={qi} className="text-sm text-gray-700">
                                  <span>{q.testo}</span>
                                  {q.tipologia && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">{q.tipologia}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        id="newQuestion"
                        placeholder="Nuova domanda..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && addSuggestedQuestion()}
                      />
                      <button
                        type="button"
                        onClick={addSuggestedQuestion}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Aggiungi
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fonti
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="url"
                        id="newSourceUri"
                        placeholder="URL fonte..."
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        id="newSourceTitle"
                        placeholder="Titolo fonte..."
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addSource}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 mb-2"
                    >
                      Aggiungi Fonte
                    </button>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {formData.sources.map((source, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{source.title}</div>
                            <div className="text-xs text-gray-500 truncate">{source.uri}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSource(index)}
                            className="text-red-600 hover:text-red-800 ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {aiError && (
                <div className="mt-4 text-sm text-red-600">
                  Errore AI: {aiError}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingGem(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={editingGem ? handleUpdateGem : handleCreateGem}
                  disabled={!formData.title || !formData.description || !formData.channelId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingGem ? 'Salva Modifiche' : 'Crea Gem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal di conferma */}
      <AdminConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        actionText="Elimina"
        actionType="danger"
        onConfirm={() => {
          confirmModal.action();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </AdminPageLayout>
  );
};

export default GemsManagement;
