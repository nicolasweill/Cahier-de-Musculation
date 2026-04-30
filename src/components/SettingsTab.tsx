import { useState, useEffect } from 'react';
import { Palette, Check, Activity, Edit2, Trash2, ExternalLink } from 'lucide-react';

export type ThemePalette = {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    accentLight: string;
    bgAlt: string;
  };
};

type SavedThemePalette = ThemePalette & {
  sourceUrl?: string;
};

type ThemeColorKey = keyof ThemePalette['colors'];

const CUSTOM_COLOR_FIELDS: { key: ThemeColorKey; label: string }[] = [
  { key: 'primary', label: 'Primaire' },
  { key: 'secondary', label: 'Secondaire' },
  { key: 'accent', label: 'Accent' },
  { key: 'accentLight', label: 'Accent Clair' },
  { key: 'bgAlt', label: 'Fond Clair' }
];

export const PREDEFINED_THEMES: ThemePalette[] = [
  {
    id: 'forest',
    name: 'Forêt (Défaut)',
    colors: {
      primary: '#283618',
      secondary: '#606c38',
      accent: '#bc6c25',
      accentLight: '#dda15e',
      bgAlt: '#fefae0'
    }
  },
  {
    id: 'ocean',
    name: 'Océan Profond',
    colors: {
      primary: '#0B192C',
      secondary: '#1A365D',
      accent: '#3B82F6',
      accentLight: '#93C5FD',
      bgAlt: '#F0F9FF'
    }
  },
  {
    id: 'sunset',
    name: 'Coucher de Soleil',
    colors: {
      primary: '#2D1B2E',
      secondary: '#4A2545',
      accent: '#FF7D00',
      accentLight: '#FFB56B',
      bgAlt: '#FFF0E6'
    }
  },
  {
    id: 'midnight',
    name: 'Nuit de Minuit',
    colors: {
      primary: '#0F172A',
      secondary: '#1E293B',
      accent: '#8B5CF6',
      accentLight: '#C4B5FD',
      bgAlt: '#F8FAFC'
    }
  }
];

export default function SettingsTab() {
  const [activeThemeId, setActiveThemeId] = useState<string>('forest');
  const [isCustom, setIsCustom] = useState(false);
  const [customColors, setCustomColors] = useState(PREDEFINED_THEMES[0].colors);
  const [customPalettes, setCustomPalettes] = useState<SavedThemePalette[]>([]);
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null);
  const [paletteUrl, setPaletteUrl] = useState('');
  const [paletteImportError, setPaletteImportError] = useState('');
  const [draggedColorKey, setDraggedColorKey] = useState<ThemeColorKey | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState(false);
  const [metricType, setMetricType] = useState<'RIR' | 'RPE'>('RIR');

  useEffect(() => {
    const savedPalettes = localStorage.getItem('app-custom-palettes');
    if (savedPalettes) {
      try {
        setCustomPalettes(JSON.parse(savedPalettes));
      } catch {
        setCustomPalettes([]);
      }
    }

    const savedTheme = localStorage.getItem('app-theme-id');
    if (savedTheme) {
      if (savedTheme === 'custom') {
        setIsCustom(true);
        setActiveThemeId('custom');
        const savedCustom = localStorage.getItem('app-custom-colors');
        if (savedCustom) {
          try {
            setCustomColors(JSON.parse(savedCustom));
          } catch {
            setCustomColors(PREDEFINED_THEMES[0].colors);
          }
        }
      } else {
        setActiveThemeId(savedTheme);
      }
    }

    const savedMetrics = localStorage.getItem('app-advanced-metrics');
    if (savedMetrics) setAdvancedMetrics(savedMetrics === 'true');
    
    const savedMetricType = localStorage.getItem('app-metric-type');
    if (savedMetricType === 'RIR' || savedMetricType === 'RPE') {
      setMetricType(savedMetricType as 'RIR' | 'RPE');
    }
  }, []);

  const applyColors = (colors: ThemePalette['colors']) => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-secondary', colors.secondary);
    root.style.setProperty('--theme-accent', colors.accent);
    root.style.setProperty('--theme-accent-light', colors.accentLight);
    root.style.setProperty('--theme-bg-alt', colors.bgAlt);
  };

  const saveCustomPalettes = (palettes: SavedThemePalette[]) => {
    setCustomPalettes(palettes);
    localStorage.setItem('app-custom-palettes', JSON.stringify(palettes));
  };

  const selectCustomTheme = (colors = customColors) => {
    setActiveThemeId('custom');
    setIsCustom(true);
    localStorage.setItem('app-theme-id', 'custom');
    localStorage.setItem('app-custom-colors', JSON.stringify(colors));
    applyColors(colors);
  };

  const handleSelectTheme = (theme: ThemePalette) => {
    setActiveThemeId(theme.id);
    setIsCustom(false);
    setEditingPaletteId(null);
    localStorage.setItem('app-theme-id', theme.id);
    applyColors(theme.colors);
  };

  const saveCustomColors = (newColors: ThemePalette['colors']) => {
    setCustomColors(newColors);
    selectCustomTheme(newColors);

    if (editingPaletteId) {
      saveCustomPalettes(customPalettes.map(palette => (
        palette.id === editingPaletteId ? { ...palette, colors: newColors } : palette
      )));
    }
  };

  const handleCustomColorChange = (key: ThemeColorKey, value: string) => {
    saveCustomColors({ ...customColors, [key]: value });
  };

  const handleColorDrop = (targetKey: ThemeColorKey) => {
    if (!draggedColorKey || draggedColorKey === targetKey) {
      setDraggedColorKey(null);
      return;
    }

    saveCustomColors({
      ...customColors,
      [draggedColorKey]: customColors[targetKey],
      [targetKey]: customColors[draggedColorKey]
    });
    setDraggedColorKey(null);
  };

  const parseCoolorsPaletteUrl = (url: string): ThemePalette['colors'] | null => {
    const match = url.trim().match(/coolors\.co\/palette\/([0-9a-fA-F-]+)/);
    if (!match) return null;

    const colors = match[1]
      .split('-')
      .filter(color => /^[0-9a-fA-F]{6}$/.test(color))
      .map(color => `#${color.toLowerCase()}`);

    if (colors.length < 5) return null;

    return {
      primary: colors[0],
      secondary: colors[1],
      accent: colors[2],
      accentLight: colors[3],
      bgAlt: colors[4]
    };
  };

  const handleImportPalette = () => {
    const importedColors = parseCoolorsPaletteUrl(paletteUrl);
    if (!importedColors) {
      setPaletteImportError('URL Coolors invalide. Collez une URL contenant 5 couleurs.');
      return;
    }

    const palette: SavedThemePalette = {
      id: `palette-${Date.now()}`,
      name: `Palette ${customPalettes.length + 1}`,
      colors: importedColors,
      sourceUrl: paletteUrl.trim()
    };

    saveCustomPalettes([...customPalettes, palette]);
    setCustomColors(importedColors);
    setEditingPaletteId(palette.id);
    setPaletteUrl('');
    setPaletteImportError('');
    selectCustomTheme(importedColors);
  };

  const handleEditPalette = (palette: SavedThemePalette) => {
    setCustomColors(palette.colors);
    setEditingPaletteId(palette.id);
    selectCustomTheme(palette.colors);
  };

  const handleDeletePalette = (id: string) => {
    if (!confirm('Supprimer cette palette ?')) return;

    saveCustomPalettes(customPalettes.filter(palette => palette.id !== id));
    if (editingPaletteId === id) {
      setEditingPaletteId(null);
    }
  };

  const handleToggleMetrics = () => {
    const newValue = !advancedMetrics;
    setAdvancedMetrics(newValue);
    localStorage.setItem('app-advanced-metrics', newValue.toString());
  };

  const handleMetricTypeChange = (type: 'RIR' | 'RPE') => {
    setMetricType(type);
    localStorage.setItem('app-metric-type', type);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-bg-alt">
        <div>
          <h2 className="text-2xl font-bold text-primary">Paramètres</h2>
          <p className="text-secondary mt-1">Personnalisez votre application.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-8">
        
        {/* Section: Thèmes Prédéfinis */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-accent/30">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <Palette className="text-accent" />
            Thèmes Prédéfinis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PREDEFINED_THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme)}
                className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-3 relative overflow-hidden group ${
                  activeThemeId === theme.id && !isCustom ? 'border-accent shadow-md' : 'border-bg-alt/50 hover:border-accent/50'
                }`}
                style={{ backgroundColor: theme.colors.bgAlt }}
              >
                {activeThemeId === theme.id && !isCustom && (
                  <div className="absolute top-2 right-2 bg-accent text-white p-1 rounded-full">
                    <Check size={14} />
                  </div>
                )}
                <span className="font-bold" style={{ color: theme.colors.primary }}>{theme.name}</span>
                <div className="flex h-8 w-full rounded-lg overflow-hidden shadow-inner border border-black/10">
                  <div className="flex-1" style={{ backgroundColor: theme.colors.primary }}></div>
                  <div className="flex-1" style={{ backgroundColor: theme.colors.secondary }}></div>
                  <div className="flex-1" style={{ backgroundColor: theme.colors.accent }}></div>
                  <div className="flex-1" style={{ backgroundColor: theme.colors.accentLight }}></div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Section: Thème Personnalisé */}
        <section
          onClick={() => selectCustomTheme()}
          className={`bg-white p-6 rounded-2xl shadow-sm border transition-all cursor-pointer ${isCustom ? 'border-accent' : 'border-accent/30 hover:border-accent/50'}`}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-primary">Thème Personnalisé</h3>
              <p className="text-sm text-secondary">Créez votre propre palette de couleurs.</p>
            </div>
            {isCustom && (
              <div className="bg-accent text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Actif
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {CUSTOM_COLOR_FIELDS.map(field => (
              <div
                key={field.key}
                draggable
                onDragStart={(e) => {
                  setDraggedColorKey(field.key);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', field.key);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleColorDrop(field.key);
                }}
                onDragEnd={() => setDraggedColorKey(null)}
                className={`flex flex-col gap-2 rounded-xl border-2 border-dashed p-2 transition-all ${
                  draggedColorKey && draggedColorKey !== field.key
                    ? 'border-accent/70 bg-accent/5'
                    : 'border-transparent'
                }`}
                title="Glisser-déposer pour échanger cette couleur avec un autre rôle"
              >
                <label className="text-xs font-bold text-secondary uppercase">{field.label}</label>
                <input
                  type="color"
                  value={customColors[field.key]}
                  onChange={(e) => handleCustomColorChange(field.key, e.target.value)}
                  className="w-full h-12 rounded-lg cursor-grab active:cursor-grabbing border-none p-0"
                />
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-bg-alt/70" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-bold text-secondary uppercase">Importer une palette</label>
                  <a
                    href="https://coolors.co/palettes/popular/5%20colors"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                  >
                    Coolors <ExternalLink size={12} />
                  </a>
                </div>
                <input
                  type="url"
                  value={paletteUrl}
                  onChange={(e) => {
                    setPaletteUrl(e.target.value);
                    setPaletteImportError('');
                  }}
                  placeholder="https://coolors.co/palette/264653-2a9d8f-e9c46a-f4a261-e76f51"
                  className="w-full bg-bg-alt/50 border border-accent-light/50 rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold"
                />
                {paletteImportError && (
                  <p className="text-sm text-red-600 mt-2 font-semibold">{paletteImportError}</p>
                )}
              </div>
              <button
                onClick={handleImportPalette}
                className="bg-accent text-white px-4 py-2.5 rounded-xl font-bold hover:bg-accent-light transition-colors shadow-sm"
              >
                Importer
              </button>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-bold text-secondary uppercase mb-3">Bibliothèque de palettes</h4>
              {customPalettes.length === 0 ? (
                <div className="text-sm text-secondary bg-bg-alt/40 border border-dashed border-accent-light/50 rounded-xl p-4">
                  Aucune palette importÃ©e.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customPalettes.map(palette => (
                    <div
                      key={palette.id}
                      className={`bg-white p-3 rounded-xl border flex items-center gap-3 shadow-sm ${
                        editingPaletteId === palette.id ? 'border-accent' : 'border-accent-light/30'
                      }`}
                    >
                      <button
                        onClick={() => handleEditPalette(palette)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="font-bold text-primary text-sm truncate">{palette.name}</div>
                        <div className="flex h-7 w-full rounded-lg overflow-hidden shadow-inner border border-black/10 mt-2">
                          <div className="flex-1" style={{ backgroundColor: palette.colors.primary }}></div>
                          <div className="flex-1" style={{ backgroundColor: palette.colors.secondary }}></div>
                          <div className="flex-1" style={{ backgroundColor: palette.colors.accent }}></div>
                          <div className="flex-1" style={{ backgroundColor: palette.colors.accentLight }}></div>
                          <div className="flex-1" style={{ backgroundColor: palette.colors.bgAlt }}></div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditPalette(palette)}
                          className="p-2 text-accent-light hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePalette(palette.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section: Entraînement */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-accent/30">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <Activity className="text-accent" />
            Entraînement
          </h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-primary">Métriques avancées</div>
                <div className="text-sm text-secondary">Permet de noter le RIR ou RPE pour chaque série.</div>
              </div>
              <button
                onClick={handleToggleMetrics}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  advancedMetrics ? 'bg-accent' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    advancedMetrics ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            {advancedMetrics && (
              <div className="mt-4 pt-4 border-t border-bg-alt/50">
                <div className="font-bold text-sm text-secondary mb-3 uppercase">Type de métrique</div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${metricType === 'RIR' ? 'border-accent' : 'border-gray-300 group-hover:border-accent/50'}`}>
                      {metricType === 'RIR' && <div className="w-2.5 h-2.5 bg-accent rounded-full" />}
                    </div>
                    <span className={`font-semibold ${metricType === 'RIR' ? 'text-primary' : 'text-secondary'}`}>RIR (Reps in Reserve)</span>
                    <input 
                      type="radio" 
                      name="metricType" 
                      value="RIR" 
                      checked={metricType === 'RIR'}
                      onChange={() => handleMetricTypeChange('RIR')}
                      className="hidden" 
                    />
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${metricType === 'RPE' ? 'border-accent' : 'border-gray-300 group-hover:border-accent/50'}`}>
                      {metricType === 'RPE' && <div className="w-2.5 h-2.5 bg-accent rounded-full" />}
                    </div>
                    <span className={`font-semibold ${metricType === 'RPE' ? 'text-primary' : 'text-secondary'}`}>RPE (Rate of Perceived Exertion)</span>
                    <input 
                      type="radio" 
                      name="metricType" 
                      value="RPE" 
                      checked={metricType === 'RPE'}
                      onChange={() => handleMetricTypeChange('RPE')}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section: Outils de développement */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-red-500/30">
          <h3 className="text-xl font-bold text-red-600 mb-6 flex items-center gap-2">
            Outils Développeur
          </h3>
          <p className="text-sm text-secondary mb-4">Ces actions sont irréversibles et modifieront la base de données de test.</p>
          <div className="flex gap-4">
            <button 
              onClick={async () => {
                if (confirm('Attention : cela va EFFACER toutes vos données actuelles et les remplacer par un mois de données générées aléatoirement. Êtes-vous sûr ?')) {
                  const { generateSyntheticMonth } = await import('../db');
                  await generateSyntheticMonth();
                  window.location.reload();
                }
              }}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              Générer 1 mois de données de test
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
