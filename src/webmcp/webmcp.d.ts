declare global {
  interface WebMcpToolAnnotations {
    readOnlyHint?: boolean
    untrustedContentHint?: boolean
    /** Incubator-main hint: invoking the tool changes application state. */
    consequentialHint?: boolean
  }

  interface WebMcpToolExecutionOptions {
    signal: AbortSignal
  }

  interface WebMcpToolDefinition {
    name: string
    title?: string
    description: string
    inputSchema?: Record<string, unknown>
    annotations?: WebMcpToolAnnotations
    execute: (input: Record<string, unknown>, options: WebMcpToolExecutionOptions) => unknown | Promise<unknown>
  }

  interface WebMcpRegisteredTool {
    name: string
    title?: string
    description: string
    inputSchema?: Record<string, unknown>
    annotations?: WebMcpToolAnnotations
    origin: string
    window: Window
  }

  interface WebMcpModelContext extends EventTarget {
    registerTool(
      tool: WebMcpToolDefinition,
      options?: { signal?: AbortSignal; exposedTo?: string[] },
    ): Promise<void>
    getTools(options?: { fromOrigins?: string[] }): Promise<WebMcpRegisteredTool[]>
    executeTool(
      tool: WebMcpRegisteredTool,
      input?: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ): Promise<unknown>
  }

  interface ForkRoomDevTools {
    version: string
    listTools: () => Array<{
      name: string
      title: string
      description: string
      mode: 'read' | 'proposal' | 'navigation'
      readOnly: boolean
      consequential: boolean
      inputSchema: Record<string, unknown>
    }>
    execute: (name: string, input?: Record<string, unknown>) => Promise<unknown>
  }

  interface Document {
    readonly modelContext?: WebMcpModelContext
  }

  interface Navigator {
    /** Deprecated pre-Chromium-150 location retained for challenge-browser compatibility. */
    readonly modelContext?: WebMcpModelContext
  }

  interface Window {
    __FORKROOM_DEVTOOLS__?: ForkRoomDevTools
  }
}

export {}
