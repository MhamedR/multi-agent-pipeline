export interface Tool {
    name: string;
    description: string;
    execute: () => Promise<string> | string;
  }