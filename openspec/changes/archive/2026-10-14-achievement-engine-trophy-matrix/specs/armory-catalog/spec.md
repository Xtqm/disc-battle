# Spec Delta

## ADDED Requirements

### Requirement: Direct Achievement Reward Entitlement Unlocking
The system SHALL provide an authoritative method (`unlockRewardItem`) on the Armory manager to directly grant cosmetic rewards awarded by achievements into persistent inventory and broadcast unlock notifications.

#### Scenario: Granting an achievement cosmetic skin
- **WHEN** an achievement unlock awards a cosmetic item (such as `disc_corrupted_void` or `chassis_arbiter`)
- **THEN** the system validates the item identifier, appends it to the category's persistent inventory array, commits storage, and emits an `ARMORY_ITEM_UNLOCKED` event.

#### Scenario: Granting an already owned reward skin
- **WHEN** an achievement reward is granted for an item already unlocked in persistent inventory
- **THEN** the system prevents duplicate inventory entries and completes idempotently.
