import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { plan, email } = req.body

  try {
    const isAnual = plan === 'anual'

    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email || undefined,
      locale: 'pt-BR',
      line_items: [
        {
          price: isAnual
            ? process.env.STRIPE_PRICE_ANUAL
            : process.env.STRIPE_PRICE_MENSAL,
          quantity: 1,
        },
      ],
      discounts: isAnual
        ? []
        : [{ coupon: process.env.STRIPE_COUPON_PRIMEIRO_MES }],
      success_url: `${process.env.NEXT_PUBLIC_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/?canceled=true`,
      subscription_data: {
        metadata: {
          plan,
          source: 'synapsys_landing',
        },
      },
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    return res.status(500).json({ error: err.message })
  }
}
