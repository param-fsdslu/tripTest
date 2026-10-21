import {
  Wifi,
  Waves,
  UtensilsCrossed,
  Dumbbell,
  ParkingCircle,
  Wind,
  Tv,
  WashingMachine,
  Wine,
  Sparkles,
  Trees,
  Bell,
  Dog,
  ArrowUpDown,
  Coffee,
  ChefHat,
  Bike,
  Car,
  Luggage,
  Flame,
  Droplets,
  Shield,
  Phone,
  Printer,
  Monitor,
  Bath,
  Shirt,
  Snowflake,
  Sun,
  Zap,
  Clock,
  Volume2,
  Baby,
  Flower2,
  Banknote,
  CheckCircle2,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { FC } from 'react';

type LucideIcon = FC<LucideProps>;

const AMENITY_ICON_MAP: Record<string, LucideIcon> = {
  // Connectivity
  wifi: Wifi,
  'wi-fi': Wifi,
  'free wifi': Wifi,
  'free wi-fi': Wifi,
  internet: Wifi,
  'high speed internet': Wifi,

  // Pool & Water
  pool: Waves,
  'swimming pool': Waves,
  'outdoor pool': Waves,
  'indoor pool': Waves,
  'heated pool': Waves,
  jacuzzi: Droplets,
  'hot tub': Droplets,
  bathtub: Bath,
  bath: Bath,

  // Food & Drink
  restaurant: UtensilsCrossed,
  dining: UtensilsCrossed,
  'on-site restaurant': UtensilsCrossed,
  breakfast: Coffee,
  'free breakfast': Coffee,
  'complimentary breakfast': Coffee,
  bar: Wine,
  lounge: Wine,
  'mini bar': Wine,
  minibar: Wine,
  kitchen: ChefHat,
  kitchenette: ChefHat,

  // Fitness & Wellness
  gym: Dumbbell,
  fitness: Dumbbell,
  'fitness center': Dumbbell,
  'fitness centre': Dumbbell,
  'gym/fitness center': Dumbbell,
  spa: Sparkles,
  'spa & wellness': Sparkles,
  sauna: Flame,
  'steam room': Flame,

  // Parking & Transport
  parking: ParkingCircle,
  'free parking': ParkingCircle,
  'car parking': Car,
  'valet parking': Car,
  'airport shuttle': Car,
  taxi: Car,
  bicycle: Bike,
  'bicycle rental': Bike,
  'bike rental': Bike,

  // Climate Control
  'air conditioning': Wind,
  'air-conditioning': Wind,
  ac: Wind,
  'central air': Wind,
  heating: Snowflake,
  'central heating': Snowflake,
  fan: Sun,

  // Entertainment
  tv: Tv,
  television: Tv,
  'flat-screen tv': Tv,
  'cable tv': Tv,
  'satellite tv': Tv,
  'smart tv': Tv,
  projector: Monitor,

  // Laundry
  laundry: WashingMachine,
  'laundry service': WashingMachine,
  'washing machine': WashingMachine,
  'dry cleaning': Shirt,
  ironing: Shirt,
  'iron & board': Shirt,

  // Nature & Outdoor
  garden: Trees,
  'garden view': Trees,
  terrace: Trees,
  'outdoor area': Trees,
  beach: Waves,
  'beach access': Waves,
  'sea view': Waves,
  'ocean view': Waves,

  // Services
  'room service': Bell,
  'concierge': Bell,
  '24-hour front desk': Clock,
  '24/7 front desk': Clock,
  'front desk': Clock,
  'luggage storage': Luggage,
  'luggage room': Luggage,
  safe: Shield,
  'in-room safe': Shield,
  'security': Shield,
  elevator: ArrowUpDown,
  lift: ArrowUpDown,
  'pet friendly': Dog,
  'pets allowed': Dog,
  'business center': Printer,
  'meeting room': Printer,
  'fax/photocopying': Printer,

  // Power & Tech
  'power backup': Zap,
  generator: Zap,
  'generator backup': Zap,
  'telephone': Phone,
  phone: Phone,
  'in-room telephone': Phone,

  // Family
  'baby cot': Baby,
  crib: Baby,
  'kids club': Baby,
  'children activities': Baby,

  // Garden & Environment
  'flower arrangement': Flower2,
  'garden facing': Flower2,

  // Cash & Finance
  atm: Banknote,
  'currency exchange': Banknote,
};

/**
 * Returns the Lucide icon component that best matches the amenity name.
 * Falls back to CheckCircle2 for unrecognised names.
 */
export function getAmenityIcon(name: string): LucideIcon {
  const key = name.toLowerCase().trim();
  return AMENITY_ICON_MAP[key] ?? CheckCircle2;
}
