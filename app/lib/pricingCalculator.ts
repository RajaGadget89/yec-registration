import { getSupabaseServiceClient } from './supabase-server';
import { EventSettings, PricePackage } from '../types/database';

/**
 * Pricing calculator for YEC Day registrations
 * Computes applied price based on event settings, selected package, and current time
 */
export class PricingCalculator {
  /**
   * Calculate the applied price for a registration
   */
  static async calculatePrice(
    selectedPackageCode: string,
    currentTimeUtc: Date = new Date()
  ): Promise<{ price: number; currency: string; isEarlyBird: boolean; package: PricePackage }> {
    const supabase = getSupabaseServiceClient();
    
    // Get event settings
    const { data: eventSettings, error } = await supabase
      .from('event_settings')
      .select('*')
      .single();
    
    if (error || !eventSettings) {
      throw new Error('Event settings not found');
    }
    
    // Find the selected package
    const selectedPackage = eventSettings.price_packages.find(
      (pkg: PricePackage) => pkg.code === selectedPackageCode
    );
    
    if (!selectedPackage) {
      throw new Error(`Package with code '${selectedPackageCode}' not found`);
    }
    
    // Check if current time is before early bird deadline
    const earlyBirdDeadline = new Date(eventSettings.early_bird_deadline_utc);
    const isEarlyBird = currentTimeUtc <= earlyBirdDeadline;
    
    // Calculate price
    const price = isEarlyBird ? selectedPackage.early_bird_amount : selectedPackage.regular_amount;
    
    return {
      price,
      currency: selectedPackage.currency,
      isEarlyBird,
      package: selectedPackage,
    };
  }
  
  /**
   * Get all available price packages
   */
  static async getPricePackages(): Promise<PricePackage[]> {
    const supabase = getSupabaseServiceClient();
    
    const { data: eventSettings, error } = await supabase
      .from('event_settings')
      .select('price_packages')
      .single();
    
    if (error || !eventSettings) {
      throw new Error('Event settings not found');
    }
    
    return eventSettings.price_packages;
  }
  
  /**
   * Get event settings
   */
  static async getEventSettings(): Promise<EventSettings> {
    const supabase = getSupabaseServiceClient();
    
    const { data: eventSettings, error } = await supabase
      .from('event_settings')
      .select('*')
      .single();
    
    if (error || !eventSettings) {
      throw new Error('Event settings not found');
    }
    
    return eventSettings;
  }
  
  /**
   * Check if registration is still open
   */
  static async isRegistrationOpen(currentTimeUtc: Date = new Date()): Promise<boolean> {
    const eventSettings = await this.getEventSettings();
    const registrationDeadline = new Date(eventSettings.registration_deadline_utc);
    
    return currentTimeUtc <= registrationDeadline;
  }
  
  /**
   * Check if early bird pricing is still available
   */
  static async isEarlyBirdAvailable(currentTimeUtc: Date = new Date()): Promise<boolean> {
    const eventSettings = await this.getEventSettings();
    const earlyBirdDeadline = new Date(eventSettings.early_bird_deadline_utc);
    
    return currentTimeUtc <= earlyBirdDeadline;
  }
  
  /**
   * Format price for display
   */
  static formatPrice(price: number, currency: string = 'THB'): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }
  
  /**
   * Convert UTC time to Bangkok time for display
   */
  static convertToBangkokTime(utcTime: string | Date): string {
    const date = new Date(utcTime);
    return date.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  /**
   * Convert Bangkok time to UTC for storage
   */
  static convertToUtc(bangkokTime: string): Date {
    // Parse Bangkok time and convert to UTC
    const bangkokDate = new Date(bangkokTime + ' Asia/Bangkok');
    return new Date(bangkokDate.getTime() - (bangkokDate.getTimezoneOffset() * 60000));
  }
}
