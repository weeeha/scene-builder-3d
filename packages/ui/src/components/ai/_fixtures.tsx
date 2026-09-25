export type FixtureSource = { id: string; title: string; url: string }

export const sampleMarkdown = `Yes — you can call the API directly from a server component. Here's the shape of it:

- Create the client once at module scope, not per request
- Pass an \`AbortSignal\` so a cancelled request doesn't leak a connection

\`\`\`ts
const result = await client.query({ scope: ["users"], limit: 20 })
\`\`\`
`

export const sampleSources: FixtureSource[] = [
  { id: "1", title: "React — Server Components", url: "https://react.dev" },
  { id: "2", title: "MDN — AbortSignal", url: "https://developer.mozilla.org" },
]

export const sampleReasoning =
  "The client is described as being created inside the handler, so a new connection opens on every request. Hoisting it to module scope is the safe assumption until profiling says otherwise."

export const sampleSuggestions = ["Explain this error", "Write a test", "Refactor for clarity", "Add types"]

export const sampleToolInput = { scope: ["users"], limit: 20, includeArchived: false }
export const sampleToolOutput = { label: "Fetched records", detail: "20 users · 142ms" }
