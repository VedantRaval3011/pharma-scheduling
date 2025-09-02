// Create a new file: lib/syncUtils.ts
export const broadcastProductMFCSync = (productId: string, mfcIds: string[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('product-mfc-sync', JSON.stringify({
      productId,
      mfcIds,
      timestamp: Date.now()
    }));
    // Remove it immediately to trigger the event
    localStorage.removeItem('product-mfc-sync');
  }
};

export const broadcastMFCProductSync = (mfcId: string, productIds: string[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mfc-product-sync', JSON.stringify({
      mfcId,
      productIds,
      timestamp: Date.now()
    }));
    // Remove it immediately to trigger the event
    localStorage.removeItem('mfc-product-sync');
  }
};
