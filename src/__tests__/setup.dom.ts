import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

// Mock URL.createObjectURL for tests
globalThis.URL.createObjectURL = (blob: Blob) => `mock://blob/${blob.size}`
globalThis.URL.revokeObjectURL = () => {}
