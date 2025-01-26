use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("No Text Allowed")]
    TooMuchText {},

    #[error("Only One Link Allowed")]
    OnlyOneLink {},

    #[error("Seller must sign shipped prior to buyer signing received")]
    NotShipped {},

    #[error("Not eligible for arbitration")]
    NotEligibleForArbitration {},

    #[error("Not eligible for cancellation")]
    NotEligibleForCancellation {},

    #[error("Arbitration not requested by seller or buyer")]
    ArbitrationNotRequested {},

    #[error("This listing is already purchased by another customer")]
    AlreadyPurchased {},

    #[error("Insufficient funds. Needed: {needed} Sent: {received}")]
    NotEnoughFunds { needed: String, received: String },

    #[error("Funds recipient must be the seller or buyer")]
    InvalidFundsRecipient {},

    #[error("The IPFS link must be with Julian's dedicated gateway: https://julian.infura-ipfs.io/ipfs/")]
    MustUseJulianGateway {},

    #[error("The profile name {taken_profile_name} is already taken. Please choose another")]
    ProfileNameTaken { taken_profile_name: String },

    #[error("To prevent misattribution, profile names are immutably tied to wallet addresses.")]
    ProfileNameImmutable {},

    #[error("This post already exists. Please edit the existing post or change the title.")]
    PostAlreadyExists {},

    #[error("Denom not accepted: {denom}")]
    InvalidDenom { denom: String },

    #[error("Profile not found")]
    ProfileNotFound {},

    #[error("Item cannot be cancelled because it has not been purchased")]
    NotPurchased {},

    #[error("Rating must be between 1 and 5")]
    InvalidRating {},

    #[error("No transaction relationship found between these addresses")]
    NoRelationshipFound {},
}
