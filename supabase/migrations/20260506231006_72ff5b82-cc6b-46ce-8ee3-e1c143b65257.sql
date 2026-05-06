ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_txn_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_txn_type_check
  CHECK (txn_type = ANY (ARRAY[
    'recharge'::text,
    'coin_purchase'::text,
    'lead_unlock'::text,
    'lead_purchase'::text,
    'shipment'::text,
    'refund'::text,
    'bonus'::text,
    'adjustment'::text,
    'withdrawal'::text
  ]));