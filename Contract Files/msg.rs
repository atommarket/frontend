use crate::state::{Listing, Profile};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct InstantiateMsg {}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    CreateListing {
        listing_title: String,
        external_id: String,
        text: String,
        tags: Vec<String>,
        contact: String,
        price: u64,
    },
    EditListing {
        listing_id: u64,
        external_id: String,
        text: String,
        tags: Vec<String>,
        price: u64,
    },
    DeleteListing {
        listing_id: u64,
    },
    Purchase {
        listing_id: u64,
    },
    CancelPurchase {
        listing_id: u64,
    },
    SellerCancelSale {
        listing_id: u64,
    },
    SignShipped {
        listing_id: u64,
    },
    SignReceived {
        listing_id: u64,
    },
    RequestArbitration {
        listing_id: u64,
    },
    Arbitrate {
        listing_id: u64,
        funds_recipient: String,
    },
    CreateProfile {
        profile_name: String,
    },
    DeleteProfile {},
    RateUser {
        recipient_address: String,
        rating: u64,
    },
    CleanupOldRelationships {},
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
pub struct ProfileResponse {
    pub profile: Option<Profile>,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct AllListingsResponse {
    pub listings: Vec<Listing>,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct ListingResponse {
    pub listing: Option<Listing>,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct ListingCountResponse {
    pub listing_count: u64,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct ArbitrationListingsResponse {
    pub listings: Vec<Listing>,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct SearchListingsResponse {
    pub listings: Vec<Listing>,
}
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    AllListings {
        limit: Option<u32>,
        start_after: Option<u64>,
    },
    Listing {
        listing_id: u64,
    },
    ListingCount {},
    ArbitrationListings {
        limit: Option<u32>,
        start_after: Option<u64>,
    },
    SearchListingsByTitle {
        title: String,
        limit: Option<u32>,
    },
    Profile {
        address: String,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub struct MigrateMsg {}


