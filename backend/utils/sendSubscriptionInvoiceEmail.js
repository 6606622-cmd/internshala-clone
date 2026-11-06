async function sendSubscriptionInvoiceEmail({
  email,
  name,
  plan,
  amount,
  transactionId,
  invoiceNumber,
  validFrom,
  validUntil,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    throw new Error("Resend email configuration is missing");
  }

  if (!email || !transactionId || !invoiceNumber) {
    throw new Error("Required invoice email details are missing");
  }

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
      <h2 style="color:#2563eb;">InternArea Subscription Invoice</h2>

      <p>Hello ${name || "User"},</p>

      <p>Your subscription payment has been successfully verified.</p>

      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px;border:1px solid #ddd;">Invoice Number</td>
            <td style="padding:10px;border:1px solid #ddd;">${invoiceNumber}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Plan</td>
            <td style="padding:10px;border:1px solid #ddd;">${plan}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Amount Paid</td>
            <td style="padding:10px;border:1px solid #ddd;">${formattedAmount}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Transaction ID</td>
            <td style="padding:10px;border:1px solid #ddd;">${transactionId}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Valid From</td>
            <td style="padding:10px;border:1px solid #ddd;">${formatDate(validFrom)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Valid Until</td>
            <td style="padding:10px;border:1px solid #ddd;">${formatDate(validUntil)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;">Billing Email</td>
            <td style="padding:10px;border:1px solid #ddd;">${email}</td></tr>
      </table>

      <p style="margin-top:24px;">
        Thank you for choosing InternArea.
      </p>
      <p>InternArea Team</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `InternArea ${plan} Subscription Invoice`,
      html,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Subscription invoice email failed");
  }

  return result;
}

module.exports = sendSubscriptionInvoiceEmail;