import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { validateJSON, formatJSON } from '../utils/jsonUtils';
import { isSensitiveField } from '../constants/bankConfig';
import { Copy, Check, AlertTriangle, Sparkles, Code2 } from 'lucide-react';
import { toast } from '../utils/toast';
import { useTheme } from '../contexts/ThemeContext';

/**
 * JSON Editor Component
 * Component สำหรับแก้ไข JSON configuration
 * 
 * Features:
 * - Syntax highlighting
 * - Real-time validation
 * - Format/Beautify
 * - Error messages
 * - Support nested objects และ arrays
 */
const JsonEditor = ({ 
  value = {}, 
  onChange, 
  readOnly = false,
  height = '500px',
  className = '',
}) => {
  const [jsonString, setJsonString] = useState('');
  const [error, setError] = useState(null);
  const [isFormatted, setIsFormatted] = useState(true);
  const editorRef = useRef(null);
  const { isDark } = useTheme();

  // Initialize JSON string from value prop
  useEffect(() => {
    try {
      const formatted = formatJSON(value);
      setJsonString(formatted);
      setError(null);
      setIsFormatted(true);
    } catch (err) {
      setJsonString(JSON.stringify(value, null, 2));
    }
  }, [value]);

  // Handle editor change
  const handleEditorChange = (newValue) => {
    setJsonString(newValue || '');
    
    // Validate JSON
    const validation = validateJSON(newValue || '{}');
    if (validation.valid) {
      setError(null);
      try {
        const parsed = JSON.parse(newValue || '{}');
        if (onChange) {
          onChange(parsed);
        }
        setIsFormatted(true);
      } catch (err) {
        setError(err.message);
      }
    } else {
      setError(validation.error);
      setIsFormatted(false);
    }
  };

  // Format/Beautify JSON
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonString || '{}');
      const formatted = formatJSON(parsed);
      setJsonString(formatted);
      setError(null);
      setIsFormatted(true);
      
      // Trigger onChange with formatted value
      if (onChange) {
        onChange(parsed);
      }
    } catch (err) {
      setError(`Format error: ${err.message}`);
    }
  };

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Define custom dark theme
    monaco.editor.defineTheme('elegance-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'e2e8f0', background: '0f172a' },
        { token: 'string', foreground: '34d399' }, // green-400
        { token: 'number', foreground: '60a5fa' }, // blue-400
        { token: 'keyword', foreground: 'f472b6' }, // pink-400
        { token: 'operator', foreground: '94a3b8' }, // slate-400
        { token: 'delimiter', foreground: '94a3b8' },
        { token: 'property', foreground: 'a78bfa' }, // purple-400
      ],
      colors: {
        'editor.background': '#0f172a', // slate-950
        'editor.foreground': '#e2e8f0', // slate-200
        'editor.lineHighlightBackground': '#1e293b', // slate-800
        'editor.selectionBackground': '#334155', // slate-700
        'editor.inactiveSelectionBackground': '#1e293b',
        'editorCursor.foreground': '#ef4444', // red-500
        'editorWhitespace.foreground': '#334155',
        'editorIndentGuide.activeBackground': '#475569',
        'editorIndentGuide.background': '#1e293b',
        'editor.lineHighlightBorder': '#1e293b',
        'editorLineNumber.foreground': '#64748b', // slate-500
        'editorLineNumber.activeForeground': '#94a3b8', // slate-400
        'editorGutter.background': '#0f172a',
        'editor.selectionHighlightBackground': '#33415580',
        'editor.wordHighlightBackground': '#33415540',
        'editor.wordHighlightStrongBackground': '#47556940',
        'editorBracketMatch.background': '#1e293b',
        'editorBracketMatch.border': '#475569',
      },
    });

    // Define custom light theme
    monaco.editor.defineTheme('elegance-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '', foreground: '1e293b', background: 'ffffff' },
        { token: 'string', foreground: '059669' }, // green-600
        { token: 'number', foreground: '2563eb' }, // blue-600
        { token: 'keyword', foreground: 'db2777' }, // pink-600
        { token: 'operator', foreground: '64748b' }, // slate-500
        { token: 'delimiter', foreground: '64748b' },
        { token: 'property', foreground: '9333ea' }, // purple-600
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1e293b', // slate-800
        'editor.lineHighlightBackground': '#f1f5f9', // slate-100
        'editor.selectionBackground': '#e2e8f0', // slate-200
        'editor.inactiveSelectionBackground': '#f1f5f9',
        'editorCursor.foreground': '#ef4444', // red-500
        'editorWhitespace.foreground': '#cbd5e1',
        'editorIndentGuide.activeBackground': '#94a3b8',
        'editorIndentGuide.background': '#e2e8f0',
        'editor.lineHighlightBorder': '#f1f5f9',
        'editorLineNumber.foreground': '#94a3b8', // slate-400
        'editorLineNumber.activeForeground': '#64748b', // slate-500
        'editorGutter.background': '#ffffff',
        'editor.selectionHighlightBackground': '#e2e8f080',
        'editor.wordHighlightBackground': '#f1f5f940',
        'editor.wordHighlightStrongBackground': '#e2e8f040',
        'editorBracketMatch.background': '#f1f5f9',
        'editorBracketMatch.border': '#cbd5e1',
      },
    });

    // Apply theme based on current mode
    const theme = isDark ? 'elegance-dark' : 'elegance-light';
    monaco.editor.setTheme(theme);
    
    // Add format on save shortcut (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleFormat();
    });
  };

  // Update theme when mode changes
  useEffect(() => {
    if (editorRef.current) {
      const theme = isDark ? 'elegance-dark' : 'elegance-light';
      // Monaco theme is set via options prop
    }
  }, [isDark]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className={`json-editor ${className} pt-4 pb-4`}>
      {/* Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-700 rounded-t-lg px-4 py-3 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-3">
          <Code2 className="w-4 h-4 text-slate-600 dark:text-slate-400 transition-colors" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider transition-colors">JSON Editor</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400">
              <AlertTriangle className="w-3 h-3" />
              <span>Invalid JSON</span>
            </div>
          )}
          {!error && !isFormatted && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              <span>Not formatted</span>
            </div>
          )}
          {!error && isFormatted && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-400">
              <Check className="w-3 h-3" />
              <span>Valid JSON</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-300 dark:border-slate-700 transition-colors">
            {!readOnly && (
              <button
                type="button"
                onClick={handleFormat}
                disabled={error !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                title="Format JSON (Ctrl+S / Cmd+S)"
              >
                <Sparkles className="w-3 h-3" />
                Format
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-xs font-medium transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="border border-slate-300 dark:border-slate-700 rounded-b-lg overflow-hidden pt-2 pb-2 transition-colors">
        <Editor
          height={height}
          defaultLanguage="json"
          value={jsonString}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme={isDark ? 'elegance-dark' : 'elegance-light'}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
            wordWrap: 'on',
            theme: isDark ? 'elegance-dark' : 'elegance-light',
            lineHeight: 22,
            fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
            fontWeight: '400',
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-red-400 mb-1">JSON Syntax Error</div>
              <div className="text-xs text-red-300 font-mono">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      {!readOnly && !error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-500 transition-colors">
          <div className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full transition-colors"></div>
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-400 transition-colors">Ctrl+S</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-400 transition-colors">Cmd+S</kbd> to format JSON</span>
        </div>
      )}
    </div>
  );
};

export default JsonEditor;







