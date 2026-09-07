export function getOllamaModel(): string {
  const model = process.env.OLLAMA_MODEL?.trim();
  return model && model.length > 0 ? model : 'llama3.2:latest';
}

export function getSearxngUrl(): string {
  return process.env.SEARXNG_URL?.trim() || 'http://localhost:8080';
}

export function getMaxPipelineIterations(): number {
  const parsed = Number(process.env.MAX_PIPELINE_ITERATIONS ?? 3);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}
