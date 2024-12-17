#![allow(unused)]

use super::shipment_id::ShipmentIdInner;
use candid::Principal;
use serde::{Deserialize, Serialize};

pub type CarrierId = Principal;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Carrier {
    id: CarrierId,
    name: String,
    shipments_done: u32,
    shipments: Vec<ShipmentIdInner>,
}

impl Carrier {
    pub fn new(id: CarrierId, name: String) -> Self {
        Self {
            id,
            name,
            shipments: vec![],
            shipments_done: 0,
        }
    }

    pub fn add_shipment(&mut self, shipment_id: ShipmentIdInner) {
        self.shipments.push(shipment_id);
    }

    pub fn finalize_shipment(&mut self, shipment_id: ShipmentIdInner) {
        self.shipments.retain(|&x| x != shipment_id);
        self.shipments_done += 1;
    }
    
    pub fn id(&self) -> Principal {
        self.id
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn shipments(&self) -> &[ShipmentIdInner] {
        &self.shipments
    }

    pub fn shipments_done(&self) -> u32 {
        self.shipments_done
    }
}