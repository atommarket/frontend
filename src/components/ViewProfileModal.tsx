import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Button,
  VStack,
  Text,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
} from '@chakra-ui/react';
import { useState, useRef, useEffect } from 'react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { useProfile } from '../hooks/useProfile';

interface ViewProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: SigningCosmWasmClient | null;
  contractAddress: string;
  walletAddress: string;
  onProfileDeleted: () => void;
}

export default function ViewProfileModal({
  isOpen,
  onClose,
  client,
  contractAddress,
  walletAddress,
  onProfileDeleted,
}: ViewProfileModalProps) {
  const toast = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { profile, fetchProfile, deleteProfile } = useProfile(client, contractAddress);

  // Fetch profile when modal opens
  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchProfile(walletAddress);
    }
  }, [isOpen, walletAddress, fetchProfile]);

  const handleDelete = async () => {
    if (!client || !walletAddress) return;
    try {
      await deleteProfile(walletAddress);
      toast({ title: 'Profile deleted successfully', status: 'success' });
      onProfileDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast({ 
        title: 'Failed to delete profile',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        status: 'error' 
      });
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Your Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {!profile ? (
              <VStack spacing={6} pb={6} align="center">
                <Text>Loading profile...</Text>
              </VStack>
            ) : (
            <VStack spacing={6} pb={6} align="stretch">
              <Text fontSize="xl" fontWeight="bold">
                {profile.profile_name}
              </Text>

              <StatGroup>
                <Stat>
                  <StatLabel>Transactions</StatLabel>
                  <StatNumber>{profile.transaction_count}</StatNumber>
                </Stat>

                <Stat>
                  <StatLabel>Average Rating</StatLabel>
                  <StatNumber>
                    {profile.ratings > 0 
                      ? (profile.rating_count / profile.ratings).toFixed(1)
                      : 'No ratings'}
                  </StatNumber>
                </Stat>

                <Stat>
                  <StatLabel>Total Ratings</StatLabel>
                  <StatNumber>{profile.ratings}</StatNumber>
                </Stat>
              </StatGroup>

              <Button
                colorScheme="red"
                onClick={() => setIsDeleteDialogOpen(true)}
                mt={4}
              >
                Delete Profile
              </Button>
            </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Profile
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete your profile? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
} 