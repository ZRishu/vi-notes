import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import TurndownService from 'turndown';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { 
  Undo, Redo, 
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link2,
  Activity, CheckCircle2, ShieldAlert, ChevronDown,
  Quote, Code, Image as ImageIcon, Minus, Plus, Share,
  FileText, FileDown
} from 'lucide-react';

const FONTS = [
  { name: 'Arial', family: 'Arial, sans-serif' },
  { name: 'Times New Roman', family: '"Times New Roman", serif' },
  { name: 'Courier New', family: '"Courier New", monospace' },
  { name: 'Georgia', family: 'Georgia, serif' },
  { name: 'Verdana', family: 'Verdana, serif' },
  { name: 'Trebuchet MS', family: '"Trebuchet MS", sans-serif' },
  { name: 'Impact', family: 'Impact, sans-serif' },
  { name: 'Comic Sans MS', family: '"Comic Sans MS", cursive, sans-serif' },
  { name: 'Inter', family: 'Inter, sans-serif' },
  { name: 'Fira Code', family: '"Fira Code", monospace' },
  { name: 'Roboto', family: 'Roboto, sans-serif' },
  { name: 'Open Sans', family: '"Open Sans", sans-serif' },
  { name: 'Lato', family: 'Lato, sans-serif' },
  { name: 'Montserrat', family: 'Montserrat, sans-serif' },
  { name: 'Oswald', family: 'Oswald, sans-serif' },
  { name: 'Raleway', family: 'Raleway, sans-serif' },
  { name: 'Nunito', family: 'Nunito, sans-serif' },
  { name: 'Playfair Display', family: '"Playfair Display", serif' },
  { name: 'Merriweather', family: 'Merriweather, serif' },
  { name: 'Lora', family: 'Lora, serif' },
];

const FONT_SIZES = [
  { label: '10pt', value: '1' },
  { label: '13pt', value: '2' },
  { label: '16pt', value: '3' },
  { label: '18pt', value: '4' },
  { label: '24pt', value: '5' },
  { label: '32pt', value: '6' },
  { label: '48pt', value: '7' },
];

const Editor: React.FC = () => {
  const [content, setContent] = useState('');
  const [keystrokeData, setKeystrokeData] = useState<any[]>([]);
  const [pastedEvents, setPastedEvents] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  // Custom UI states
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [currentFont, setCurrentFont] = useState('Inter');
  const [currentFontSize, setCurrentFontSize] = useState('3');
  const [currentStyle, setCurrentStyle] = useState('Normal Text');
  const [currentAlign, setCurrentAlign] = useState('Left');
  
  const editorRef = useRef<HTMLDivElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const fontSizeDropdownRef = useRef<HTMLDivElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const alignDropdownRef = useRef<HTMLDivElement>(null);
  const listDropdownRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const keyDownTimes = useRef<{ [key: string]: number }>({});
  
  // Basic text content for word count analysis, stripping HTML tags
  const textContent = content.replace(/<[^>]*>?/gm, '');
  const wordCount = textContent.trim().split(/\s+/).filter(w => w.length > 0).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(target)) setShowFontDropdown(false);
      if (fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(target)) setShowFontSizeDropdown(false);
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(target)) setShowStyleDropdown(false);
      if (alignDropdownRef.current && !alignDropdownRef.current.contains(target)) setShowAlignDropdown(false);
      if (listDropdownRef.current && !listDropdownRef.current.contains(target)) setShowListDropdown(false);
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) setShowExportDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const timestamp = Date.now();
    keyDownTimes.current[e.code] = timestamp;
    
    setKeystrokeData(prev => [...prev, {
      type: 'keydown',
      keyCode: e.code,
      timestamp
    }]);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const timestamp = Date.now();
    const duration = keyDownTimes.current[e.code] ? timestamp - keyDownTimes.current[e.code] : 0;
    
    setKeystrokeData(prev => [...prev, {
      type: 'keyup',
      keyCode: e.code,
      timestamp,
      duration
    }]);
    
    delete keyDownTimes.current[e.code];
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, pastedText);
    
    const timestamp = Date.now();
    setPastedEvents(prev => [...prev, {
      timestamp,
      textLength: pastedText.length,
      content: pastedText 
    }]);
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      setContent(editorRef.current.innerHTML);
    }
  };

  const applyFont = (fontName: string, fontFamily: string) => {
    setCurrentFont(fontName);
    execCommand('fontName', fontFamily);
    setShowFontDropdown(false);
  };

  const applyFontSize = (size: string) => {
    setCurrentFontSize(size);
    execCommand('fontSize', size);
    setShowFontSizeDropdown(false);
  };

  const changeFontSize = (delta: number) => {
    let newSize = parseInt(currentFontSize) + delta;
    if (newSize < 1) newSize = 1;
    if (newSize > 7) newSize = 7;
    const newSizeStr = newSize.toString();
    setCurrentFontSize(newSizeStr);
    execCommand('fontSize', newSizeStr);
  };

  const applyStyle = (label: string, value: string) => {
    setCurrentStyle(label);
    execCommand('formatBlock', value);
    setShowStyleDropdown(false);
  };

  const applyAlignment = (label: string, command: string) => {
    setCurrentAlign(label);
    execCommand(command);
    setShowAlignDropdown(false);
  };

  const handleLinkOpen = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setLinkUrl('');
      setShowLinkModal(true);
    }
  };

  const handleLinkSubmit = () => {
    if (linkUrl) {
      if (editorRef.current) {
        editorRef.current.focus();
        execCommand('createLink', linkUrl);
      }
    }
    setShowLinkModal(false);
    setLinkUrl('');
  };

  const handleImageOpen = () => {
    setImageUrl('');
    setShowImageModal(true);
  };

  const handleImageSubmit = () => {
    if (imageUrl) {
      if (editorRef.current) {
        editorRef.current.focus();
        execCommand('insertImage', imageUrl);
      }
    }
    setShowImageModal(false);
    setImageUrl('');
  };

  const insertHorizontalRule = () => {
    execCommand('insertHorizontalRule');
  };

  const insertCodeBlock = () => {
    execCommand('formatBlock', 'PRE');
  };

  const insertBlockquote = () => {
    execCommand('formatBlock', 'BLOCKQUOTE');
  };

  const getDocumentTitle = () => {
    const titleInput = document.querySelector('.header-doc-title') as HTMLInputElement;
    return titleInput && titleInput.value ? titleInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'document';
  };

  const handleExportMarkdown = () => {
    if (!editorRef.current) return;
    
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced'
    });
    
    const markdown = turndownService.turndown(editorRef.current.innerHTML);
    const filename = `${getDocumentTitle()}.md`;
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
    setShowExportDropdown(false);
  };

  const handleExportPDF = () => {
    if (!editorRef.current) return;
    
    // Temporarily apply white background and black text for PDF generation to ensure it looks like a document
    // regardless of dark mode.
    const originalBg = editorRef.current.style.backgroundColor;
    const originalColor = editorRef.current.style.color;
    editorRef.current.style.backgroundColor = '#ffffff';
    editorRef.current.style.color = '#000000';

    const filename = `${getDocumentTitle()}.pdf`;
    
    const opt = {
      margin:       1,
      filename:     filename,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };

    html2pdf().from(editorRef.current).set(opt).save().then(() => {
      // Restore original styles
      if (editorRef.current) {
        editorRef.current.style.backgroundColor = originalBg;
        editorRef.current.style.color = originalColor;
      }
    });
    
    setShowExportDropdown(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data } = await api.post('/sessions', {
        content: textContent,
        keystrokeData,
        pastedEvents
      });
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="main-layout">
      {/* Editor Area with Floating Toolbar */}
      <div className="editor-wrapper">
        <div className="toolbar-container" style={{ flexWrap: 'wrap', padding: '16px 12px' }}>
          <div className="toolbar" style={{ flexWrap: 'wrap' }}>
            <button className="toolbar-btn" onClick={() => execCommand('undo')} title="Undo"><Undo size={16} /></button>
            <button className="toolbar-btn" onClick={() => execCommand('redo')} title="Redo"><Redo size={16} /></button>
            <div className="toolbar-separator" />
            
            {/* Font Family Dropdown */}
            <div className="custom-dropdown-container" ref={fontDropdownRef}>
              <button 
                className="custom-dropdown-btn" 
                onClick={() => setShowFontDropdown(!showFontDropdown)}
              >
                <span style={{ fontFamily: FONTS.find(f => f.name === currentFont)?.family || 'Inter', whiteSpace: 'nowrap' }}>
                  {currentFont}
                </span>
                <ChevronDown size={14} style={{ flexShrink: 0 }} />
              </button>
              {showFontDropdown && (
                <div className="custom-dropdown-menu" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {FONTS.map(font => (
                    <button 
                      key={font.name} 
                      className="custom-dropdown-item" 
                      style={{ fontFamily: font.family, whiteSpace: 'nowrap' }}
                      onClick={() => applyFont(font.name, font.family)}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="toolbar-separator" />

            {/* Font Size Controls */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="toolbar-btn" onClick={() => changeFontSize(-1)} title="Decrease Font Size" style={{ padding: '4px' }}><Minus size={14} /></button>
              <div className="custom-dropdown-container" ref={fontSizeDropdownRef}>
                <button 
                  className="custom-dropdown-btn" 
                  onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                  style={{ padding: '4px 8px', justifyContent: 'center' }}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {FONT_SIZES.find(s => s.value === currentFontSize)?.label || '16pt'}
                  </span>
                </button>
                {showFontSizeDropdown && (
                  <div className="custom-dropdown-menu">
                    {FONT_SIZES.map(size => (
                      <button 
                        key={size.value} 
                        className="custom-dropdown-item" 
                        onClick={() => applyFontSize(size.value)}
                        style={{ textAlign: 'center', whiteSpace: 'nowrap' }}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="toolbar-btn" onClick={() => changeFontSize(1)} title="Increase Font Size" style={{ padding: '4px' }}><Plus size={14} /></button>
            </div>

            <div className="toolbar-separator" />

            {/* Text Style Dropdown (H1, H2, Normal) */}
            <div className="custom-dropdown-container" ref={styleDropdownRef}>
              <button 
                className="custom-dropdown-btn" 
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                title="Text Style"
              >
                <span style={{ whiteSpace: 'nowrap' }}>
                  {currentStyle}
                </span>
                <ChevronDown size={14} style={{ flexShrink: 0 }} />
              </button>
              {showStyleDropdown && (
                <div className="custom-dropdown-menu">
                  <button className="custom-dropdown-item" onClick={() => applyStyle('Normal Text', 'P')} style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>Normal text</button>
                  <button className="custom-dropdown-item" onClick={() => applyStyle('Heading 1', 'H1')} style={{ fontSize: '24px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Heading 1</button>
                  <button className="custom-dropdown-item" onClick={() => applyStyle('Heading 2', 'H2')} style={{ fontSize: '20px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Heading 2</button>
                  <button className="custom-dropdown-item" onClick={() => applyStyle('Heading 3', 'H3')} style={{ fontSize: '16px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Heading 3</button>
                </div>
              )}
            </div>

            <div className="toolbar-separator" />
            
            <button className="toolbar-btn" onClick={() => execCommand('bold')} title="Bold (Ctrl+B)"><Bold size={16} /></button>
            <button className="toolbar-btn" onClick={() => execCommand('italic')} title="Italic (Ctrl+I)"><Italic size={16} /></button>
            <button className="toolbar-btn" onClick={() => execCommand('underline')} title="Underline (Ctrl+U)"><Underline size={16} /></button>
            <button className="toolbar-btn" onClick={() => execCommand('strikeThrough')} title="Strikethrough"><Strikethrough size={16} /></button>
            
            <div className="toolbar-separator" />

            {/* Alignment Dropdown */}
            <div className="custom-dropdown-container" ref={alignDropdownRef}>
              <button 
                className="toolbar-btn" 
                onClick={() => setShowAlignDropdown(!showAlignDropdown)}
                title={`Align ${currentAlign}`}
                style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderRadius: '6px' }}
              >
                {currentAlign === 'Left' && <AlignLeft size={16} />}
                {currentAlign === 'Center' && <AlignCenter size={16} />}
                {currentAlign === 'Right' && <AlignRight size={16} />}
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>
              {showAlignDropdown && (
                <div className="custom-dropdown-menu">
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => applyAlignment('Left', 'justifyLeft')}><AlignLeft size={14} /> Left</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => applyAlignment('Center', 'justifyCenter')}><AlignCenter size={14} /> Center</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => applyAlignment('Right', 'justifyRight')}><AlignRight size={14} /> Right</button>
                </div>
              )}
            </div>
            
            {/* Lists Dropdown */}
            <div className="custom-dropdown-container" ref={listDropdownRef}>
              <button 
                className="toolbar-btn" 
                onClick={() => setShowListDropdown(!showListDropdown)}
                title="Lists"
                style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderRadius: '6px' }}
              >
                <List size={16} />
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>
              {showListDropdown && (
                <div className="custom-dropdown-menu">
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => { execCommand('insertUnorderedList'); setShowListDropdown(false); }}><List size={14} /> Bulleted List</button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => { execCommand('insertOrderedList'); setShowListDropdown(false); }}><ListOrdered size={14} /> Numbered List</button>
                </div>
              )}
            </div>
            
            <div className="toolbar-separator" />
            
            <button className="toolbar-btn" onClick={insertBlockquote} title="Quote"><Quote size={16} /></button>
            <button className="toolbar-btn" onClick={insertCodeBlock} title="Code Block"><Code size={16} /></button>
            <button className="toolbar-btn" onClick={insertHorizontalRule} title="Divider"><Minus size={16} /></button>
            
            <div className="toolbar-separator" />
            
            <button className="toolbar-btn" onClick={handleLinkOpen} title="Insert Link"><Link2 size={16} /></button>
            <button className="toolbar-btn" onClick={handleImageOpen} title="Insert Image"><ImageIcon size={16} /></button>
            
            <div className="toolbar-separator" />
            
            {/* Export Dropdown */}
            <div className="custom-dropdown-container" ref={exportDropdownRef}>
              <button 
                className="toolbar-btn" 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                title="Export Document"
                style={{ display: 'flex', gap: '4px', padding: '6px 8px', borderRadius: '6px', color: 'var(--accent-color)' }}
              >
                <Share size={16} />
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>
              {showExportDropdown && (
                <div className="custom-dropdown-menu" style={{ right: 0, left: 'auto' }}>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={handleExportMarkdown}>
                    <FileText size={14} /> Export as Markdown
                  </button>
                  <button className="custom-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={handleExportPDF}>
                    <FileDown size={14} /> Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="page-container">
          <div
            ref={editorRef}
            className="writing-area"
            contentEditable={true}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onPaste={handlePaste}
            data-placeholder="Start writing your document here..."
            spellCheck={false}
            style={{ fontFamily: 'var(--text-primary-font, inherit)' }}
          />
        </div>
      </div>

      {/* Custom Link Modal */}
      {showLinkModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Insert Link</h3>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Paste or type a link URL..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLinkSubmit()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleLinkSubmit}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Image Modal */}
      {showImageModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Insert Image</h3>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Paste an image URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImageSubmit()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowImageModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleImageSubmit}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Right Sidebar / Stats Panel */}
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">
            <Activity size={14} /> Session Stats
          </div>
          <div className="stats-container">
            <div className="stat-box">
              <span className="stat-value">{wordCount}</span>
              <span className="stat-label">Words</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{keystrokeData.length}</span>
              <span className="stat-label">Keystrokes</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{pastedEvents.length}</span>
              <span className="stat-label">Paste Events</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{Math.round(keystrokeData.length / 5)}</span>
              <span className="stat-label">Est. Time (s)</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section" style={{ flex: 1 }}>
          <div className="sidebar-title">
            <ShieldAlert size={14} /> Authenticity Check
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
            Run the AI analysis to verify if the writing patterns match genuine human behavior.
          </p>
          <button 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }} 
            onClick={handleAnalyze}
            disabled={isAnalyzing || textContent.length === 0}
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>

          {analysis && (
            <div className="report-card">
              <div className="score-display">
                <div className={`score-circle ${analysis.authenticityScore > 80 ? 'high' : analysis.authenticityScore > 50 ? 'medium' : 'low'}`}>
                  {analysis.authenticityScore}
                </div>
                <div>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Confidence</div>
                  <div className="report-recommendation" style={{ margin: 0 }}>{analysis.recommendation}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Speed</div>
                  <div style={{ fontWeight: 600 }}>{analysis.typingSpeed} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>CPM</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pauses</div>
                  <div style={{ fontWeight: 600 }}>{analysis.pauseCount}</div>
                </div>
              </div>

              {analysis.suspiciousFlags.length > 0 ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warning-color)', marginBottom: '8px' }}>Flags Detected</div>
                  <ul className="flags-list">
                    {analysis.suspiciousFlags.map((flag: string, i: number) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)' }}>
                  <CheckCircle2 size={16} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>No suspicious patterns found.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Editor;
