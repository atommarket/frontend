import { useCallback } from 'react';

const WORKER_URL = 'https://ipfs-worker.atommarket.workers.dev';

export function useIPFS() {
  const unpinFile = useCallback(async (cid: string) => {
    try {
      const response = await fetch(`${WORKER_URL}/unpin/${cid}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to unpin file: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error unpinning file:', error);
      throw error;
    }
  }, []);

  return { unpinFile };
} 