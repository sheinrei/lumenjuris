export interface OpenAIOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: any;
}

type ReasoningDepth = "none" | "low" | "medium" | "high" | "xhigh"
type Verbosity = "low" | "medium" | "high"


export async function callOpenAI(messages: { role: string; content: string }[], options: OpenAIOptions = {}) {
  const res = await fetch('/api/openai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, ...options })
  });
  if (!res.ok) {
    throw new Error(`OpenAI backend error ${res.status}`);
  }
  const data = await res.json();
  return data.content as string;
}


/**
 * Call gpt5.2 le setup du model ce fait dirctement dans le backend.
 *
 * @param promptContent - le prompt prêt à être envoyé au model
 * @param reasoningDepth - Profondeur de recherche du model
 * @returns 
 */
export async function callOpenAi52(promptContent:string, reasoningDepth : ReasoningDepth, verbosity : Verbosity ){
  const r = await fetch(`/api/openai-chat-5`, { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body : JSON.stringify({prompt:promptContent, reasoning:reasoningDepth, verbosity})
  })

  if(!r.ok) {
    throw new Error(`Echec lors de l'appel openai 5.2, resStatus:${r.status}`)
  }
  const data = await r.json();
  return data.content as string
}



export async function callHuggingFace(model: string, inputs: string, parameters: any = {}) {
  const res = await fetch('/api/huggingface-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, inputs, parameters })
  });
  if (!res.ok) {
    throw new Error(`HuggingFace backend error ${res.status}`);
  }
  const data = await res.json();
  return data.generated_text as string;
}
