import api from './api';

export interface ShippingResult {
  distance: number;
  cost: number;
}

export const shippingService = {
  calculate: async (latitude: number, longitude: number): Promise<ShippingResult> => {
    const response = await api.post('/shipping/calculate', { latitude, longitude });
    return response.data.data;
  },

  getUserLocation: (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      });
    });
  },
};
