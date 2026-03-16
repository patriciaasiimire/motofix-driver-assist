import { useState, useEffect } from 'react';
import { DollarSign, Check, X, Loader2, Smartphone } from 'lucide-react';
import { paymentsService } from '@/config/api';
import { useRequests } from '@/contexts/RequestContext';
import { toast } from 'sonner';

export function QuoteModal() {
  const { pendingQuote, pendingQuoteRequestId, setPendingQuote, clearPendingQuote } = useRequests();

  const [isApproving, setIsApproving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [momoPhone, setMomoPhone] = useState('');

  // Pre-fill MoMo from stored profile
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('motofix_user') || '{}');
      if (user?.phone) setMomoPhone(user.phone.replace('+', ''));
    } catch {}
  }, []);

  // Poll payment status after collection initiated
  useEffect(() => {
    if (!pendingQuote || !pendingQuoteRequestId) return;
    if (pendingQuote.collection_status !== 'initiated') return;

    const interval = setInterval(async () => {
      try {
        const res = await paymentsService.getStatus(pendingQuoteRequestId);
        const updated = res.data;
        setPendingQuote(updated);
        if (updated.collection_status === 'success') {
          clearInterval(interval);
          toast.success('Payment confirmed! The mechanic is on the way.');
          setTimeout(clearPendingQuote, 3000);
        } else if (updated.collection_status === 'failed') {
          clearInterval(interval);
          toast.error('Payment failed. Please try again.');
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [pendingQuote?.collection_status, pendingQuoteRequestId]);

  if (!pendingQuote || !pendingQuoteRequestId) return null;
  if (pendingQuote.collection_status === 'success') return null;

  const quoteApproved = pendingQuote.quote_approved;
  const paymentPending = pendingQuote.collection_status === 'initiated';
  const showApproveButtons = !quoteApproved && !paymentPending;
  const showPayButton = quoteApproved && !paymentPending;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await paymentsService.approveQuote(pendingQuoteRequestId);
      setPendingQuote({ ...pendingQuote, quote_approved: true });
      toast.success('Quote approved!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to approve quote');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    toast.info('Quote rejected. The mechanic will be notified.');
    clearPendingQuote();
  };

  const handlePay = async () => {
    const phone = momoPhone.trim().replace(/\s+/g, '');
    if (!phone) { toast.error('Enter your MTN MoMo number'); return; }
    setIsPaying(true);
    try {
      await paymentsService.collect(pendingQuoteRequestId, phone);
      setPendingQuote({ ...pendingQuote, collection_status: 'initiated' });
      toast.success('Payment initiated — approve the prompt on your phone');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Payment failed. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6">
      <div className="w-full max-w-md bg-card rounded-3xl p-6 shadow-2xl border border-border animate-slide-up">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your mechanic quoted</p>
            <p className="text-2xl font-bold text-foreground">
              UGX {pendingQuote.quoted_amount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Payment pending */}
        {paymentPending && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 mb-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">Awaiting payment</p>
              <p className="text-xs text-muted-foreground">Approve the MoMo prompt on your phone</p>
            </div>
          </div>
        )}

        {/* Approve / Reject */}
        {showApproveButtons && (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              Approve the price to continue. The mechanic is waiting.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-destructive/10 text-destructive font-bold text-sm border border-destructive/20"
              >
                <X className="w-4 h-4" /> Reject
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-success text-success-foreground font-bold text-sm disabled:opacity-60"
              >
                {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve
              </button>
            </div>
          </>
        )}

        {/* Pay with MoMo */}
        {showPayButton && (
          <>
            <p className="text-xs text-success flex items-center gap-1.5 mb-4">
              <Check className="w-3.5 h-3.5" /> Quote approved — pay to get started
            </p>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">+256</span>
              <input
                type="tel"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                placeholder="771234567"
                className="w-full pl-14 pr-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={handlePay}
              disabled={isPaying || !momoPhone.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base disabled:opacity-60 shadow-sm"
            >
              {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
              {isPaying ? 'Processing…' : `Pay UGX ${pendingQuote.quoted_amount.toLocaleString()}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
