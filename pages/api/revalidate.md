import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

const secret = process.env.SANITY_WEBHOOK_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const signature = req.headers[SIGNATURE_HEADER_NAME]
  const body = JSON.stringify(req.body)

  const isValid = isValidSignature(body, signature, secret)

  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Invalid signature' })
  }

  try {
    const slug = req.body?.slug?.current

    if (slug) {
      await res.revalidate(`/post/${slug}`)
    }

    await res.revalidate('/')
    await res.revalidate('/archive')

    return res.json({
      revalidated: true,
      paths: slug ? [`/post/${slug}`, '/', '/archive'] : ['/', '/archive']
    })
  } catch (err) {
    return res.status(500).json({ message: 'Error revalidating' })
  }
}