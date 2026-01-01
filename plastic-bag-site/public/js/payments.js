export async function pay(amount, productName) {
  const stripe = Stripe(window.STRIPE_PUBLIC_KEY);

  await stripe.redirectToCheckout({
    lineItems: [{
      price_data: {
        currency: 'usd',
        product_data: { name: productName },
        unit_amount: amount * 100
      },
      quantity: 1
    }],
    mode: 'payment',
    successUrl: window.location.origin + '/products.html',
    cancelUrl: window.location.origin + '/products.html'
  });
}
