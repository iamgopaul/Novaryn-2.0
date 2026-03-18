-- Seed default tools for Novaryn
INSERT INTO public.tools (name, type, description, icon, config) VALUES
  ('Code Editor', 'editor', 'Monaco-powered code editor with syntax highlighting and IntelliSense', 'code', '{"theme": "vs-dark", "fontSize": 14}'),
  ('Terminal', 'terminal', 'Integrated terminal for running commands', 'terminal', '{"shell": "bash", "fontSize": 14}'),
  ('Documentation Generator', 'docs', 'Auto-generate documentation from your code', 'file-text', '{"format": "markdown", "includeExamples": true}'),
  ('Snippet Manager', 'snippets', 'Save and organize code snippets for quick access', 'scissors', '{"defaultLanguage": "typescript", "enableSearch": true}')
ON CONFLICT (name) DO NOTHING;
