import { Injectable } from '@nestjs/common';

@Injectable()
export class DeductionsService {
  getCategories() {
    return [
      { id: 'weather', name: 'Weather Delay', defaultCounted: 0, description: 'Adverse sea or atmospheric conditions preventing operations' },
      { id: 'rain', name: 'Rain', defaultCounted: 0, description: 'Precipitation stoppage recorded in Statement of Facts' },
      { id: 'breakdown', name: 'Shore Breakdown', defaultCounted: 0, description: 'Terminal loading arm or shore pipeline mechanical failure' },
      { id: 'crew', name: 'Crew Change', defaultCounted: 0, description: 'Vessel-related delay for crew embarkation/disembarkation' },
      { id: 'shifting', name: 'Shifting', defaultCounted: 0, description: 'Vessel transit from anchorage to berth or between berths' },
      { id: 'waiting', name: 'Waiting for berth', defaultCounted: 100, description: 'Congestion time after valid NOR tender' },
      { id: 'equipment', name: 'Equipment breakdown', defaultCounted: 0, description: 'Shipboard gear or crane malfunction' },
      { id: 'closure', name: 'Port closure', defaultCounted: 0, description: 'Harbor master closure or channel blockage' },
      { id: 'strike', name: 'Strike', defaultCounted: 50, description: 'Stevedore, tug, or pilot labor dispute stoppage' },
      { id: 'holiday', name: 'Holiday', defaultCounted: 0, description: 'Official port or national statutory holiday' },
      { id: 'others', name: 'Others', defaultCounted: 100, description: 'General operational activities and working periods' },
      { id: 'custom', name: 'Custom', defaultCounted: 0, description: 'User-specified exception under bespoke charterparty clause' },
    ];
  }
}