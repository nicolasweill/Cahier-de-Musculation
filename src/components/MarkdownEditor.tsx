import { useEffect, useRef } from 'react';
import { Bold, Heading1, Heading2, Italic, List, Code } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdownToHtml(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function markdownToHtml(markdown: string) {
  if (!markdown.trim()) return '';

  return markdown
    .split('\n')
    .map(line => {
      if (line.startsWith('# ')) return `<h2>${inlineMarkdownToHtml(line.slice(2))}</h2>`;
      if (line.startsWith('## ')) return `<h3>${inlineMarkdownToHtml(line.slice(3))}</h3>`;
      if (line.startsWith('### ')) return `<h4>${inlineMarkdownToHtml(line.slice(4))}</h4>`;
      if (line.startsWith('- ')) return `<p class="markdown-list-item">${inlineMarkdownToHtml(line.slice(2))}</p>`;
      return `<p>${inlineMarkdownToHtml(line) || '<br>'}</p>`;
    })
    .join('');
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (!(node instanceof HTMLElement)) return '';

  const content = Array.from(node.childNodes).map(nodeToMarkdown).join('');

  if (node.tagName === 'H2') return `# ${content}`;
  if (node.tagName === 'H3') return `## ${content}`;
  if (node.tagName === 'H4') return `### ${content}`;
  if (node.tagName === 'STRONG' || node.tagName === 'B') return `**${content}**`;
  if (node.tagName === 'EM' || node.tagName === 'I') return `*${content}*`;
  if (node.tagName === 'CODE') return `\`${content}\``;
  if (node.classList.contains('markdown-list-item')) return `- ${content}`;
  if (node.tagName === 'DIV' || node.tagName === 'P') return content;
  return content;
}

function editorHtmlToMarkdown(element: HTMLElement) {
  return Array.from(element.childNodes)
    .map(nodeToMarkdown)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastRenderedValueRef = useRef('');

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastRenderedValueRef.current) return;

    editor.innerHTML = markdownToHtml(value);
    lastRenderedValueRef.current = value;
  }, [value]);

  const syncChange = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const markdown = editorHtmlToMarkdown(editor);
    lastRenderedValueRef.current = markdown;
    onChange(markdown);
  };

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncChange();
  };

  const setBlock = (tag: 'h2' | 'h3' | 'p') => {
    runCommand('formatBlock', tag);
  };

  const setBullet = () => {
    const selection = window.getSelection();
    const text = selection?.toString() || 'Nouvel élément';
    document.execCommand('insertHTML', false, `<p class="markdown-list-item">${escapeHtml(text)}</p>`);
    syncChange();
  };

  return (
    <div className="bg-white border border-accent-light/40 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-1 p-2 border-b border-accent-light/30 bg-bg-alt/40">
        <button type="button" onClick={() => setBlock('h2')} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white" title="Titre 1">
          <Heading1 size={16} />
        </button>
        <button type="button" onClick={() => setBlock('h3')} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white" title="Titre 2">
          <Heading2 size={16} />
        </button>
        <button type="button" onClick={() => runCommand('bold')} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white" title="Gras">
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => runCommand('italic')} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white" title="Italique">
          <Italic size={16} />
        </button>
        <button type="button" onClick={setBullet} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white" title="Liste">
          <List size={16} />
        </button>
        <button type="button" onClick={() => runCommand('formatBlock', 'pre')} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white" title="Code">
          <Code size={16} />
        </button>
        <button type="button" onClick={() => setBlock('p')} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold text-secondary hover:text-primary hover:bg-white">
          Texte
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncChange}
        onBlur={syncChange}
        data-placeholder={placeholder}
        className="min-h-[150px] p-4 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent empty:before:content-[attr(data-placeholder)] empty:before:text-secondary/50 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-primary [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-primary [&_h3]:mb-2 [&_h4]:font-bold [&_h4]:text-primary [&_p]:mb-2 [&_strong]:text-primary [&_code]:bg-bg-alt [&_code]:border [&_code]:border-accent-light/30 [&_code]:rounded [&_code]:px-1 [&_.markdown-list-item]:before:content-['•_'] [&_.markdown-list-item]:pl-2"
      />
    </div>
  );
}
