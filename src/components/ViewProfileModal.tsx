import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  VStack,
  Text,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
} from '@chakra-ui/react';
import { useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useSolanaProfile } from '../hooks/useSolanaProfile';

interface ViewProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onProfileDeleted: () => void;
}

export default function ViewProfileModal({
  isOpen,
  onClose,
  walletAddress,
  onProfileDeleted,
}: ViewProfileModalProps) {
  const toast = useToast();
  const { profile, fetchProfile } = useSolanaProfile();

  // Fetch profile when modal opens
  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchProfile(new PublicKey(walletAddress));
    }
  }, [isOpen, walletAddress, fetchProfile]);

  if (!profile) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Your Profile</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} pb={6} align="stretch">
            <Text fontSize="xl" fontWeight="bold">
              {profile.profileName}
            </Text>

            <StatGroup>
              <Stat>
                <StatLabel>Transactions</StatLabel>
                <StatNumber>{profile.transactionCount}</StatNumber>
              </Stat>

              <Stat>
                <StatLabel>Average Rating</StatLabel>
                <StatNumber>
                  {profile.ratingCount > 0 
                    ? (profile.ratings / profile.ratingCount).toFixed(1)
                    : 'No ratings'}
                </StatNumber>
              </Stat>

              <Stat>
                <StatLabel>Total Ratings</StatLabel>
                <StatNumber>{profile.ratingCount}</StatNumber>
              </Stat>
            </StatGroup>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
