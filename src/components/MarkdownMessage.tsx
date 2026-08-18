import { Fragment, type ReactNode } from 'react'

interface MarkdownMessageProps {
  content: string
}

function renderInline(text: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g
  return text.split(tokenPattern).filter(Boolean).map((token, index) => {
    const key = `${index}-${token.slice(0, 12)}`
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={key}>{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={key}>{token.slice(1, -1)}</code>
    }
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
    if (link) {
      return (
        <a key={key} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      )
    }
    return <Fragment key={key}>{token}</Fragment>
  })
}

function startsNewBlock(line: string) {
  return (
    /^```/.test(line) ||
    /^#{1,3}\s+/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line)
  )
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      index += index < lines.length ? 1 : 0
      blocks.push(
        <pre key={`code-${index}`} data-language={language || undefined}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      const headingContent = renderInline(heading[2])
      const key = `heading-${index}`
      blocks.push(
        heading[1].length === 1 ? (
          <h2 key={key}>{headingContent}</h2>
        ) : heading[1].length === 2 ? (
          <h3 key={key}>{headingContent}</h3>
        ) : (
          <h4 key={key}>{headingContent}</h4>
        ),
      )
      index += 1
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ''))
        index += 1
      }
      blocks.push(
        <ul key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${itemIndex}-${item.slice(0, 12)}`}>{renderInline(item)}</li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ''))
        index += 1
      }
      blocks.push(
        <ol key={`ordered-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${itemIndex}-${item.slice(0, 12)}`}>{renderInline(item)}</li>
          ))}
        </ol>,
      )
      continue
    }

    const paragraphLines = [line]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !startsNewBlock(lines[index])
    ) {
      paragraphLines.push(lines[index])
      index += 1
    }
    blocks.push(
      <p key={`paragraph-${index}`}>
        {paragraphLines.map((paragraphLine, lineIndex) => (
          <Fragment key={`${lineIndex}-${paragraphLine.slice(0, 12)}`}>
            {lineIndex > 0 && <br />}
            {renderInline(paragraphLine)}
          </Fragment>
        ))}
      </p>,
    )
  }

  return <div className="markdown-message">{blocks}</div>
}
