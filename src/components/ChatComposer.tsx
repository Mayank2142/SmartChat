import { ArrowUp, FileText, Paperclip, SlidersHorizontal, X } from 'lucide-react'
import {
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import type { AttachmentPayload } from '../types/chat'
import {
  ACCEPTED_ATTACHMENT_TYPES,
  formatFileSize,
  readFileAsAttachment,
  validateFiles,
} from '../utils/attachments'
import { MAX_MESSAGE_LENGTH, normalizeMessageContent } from '../utils/message'

interface ChatComposerProps {
  inputRef: RefObject<HTMLTextAreaElement | null>
  isGenerating: boolean
  value: string
  onOpenSettings: () => void
  onValueChange: (value: string) => void
  onSend: (content: string, attachments: AttachmentPayload[]) => void
}

export function ChatComposer({
  inputRef,
  isGenerating,
  value,
  onOpenSettings,
  onValueChange,
  onSend,
}: ChatComposerProps) {
  const submissionLockRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [isReadingFiles, setIsReadingFiles] = useState(false)
  const normalizedValue = normalizeMessageContent(value)
  const canSend =
    (normalizedValue.length > 0 || attachments.length > 0) &&
    !isReadingFiles &&
    !isGenerating
  const showCount = value.length >= MAX_MESSAGE_LENGTH * 0.8

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return

    input.style.height = 'auto'
    const nextHeight = Math.min(input.scrollHeight, 160)
    input.style.height = `${Math.max(nextHeight, 52)}px`
    input.style.overflowY = input.scrollHeight > 160 ? 'auto' : 'hidden'
  }, [inputRef, value])

  const submit = () => {
    if (!canSend || submissionLockRef.current) return

    submissionLockRef.current = true
    onSend(normalizedValue || 'Please analyze the attached file.', attachments)
    onValueChange('')
    setAttachments([])
    setAttachmentError('')
    if (fileInputRef.current) fileInputRef.current.value = ''

    queueMicrotask(() => {
      submissionLockRef.current = false
      inputRef.current?.focus()
    })
  }

  const addFiles = async (files: File[]) => {
    if (files.length === 0) return
    const validationError = validateFiles(files, attachments)
    if (validationError) {
      setAttachmentError(validationError)
      return
    }

    setIsReadingFiles(true)
    setAttachmentError('')
    try {
      const preparedFiles = await Promise.all(files.map(readFileAsAttachment))
      setAttachments((current) => [...current, ...preparedFiles])
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : 'Could not prepare that attachment.',
      )
    } finally {
      setIsReadingFiles(false)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void addFiles(Array.from(event.target.files ?? []))
  }

  const handleDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault()
    void addFiles(Array.from(event.dataTransfer.files))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer-wrap">
      <form
        className={`composer ${isGenerating ? 'composer-generating' : ''}`}
        aria-label="Send a message"
        aria-busy={isGenerating}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onSubmit={handleSubmit}
      >
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          multiple
          accept={ACCEPTED_ATTACHMENT_TYPES}
          aria-label="Choose files to attach"
          onChange={handleFileChange}
        />
        {attachments.length > 0 && (
          <ul className="attachment-list" aria-label="Attached files">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="attachment-chip">
                <FileText size={14} aria-hidden="true" />
                <span className="attachment-name">{attachment.name}</span>
                <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() =>
                    setAttachments((current) =>
                      current.filter((candidate) => candidate.id !== attachment.id),
                    )
                  }
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label htmlFor="chat-message" className="sr-only">
          Message Darwix AI
        </label>
        <textarea
          ref={inputRef}
          id="chat-message"
          name="message"
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          className="composer-input"
          placeholder="Ask Darwix AI anything..."
          value={value}
          aria-describedby="composer-state composer-count attachment-error"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-end justify-between gap-3 px-2 pb-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="composer-tool"
              aria-label="Attach files"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="composer-tool"
              aria-label="Open response settings"
              onClick={onOpenSettings}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span
              id="composer-count"
              className={showCount ? 'character-count' : 'sr-only'}
              aria-live={showCount ? 'polite' : 'off'}
            >
              {value.length} / {MAX_MESSAGE_LENGTH}
            </span>
            <button
              type="submit"
              className="send-button"
              aria-label="Send message"
              aria-describedby="composer-state"
              disabled={!canSend}
              title={
                isGenerating
                  ? 'Wait for Darwix AI to finish responding'
                  : 'Send message'
              }
            >
              <ArrowUp size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
      <p
        id="attachment-error"
        className="composer-error"
        role={attachmentError ? 'alert' : undefined}
      >
        {attachmentError}
      </p>
      <p
        id="composer-state"
        className={`composer-help ${isGenerating ? 'composer-help-active' : ''}`}
        role={isGenerating ? 'status' : undefined}
        aria-live={isGenerating ? 'polite' : undefined}
      >
        {isGenerating
          ? 'Darwix AI is responding · Send unlocks when the answer is ready'
          : 'Press Enter to send · Shift + Enter for a new line · Drop files to attach'}
      </p>
    </div>
  )
}
