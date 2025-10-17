import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  useDisclosure,
  Input,
  InputGroup,
  InputLeftElement,
  Image,
  HStack,
  useColorMode,
  IconButton,
} from '@chakra-ui/react';
import { SearchIcon, MoonIcon, SunIcon, AddIcon } from '@chakra-ui/icons';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { PublicKey } from '@solana/web3.js';

import CreateListingModal from './components/CreateListingModal';
import CreateProfileModal from './components/CreateProfileModal';
import ViewProfileModal from './components/ViewProfileModal';
import ListingGrid from './components/ListingGrid';
import ListingPage from './pages/ListingPage';
import { useSolanaListing } from './hooks/useSolanaListing';
import { useSolanaProfile } from './hooks/useSolanaProfile';
import { RPC_ENDPOINT } from './config/solana';
import logo from './assets/logo.png';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

function HomePage({ 
  walletAddress, 
}: { 
  walletAddress: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const { listings, fetchListings, searchListingsByTitle } = useSolanaListing();

  // Initial fetch of listings
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchListingsByTitle(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchListingsByTitle]);

  return (
    <VStack spacing={8} align="stretch">
      <Box>
        <InputGroup size="lg" mb={6}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search listings by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </Box>

      <ListingGrid
        listings={listings}
        walletAddress={walletAddress}
        onRefresh={fetchListings}
      />
    </VStack>
  );
}

function AppContent() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const { isOpen: isListingModalOpen, onOpen: onListingModalOpen, onClose: onListingModalClose } = useDisclosure();
  const { isOpen: isProfileModalOpen, onOpen: onProfileModalOpen, onClose: onProfileModalClose } = useDisclosure();
  const { isOpen: isViewProfileOpen, onOpen: onViewProfileOpen, onClose: onViewProfileClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const { fetchProfile } = useSolanaProfile();
  const { publicKey } = useWallet();

  // Track wallet connection
  useEffect(() => {
    if (publicKey) {
      setWalletAddress(publicKey.toString());
    } else {
      setWalletAddress('');
      setHasProfile(false);
    }
  }, [publicKey]);

  const checkProfile = async (pubkey: PublicKey) => {
    try {
      const profile = await fetchProfile(pubkey);
      setHasProfile(!!profile);
    } catch (error) {
      console.error('Error checking profile:', error);
      setHasProfile(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      checkProfile(new PublicKey(walletAddress));
    }
  }, [walletAddress]);

  return (
    <Router>
      <Container maxW="container.xl" py={8}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={8}>
          <HStack spacing={4}>
            <Image src={logo} alt="Solana Market Logo" height="60px" />
            <Heading size="2xl">Solana Market</Heading>
          </HStack>
          <HStack spacing={4}>
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              variant="ghost"
            />
            <WalletMultiButton />
            {walletAddress && (
              <>
                <Button colorScheme="blue" onClick={onListingModalOpen} leftIcon={<AddIcon />}>
                  Create Listing
                </Button>
                {hasProfile ? (
                  <Button colorScheme="blue" onClick={onViewProfileOpen}>
                    View Profile
                  </Button>
                ) : (
                  <Button colorScheme="green" onClick={onProfileModalOpen}>
                    Create Profile
                  </Button>
                )}
              </>
            )}
          </HStack>
        </Box>

        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                walletAddress={walletAddress}
              />
            } 
          />
          <Route 
            path="/listing/:id" 
            element={
              <ListingPage
                walletAddress={walletAddress}
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <CreateListingModal
          isOpen={isListingModalOpen}
          onClose={onListingModalClose}
          walletAddress={walletAddress}
          onSuccess={() => {
            onListingModalClose();
            window.location.reload();
          }}
        />

        <CreateProfileModal
          isOpen={isProfileModalOpen}
          onClose={onProfileModalClose}
          walletAddress={walletAddress}
          onSuccess={() => {
            onProfileModalClose();
            if (walletAddress) {
              checkProfile(new PublicKey(walletAddress));
            }
          }}
        />

        <ViewProfileModal
          isOpen={isViewProfileOpen}
          onClose={onViewProfileClose}
          walletAddress={walletAddress}
          onProfileDeleted={() => {
            setHasProfile(false);
          }}
        />
      </Container>
    </Router>
  );
}

// Wallet connection wrapper
function WalletConnectionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProviderWrapper>
        {children}
      </WalletProviderWrapper>
    </ConnectionProvider>
  );
}

function WalletProviderWrapper({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [network]
  );

  return (
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </WalletProvider>
  );
}

export default function App() {
  return (
    <WalletConnectionWrapper>
      <AppContent />
    </WalletConnectionWrapper>
  );
}
