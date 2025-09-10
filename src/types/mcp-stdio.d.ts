declare module '@modelcontextprotocol/sdk/dist/cjs/server/stdio.js' {
    export class StdioServerTransport {
        constructor(...args: any[]);
        start(): Promise<void>;
        close(): Promise<void>;
    }
}
