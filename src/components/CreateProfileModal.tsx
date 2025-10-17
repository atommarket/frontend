import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useSolanaProfile } from '../hooks/useSolanaProfile';

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onSuccess: () => void;
}

export default function CreateProfileModal({
  isOpen,
  onClose,
  walletAddress,
  onSuccess,
}: CreateProfileModalProps) {
  const toast = useToast();
  const { createProfile } = useSolanaProfile();
  const [profileName, setProfileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!walletAddress) {
      toast({ 
        title: 'Error',
        description: 'Wallet not connected',
        status: 'error' 
      });
      return;
    }

    if (!profileName.trim()) {
      toast({
        title: 'Error',
        description: 'Profile name is required',
        status: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createProfile(profileName.trim());
      
      onSuccess();
      onClose();
      toast({ 
        title: 'Profile created successfully',
        description: 'Your profile has been created on Solana',
        status: 'success' 
      });
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({ 
        title: 'Failed to create profile',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create Profile</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} pb={4}>
            <FormControl>
              <FormLabel>Profile Name</FormLabel>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your profile name"
              />
            </FormControl>
            
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              w="full"
              isLoading={isSubmitting}
            >
              Create Profile
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
