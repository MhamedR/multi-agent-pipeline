export interface ToolParameter {
  type?: string | string[];
  items?: unknown;
  description?: string;
  enum?: unknown[];
}

export interface Tool {
  name: string;
  description: string;

  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };

  execute: (args: Record<string, unknown>) => Promise<string> | string;
}
