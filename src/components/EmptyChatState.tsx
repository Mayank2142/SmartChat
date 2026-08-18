import { ArrowUpRight, Bot, Lightbulb, PenLine, Sparkles } from 'lucide-react'

const suggestions = [
  {
    icon: PenLine,
    title: 'Create something',
    prompt: 'Help me draft a thoughtful project brief',
    accent: 'violet',
  },
  {
    icon: Lightbulb,
    title: 'Explore an idea',
    prompt: 'Brainstorm a better user experience',
    accent: 'cyan',
  },
]

interface EmptyChatStateProps {
  onSelectSuggestion: (prompt: string) => void
}

export function EmptyChatState({ onSelectSuggestion }: EmptyChatStateProps) {
  return (
    <section className="empty-state" aria-labelledby="welcome-heading">
      <div className="empty-state-orbit" aria-hidden="true">
        <div className="empty-state-mark">
          <Bot size={30} strokeWidth={1.65} />
        </div>
      </div>

      <div className="mt-7 max-w-xl text-center">
        <p className="eyebrow justify-center">
          <Sparkles size={13} aria-hidden="true" />
          Ready when you are
        </p>
        <h2
          id="welcome-heading"
          className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl"
        >
          What can we build together?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-6 text-slate-400 sm:text-base">
          Ask a question, develop an idea, or turn a rough thought into something useful.
        </p>
      </div>

      <div className="mt-8 grid w-full max-w-xl gap-3 sm:grid-cols-2">
        {suggestions.map(({ icon: Icon, title, prompt, accent }) => (
          <button
            key={title}
            type="button"
            className="suggestion-card group"
            onClick={() => onSelectSuggestion(prompt)}
          >
            <div className={`suggestion-icon suggestion-icon-${accent}`} aria-hidden="true">
              <Icon size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-200">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{prompt}</span>
            </div>
            <ArrowUpRight
              size={15}
              className="mt-0.5 shrink-0 text-slate-600"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </section>
  )
}
