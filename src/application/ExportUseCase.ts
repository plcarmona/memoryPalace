import JSZip from 'jszip'
import type { PalaceNode, PalaceElement } from '../domain/models'

const MANIFEST_PATH = 'palace.json'
const ASSET_DIR = 'assets'
const ASSET_REF_PREFIX = 'asset-ref:'

export interface ExportManifest {
  version: 1
  exportedAt: number
  nodes: PalaceNode[]
  /** Map of assetRef -> original filename hint (for extension) */
  assetFilenames: Record<string, string>
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer()
}

async function hashString(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

function extensionFor(url: string, fallback = 'bin'): string {
  // Strip query/hash
  const clean = url.split(/[?#]/)[0]
  const m = clean.match(/\.([a-zA-Z0-9]+)$/)
  return m ? m[1].toLowerCase() : fallback
}

function collectAssetRefs(nodes: PalaceNode[]): string[] {
  const refs = new Set<string>()
  for (const node of nodes) {
    for (const el of node.elements) {
      if (isExternalAssetUrl(el.assetUrl)) refs.add(el.assetUrl)
    }
  }
  return [...refs]
}

function isExternalAssetUrl(url: string): boolean {
  if (!url) return false
  // builtin: shapes have no external asset
  if (url.startsWith('builtin:')) return false
  // text elements store the text itself in assetUrl — skip
  // (handled per-element in caller, but defensively skip non-url values)
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http:') || url.startsWith('https:')) {
    return true
  }
  return false
}

export class ExportUseCase {
  /**
   * Serialize the given nodes into a portable .zip Blob containing:
   *   palace.json  — manifest with all node data (asset URLs rewritten to refs)
   *   assets/*     — every referenced image/model blob
   */
  async exportPalace(nodes: PalaceNode[]): Promise<Blob> {
    const zip = new JSZip()
    const refs = collectAssetRefs(nodes)

    // Fetch each unique asset once and add to zip
    const urlToRef = new Map<string, string>()
    const assetFilenames: Record<string, string> = {}

    for (const url of refs) {
      try {
        const blob = await this.fetchBlob(url)
        const hash = await hashString(url)
        const ext = extensionFor(url, blob.type.split('/')[1] || 'bin')
        const ref = `${hash}.${ext}`
        urlToRef.set(url, ref)
        assetFilenames[ref] = `${ASSET_DIR}/${ref}`
        zip.file(`${ASSET_DIR}/${ref}`, await blobToArrayBuffer(blob))
      } catch (err) {
        // Skip missing assets but keep going
        console.warn(`[export] Failed to fetch asset ${url}:`, err)
      }
    }

    // Rewrite nodes' assetUrls to ref form
    const rewritten = nodes.map(n => ({
      ...n,
      elements: n.elements.map(el => this.rewriteElement(el, urlToRef)),
    }))

    const manifest: ExportManifest = {
      version: 1,
      exportedAt: Date.now(),
      nodes: rewritten,
      assetFilenames,
    }

    zip.file(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
    return zip.generateAsync({ type: 'blob' })
  }

  private rewriteElement(el: PalaceElement, urlToRef: Map<string, string>): PalaceElement {
    if (!isExternalAssetUrl(el.assetUrl)) return el
    const ref = urlToRef.get(el.assetUrl)
    if (!ref) return el
    return { ...el, assetUrl: `${ASSET_REF_PREFIX}${ref}` }
  }

  private async fetchBlob(url: string): Promise<Blob> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.blob()
  }

  /**
   * Parse a .zip Blob produced by exportPalace and return the original node tree
   * with asset URLs rehydrated as fresh blob: URLs valid for this session.
   */
  async importPalace(zipBlob: Blob): Promise<PalaceNode[]> {
    const zip = await JSZip.loadAsync(zipBlob)
    const manifestFile = zip.file(MANIFEST_PATH)
    if (!manifestFile) throw new Error('Invalid palace archive: missing palace.json')
    const manifestText = await manifestFile.async('string')
    const manifest = JSON.parse(manifestText) as ExportManifest
    if (manifest.version !== 1) throw new Error(`Unsupported palace archive version: ${manifest.version}`)

    // Extract each asset and create a fresh blob URL
    const refToBlobUrl = new Map<string, string>()
    for (const [ref, path] of Object.entries(manifest.assetFilenames)) {
      const file = zip.file(path)
      if (!file) {
        console.warn(`[import] Missing asset in archive: ${path}`)
        continue
      }
      const ab = await file.async('arraybuffer')
      refToBlobUrl.set(ref, URL.createObjectURL(new Blob([ab])))
    }

    // Rewrite assetUrl refs back to live blob URLs
    return manifest.nodes.map(n => ({
      ...n,
      elements: n.elements.map(el => {
        if (el.assetUrl.startsWith(ASSET_REF_PREFIX)) {
          const ref = el.assetUrl.slice(ASSET_REF_PREFIX.length)
          const blobUrl = refToBlobUrl.get(ref)
          if (blobUrl) return { ...el, assetUrl: blobUrl }
        }
        return el
      }),
    }))
  }

  /** Convenience: trigger a browser download of the blob */
  static download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Give the browser a tick before revoking
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
