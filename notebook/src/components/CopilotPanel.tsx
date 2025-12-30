import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore, FileEntry } from '../store/store';
import { Send, Bot, User, Loader2, Settings, Trash2, FileText, FolderTree } from 'lucide-react';
import { createTwoFilesPatch } from 'diff';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  pendingEditId?: string;
  researchResults?: { url: string; snippet: string }[];
}

// Tool definitions for function calling
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file in the vault',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The path to the file to read' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write or update content in a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The path to the file to write' },
          content: { type: 'string', description: 'The content to write to the file' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_vault',
      description: 'Search for files or content in the vault',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' }
        },
        required: ['query']
      }
    }
  }
  ,
  {
    type: 'function',
    function: {
      name: 'read_folder',
      description: 'List the contents of a folder in the vault',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The path to the folder to list' }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_folder',
      description: 'Create a new folder in the vault',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The path to create the folder at' }
        },
        required: ['path']
      }
    }
  }
  ,
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetch a URL and return text content (truncated)',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to fetch' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Propose an edit to a file; returns a diff and requires user confirmation to apply',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The path to the file to edit' },
          content: { type: 'string', description: 'The full new content for the file' }
        },
        required: ['path', 'content']
      }
    }
  }
  ,
  {
    type: 'function',
    function: {
      name: 'research',
      description: 'Perform a web research query (uses Google search) and return the top 5 results and their extracted text contents',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  }
];

// Helper to flatten file structure for display
const flattenFileTree = (entries: FileEntry[], prefix = ''): string[] => {
  const result: string[] = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.type === 'folder') {
      result.push(`📁 ${path}/`);
      if (entry.children) {
        result.push(...flattenFileTree(entry.children, path));
      }
    } else {
      result.push(`📄 ${path}`);
    }
  }
  return result;
};

export const CopilotPanel: React.FC = () => {
  const { aiProviders, selectedAIProvider, activeFile, fileContents, fileStructure, setFileContent, markUnsavedChanges, viewedHistory, toolExecutionMode } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingEdits, setPendingEdits] = useState<Record<string, { path: string; newContent: string; diff: string }>>({});
  const [expandedResearch, setExpandedResearch] = useState<Record<string, Set<number>>>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [sessionAllowedTools, setSessionAllowedTools] = useState<string[]>([]);
  const [sessionAllowAll, setSessionAllowAll] = useState(false);
  const [toolPrompt, setToolPrompt] = useState<{ visible: boolean; name?: string; resolve?: (choice: 'once'|'tool'|'all'|'deny') => void }>({ visible: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedProvider = aiProviders.find(p => p.id === selectedAIProvider);

  // Build context about what the user is viewing
  // Determine the most recently viewed file (excluding assistant tab)
  const mostRecentViewed = viewedHistory && viewedHistory.length > 0 ? viewedHistory[viewedHistory.length - 1] : null;
  const currentObservedFile = mostRecentViewed || activeFile;
  const currentFileContent = currentObservedFile ? fileContents[currentObservedFile] : null;
  const fileList = useMemo(() => flattenFileTree(fileStructure), [fileStructure]);
  
  const systemPrompt = useMemo(() => {
    let prompt = `You are a helpful AI assistant integrated into a note-taking application called Notebook (similar to Obsidian). You help users with their notes, writing, and organization.

You have access to the user's vault and can read/write files using the available tools.

`;

    if (currentObservedFile && currentFileContent !== null) {
      prompt += `## Currently Active File
Path: ${currentObservedFile}
Content:
\`\`\`
${currentFileContent}
\`\`\`

`;
    }

    prompt += `## Vault Structure
${fileList.slice(0, 100).join('\n')}${fileList.length > 100 ? '\n... and more files' : ''}

## Available Actions
- Read files from the vault
- Write/update files in the vault
- Search for content across the vault
- Help with writing, editing, and organizing notes
- Answer questions about the content

When helping with notes, be concise and helpful. If the user asks about their current file, you can see its content above.`;

    // Mention folder actions
    prompt = prompt.replace('## Available Actions', '## Available Actions\n- Read folders and list directory contents\n- Create new folders in the vault\n\n## Available Actions');

    return prompt;
  }, [currentObservedFile, currentFileContent, fileList]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Tool execution handlers
  const executeToolCall = async (name: string, args: Record<string, string>): Promise<string> => {
    // Permission check
    const checkPermission = async (): Promise<boolean> => {
      if (toolExecutionMode === 'allow_all') return true;
      if (sessionAllowAll) return true;
      if (sessionAllowedTools.includes(name)) return true;

      // show prompt and await choice
      const choice = await new Promise<'once'|'tool'|'all'|'deny'>((resolve) => {
        setToolPrompt({ visible: true, name, resolve });
      });

      if (choice === 'deny') return false;
      if (choice === 'all') {
        setSessionAllowAll(true);
        return true;
      }
      if (choice === 'tool') {
        setSessionAllowedTools(prev => [...prev, name]);
        return true;
      }
      // once
      return choice === 'once';
    };

    const permitted = await checkPermission();
    if (!permitted) {
      const denyMsg = `[Tool blocked by user: ${name}]`;
      setMessages(prev => [...prev, { id: `blocked-${Date.now()}`, role: 'assistant', content: denyMsg, timestamp: new Date() }]);
      return denyMsg;
    }
    switch (name) {
      case 'read_file': {
        const content = fileContents[args.path];
        if (content !== undefined) {
          return `File content of ${args.path}:\n\`\`\`\n${content}\n\`\`\``;
        }
        // Try to read from disk
        try {
          const content = await window.electronAPI.readFile(args.path);
          return `File content of ${args.path}:\n\`\`\`\n${content}\n\`\`\``;
        } catch {
          return `Error: File not found: ${args.path}`;
        }
      }
      case 'write_file': {
        try {
          setFileContent(args.path, args.content);
          markUnsavedChanges(args.path);
          return `Successfully updated ${args.path}. The file has been marked as modified and will be saved.`;
        } catch (error) {
          return `Error writing file: ${error}`;
        }
      }
      case 'search_vault': {
        const query = args.query.toLowerCase();
        const results: string[] = [];
        for (const [path, content] of Object.entries(fileContents)) {
          if (path.toLowerCase().includes(query) || content.toLowerCase().includes(query)) {
            const preview = content.substring(0, 200).replace(/\n/g, ' ');
            results.push(`- ${path}: ${preview}...`);
          }
        }
        return results.length > 0 
          ? `Found ${results.length} matches:\n${results.slice(0, 10).join('\n')}`
          : `No files found matching "${args.query}"`;
      }
      case 'read_folder': {
        try {
          const entries = await window.electronAPI.readDir(args.path);
          const lines = entries.map((e: any) => e.isDirectory ? `📁 ${e.name}/` : `📄 ${e.name}`);
          return `Contents of ${args.path}:\n${lines.join('\n')}`;
        } catch (err) {
          return `Error reading folder ${args.path}: ${(err as Error).message || err}`;
        }
      }
      case 'create_folder': {
        try {
          await window.electronAPI.mkdir(args.path);
          return `Created folder: ${args.path}`;
        } catch (err) {
          return `Error creating folder ${args.path}: ${(err as Error).message || err}`;
        }
      }
      case 'read_folder': {
        try {
          const entries = await window.electronAPI.readDir(args.path);
          const lines = entries.map((e: any) => e.isDirectory ? `📁 ${e.name}/` : `📄 ${e.name}`);
          // Log tool usage in chat
          setMessages(prev => [...prev, { id: `tool-${Date.now()}`, role: 'assistant', content: `[Tool used: read_folder ${args.path}]`, timestamp: new Date() }]);
          return `Contents of ${args.path}:\n${lines.join('\n')}`;
        } catch (err) {
          return `Error reading folder ${args.path}: ${(err as Error).message || err}`;
        }
      }
      case 'create_folder': {
        try {
          await window.electronAPI.mkdir(args.path);
          setMessages(prev => [...prev, { id: `tool-${Date.now()}`, role: 'assistant', content: `[Tool used: create_folder ${args.path}]`, timestamp: new Date() }]);
          return `Created folder: ${args.path}`;
        } catch (err) {
          return `Error creating folder ${args.path}: ${(err as Error).message || err}`;
        }
      }
      case 'fetch_url': {
        try {
          const res = await fetch(args.url);
          const text = await res.text();
          const truncated = text.length > 8000 ? text.slice(0, 8000) + '\n\n[truncated]' : text;
          setMessages(prev => [...prev, { id: `tool-${Date.now()}`, role: 'assistant', content: `[Tool used: fetch_url ${args.url}]`, timestamp: new Date() }]);
          return `Fetched ${args.url}:\n\n${truncated}`;
        } catch (err) {
          return `Error fetching ${args.url}: ${(err as Error).message || err}`;
        }
      }
      case 'edit_file': {
        // Create a proposed edit (do NOT apply automatically)
        try {
          const path = args.path;
          const newContent = args.content;
          let oldContent = fileContents[path];
          if (oldContent === undefined) {
            try { oldContent = await window.electronAPI.readTextFile(path); } catch { oldContent = ''; }
          }
          // Use unified diff via jsdiff
          const diff = createTwoFilesPatch(path, path, oldContent || '', newContent || '');
          const id = `edit-${Date.now()}`;
          setPendingEdits(prev => ({ ...prev, [id]: { path, newContent, diff } }));

          // Add a chat message with the proposed diff and include pendingEditId
          setMessages(prev => [...prev, { id: id, role: 'assistant', content: `Proposed edit for ${path}:\n\n${diff}\n\nClick Apply to perform the change or Reject to cancel.`, timestamp: new Date(), pendingEditId: id }]);

          // Log the tool usage
          setMessages(prev => [...prev, { id: `tool-${Date.now()}`, role: 'assistant', content: `[Tool used: edit_file ${path} (pending id: ${id})]`, timestamp: new Date() }]);

          return `Proposed edit created for ${path} (pending id: ${id})`;
        } catch (err) {
          return `Error creating edit: ${(err as Error).message || err}`;
        }
      }
      case 'research': {
        try {
          const query = args.query;
          // Use jina.ai text proxy to fetch Google search results HTML (proxy avoids CORS)
          const searchUrl = `https://r.jina.ai/http://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
          const searchRes = await fetch(searchUrl);
          if (!searchRes.ok) throw new Error('Search fetch failed');
          const html = await searchRes.text();

          // Extract result URLs from Google search HTML (/url?q=...)
          const urlRegex = /\/url\?q=(https?:\/\/[^&\"]+)/g;
          const urls: string[] = [];
          let m: RegExpExecArray | null;
          while ((m = urlRegex.exec(html)) && urls.length < 10) {
            const u = decodeURIComponent(m[1]);
            if (!urls.includes(u)) urls.push(u);
          }

          const top = urls.slice(0, 5);
          const structured: { url: string; snippet: string }[] = [];

          for (const u of top) {
            try {
              const proxied = `https://r.jina.ai/http://${u.replace(/^https?:\/\//, '')}`;
              const r = await fetch(proxied);
              if (!r.ok) {
                structured.push({ url: u, snippet: '[failed to fetch content]' });
                continue;
              }
              const text = await r.text();
              const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 3000);
              structured.push({ url: u, snippet });
            } catch (e) {
              structured.push({ url: u, snippet: '[error fetching content]' });
            }
          }

          const out = `Research results for "${query}":\n\n${structured.map(r => `- ${r.url}\n  ${r.snippet}`).join('\n---\n')}`;

          // Add a structured assistant message containing the research results (dropdowns will render from this)
          setMessages(prev => [...prev, {
            id: `research-${Date.now()}`,
            role: 'assistant',
            content: `Research results for "${query}":`,
            timestamp: new Date(),
            researchResults: structured
          }] as Message[]);

          setMessages(prev => [...prev, { id: `tool-${Date.now()}`, role: 'assistant', content: `[Tool used: research query=${query}]`, timestamp: new Date() }]);
          return out;
        } catch (err) {
          return `Research failed: ${(err as Error).message || err}`;
        }
      }
      default:
        return `Unknown tool: ${name}`;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    if (!selectedProvider) {
      alert('Please configure an AI provider in Settings first.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await callLLMAPI(selectedProvider, [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content }
      ]);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const callLLMAPI = async (
    provider: { name: string; apiKey: string; baseUrl?: string; model?: string },
    chatMessages: { role: string; content: string }[]
  ): Promise<string> => {
    const baseUrl = provider.baseUrl || 'https://api.openai.com/v1';
    const model = provider.model || 'gpt-4o';

    // Handle Anthropic API differently (with tools)
    if (provider.name === 'Anthropic' || baseUrl.includes('anthropic')) {
      const anthropicTools = TOOLS.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));

      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 4096,
          system: systemPrompt,
          tools: anthropicTools,
          messages: chatMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API error');
      }

      const data = await response.json();
      
      // Handle tool use
      if (data.stop_reason === 'tool_use') {
        const toolUseBlock = data.content.find((block: any) => block.type === 'tool_use');
        if (toolUseBlock) {
          const toolResult = await executeToolCall(toolUseBlock.name, toolUseBlock.input);
          // Continue conversation with tool result
          return await callLLMAPI(provider, [
            ...chatMessages,
            { role: 'assistant', content: `[Using tool: ${toolUseBlock.name}]` },
            { role: 'user', content: `Tool result: ${toolResult}` }
          ]);
        }
      }
      
      const textBlock = data.content.find((block: any) => block.type === 'text');
      return textBlock?.text || 'No response';
    }

    // OpenAI-compatible API (OpenAI, OpenRouter, Ollama, etc.) with tools
    const messagesWithSystem = [
      { role: 'system', content: systemPrompt },
      ...chatMessages
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messagesWithSystem,
        tools: TOOLS,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API error');
    }

    const data = await response.json();
    const message = data.choices[0]?.message;
    
    // Handle tool calls
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      const toolResult = await executeToolCall(toolCall.function.name, args);
      
      // Continue conversation with tool result
      return await callLLMAPI(provider, [
        ...chatMessages,
        { role: 'assistant', content: `[Using tool: ${toolCall.function.name}]` },
        { role: 'user', content: `Tool result: ${toolResult}` }
      ]);
    }
    
    return message?.content || 'No response';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleResearch = (messageId: string, idx: number) => {
    setExpandedResearch(prev => {
      const copy: Record<string, Set<number>> = { ...prev };
      const set = new Set(copy[messageId] ? Array.from(copy[messageId]) : []);
      if (set.has(idx)) set.delete(idx); else set.add(idx);
      copy[messageId] = set;
      return copy;
    });
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!selectedProvider) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Bot size={48} className="text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          No AI Provider Configured
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Go to Settings and add an AI provider with your API key to start chatting.
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Settings size={14} />
          <span>Settings → AI Providers</span>
        </div>
      </div>
    );
  }

 
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Tool permission prompt modal */}
      {toolPrompt.visible && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 w-96">
            <h3 className="text-sm font-semibold mb-2">Tool Permission</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">The assistant wants to use the tool <strong>{toolPrompt.name}</strong>. Allow?</p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-green-500 text-white rounded" onClick={() => { toolPrompt.resolve && toolPrompt.resolve('once'); setToolPrompt({ visible: false }); }}>Allow once</button>
              <button className="px-3 py-1.5 bg-blue-500 text-white rounded" onClick={() => { toolPrompt.resolve && toolPrompt.resolve('tool'); setToolPrompt({ visible: false }); }}>Allow this tool for session</button>
              <button className="px-3 py-1.5 bg-purple-600 text-white rounded" onClick={() => { toolPrompt.resolve && toolPrompt.resolve('all'); setToolPrompt({ visible: false }); }}>Allow all tools this session</button>
              <button className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded" onClick={() => { toolPrompt.resolve && toolPrompt.resolve('deny'); setToolPrompt({ visible: false }); }}>Deny</button>
            </div>
            {/* Render research results as closed dropdown tabs */}
            {message.researchResults && message.researchResults.length > 0 && (
              <div className="w-full max-w-[80%] mt-2 space-y-2">
                {message.researchResults.map((r, i) => {
                  const isOpen = !!(expandedResearch[message.id] && expandedResearch[message.id].has(i));
                  return (
                    <div key={i} className="border border-gray-200 dark:border-gray-700 rounded">
                      <button
                        className="w-full flex items-center justify-between px-3 py-2 text-left"
                        onClick={() => toggleResearch(message.id, i)}
                      >
                        <div className="truncate text-sm text-blue-600 hover:underline">
                          <a href={r.url} target="_blank" rel="noreferrer">{r.url}</a>
                        </div>
                        <div className="ml-2 text-xs text-gray-500">{isOpen ? '▾' : '▸'}</div>
                      </button>
                      {isOpen && (
                        <div className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {r.snippet}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-blue-500" />
            <span className="text-sm font-medium">{selectedProvider.name}</span>
            <span className="text-xs text-gray-500">({selectedProvider.model})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowContext(!showContext)}
              className={`p-1.5 rounded ${showContext ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              title="Show context"
            >
              <FolderTree size={16} />
            </button>
            <button
              onClick={clearChat}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="Clear chat"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {/* Context indicator */}
        {currentObservedFile && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
            <FileText size={12} />
            <span className="truncate">Viewing: {currentObservedFile.split(/[/\\]/).pop()}</span>
          </div>
        )}
        
        {/* Context details panel */}
        {showContext && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs max-h-40 overflow-y-auto">
            <div className="font-medium mb-1 text-gray-700 dark:text-gray-300">Copilot can see:</div>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>✓ Current file content ({currentFileContent?.length || 0} chars)</li>
              <li>✓ Vault structure ({fileList.length} files)</li>
              <li>✓ Tools: read_file, write_file, search_vault</li>
            </ul>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Bot size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start a conversation with your AI assistant</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            {/* If message contains a pending edit, show Apply/Reject buttons */}
            {message.pendingEditId && (
              <div className="flex gap-2 mt-2">
                <button
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                  onClick={async () => {
                    const id = message.pendingEditId!;
                    const pending = pendingEdits[id];
                    if (!pending) return;
                    try {
                      await window.electronAPI.writeTextFile(pending.path, pending.newContent);
                      // Update store and mark saved
                      setFileContent(pending.path, pending.newContent);
                      // remove pending
                      setPendingEdits(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
                      setMessages(prev => [...prev, { id: `applied-${Date.now()}`, role: 'assistant', content: `Applied edit to ${pending.path}`, timestamp: new Date() }]);
                    } catch (err) {
                      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', content: `Failed to apply edit: ${(err as Error).message || err}`, timestamp: new Date() }]);
                    }
                  }}
                >
                  Apply
                </button>
                <button
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs"
                  onClick={() => {
                    const id = message.pendingEditId!;
                    const pending = pendingEdits[id];
                    setPendingEdits(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
                    setMessages(prev => [...prev, { id: `rejected-${Date.now()}`, role: 'assistant', content: `Rejected edit for ${pending?.path || ''}`, timestamp: new Date() }]);
                  }}
                >
                  Reject
                </button>
              </div>
            )}
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-500 flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Loader2 size={16} className="animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
