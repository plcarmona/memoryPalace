import { IImageGenerator, ImageData } from '../../domain/interfaces/IImageGenerator'

const DEFAULT_TIMEOUT = 120_000

type Provider = 'comfyui' | 'a1111' | 'unknown'

async function detectProvider(): Promise<Provider> {
  try {
    const res = await fetch('http://localhost:8188/system_stats', { signal: AbortSignal.timeout(2000) })
    if (res.ok) return 'comfyui'
  } catch { /* not comfyui */ }

  try {
    const res = await fetch('http://localhost:7860/sdapi/v1/options', { signal: AbortSignal.timeout(2000) })
    if (res.ok) return 'a1111'
  } catch { /* not a1111 */ }

  return 'unknown'
}

async function generateComfyUI(prompt: string, timeout: number): Promise<ImageData> {
  const workflow = {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: Math.floor(Math.random() * 2147483647),
        steps: 20,
        cfg: 7,
        sampler_name: 'euler_ancestral',
        scheduler: 'normal',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: 1024, height: 1024, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: 'blurry, low quality, watermark', clip: ['4', 1] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'memory_palace', images: ['8', 0] } },
  }

  const queueRes = await fetch('http://localhost:8188/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
    signal: AbortSignal.timeout(timeout),
  })

  if (!queueRes.ok) throw new Error(`ComfyUI queue failed: ${queueRes.statusText}`)
  const { prompt_id } = await queueRes.json()

  // Poll for completion
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const historyRes = await fetch(`http://localhost:8188/history/${prompt_id}`)
    if (historyRes.ok) {
      const history = await historyRes.json()
      const entry = history[prompt_id]
      if (entry?.outputs?.['9']?.images?.[0]) {
        const img = entry.outputs['9'].images[0]
        const imgRes = await fetch(`http://localhost:8188/view?filename=${img.filename}&subfolder=${img.subfolder ?? ''}&type=${img.type ?? 'output'}`)
        if (!imgRes.ok) throw new Error('Failed to fetch generated image from ComfyUI')
        const blob = await imgRes.blob()
        return {
          url: URL.createObjectURL(blob),
          blob,
          width: 1024,
          height: 1024,
        }
      }
    }
    await new Promise(r => setTimeout(r, 1000))
  }

  throw new Error('ComfyUI generation timed out')
}

async function generateA1111(prompt: string, timeout: number): Promise<ImageData> {
  const res = await fetch('http://localhost:7860/sdapi/v1/txt2img', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      negative_prompt: 'blurry, low quality, watermark',
      steps: 20,
      width: 1024,
      height: 1024,
      cfg_scale: 7,
      sampler_name: 'Euler a',
    }),
    signal: AbortSignal.timeout(timeout),
  })

  if (!res.ok) throw new Error(`A1111 generation failed: ${res.statusText}`)
  const data = await res.json()

  if (!data.images?.[0]) throw new Error('A1111 returned no images')

  const binary = atob(data.images[0])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'image/png' })

  return {
    url: URL.createObjectURL(blob),
    blob,
    width: 1024,
    height: 1024,
  }
}

export class SDXLGenerator implements IImageGenerator {
  private provider: Provider | null = null
  private timeout: number

  constructor(timeout = DEFAULT_TIMEOUT) {
    this.timeout = timeout
  }

  async generate(prompt: string): Promise<ImageData> {
    if (!this.provider) {
      this.provider = await detectProvider()
    }

    switch (this.provider) {
      case 'comfyui':
        return generateComfyUI(prompt, this.timeout)
      case 'a1111':
        return generateA1111(prompt, this.timeout)
      default:
        throw new Error(
          'No Stable Diffusion API detected. Start ComfyUI (port 8188) or Automatic1111 (port 7860).'
        )
    }
  }

  resetProvider(): void {
    this.provider = null
  }
}
