/**
 * Parent Data Types
 * Defines the shape of parent documents in Firestore
 */

import { Timestamp } from 'firebase/firestore';

export interface ParentData {
  // Primary Key
  email: string; // Parent email (unique identifier)

  // Linked Children
  linkedChildren: string[]; // Array of child UIDs

  // Security
  hasPassword: boolean; // Whether parent has set a password for portal

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
