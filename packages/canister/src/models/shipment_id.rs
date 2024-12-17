use std::ops::{Deref, DerefMut};

use crate::state::SHIPMENT_COUNTER;

pub type ShipmentIdInner = u64;
pub struct ShipmentId(ShipmentIdInner);

impl Deref for ShipmentId {
    type Target = ShipmentIdInner;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for ShipmentId {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl ShipmentId {
    pub fn new() -> Self {
        let id = SHIPMENT_COUNTER.with_borrow_mut(|counter| {
            let current = *counter; 
            *counter = current + 1;
            current
        });

        Self(id)
    }

    pub fn into_inner(self) -> ShipmentIdInner {
        self.0
    }
}