import { useMemo } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { IDL } from '../config/idl';
import { PROGRAM_ID } from '../config/solana';

export function useSolanaProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;

    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );

    return new Program(
      IDL as any,
      PROGRAM_ID,
      provider
    );
  }, [connection, wallet]);

  return { program, connection, wallet };
}

