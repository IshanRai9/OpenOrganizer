import { useState, useEffect } from 'react';
import { FolderUp, Plus, X, Folder, AlertTriangle, Settings2, Play, Check, BookmarkMinus, Target, CheckSquare, Save, Trash2, FolderOpen, AlertCircle, Home, MapPin, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import './index.css';

const COMMON_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.bmp', '.webp', '.svg', '.tiff', '.heic', '.heif',
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mpeg', '.mpg',
  '.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a', '.wma',
  '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.ods', '.odp', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
  '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.sass', '.less', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.kts', '.dart', '.lua', '.sql', '.json', '.xml', '.yaml', '.yml', '.toml',
  '.exe', '.msi', '.dmg', '.deb', '.rpm', '.apk', '.app',
  '.dll', '.sys', '.ini', '.cfg', '.log', '.tmp', '.temp'
];

const DEFAULT_PRESET = {
  id: 'default-preset',
  name: "Default Preset",
  tabs: [
    { id: 't1', name: "Images", extensions: [".jpg", ".jpeg", ".png", ".bmp", ".webp", ".svg", ".tiff", ".heic", ".heif"], outputDir: '' },
    { id: 't2', name: "Documents", extensions: [".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt", ".ods", ".odp", ".xls", ".xlsx", ".ppt", ".pptx"], outputDir: '' },
    { id: 't3', name: "Videos", extensions: [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".mpeg", ".mpg"], outputDir: '' },
    { id: 't4', name: "Audio", extensions: [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a", ".wma"], outputDir: '' },
    { id: 't5', name: "Archives", extensions: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"], outputDir: '' },
    { id: 't6', name: "Code", extensions: [".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".scss", ".sass", ".less", ".py", ".java", ".c", ".cpp", ".h", ".hpp", ".cs", ".php", ".rb", ".go", ".rs", ".swift", ".kt", ".kts", ".dart", ".lua", ".sql", ".json", ".xml", ".yaml", ".yml", ".toml"], outputDir: '' },
    { id: 't7', name: "Executables", extensions: [".exe", ".msi", ".dmg", ".deb", ".rpm", ".apk", ".app"], outputDir: '' },
    { id: 't8', name: "System", extensions: [".dll", ".sys", ".ini", ".cfg", ".log", ".tmp", ".temp"], outputDir: '' },
    { id: 't9', name: "Other/Miscellaneous", extensions: ["*"], outputDir: '' }
  ]
};

// Helper: migrate old string[] sourceDirs to object[]
function migrateSourceDirs(dirs) {
  if (!dirs || dirs.length === 0) return [];
  // If already objects, return as-is (ensure fields)
  if (typeof dirs[0] === 'object') {
    return dirs.map(d => ({
      path: d.path || '',
      includeSubfolders: d.includeSubfolders || false,
      excludeDirs: d.excludeDirs || []
    }));
  }
  // Old format: string array
  return dirs.map(d => ({ path: d, includeSubfolders: false, excludeDirs: [] }));
}

export default function App() {
  // Source directories (multiple, each with own subfolder settings)
  // Each entry: { path: string, includeSubfolders: boolean, excludeDirs: string[] }
  const [sourceDirs, setSourceDirs] = useState([]);

  // Output mode
  const [outputMode, setOutputMode] = useState('single'); // 'single' | 'per-tab'
  const [outputBaseDir, setOutputBaseDir] = useState('');

  // Tabs
  const [tabs, setTabs] = useState([ { id: 'tab-1', name: 'Images', extensions: ['.jpg', '.png', '.webp'], outputDir: '' } ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  
  // Presets State
  const [presets, setPresets] = useState([DEFAULT_PRESET]);
  const [activePresetId, setActivePresetId] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTabId, setEditingTabId] = useState(null);
  const [customExt, setCustomExt] = useState('');

  // Status state
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Track which source dir's settings are expanded
  const [expandedSourceDir, setExpandedSourceDir] = useState(null);

  // Guard to prevent saving config before initial load completes
  const [configLoaded, setConfigLoaded] = useState(false);

  // Presets Handlers
  const applyPreset = (preset) => {
     setActivePresetId(preset.id);
     const copiedTabs = JSON.parse(JSON.stringify(preset.tabs));
     copiedTabs.forEach(t => { if (!t.outputDir) t.outputDir = ''; });
     setTabs(copiedTabs);
     if (copiedTabs.length > 0) setActiveTabId(copiedTabs[0].id);
  };

  const handleHomeClick = () => {
     setActivePresetId(null);
     setTabs([ { id: `tab-${Date.now()}`, name: '', extensions: [], outputDir: '' } ]);
     setSourceDirs([]);
     setOutputBaseDir('');
     setOutputMode('single');
     setExpandedSourceDir(null);
  };

  // Initialization: Load Config and Presets
  useEffect(() => {
    async function loadData() {
      if (window.electronAPI) {
        const loadedPresets = await window.electronAPI.loadPresets();
        if (loadedPresets && loadedPresets.length > 0) {
          const hasDefault = loadedPresets.find(p => p.id === 'default-preset');
          setPresets(hasDefault ? loadedPresets : [DEFAULT_PRESET, ...loadedPresets]);
        }
        const config = await window.electronAPI.loadConfig();
        if (config) {
          // Support old sourceDir (string), old sourceDirs (string[]), and new sourceDirs (object[])
          if (config.sourceDirs && config.sourceDirs.length > 0) {
            setSourceDirs(migrateSourceDirs(config.sourceDirs));
          } else if (config.sourceDir) {
            setSourceDirs([{ path: config.sourceDir, includeSubfolders: config.includeSubfolders || false, excludeDirs: config.excludeDirs || [] }]);
          }
          if (config.outputMode) setOutputMode(config.outputMode);
          if (config.outputBaseDir) setOutputBaseDir(config.outputBaseDir);
          if (config.tabs && config.tabs.length > 0) {
            const migratedTabs = config.tabs.map(t => ({ ...t, outputDir: t.outputDir || '' }));
            setTabs(migratedTabs);
            setActiveTabId(migratedTabs[0].id);
          }
          if (config.activePresetId) setActivePresetId(config.activePresetId);
        } else {
          // No saved config — apply default preset
          applyPreset(DEFAULT_PRESET);
        }
      } else {
        // No Electron API (web preview) — apply default preset
        applyPreset(DEFAULT_PRESET);
      }
      setConfigLoaded(true);
    }
    loadData();
  }, []);

  // Save config on change (only after initial load completes)
  useEffect(() => {
    if (window.electronAPI && configLoaded) {
      window.electronAPI.saveConfig({ sourceDirs, tabs, activePresetId, outputMode, outputBaseDir });
    }
  }, [sourceDirs, tabs, activePresetId, outputMode, outputBaseDir, configLoaded]);

  // Derived state: Extensions used in other tabs
  const getUsedExtensions = (excludeTabId = null) => {
    const used = new Set();
    tabs.forEach(tab => {
      if (tab.id !== excludeTabId) {
        tab.extensions.forEach(ext => used.add(ext.toLowerCase()));
      }
    });
    return used;
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  // --- Source Directory Handlers ---
  const handleAddSourceDir = async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.selectDirectory();
      if (dir && !sourceDirs.some(d => d.path === dir)) {
        setSourceDirs([...sourceDirs, { path: dir, includeSubfolders: false, excludeDirs: [] }]);
      }
    }
  };

  const removeSourceDir = (dirPath) => {
    setSourceDirs(sourceDirs.filter(d => d.path !== dirPath));
    if (expandedSourceDir === dirPath) setExpandedSourceDir(null);
  };

  const toggleSourceDirSubfolders = (dirPath) => {
    setSourceDirs(sourceDirs.map(d =>
      d.path === dirPath ? { ...d, includeSubfolders: !d.includeSubfolders } : d
    ));
  };

  const handleAddExcludedDirsForSource = async (dirPath) => {
    if (window.electronAPI) {
      const dirs = await window.electronAPI.selectDirectories();
      if (dirs && dirs.length > 0) {
        setSourceDirs(sourceDirs.map(d => {
          if (d.path === dirPath) {
            const newExcludes = Array.from(new Set([...d.excludeDirs, ...dirs]));
            return { ...d, excludeDirs: newExcludes };
          }
          return d;
        }));
      }
    }
  };

  const removeExcludedDirFromSource = (dirPath, excludeDir) => {
    setSourceDirs(sourceDirs.map(d => {
      if (d.path === dirPath) {
        return { ...d, excludeDirs: d.excludeDirs.filter(e => e !== excludeDir) };
      }
      return d;
    }));
  };

  // --- Output Directory Handlers ---
  const handleSelectOutputBaseDir = async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.selectDirectory();
      if (dir) setOutputBaseDir(dir);
    }
  };

  const handleSelectTabOutputDir = async (tabId) => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.selectDirectory();
      if (dir) {
        setTabs(tabs.map(t => t.id === tabId ? { ...t, outputDir: dir } : t));
        setActivePresetId(null);
      }
    }
  };

  const handleAddTab = () => {
    const newTabId = `tab-${Date.now()}`;
    setTabs([...tabs, { id: newTabId, name: `Folder ${tabs.length + 1}`, extensions: [], outputDir: '' }]);
    setActiveTabId(newTabId);
    setActivePresetId(null);
  };

  const handleDeleteTab = (e, tabId) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id);
    }
    setActivePresetId(null);
  };

  const handleUpdateTabName = (name) => {
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, name } : t));
    setActivePresetId(null);
  };

  const handleOrganize = async () => {
    if (sourceDirs.length === 0) {
      setStatusMsg("Please add at least one source directory.");
      return;
    }

    if (outputMode === 'single' && !outputBaseDir) {
      setStatusMsg("Please select an output directory.");
      return;
    }
    
    const hasValidTab = tabs.some(t => t.name.trim() !== '' && t.extensions.length > 0);
    if (!hasValidTab) {
      setStatusMsg("Create at least one folder tab with an extension.");
      return;
    }

    if (outputMode === 'per-tab') {
      const missingOutput = tabs.filter(t => t.name.trim() !== '' && t.extensions.length > 0 && !t.outputDir);
      if (missingOutput.length > 0) {
        setStatusMsg(`Please set an output directory for: ${missingOutput.map(t => t.name || 'Unnamed').join(', ')}`);
        return;
      }
    }

    setIsOrganizing(true);
    setStatusMsg("Organizing files...");

    if (window.electronAPI) {
      const config = { sourceDirs, tabs, outputMode, outputBaseDir };
      const res = await window.electronAPI.organizeFiles(config);
      if (res.success) {
        setStatusMsg(`Successfully moved ${res.totalMoved} files!`);
        if (!activePresetId) {
           setTimeout(() => {
              if (window.confirm("Organization complete! Would you like to save this layout as a preset for future use?")) {
                 handleSaveAsPreset();
              }
           }, 100);
        }
      } else {
        setStatusMsg(`Failed: ${res.error}`);
      }
    } else {
      setTimeout(() => setStatusMsg("Mock Organization Complete!"), 1500);
    }
    setIsOrganizing(false);
  };

  const toggleExtension = (ext) => {
    const normExt = ext.startsWith('.') || ext === '*' ? ext.toLowerCase() : '.' + ext.toLowerCase();
    
    setTabs(tabs.map(tab => {
      if (tab.id === editingTabId) {
        if (tab.extensions.includes(normExt)) {
          return { ...tab, extensions: tab.extensions.filter(e => e !== normExt) };
        } else {
          return { ...tab, extensions: [...tab.extensions, normExt] };
        }
      }
      return tab;
    }));
    setActivePresetId(null);
  };

  const addCustomExtension = (e) => {
    e.preventDefault();
    if (customExt.trim()) {
      let ext = customExt.trim().toLowerCase();
      if (!ext.startsWith('.') && ext !== '*') ext = '.' + ext;
      
      const usedByOthers = getUsedExtensions(editingTabId);
      if (usedByOthers.has(ext)) {
        alert("This extension is already used in another tab.");
        return;
      }

      setTabs(tabs.map(tab => {
        if (tab.id === editingTabId && !tab.extensions.includes(ext)) {
          return { ...tab, extensions: [...tab.extensions, ext] };
        }
        return tab;
      }));
      setCustomExt('');
      setActivePresetId(null);
    }
  };

  const selectAllExtensions = () => {
    const usedByOthers = getUsedExtensions(editingTabId);
    const available = COMMON_EXTENSIONS.filter(ext => !usedByOthers.has(ext));
    
    setTabs(tabs.map(tab => {
       if (tab.id === editingTabId) {
          const existingSet = new Set(tab.extensions);
          available.forEach(ex => existingSet.add(ex));
          return { ...tab, extensions: Array.from(existingSet) };
       }
       return tab;
    }));
    setActivePresetId(null);
  };

  const openExtensionModal = (tabId) => {
    setEditingTabId(tabId);
    setIsModalOpen(true);
  };

  const handleSaveAsPreset = () => {
     const name = prompt("Enter a name for this preset:");
     if (!name) return;
     
     const newPreset = {
        id: `preset-${Date.now()}`,
        name,
        tabs: JSON.parse(JSON.stringify(tabs))
     };
     const newPresets = [...presets, newPreset];
     setPresets(newPresets);
     setActivePresetId(newPreset.id);
     if (window.electronAPI) window.electronAPI.savePresets(newPresets);
  };

  const deletePreset = (e, id) => {
     e.stopPropagation();
     if (id === 'default-preset') return;
     if (!confirm("Are you sure you want to delete this preset?")) return;
     const newPresets = presets.filter(p => p.id !== id);
     setPresets(newPresets);
     if (activePresetId === id) setActivePresetId(null);
     if (window.electronAPI) window.electronAPI.savePresets(newPresets);
  };

  return (
    <div className="app-wrapper">
      <div className="sidebar">
         <div className="titlebar-spacer"></div>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}><BookmarkMinus size={16} /> Presets</h2>
            <button 
               className="btn-secondary" 
               style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}
               onClick={handleHomeClick}
               title="Clear Setup and Return to Home"
            >
               <Home size={14} /> Home
            </button>
         </div>
         <div className="presets-list">
            {presets.map(p => (
               <div 
                 key={p.id} 
                 className={`preset-item ${activePresetId === p.id ? 'active' : ''}`}
                 onClick={() => applyPreset(p)}
               >
                 <span>{p.name}</span>
                 {p.id !== 'default-preset' && (
                    <Trash2 size={14} className="preset-delete" onClick={(e) => deletePreset(e, p.id)} />
                 )}
               </div>
            ))}
         </div>
         <div className="sidebar-footer">
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleSaveAsPreset}>
               <Save size={14} /> Save Current Layout
            </button>
         </div>
      </div>

      <div className="main-content">
        <div className="titlebar-spacer"></div>
        
        <header>
          <h1>OpenOrganizer</h1>
        </header>

        {/* Source Directories */}
        <section className="glass-panel">
          <h2 className="panel-title"><FolderUp size={16} /> Source Directories</h2>
          <p className="panel-description">Select the directories you want to scan for files to organize.</p>
          
          <div className="source-dirs-list">
            {sourceDirs.length === 0 ? (
              <div className="empty-state">No source directories added yet.</div>
            ) : (
              sourceDirs.map(srcDir => (
                <div key={srcDir.path} className="source-dir-entry">
                  <div className="source-dir-item">
                    <button
                      className="source-dir-expand"
                      onClick={() => setExpandedSourceDir(expandedSourceDir === srcDir.path ? null : srcDir.path)}
                      title="Toggle settings"
                    >
                      {expandedSourceDir === srcDir.path ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <Folder size={14} style={{ flexShrink: 0, color: 'var(--accent-color)' }} />
                    <span className="source-dir-path">{srcDir.path}</span>
                    {srcDir.includeSubfolders && (
                      <span className="source-dir-badge">Subfolders</span>
                    )}
                    <button className="source-dir-remove" onClick={() => removeSourceDir(srcDir.path)} title="Remove">
                      <X size={14} />
                    </button>
                  </div>

                  {/* Expanded settings for this source dir */}
                  {expandedSourceDir === srcDir.path && (
                    <div className="source-dir-settings">
                      <div className="toggle-wrapper" onClick={() => toggleSourceDirSubfolders(srcDir.path)}>
                        <div className={`toggle ${srcDir.includeSubfolders ? 'on' : ''}`}>
                           <div className="toggle-knob"></div>
                        </div>
                        <span style={{ fontSize: '13px' }}>Scan subfolders</span>
                      </div>

                      {srcDir.includeSubfolders && (
                        <div className="danger-text" style={{ marginLeft: 0, fontSize: '12px' }}>
                          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/>
                          Will pull matching files out of all subfolders.
                        </div>
                      )}

                      {srcDir.includeSubfolders && (
                        <div style={{ marginTop: '8px' }}>
                          <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => handleAddExcludedDirsForSource(srcDir.path)}>
                            <Plus size={12} /> Exclude Folders
                          </button>
                          {srcDir.excludeDirs.length > 0 && (
                            <div className="excluded-dirs-list" style={{ marginTop: '6px' }}>
                              {srcDir.excludeDirs.map(d => (
                                <div key={d} className="excluded-dir-item">
                                  <span>{d}</span>
                                  <span onClick={() => removeExcludedDirFromSource(srcDir.path, d)}><X size={12} /></span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={handleAddSourceDir}>
            <Plus size={16} /> Add Source Directory
          </button>
        </section>

        {/* Output Configuration */}
        <section className="glass-panel">
          <h2 className="panel-title"><MapPin size={16} /> Output Location</h2>
          <p className="panel-description">Choose where organized folders will be created.</p>

          <div className="mode-toggle">
            <button 
              className={`mode-option ${outputMode === 'single' ? 'active' : ''}`}
              onClick={() => setOutputMode('single')}
            >
              <Layers size={14} />
              Single Directory
            </button>
            <button 
              className={`mode-option ${outputMode === 'per-tab' ? 'active' : ''}`}
              onClick={() => setOutputMode('per-tab')}
            >
              <Target size={14} />
              Per-Tab Location
            </button>
          </div>

          {outputMode === 'single' ? (
            <div className="output-single">
              <div className="folder-selector">
                <div className={`path-display ${outputBaseDir ? 'has-path' : ''}`}>
                  {outputBaseDir || 'No output directory selected...'}
                </div>
                <button className="btn" onClick={handleSelectOutputBaseDir}>
                  <FolderOpen size={18} /> Select Output Directory
                </button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                All folder tabs will be created as subfolders inside this directory.
              </div>
            </div>
          ) : (
            <div className="output-pertab-info">
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>Each folder tab has its own output location. Set them in the tab settings below.</span>
            </div>
          )}
        </section>

        {/* Tab Management */}
        <section className="tabs-container">
          <div className="tabs-header">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <Folder size={14} />
                {tab.name || 'Unnamed Folder'}
                {tabs.length > 1 && (
                  <div className="delete-tab" onClick={(e) => handleDeleteTab(e, tab.id)}>
                    <X size={14} />
                  </div>
                )}
              </div>
            ))}
            <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={handleAddTab}>
              <Plus size={16} /> Add Folder Tab
            </button>
          </div>

          {activeTab && (
            <div className="tab-content glass-panel">
              <div className="input-group">
                <label className="input-label">Folder Name</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <input 
                     type="text" 
                     className="text-input" 
                     value={activeTab.name}
                     onChange={(e) => handleUpdateTabName(e.target.value)}
                     placeholder="e.g., Images, Documents, Videos"
                   />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', marginLeft: '4px' }}>
                   <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                   Files matching the extensions below will be moved into this folder.
                </div>
              </div>

              {/* Per-tab output directory (only in per-tab mode) */}
              {outputMode === 'per-tab' && (
                <div className="input-group">
                  <label className="input-label">Output Directory for "{activeTab.name || 'this tab'}"</label>
                  <div className="folder-selector">
                    <div className={`path-display ${activeTab.outputDir ? 'has-path' : ''}`}>
                      {activeTab.outputDir || 'No output directory selected...'}
                    </div>
                    <button className="btn btn-secondary" onClick={() => handleSelectTabOutputDir(activeTab.id)}>
                      <FolderOpen size={16} /> Browse...
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                    <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>
                    The "{activeTab.name || 'Unnamed'}" folder will be created inside this directory.
                  </div>
                </div>
              )}
              
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Selected Extensions</span>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openExtensionModal(activeTab.id)}>
                    <Settings2 size={14} /> Manage Extensions
                  </button>
                </label>
                
                <div className="extensions-grid">
                  {activeTab.extensions.length === 0 ? (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No extensions selected yet.</span>
                  ) : (
                    activeTab.extensions.map(ext => (
                      <div className="ext-pill" key={ext}>
                        {ext}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Footer Organize action */}
        <footer className="action-footer">
          <div style={{ color: statusMsg.includes('Failed') ? 'var(--danger-color)' : 'var(--text-secondary)', fontSize: '14px' }}>
            {statusMsg}
          </div>
          <button className="btn" style={{ background: 'var(--success-color)' }} onClick={handleOrganize} disabled={isOrganizing}>
            {isOrganizing ? <div style={{width:'18px',height:'18px',border:'2px solid white',borderTop:'2px solid transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div> : <Play size={18} />}
            {isOrganizing ? 'Organizing...' : 'Organize Files!'}
          </button>
        </footer>
      </div>

      {/* Extension Selection Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              Select Extensions
              <button className="btn-secondary" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={addCustomExtension} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <input 
                  type="text" 
                  className="text-input" 
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                  placeholder="Custom extension (.cs or *)" 
                  value={customExt}
                  onChange={e => setCustomExt(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '8px 12px' }}>Add</button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                 <div className="input-label" style={{ marginBottom: 0 }}>Common Extensions</div>
                 <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={selectAllExtensions}>
                    <CheckSquare size={14} /> Select All Available
                 </button>
              </div>
              <div className="extensions-grid">
                {COMMON_EXTENSIONS.map(ext => {
                   const usedByOthers = getUsedExtensions(editingTabId).has(ext);
                   const isSelected = tabs.find(t => t.id === editingTabId)?.extensions.includes(ext);
                   
                   let className = 'ext-pill selectable';
                   if (usedByOthers) className = 'ext-pill disabled';
                   else if (isSelected) className = 'ext-pill selected';

                   return (
                     <div 
                       key={ext}
                       className={className}
                       onClick={() => !usedByOthers && toggleExtension(ext)}
                       title={usedByOthers ? 'Used in another folder' : ''}
                     >
                       {isSelected && <Check size={12} />}
                       {ext}
                     </div>
                   );
                })}
              </div>
            </div>
            <div className="action-footer" style={{ borderTop: 'none', padding: '16px 24px', justifyContent: 'flex-end' }}>
               <button className="btn" onClick={() => setIsModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
