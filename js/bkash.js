/* ============================================================
   EX-CAP Sports — bkash.js  (client side)
   Drives the tokenized-checkout flow. All secret calls happen
   in the Vercel serverless functions under /api. This file only
   asks the server to create a payment, redirects the user to the
   bKash URL, then (on return) asks the server to execute it.
   ============================================================ */
(function(){
  const cfg=window.EXCAP;
  const Bkash={};
  const base=cfg.apiBase||"";

  /* Step 1: create payment → returns bkashURL to redirect to. */
  Bkash.createPayment = async function({amount, ref, regId}){
    const res=await fetch(base+"/api/bkash-create-payment",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({amount:String(amount), payerReference:ref||regId, merchantInvoiceNumber:regId})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||"bKash create failed");
    return data; // { paymentID, bkashURL }
  };

  /* Step 2 (after redirect back with ?paymentID=&status=success):
     execute the payment to capture funds. */
  Bkash.executePayment = async function(paymentID){
    const res=await fetch(base+"/api/bkash-execute-payment",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({paymentID})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||"bKash execute failed");
    return data; // { transactionStatus, trxID, ... }
  };

  /* Helper: read callback params from the URL after bKash returns. */
  Bkash.readCallback = function(){
    const p=new URLSearchParams(location.search);
    return { paymentID:p.get("paymentID"), status:p.get("status") };
  };

  window.Bkash=Bkash;
})();
