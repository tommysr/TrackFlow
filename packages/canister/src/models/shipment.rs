#![allow(unused)]

use super::{carrier::Carrier, customer::Customer, shipment_id::ShipmentIdInner};
use anyhow::Context;
use candid::{CandidType, Principal};
use hex::FromHex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Deserialize, Serialize, Debug, Clone, CandidType)]
pub enum SizeCategory {
    Envelope,
    Parcel {
        max_width: u64,
        max_height: u64,
        max_depth: u64,
    },
}

#[derive(Deserialize, Serialize, Debug, Clone, CandidType)]
pub struct ShipmentLocation {
    street: String,
    lat: f64,
    lng: f64,
}

impl ShipmentLocation {
    pub fn new(street: String, lat: f64, lng: f64) -> Self {
        Self { street, lat, lng }
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, CandidType)]
pub struct ShipmentInfo {
    value: u64,
    price: u64,
    source: ShipmentLocation,
    destination: ShipmentLocation,
    size_category: SizeCategory,
}

impl ShipmentInfo {
    pub fn price(&self) -> u64 {
        self.price
    }

    pub fn value(&self) -> u64 {
        self.value
    }

    pub fn new(
        value: u64,
        price: u64,
        source: ShipmentLocation,
        destination: ShipmentLocation,
        size_category: SizeCategory,
    ) -> Self {
        Self {
            value,
            price,
            source,
            destination,
            size_category,
        }
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, CandidType, PartialEq, Eq)]
pub enum ShipmentStatus {
    Pending,
    Bought,
    InTransit,
    Delivered,
    Cancelled,
}

#[derive(Deserialize, Serialize, Debug, Clone, CandidType)]
pub struct Shipment {
    id: ShipmentIdInner,
    name: String,
    hashed_secret: String,
    info: ShipmentInfo,
    status: ShipmentStatus,
    message: Option<String>,
    carrier: Option<Principal>,
    customer: Principal,
    created_at: u64,
}

impl Shipment {
    pub fn add_encrypted_message(&mut self, message: String) {
        self.message = Some(message);
    }

    pub fn encrypted_message(&self) -> Option<String> {
        self.message.clone()
    }

    pub fn create(
        creator: &mut Customer,
        id: ShipmentIdInner,
        hashed_secret: String,
        name: String,
        info: ShipmentInfo,
    ) -> Self {
        let created_at = ic_cdk::api::time();

        creator.add_shipment(id);

        let shipment = Self {
            id,
            info,
            name,
            message: None,
            hashed_secret,
            status: ShipmentStatus::Pending,
            carrier: None,
            customer: creator.id(),
            created_at,
        };

        shipment
    }

    fn validate_secret(&self, secret: Option<String>) -> anyhow::Result<()> {
        let secret = secret.ok_or(anyhow::anyhow!("missing secret"))?;
        let hex = Vec::from_hex(self.hashed_secret.clone()).context("invalid hex")?;

        let mut hasher = Sha256::new();
        hasher.update(secret);
        let result = hasher.finalize();

        if result[..] == hex {
            return Ok(());
        } else {
            return Err(anyhow::anyhow!("secret verification failed"));
        }
    }

    pub fn finalize(
        &mut self,
        carrier: &mut Carrier,
        customer: &mut Customer,
        secret_key: Option<String>,
        caller: Principal,
    ) -> anyhow::Result<()> {
        if self.status != ShipmentStatus::InTransit {
            return Err(anyhow::anyhow!("shipment is not ready to be finalized"));
        }

        match caller == self.customer {
            true => {}
            false => self.validate_secret(secret_key)?,
        }

        self.status = ShipmentStatus::Delivered;

        carrier.finalize_shipment(self.id());
        customer.finalize_shipment(self.id());

        Ok(())
    }

    pub fn buy(&mut self, carrier: &mut Carrier) -> anyhow::Result<()> {
        if self.status != ShipmentStatus::Pending {
            return Err(anyhow::anyhow!("shipment is not pending"));
        }

        self.carrier = Some(carrier.id());
        self.status = ShipmentStatus::InTransit;

        carrier.add_shipment(self.id());

        Ok(())
    }

    pub fn status(&self) -> &ShipmentStatus {
        &self.status
    }

    pub fn customer_id(&self) -> Principal {
        self.customer
    }

    pub fn carrier_id(&self) -> Option<Principal> {
        self.carrier
    }

    pub fn id(&self) -> ShipmentIdInner {
        self.id
    }

    pub fn info(&self) -> &ShipmentInfo {
        &self.info
    }
}

// works, but cannot be used in tests, beacuse of icp code
// #[cfg(test)]
// mod hash_verify_test {
//     use super::*;

//     #[test]
//     fn test_hash_verify() {
//         let secret = "secret";
//         let hex =  "2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b";

//         let shipment = Shipment::create(
//             &mut Customer::new(Principal::anonymous(), "Jacek".to_string()),
//             ShipmentIdInner::default(),
//             hex.to_string(),
//             "name".to_string(),
//             ShipmentInfo::new(
//                 0,
//                 0,
//                 ShipmentLocation::new("street".to_string(), 0.0, 0.0),
//                 ShipmentLocation::new("street".to_string(), 0.0, 0.0),
//                 SizeCategory::Envelope,
//             ),
//         );

//         assert!(shipment.validate_secret(Some(secret.to_string())).is_ok());
//     }
// }