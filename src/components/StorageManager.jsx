import React, { useEffect, useRef, useState, useCallback } from 'react';
import { storageApi } from '../services/api';
import { 
  FolderPlus, Trash2, Upload, FileText, Loader2, Grid, List, Download, 
  MessageSquare, X, Search, FolderOpen, File, ChevronRight, RefreshCw,
  MoreVertical, Eye, Clock, HardDrive, Cloud, CheckCircle2, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// File type configurations
const FILE_CONFIGS = {
  pdf: { icon: '📕', color: '#ef4444', label: 'PDF' },
  doc: { icon: '📘', color: '#3b82f6', label: 'Word' },
  docx: { icon: '📘', color: '#3b82f6', label: 'Word' },
  txt: { icon: '📄', color: '#6b7280', label: 'Text' },
  xls: { icon: '📗', color: '#22c55e', label: 'Excel' },
  xlsx: { icon: '📗', color: '#22c55e', label: 'Excel' },
  ppt: { icon: '📙', color: '#f97316', label: 'PowerPoint' },
  pptx: { icon: '📙', color: '#f97316', label: 'PowerPoint' },
  jpg: { icon: '🖼️', color: '#8b5cf6', label: 'Image' },
  jpeg: { icon: '🖼️', color: '#8b5cf6', label: 'Image' },
  png: { icon: '🖼️', color: '#8b5cf6', label: 'Image' },
  gif: { icon: '🖼️', color: '#8b5cf6', label: 'Image' },
  default: { icon: '📄', color: '#64748b', label: 'File' }
};

const getFileConfig = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  return FILE_CONFIGS[ext] || FILE_CONFIGS.default;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StorageManager = ({ onOpenDocumentChat }) => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [trail, setTrail] = useState([]);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [filesInFolder, setFilesInFolder] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const refreshFolders = useCallback(async () => {
    try {
      const { data } = await storageApi.listFolders();
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders');
    }
  }, []);

  const refreshTrail = useCallback(async () => {
    if (!selectedFolder) return;
    try {
      const { data } = await storageApi.listRecommendations(selectedFolder);
      setTrail(data.trail || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  }, [selectedFolder]);

  const refreshFiles = useCallback(async () => {
    if (!selectedFolder) {
      setFilesInFolder([]);
      return;
    }
    try {
      const { data } = await storageApi.listFiles(selectedFolder);
      // Normalize file data - handle both string array and object array
      const normalizedFiles = (data.files || []).map(f => 
        typeof f === 'string' ? { name: f } : f
      );
      setFilesInFolder(normalizedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }, [selectedFolder]);

  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

  useEffect(() => {
    if (!selectedFolder) {
      setTrail([]);
      setFilesInFolder([]);
      setSelectedFiles([]);
      setLoadingData(false);
      return;
    }
    let cancelled = false;
    setLoadingData(true);
    Promise.all([refreshFiles(), refreshTrail()])
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });
    return () => { cancelled = true; };
  }, [selectedFolder, refreshFiles, refreshTrail]);

  const onCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      toast.error('Please enter a folder name');
      return;
    }
    
    setCreatingFolder(true);
    try {
      await storageApi.createFolder(name);
      await refreshFolders();
      setSelectedFolder(name);
      setShowNewFolderModal(false);
      setNewFolderName('');
      toast.success(`Folder "${name}" created successfully`);
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to create folder';
      toast.error(errorMsg);
    } finally {
      setCreatingFolder(false);
    }
  };

  const onDeleteFolder = async () => {
    if (!selectedFolder) return;
    const ok = window.confirm(`Are you sure you want to delete "${selectedFolder}" and all its contents? This action cannot be undone.`);
    if (!ok) return;
    
    const folderName = selectedFolder;
    try {
      await storageApi.deleteFolder(selectedFolder);
      setSelectedFolder('');
      setTrail([]);
      await refreshFolders();
      toast.success(`Folder "${folderName}" deleted`);
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to delete folder';
      toast.error(errorMsg);
    }
  };

  const onUpload = async () => {
    if (!selectedFolder || !filesToUpload.length) return;
    
    try {
      setUploading(true);
      const response = await storageApi.uploadToFolder(selectedFolder, filesToUpload);
      setFilesToUpload([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await Promise.all([refreshTrail(), refreshFiles()]);
      toast.success(`${filesToUpload.length} file(s) uploaded successfully`);
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Upload failed';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const removeFileFromUpload = (index) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const getFileRecommendations = (fileName) => {
    const entry = trail.find(t => t.documentName === fileName);
    return entry?.recommendations || [];
  };

  const toggleFileSelection = (fileName) => {
    setSelectedFiles(prev => 
      prev.includes(fileName) 
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  };

  const downloadFile = async (fileName) => {
    try {
      const response = await storageApi.downloadFile(selectedFolder, fileName);
      
      // Check if response contains a downloadUrl (S3 mode)
      if (response.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
        return;
      }
      
      // Local mode - blob download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  const openChatWithDocument = (fileName) => {
    if (onOpenDocumentChat) {
      onOpenDocumentChat(fileName, selectedFolder);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setFilesToUpload(prev => [...prev, ...files]);
    }
  };

  // Filter files based on search
  const filteredFiles = filesInFolder.filter(file => {
    const fileName = typeof file === 'string' ? file : file.name;
    return fileName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-cyan-400 font-medium mb-1">
              <Cloud size={16} />
              <span>DOCUMENT STORAGE</span>
            </div>
            <h1 className="text-2xl font-bold text-white">File Management & AI Assistant</h1>
            <p className="text-slate-400 text-sm mt-1">Upload, organize, and chat with your documents using AI</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25"
            >
              <FolderPlus size={18} />
              New Folder
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Folders */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Folders</h2>
                <button 
                  onClick={refreshFolders}
                  className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={14} className="text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {folders.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No folders yet</p>
                    <p className="text-xs mt-1">Create your first folder</p>
                  </div>
                ) : (
                  folders.map(folder => {
                    const isActive = selectedFolder === folder;
                    return (
                      <button
                        key={folder}
                        onClick={() => setSelectedFolder(folder)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                          isActive 
                            ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-600/20 border border-cyan-500/50 text-white' 
                            : 'hover:bg-slate-700/50 text-slate-300 border border-transparent'
                        }`}
                      >
                        <FolderOpen size={18} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
                        <span className="flex-1 truncate font-medium text-sm">{folder}</span>
                        {isActive && <ChevronRight size={16} className="text-cyan-400" />}
                      </button>
                    );
                  })
                )}
              </div>
              
              {selectedFolder && (
                <button
                  onClick={onDeleteFolder}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors text-sm font-medium"
                >
                  <Trash2 size={14} />
                  Delete Folder
                </button>
              )}
            </div>

            {/* Upload Section */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 mt-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Upload Files</h2>
              
              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  dragActive 
                    ? 'border-cyan-400 bg-cyan-500/10' 
                    : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFilesToUpload(prev => [...prev, ...files]);
                  }}
                  className="hidden"
                />
                <Upload size={24} className={`mx-auto mb-2 ${dragActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <p className="text-sm text-slate-400">
                  {dragActive ? 'Drop files here' : 'Drag & drop or click to browse'}
                </p>
                <p className="text-xs text-slate-500 mt-1">PDF, DOC, TXT, XLS, PPT, Images</p>
              </div>

              {/* Selected Files Preview */}
              {filesToUpload.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Selected Files ({filesToUpload.length})</span>
                    <button 
                      onClick={() => setFilesToUpload([])}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                    {filesToUpload.map((file, index) => {
                      const config = getFileConfig(file.name);
                      return (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-2.5 bg-slate-700/50 rounded-lg group"
                        >
                          <span className="text-lg">{config.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                          </div>
                          <button
                            onClick={() => removeFileFromUpload(index)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
                          >
                            <X size={14} className="text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={onUpload}
                    disabled={!selectedFolder || uploading}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                      selectedFolder && !uploading
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        {selectedFolder ? `Upload to ${selectedFolder}` : 'Select a folder first'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Files */}
          <div className="col-span-12 lg:col-span-9">
            {selectedFolder ? (
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl">
                {/* Files Header */}
                <div className="p-4 border-b border-slate-700/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-lg">
                        <FolderOpen size={20} className="text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{selectedFolder}</h2>
                        <p className="text-sm text-slate-400">{filesInFolder.length} files</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search files..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-48"
                        />
                      </div>
                      
                      {/* View Toggle */}
                      <div className="flex items-center bg-slate-700/50 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-indigo-500/30 text-cyan-400' : 'text-slate-400 hover:text-slate-300'}`}
                        >
                          <Grid size={16} />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-indigo-500/30 text-cyan-400' : 'text-slate-400 hover:text-slate-300'}`}
                        >
                          <List size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Files Content */}
                <div className="p-4 min-h-[500px]">
                  {loadingData ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 size={40} className="text-cyan-400 animate-spin mb-4" />
                      <p className="text-slate-400">Loading files...</p>
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      {searchQuery ? (
                        <>
                          <Search size={48} className="text-slate-600 mb-4" />
                          <p className="text-slate-400 text-lg">No files match "{searchQuery}"</p>
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
                          >
                            Clear search
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                            <FileText size={40} className="text-slate-500" />
                          </div>
                          <p className="text-slate-400 text-lg mb-2">No files in this folder</p>
                          <p className="text-slate-500 text-sm">Upload files using the panel on the left</p>
                        </>
                      )}
                    </div>
                  ) : viewMode === 'grid' ? (
                    /* Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredFiles.map((file, index) => {
                        const fileName = typeof file === 'string' ? file : file.name;
                        const fileSize = typeof file === 'object' ? file.size : null;
                        const config = getFileConfig(fileName);
                        const isSelected = selectedFiles.includes(fileName);
                        const pendingCount = getFileRecommendations(fileName).filter(r => r.status === 'pending').length;
                        
                        return (
                          <div
                            key={fileName + index}
                            className={`group relative bg-slate-700/30 hover:bg-slate-700/50 border rounded-xl p-4 transition-all cursor-pointer ${
                              isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-slate-600/50 hover:border-slate-500/50'
                            }`}
                            onClick={() => toggleFileSelection(fileName)}
                          >
                            {/* Selection Checkbox */}
                            <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500 group-hover:border-slate-400'
                            }`}>
                              {isSelected && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                            
                            {/* File Icon */}
                            <div className="w-12 h-12 bg-slate-800/50 rounded-lg flex items-center justify-center mb-3">
                              <span className="text-2xl">{config.icon}</span>
                            </div>
                            
                            {/* File Info */}
                            <h3 className="font-medium text-slate-200 text-sm truncate mb-1" title={fileName}>
                              {fileName}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="px-1.5 py-0.5 bg-slate-600/50 rounded text-slate-400">{config.label}</span>
                              {fileSize && <span>{formatFileSize(fileSize)}</span>}
                            </div>
                            
                            {/* Status Badge */}
                            {pendingCount > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-amber-400">
                                <AlertCircle size={12} />
                                <span>{pendingCount} pending</span>
                              </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-600/30">
                              <button
                                onClick={(e) => { e.stopPropagation(); openChatWithDocument(fileName); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                <MessageSquare size={12} />
                                AI Chat
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadFile(fileName); }}
                                className="p-2 bg-slate-600/50 hover:bg-slate-600 rounded-lg transition-colors"
                              >
                                <Download size={14} className="text-slate-300" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* List View */
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-1"></div>
                        <div className="col-span-5">Name</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Actions</div>
                      </div>
                      
                      {filteredFiles.map((file, index) => {
                        const fileName = typeof file === 'string' ? file : file.name;
                        const fileSize = typeof file === 'object' ? file.size : null;
                        const config = getFileConfig(fileName);
                        const isSelected = selectedFiles.includes(fileName);
                        const pendingCount = getFileRecommendations(fileName).filter(r => r.status === 'pending').length;
                        
                        return (
                          <div
                            key={fileName + index}
                            onClick={() => toggleFileSelection(fileName)}
                            className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all items-center ${
                              isSelected 
                                ? 'bg-cyan-500/10 border border-cyan-500/30' 
                                : 'hover:bg-slate-700/30 border border-transparent'
                            }`}
                          >
                            <div className="col-span-1">
                              <span className="text-xl">{config.icon}</span>
                            </div>
                            <div className="col-span-5">
                              <p className="text-sm text-slate-200 truncate font-medium">{fileName}</p>
                              {fileSize && <p className="text-xs text-slate-500">{formatFileSize(fileSize)}</p>}
                            </div>
                            <div className="col-span-2">
                              <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-400">{config.label}</span>
                            </div>
                            <div className="col-span-2">
                              {pendingCount > 0 ? (
                                <span className="flex items-center gap-1 text-xs text-amber-400">
                                  <AlertCircle size={12} />
                                  {pendingCount} pending
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-emerald-400">
                                  <CheckCircle2 size={12} />
                                  Ready
                                </span>
                              )}
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); openChatWithDocument(fileName); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                <MessageSquare size={12} />
                                Chat
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadFile(fileName); }}
                                className="p-1.5 bg-slate-700/50 hover:bg-slate-600 rounded-lg transition-colors"
                              >
                                <Download size={14} className="text-slate-400" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty State - No Folder Selected */
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl min-h-[600px] flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mb-6">
                  <FolderOpen size={48} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">Select a Folder</h3>
                <p className="text-slate-500 text-center max-w-md mb-6">
                  Choose a folder from the sidebar to view and manage your files, or create a new folder to get started.
                </p>
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25"
                >
                  <FolderPlus size={18} />
                  Create Your First Folder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Create New Folder</h3>
              <button
                onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">Folder Name</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onCreateFolder()}
                placeholder="Enter folder name..."
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                autoFocus
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onCreateFolder}
                disabled={!newFolderName.trim() || creatingFolder}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                  newFolderName.trim() && !creatingFolder
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {creatingFolder ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderPlus size={16} />
                    Create Folder
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col items-center">
            <Loader2 size={48} className="text-cyan-400 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Uploading Files</h3>
            <p className="text-slate-400 text-sm">Please wait while your files are being uploaded...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageManager;
