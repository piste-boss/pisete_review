const CONFIG_CACHE_KEY = 'oisoya_review_config_cache'
const DEFAULT_FAVICON_PATH = '/vite.svg'
const LAST_SUBMISSION_STORAGE_KEY = 'oisoya_review_last_submission'
const FORM_KEY_BY_PROMPT = {
  page1: 'form1',
  page2: 'form2',
  page3: 'form3',
}

const readCachedConfig = () => {
  try {
    const value = window.localStorage.getItem(CONFIG_CACHE_KEY)
    if (!value) return null
    return JSON.parse(value)
  } catch {
    return null
  }
}

const writeCachedConfig = (config) => {
  try {
    window.localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config))
  } catch {
    // noop
  }
}

const inferFaviconType = (value) => {
  if (!value) return 'image/svg+xml'
  if (value.startsWith('data:image/')) {
    const match = value.match(/^data:(image\/[^;]+)/i)
    if (match) return match[1]
  }
  if (value.endsWith('.png')) return 'image/png'
  if (value.endsWith('.ico')) return 'image/x-icon'
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return 'image/jpeg'
  if (value.endsWith('.svg')) return 'image/svg+xml'
  return 'image/png'
}

const getFaviconLinks = () => {
  const links = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
  if (links.length > 0) return Array.from(links)
  const newLink = document.createElement('link')
  newLink.setAttribute('rel', 'icon')
  document.head.appendChild(newLink)
  return [newLink]
}

const setDocumentFavicon = (dataUrl) => {
  const href = dataUrl || DEFAULT_FAVICON_PATH
  const type = inferFaviconType(href)
  const links = getFaviconLinks()
  links.forEach((link) => {
    link.setAttribute('href', href)
    if (type) {
      link.setAttribute('type', type)
    }
  })
}

const app = document.querySelector('#generator-app')
if (!app) {
  throw new Error('#generator-app not found.')
}

const generateButton = app.querySelector('[data-role="generate"]')
const copyButton = app.querySelector('[data-role="copy"]')
const textarea = app.querySelector('#generated-text')
const statusEl = app.querySelector('[data-role="status"]')
const mapsLinkEl = app.querySelector('[data-role="maps-link"]')
const brandElements = {
  container: app.querySelector('[data-role="brand"]'),
  logo: app.querySelector('[data-role="brand-logo"]'),
  text: app.querySelector('[data-role="brand-text"]'),
}
const promptKey = app.dataset.promptKey || 'page1'
const tierKey = app.dataset.tier || ''

const LANG = promptKey === 'page2' ? 'en' : 'ja'

const MESSAGES = {
  ja: {
    appNotFound: '#generator-app が見つかりません。',
    initFailed: '口コミ生成画面の初期化に失敗しました。',
    generating: '口コミを生成しています…',
    buttonGenerating: '生成中…',
    buttonDefault: '口コミ生成',
    generateFailed: '口コミ生成に失敗しました。時間をおいて再度お試しください。',
    resultEmpty: '生成結果が空でした。設定を確認してください。',
    generateSuccess: '口コミを生成しました。',
    noTextToCopy: 'コピーする文章がありません。先に口コミを生成してください。',
    copySuccess: 'クリップボードにコピーしました。',
    copyFailed: 'コピーに失敗しました。手動で選択してコピーしてください。',
    reloaded: 'ページを再読み込みしました。',
  },
  en: {
    appNotFound: '#generator-app not found.',
    initFailed: 'Failed to initialize the generator.',
    generating: 'Generating review...',
    buttonGenerating: 'Generating...',
    buttonDefault: 'Generate Review',
    generateFailed: 'Failed to generate review. Please try again later.',
    resultEmpty: 'Generation result was empty. Please check settings.',
    generateSuccess: 'Review generated.',
    noTextToCopy: 'No text to copy. Please generate a review first.',
    copySuccess: 'Copied to clipboard.',
    copyFailed: 'Failed to copy. Please copy manually.',
    reloaded: 'Page reloaded.',
  },
}

const t = (key) => MESSAGES[LANG][key] || MESSAGES.ja[key]

const getFormKeyForPage = () => FORM_KEY_BY_PROMPT[promptKey] || 'form1'

const readLatestSubmissionInfo = () => {
  const expectedFormKey = getFormKeyForPage()
  const params = new URLSearchParams(window.location.search)
  const queryTimestamp = (params.get('submittedAt') || '').trim()
  const queryFormKey = (params.get('formKey') || '').trim()
  const queryResponseId = (params.get('responseId') || '').trim()
  if (queryTimestamp && (!queryFormKey || queryFormKey === expectedFormKey)) {
    return { formKey: expectedFormKey, submittedAt: queryTimestamp, responseId: queryResponseId }
  }
  try {
    const storedValue = window.sessionStorage.getItem(LAST_SUBMISSION_STORAGE_KEY)
    if (storedValue) {
      const parsed = JSON.parse(storedValue)
      if (parsed?.formKey === expectedFormKey && parsed?.submittedAt) {
        return {
          formKey: parsed.formKey,
          submittedAt: parsed.submittedAt,
          responseId: parsed.responseId || '',
        }
      }
    }
  } catch {
    // noop
  }
  return { formKey: expectedFormKey, submittedAt: '', responseId: '' }
}

if (!generateButton || !copyButton || !textarea || !statusEl || !mapsLinkEl) {
  throw new Error(t('initFailed'))
}

const setStatus = (message, type = 'info') => {
  if (!message) {
    statusEl.setAttribute('hidden', '')
    statusEl.textContent = ''
    statusEl.dataset.type = ''
    return
  }

  statusEl.removeAttribute('hidden')
  statusEl.textContent = message
  statusEl.dataset.type = type
}

const applyBrandingLogo = (branding = {}) => {
  const headerImageUrl = branding.headerImageDataUrl || ''
  if (brandElements.logo) {
    if (headerImageUrl) {
      brandElements.logo.src = headerImageUrl
      brandElements.logo.removeAttribute('hidden')
    } else {
      brandElements.logo.setAttribute('hidden', '')
      brandElements.logo.removeAttribute('src')
    }
  }
  if (brandElements.text) {
    if (headerImageUrl) {
      brandElements.text.setAttribute('hidden', '')
    } else {
      brandElements.text.removeAttribute('hidden')
    }
  }
  if (brandElements.container) {
    brandElements.container.classList.toggle('has-image', Boolean(headerImageUrl))
  }
  const logoUrl = branding.logoDataUrl || branding.faviconDataUrl || ''
  setDocumentFavicon(logoUrl)
}

const applyMapsLink = (link) => {
  if (link) {
    mapsLinkEl.href = link
    mapsLinkEl.removeAttribute('aria-disabled')
  } else {
    mapsLinkEl.href = '#'
    mapsLinkEl.setAttribute('aria-disabled', 'true')
  }
}

let currentConfig = readCachedConfig() || {}
if (currentConfig.aiSettings) {
  applyMapsLink(currentConfig.aiSettings.mapsLink)
}
applyBrandingLogo(currentConfig.branding)

const toggleLoading = (isLoading) => {
  if (isLoading) {
    generateButton.setAttribute('disabled', '')
    generateButton.textContent = t('buttonGenerating')
  } else {
    generateButton.removeAttribute('disabled')
    generateButton.textContent = t('buttonDefault')
  }
}

const handleGenerate = async () => {
  setStatus(t('generating'))
  toggleLoading(true)

  try {
    const submissionInfo = readLatestSubmissionInfo()
    const requestBody = {
      promptKey,
      tier: tierKey,
    }
    if (submissionInfo.submittedAt) {
      requestBody.submissionTimestamp = submissionInfo.submittedAt
    }
    if (submissionInfo.responseId) {
      requestBody.responseId = submissionInfo.responseId
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const message =
        payload?.message ||
        t('generateFailed')
      throw new Error(message)
    }

    const payload = await response.json()
    const text = payload?.text?.trim()
    if (!text) {
      throw new Error(t('resultEmpty'))
    }

    textarea.value = text
    const latestMapsLink = payload?.mapsLink || currentConfig?.aiSettings?.mapsLink
    applyMapsLink(latestMapsLink)

    currentConfig = {
      ...currentConfig,
      aiSettings: {
        ...(currentConfig.aiSettings || {}),
        ...(payload?.aiSettings || {}),
        mapsLink: latestMapsLink,
      },
      prompts: {
        ...(currentConfig.prompts || {}),
        ...(payload?.prompts || {}),
      },
    }

    writeCachedConfig(currentConfig)

    setStatus(t('generateSuccess'), 'success')
  } catch (error) {
    console.error(error)
    setStatus(error.message, 'error')
  } finally {
    toggleLoading(false)
  }
}

generateButton.addEventListener('click', () => {
  handleGenerate()
})

copyButton.addEventListener('click', async () => {
  const text = textarea.value.trim()
  if (!text) {
    setStatus(t('noTextToCopy'), 'warn')
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    setStatus(t('copySuccess'), 'success')
  } catch (error) {
    console.error(error)
    setStatus(t('copyFailed'), 'error')
  }
})

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    const latest = readCachedConfig()
    if (latest) {
      currentConfig = latest
      if (latest.aiSettings) {
        applyMapsLink(latest.aiSettings.mapsLink)
      }
      applyBrandingLogo(latest.branding)
    }
    setStatus(t('reloaded'), 'info')
  }
})
