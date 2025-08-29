import React, { useEffect, useState, useMemo } from 'react';
import AdminPageLayout from './AdminPageLayout';
import { fetchTokenCounter, fetchLLMModels, TokenCounter, LLMModel } from '../../services/firestoreService';
import { useUserPermissions } from '../../services/roleService';

interface TokenCounterManagementProps {
  currentUser: { role: any; permissions: any; uid?: string } | null;
  onBack: () => void;
}

const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setMonth(end.getMonth() - 1);
  return { start, end };
};

const TokenCounterManagement: React.FC<TokenCounterManagementProps> = ({ currentUser, onBack }) => {
  const [filters, setFilters] = useState({
    startDate: defaultRange().start,
    endDate: defaultRange().end,
    model: '',
    type: '',
    subtype: '',
    userId: ''
  });
  const [data, setData] = useState<TokenCounter[]>([]);
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const permissions = useUserPermissions(currentUser);

  // Cache per i modelli LLM - evita di ricaricarli ad ogni calcolo
  const modelsMapRef = React.useRef<Map<string, LLMModel>>(new Map());

  // Carica i modelli LLM una volta all'inizio
  useEffect(() => {
    const loadLLMModels = async () => {
      if (!currentUser || currentUser.role !== 'admin') return;
      try {
        const models = await fetchLLMModels();

        // Popola la cache
        const modelsMap = new Map<string, LLMModel>();
        models.forEach(model => {
          modelsMap.set(model.name, model);
        });
        modelsMapRef.current = modelsMap;

        setLlmModels(models);
      } catch (error) {
        console.error('Error loading LLM models:', error);
      }
    };
    loadLLMModels();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchTokenCounter(filters);
        setData(result);
      } catch (error) {
        console.error('Error loading token data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, currentUser]);

  // Funzione helper per calcolare i costi con cache - supporta sia pricing per token che costo fisso
  const calculateCost = (inputTokens: number, outputTokens: number, modelName: string): { inputCost: number; outputCost: number; totalCost: number } => {
    // Usa la cache per ottenere il modello
    const model = modelsMapRef.current.get(modelName);

    if (!model) {
      return { inputCost: 0, outputCost: 0, totalCost: 0 };
    }

    // Controlla se il modello ha un costo fisso
    if (typeof model.fixCost === 'number' && model.fixCost > 0) {
      // Modello con costo fisso per elaborazione
      return {
        inputCost: 0,
        outputCost: 0,
        totalCost: model.fixCost
      };
    }

    // Modello con pricing per token
    const inputCostPerMillion = model.inputCostPerMilion;
    const outputCostPerMillion = model.outputCostPerMilion;

    // Validazione che i valori siano numeri per i modelli basati su token
    if (typeof inputCostPerMillion !== 'number' || typeof outputCostPerMillion !== 'number') {
      return { inputCost: 0, outputCost: 0, totalCost: 0 };
    }

    const inputCost = (inputTokens / 1_000_000) * inputCostPerMillion;
    const outputCost = (outputTokens / 1_000_000) * outputCostPerMillion;
    const totalCost = inputCost + outputCost;

    return { inputCost, outputCost, totalCost };
  };

  // Calcoli aggregati con costi
  const aggregates = useMemo(() => {
    const totalInput = data.reduce((sum, d) => sum + (d.inputToken || 0), 0);
    const totalOutput = data.reduce((sum, d) => sum + (d.outputToken || 0), 0);
    const totalTokens = totalInput + totalOutput;

    // Calcolo costi totali
    const totalCosts = data.reduce((acc, d) => {
      const costs = calculateCost(d.inputToken || 0, d.outputToken || 0, d.model || '');
      return {
        inputCost: acc.inputCost + costs.inputCost,
        outputCost: acc.outputCost + costs.outputCost,
        totalCost: acc.totalCost + costs.totalCost
      };
    }, { inputCost: 0, outputCost: 0, totalCost: 0 });

    // Grouping by model con costi
    const byModel = data.reduce((acc, d) => {
      const model = d.model || 'Unknown';
      if (!acc[model]) {
        acc[model] = { input: 0, output: 0, count: 0, inputCost: 0, outputCost: 0, totalCost: 0 };
      }
      const costs = calculateCost(d.inputToken || 0, d.outputToken || 0, d.model || '');
      acc[model].input += d.inputToken || 0;
      acc[model].output += d.outputToken || 0;
      acc[model].count += 1;
      acc[model].inputCost += costs.inputCost;
      acc[model].outputCost += costs.outputCost;
      acc[model].totalCost += costs.totalCost;
      return acc;
    }, {} as Record<string, { input: number; output: number; count: number; inputCost: number; outputCost: number; totalCost: number }>);

    // Grouping by type con costi
    const byType = data.reduce((acc, d) => {
      const type = d.type || 'Unknown';
      if (!acc[type]) {
        acc[type] = { input: 0, output: 0, count: 0, inputCost: 0, outputCost: 0, totalCost: 0 };
      }
      const costs = calculateCost(d.inputToken || 0, d.outputToken || 0, d.model || '');
      acc[type].input += d.inputToken || 0;
      acc[type].output += d.outputToken || 0;
      acc[type].count += 1;
      acc[type].inputCost += costs.inputCost;
      acc[type].outputCost += costs.outputCost;
      acc[type].totalCost += costs.totalCost;
      return acc;
    }, {} as Record<string, { input: number; output: number; count: number; inputCost: number; outputCost: number; totalCost: number }>);

    return {
      totalInput,
      totalOutput,
      totalTokens,
      totalRequests: data.length,
      totalCosts,
      byModel,
      byType
    };
  }, [data, llmModels]);

  // Gestione form filtri
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
    setCurrentPage(1); // Reset pagination when filters change
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: new Date(value) }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      startDate: defaultRange().start,
      endDate: defaultRange().end,
      model: '',
      type: '',
      subtype: '',
      userId: ''
    });
    setCurrentPage(1);
  };

  // Paginazione
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // Unique values for filter dropdowns
  const uniqueModels = Array.from(new Set(data.map(d => d.model).filter(Boolean)));
  const uniqueTypes = Array.from(new Set(data.map(d => d.type).filter(Boolean)));
  const uniqueSubtypes = Array.from(new Set(data.map(d => d.subtype).filter(Boolean)));

  const formatNumber = (num: number) => {
    return num.toLocaleString('it-IT');
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleDateString('it-IT');
    if (date instanceof Date) return date.toLocaleDateString('it-IT');
    return String(date);
  };

  const formatDateTime = (date: any) => {
    if (!date) return 'N/A';
    if (date.toDate) return date.toDate().toLocaleString('it-IT');
    if (date instanceof Date) return date.toLocaleString('it-IT');
    return String(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    }).format(amount);
  };

  return (
    <AdminPageLayout
      title="Gestione Token LLM"
      onBack={onBack}
      actions={
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {data.length} record trovati
          </span>
        </div>
      }
    >
      {/* Filtri */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtri</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data inizio
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate.toISOString().slice(0, 10)}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data fine
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate.toISOString().slice(0, 10)}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Model Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modello
            </label>
            <select
              name="model"
              value={filters.model}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tutti i modelli</option>
              {uniqueModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tutti i tipi</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Subtype Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sottotipo
            </label>
            <select
              name="subtype"
              value={filters.subtype}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tutti i sottotipi</option>
              {uniqueSubtypes.map(subtype => (
                <option key={subtype} value={subtype}>{subtype}</option>
              ))}
            </select>
          </div>

          {/* User ID Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <input
              type="text"
              name="userId"
              value={filters.userId}
              onChange={handleChange}
              placeholder="ID utente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            🔄 Reset filtri
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Record per pagina:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Totale Richieste</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(aggregates.totalRequests)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-semibold">📥</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Token Input</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(aggregates.totalInput)}</div>
              <div className="text-xs text-green-600 font-medium">{formatCurrency(aggregates.totalCosts.inputCost)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-semibold">📤</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Token Output</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(aggregates.totalOutput)}</div>
              <div className="text-xs text-purple-600 font-medium">{formatCurrency(aggregates.totalCosts.outputCost)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 font-semibold">🔢</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Token Totali</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(aggregates.totalTokens)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-semibold">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Costo Totale</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(aggregates.totalCosts.totalCost)}</div>
              <div className="text-xs text-gray-500">
                In: {formatCurrency(aggregates.totalCosts.inputCost)} | Out: {formatCurrency(aggregates.totalCosts.outputCost)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary by Model and Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Model */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Riepilogo per Modello</h3>
          <div className="space-y-3">
            {Object.entries(aggregates.byModel).map(([model, stats]) => {
              // Determina il tipo di pricing del modello
              const modelData = modelsMapRef.current.get(model);
              const isFixedCost = modelData && typeof modelData.fixCost === 'number' && modelData.fixCost > 0;

              return (
                <div key={model} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">{model}</div>
                      {isFixedCost && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          Costo Fisso
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{stats.count} richieste</div>
                    <div className="text-xs font-medium text-green-600">{formatCurrency(stats.totalCost)}</div>
                    {isFixedCost && modelData && (
                      <div className="text-xs text-gray-500">
                        {formatCurrency(modelData.fixCost)} per elaborazione
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatNumber(stats.input + stats.output)} token
                    </div>
                    <div className="text-xs text-gray-500">
                      In: {formatNumber(stats.input)} | Out: {formatNumber(stats.output)}
                    </div>
                    {!isFixedCost && (
                      <div className="text-xs text-gray-500">
                        {formatCurrency(stats.inputCost)} | {formatCurrency(stats.outputCost)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Riepilogo per Tipo</h3>
          <div className="space-y-3">
            {Object.entries(aggregates.byType).map(([type, stats]) => (
              <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{type}</div>
                  <div className="text-sm text-gray-500">{stats.count} richieste</div>
                  <div className="text-xs font-medium text-green-600">{formatCurrency(stats.totalCost)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatNumber(stats.input + stats.output)} token
                  </div>
                  <div className="text-xs text-gray-500">
                    In: {formatNumber(stats.input)} | Out: {formatNumber(stats.output)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(stats.inputCost)} | {formatCurrency(stats.outputCost)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Dettaglio Utilizzo Token</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Caricamento dati...</p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nessun dato trovato per i filtri selezionati.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gem ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modello
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sottotipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Token Input
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Token Output
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Totale
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {item.gemId ? item.gemId.substring(0, 8) + '...' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.model || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {item.type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.subtype || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-mono text-xs">
                          {item.userId ? item.userId.substring(0, 8) + '...' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                        {formatNumber(item.inputToken || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                        {formatNumber(item.outputToken || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right font-mono">
                        {formatNumber((item.inputToken || 0) + (item.outputToken || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, data.length)} di {data.length} record
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
    </AdminPageLayout>
  );
};

export default TokenCounterManagement;

