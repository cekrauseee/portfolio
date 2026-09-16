import Markdown from 'react-markdown'

export function RoleFitAnswer({ children }: { children: string }) {
  return (
    <div className="space-y-4">
      <Markdown allowedElements={['p', 'strong']} skipHtml unwrapDisallowed>
        {children}
      </Markdown>
    </div>
  )
}
