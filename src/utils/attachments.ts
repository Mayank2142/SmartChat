import type { AttachmentPayload } from '../types/chat'

export const MAX_ATTACHMENT_COUNT = 3
export const MAX_ATTACHMENT_TOTAL_BYTES = 3 * 1024 * 1024

export const ACCEPTED_ATTACHMENT_TYPES = [
  'image/*',
  'audio/*',
  'video/*',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
].join(',')

function isAcceptedType(file: File) {
  return (
    file.type.startsWith('image/') ||
    file.type.startsWith('audio/') ||
    file.type.startsWith('video/') ||
    file.type === 'application/pdf' ||
    file.type.startsWith('text/') ||
    /\.(txt|md|csv)$/i.test(file.name)
  )
}

export function validateFiles(files: File[], current: AttachmentPayload[]) {
  if (files.length + current.length > MAX_ATTACHMENT_COUNT) {
    return `Attach up to ${MAX_ATTACHMENT_COUNT} files at a time.`
  }
  if (files.some((file) => !isAcceptedType(file))) {
    return 'Use an image, PDF, text, CSV, audio, or video file.'
  }
  const totalBytes = [...current, ...files].reduce(
    (total, file) => total + file.size,
    0,
  )
  if (totalBytes > MAX_ATTACHMENT_TOTAL_BYTES) {
    return 'Attachments must be 3 MB or less in total.'
  }
  return null
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function readFileAsAttachment(file: File) {
  return new Promise<AttachmentPayload>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => {
      reject(new Error(`Could not read ${file.name}.`))
    })
    reader.addEventListener('load', () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const separatorIndex = result.indexOf(',')
      if (separatorIndex === -1) {
        reject(new Error(`Could not prepare ${file.name}.`))
        return
      }
      resolve({
        id: globalThis.crypto.randomUUID(),
        name: file.name,
        mimeType: file.type || 'text/plain',
        size: file.size,
        data: result.slice(separatorIndex + 1),
      })
    })
    reader.readAsDataURL(file)
  })
}
