import type { AssignableStaffRole } from '../../../core/auth/application-roles';

export interface RestaurantStaffUser {
  id: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  restaurantId: string;
  role: AssignableStaffRole;
  isActive: boolean;
}

export interface CreateRestaurantStaffRequest {
  email: string;
  password: string;
  fullName: string | null;
  phoneNumber: string | null;
  role: AssignableStaffRole;
}

export interface UpdateRestaurantStaffRoleRequest {
  role: AssignableStaffRole;
}

export interface RestaurantStaffRoleUpdateResult {
  id: string;
  restaurantId: string;
  role: AssignableStaffRole;
}
