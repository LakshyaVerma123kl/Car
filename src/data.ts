export interface CarModel {
  id: string;
  name: string;
  type: 'SUV' | 'Sedan' | 'Coupe' | 'Hypercar';
  price: number; // in Lakhs
  range: string; // in km
  acceleration: string; // 0-100 km/h in seconds
  seating: number;
  image: string;
  description: string;
  isFlagship?: boolean;
}

export const cars: CarModel[] = [
  {
    id: 'aether',
    name: 'Aether SUV',
    type: 'SUV',
    price: 18.5,
    range: '450',
    acceleration: '7.2',
    seating: 5,
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=800',
    description: 'The perfect family SUV with uncompromising range and comfort.'
  },
  {
    id: 'zephyr',
    name: 'Zephyr Sedan',
    type: 'Sedan',
    price: 22.0,
    range: '520',
    acceleration: '5.8',
    seating: 5,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800',
    description: 'Executive luxury meets electric performance.'
  },
  {
    id: 'nova',
    name: 'Nova Coupe',
    type: 'Coupe',
    price: 35.0,
    range: '480',
    acceleration: '4.1',
    seating: 2,
    image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&q=80&w=800',
    description: 'Sporty, aggressive, and built for the thrill of the drive.'
  },
  {
    id: 'apex',
    name: 'Apex Hypercar',
    type: 'Hypercar',
    price: 120.0,
    range: '600',
    acceleration: '1.9',
    seating: 2,
    image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=800',
    description: 'Our flagship model. Pushing the absolute limits of electric mobility.',
    isFlagship: true
  }
];

export const formatCurrency = (priceInLakhs: number, currency: 'INR' | 'USD'): string => {
  if (currency === 'INR') {
    return `₹${priceInLakhs} Lakhs`;
  } else {
    // Approx conversion: 1 Lakh INR = ~1200 USD
    const usdPrice = priceInLakhs * 1200;
    return `$${usdPrice.toLocaleString()}`;
  }
};
