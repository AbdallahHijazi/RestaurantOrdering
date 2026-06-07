export interface RestaurantTable {
  id: string;
  name: string;
  zone: string | null;
  publicToken: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateRestaurantTableRequest {
  name: string;
  zone: string | null;
  isActive: boolean;
}

export interface UpdateRestaurantTableRequest {
  name: string;
  zone: string | null;
}

export interface UpdateRestaurantTableStatusRequest {
  isActive: boolean;
}
