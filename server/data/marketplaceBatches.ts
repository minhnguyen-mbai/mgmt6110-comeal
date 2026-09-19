/**
 * CoMeal SG - Prototype Marketplace Data Layer
 * Note: Home cooks, ratings, reviews, and batch counts represent curated prototype data
 * for behavioral instrumentation. Not real operating sellers.
 *
 * CATALOG SOURCE OF TRUTH:
 * drop_001 - drop_006 are reconciled to the approved frontend catalog in
 * src/data/mockDrops.ts. Ids, cooks, dishes, neighbourhoods, pricing, capacity,
 * delivery-cluster values, pickup details and timings must stay in step with
 * that file. Server-only additions are cookId and the field names
 * batchCapacity / portionsBooked / repeatCustomerRate, which correspond to the
 * frontend's totalPortions / portionsJoined / repeatCustomersPct.
 *
 * Frontend drop_001 and drop_003 render bundled local images; the server bundle
 * cannot import those assets, so this file carries absolute URLs for the same
 * dishes instead.
 *
 * TODO (weather phase): "Bugis" is an approved marketplace neighbourhood but is
 * NOT one of the NEA 2-hour forecast areas. It needs an explicit supported
 * forecast-area mapping later. Marketplace neighbourhood and weather forecast
 * area are separate concepts - do not rename the customer-facing neighbourhood
 * to satisfy the weather provider.
 */

export interface MarketplaceBatch {
  id: string;
  cookId: string;
  cookName: string;
  cookAvatar: string;
  cookBio: string;
  cookAddressShort: string;
  completedBatches: number;
  cookingSchedule: string;
  repeatCustomerRate: number; // percentage
  mealName: string;
  mealImage: string;
  shortDescription: string;
  fullDescription: string;
  cuisine: string;
  pricePerPortion: number;
  neighbourhood: string;
  distanceKm: number;
  pickupLocation: string;
  pickupWindow: string;
  deliveryArea: string;
  deliveryWindow: string;
  deliveryClusterName: string;
  deliveryClusterHouseholdsJoined: number;
  deliveryClusterThreshold: number;
  dayBucket: 'tonight' | 'tomorrow' | 'weekend';
  orderCutoffTime: string;
  batchCapacity: number;
  portionsBooked: number;
  groupOrderThreshold: number;
  currentDeliveryFee: number;
  unlockedDeliveryFee: number;
  rating: number;
  reviewCount: number;
  featuredReview: {
    author: string;
    residentArea: string;
    orderCount: number;
    rating: number;
    comment: string;
  };
  neighbourPhotos: string[];
  reviews: Array<{
    id: string;
    author: string;
    avatar: string;
    rating: number;
    date: string;
    residentArea?: string;
    orderCount?: number;
    comment: string;
  }>;
  allergens: string[];
  ingredients: string[];
  status: 'OPEN' | 'ALMOST_FULL' | 'UNLOCKED' | 'SOLD_OUT' | 'CLOSED';
}

export const INITIAL_BATCHES: MarketplaceBatch[] = [
  {
    id: 'drop_001',
    cookId: 'cook_linh_01',
    cookName: "Linh's Kitchen",
    cookAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    cookBio: 'Saigonese mother living in Clementi for 8 years. Cooks authentic Vietnamese family comfort staples using fresh market herbs, slow-simmered broths, and heirloom recipes.',
    cookAddressShort: 'Blk 318 Clementi Ave 4',
    completedBatches: 24,
    cookingSchedule: 'Vietnamese family meals every Thu & Sun',
    repeatCustomerRate: 84,
    mealName: 'Bún Bò Huế (Spicy Beef Noodle Soup)',
    mealImage: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Slow-cooked spicy beef noodle soup with tender beef, herbs and chilli.',
    fullDescription: 'Slow-cooked spicy beef noodle soup with tender beef shank, lemongrass, aromatics, herbs, fresh scallions, and sliced chilli. Prepared in a single fresh morning batch with thick round rice noodles and slow-simmered bone broth.',
    cuisine: 'Vietnamese Home-Style',
    pricePerPortion: 10.90,
    neighbourhood: 'Clementi',
    distanceKm: 1.2,
    pickupLocation: 'Blk 318 Clementi Ave 4 (Void Deck near Lift B)',
    pickupWindow: '6:30 – 8:00 PM',
    deliveryArea: 'Clementi West, Clementi Central, Sunset Way',
    deliveryWindow: '6:30 – 8:00 PM',
    deliveryClusterName: 'Clementi West Cluster',
    deliveryClusterHouseholdsJoined: 4,
    deliveryClusterThreshold: 5,
    dayBucket: 'tonight',
    orderCutoffTime: '4:30 PM (Today)',
    batchCapacity: 20,
    portionsBooked: 16,
    groupOrderThreshold: 20,
    currentDeliveryFee: 4.00,
    unlockedDeliveryFee: 2.00,
    rating: 4.9,
    reviewCount: 38,
    featuredReview: {
      author: 'Marcus Tan',
      residentArea: 'Clementi Ave 4 resident',
      orderCount: 6,
      rating: 5.0,
      comment: 'Tender beef shank and authentic lemongrass broth with just the right spice kick. Picked up at the void deck in 2 minutes, warm and perfectly packaged.',
    },
    neighbourPhotos: [
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=400&q=80',
    ],
    reviews: [
      {
        id: 'rev_1',
        author: 'Marcus Tan',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
        rating: 5.0,
        date: 'Last Thursday',
        residentArea: 'Blk 320 Clementi',
        orderCount: 6,
        comment: 'Tender beef shank and authentic lemongrass broth. Met Linh downstairs at the void deck, super warm and friendly.',
      },
      {
        id: 'rev_2',
        author: 'Eileen Wu',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
        rating: 5.0,
        date: '2 weeks ago',
        residentArea: 'Sunset Way',
        orderCount: 3,
        comment: 'So glad I joined the Clementi group order. The herb freshness was top-tier, unlike food delivery where it gets soggy.',
      },
      {
        id: 'rev_3',
        author: 'Dave Krishnan',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80',
        rating: 4.8,
        date: '3 weeks ago',
        residentArea: 'Clementi Ave 3',
        orderCount: 4,
        comment: 'Great value compared to typical mall restaurants. The broth has real depth from hours of simmering.',
      },
    ],
    allergens: [
      'Beef',
      'Fish Sauce',
      'Shrimp paste trace',
    ],
    ingredients: [
      'Tender beef shank slices',
      'Vietnamese round rice noodles',
      'Lemongrass beef bone broth',
      'Fresh mint & Vietnamese coriander',
      'Chopped scallions & sliced red chilli',
      'House chilli oil & lime wedge',
    ],
    status: 'OPEN',
  },
  {
    id: 'drop_002',
    cookId: 'cook_may_02',
    cookName: "Auntie May's Kitchen",
    cookAvatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=200&q=80',
    cookBio: 'Grandmother of three in Tampines with over 35 years of Cantonese wok cooking. Believes good health starts with slow-simmered herbal broths and clean unadulterated ingredients.',
    cookAddressShort: 'Blk 242 Tampines St 21',
    completedBatches: 45,
    cookingSchedule: 'Cantonese slow-simmered meals every Mon & Wed',
    repeatCustomerRate: 91,
    mealName: 'Sweet & Sour Kurobuta Pork + Lotus Root Rib Soup',
    mealImage: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Twice-glazed pork tenderloin in hawthorn sauce, steamed rice, and 3-hour lotus root rib broth.',
    fullDescription: 'Authentic Cantonese home comfort. Auntie May hand-cuts tender pork, flash-fries for a crunchy crust, and coats it in natural hawthorn and plum reduction (no food coloring). Accompanied by fragrant jasmine rice and a restorative soup simmered with dried cuttlefish, red dates, and fresh lotus root.',
    cuisine: 'Cantonese Home-Style',
    pricePerPortion: 9.50,
    neighbourhood: 'Tampines',
    distanceKm: 0.8,
    pickupLocation: 'Blk 242 Tampines St 21 (Drop-off Porch)',
    pickupWindow: '6:00 – 7:30 PM',
    deliveryArea: 'Tampines Central, Tampines East, St 21/22',
    deliveryWindow: '6:00 – 7:30 PM',
    deliveryClusterName: 'Tampines St 21 Cluster',
    deliveryClusterHouseholdsJoined: 3,
    deliveryClusterThreshold: 5,
    dayBucket: 'tonight',
    orderCutoffTime: '4:00 PM (Today)',
    batchCapacity: 15,
    portionsBooked: 11,
    groupOrderThreshold: 15,
    currentDeliveryFee: 3.50,
    unlockedDeliveryFee: 2.00,
    rating: 5.0,
    reviewCount: 52,
    featuredReview: {
      author: 'Kelvin Koh',
      residentArea: 'Tampines St 22 resident',
      orderCount: 9,
      rating: 5.0,
      comment: 'Tastes exactly like my mother-in-law’s cooking. The lotus root soup is nourishing and rich without MSG.',
    },
    neighbourPhotos: [
      'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1600335895229-6e75511892c8?auto=format&fit=crop&w=400&q=80',
    ],
    reviews: [
      {
        id: 'rev_201',
        author: 'Kelvin Koh',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
        rating: 5.0,
        date: 'Yesterday',
        residentArea: 'Tampines St 22',
        orderCount: 9,
        comment: 'Tastes like mom cooked it. The soup alone is worth every cent.',
      },
    ],
    allergens: [
      'Soy',
      'Seafood trace in broth',
    ],
    ingredients: [
      'Kurobuta pork tenderloin',
      'Fresh lotus root',
      'Pork soft ribs',
      'Red dates & wolfberries',
      'Bell peppers & pineapple',
      'Jasmine rice',
    ],
    status: 'OPEN',
  },
  {
    id: 'drop_003',
    cookId: 'cook_mai_03',
    cookName: "Mai's Home Kitchen",
    cookAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    cookBio: 'Hanoi-born home cook in Bugis who has lived in Singapore for 10 years, making comforting street-style and home Vietnamese classics for nearby neighbours.',
    cookAddressShort: 'Blk 4 Bugis Victoria Street',
    completedBatches: 32,
    cookingSchedule: 'Vietnamese family meals every Wed & Fri',
    repeatCustomerRate: 88,
    mealName: 'Cơm Tấm Sườn Nướng (Broken Rice with Grilled Pork Chop)',
    mealImage: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
    shortDescription: 'Grilled pork chop with broken rice, egg, pickled vegetables and nước chấm.',
    fullDescription: 'Marinated pork chop char-grilled over low heat, served with fragrant broken rice, sunny-side fried egg, house-pickled daikon and carrots, fresh cucumber slices, and garlic-chilli nước chấm.',
    cuisine: 'Vietnamese Home-Style',
    pricePerPortion: 9.90,
    neighbourhood: 'Bugis',
    distanceKm: 0.6,
    pickupLocation: 'Blk 4 Victoria Street (Pavilion walkway)',
    pickupWindow: '7:00 – 8:30 PM',
    deliveryArea: 'Bugis, Bras Basah, Rochor, Middle Road',
    deliveryWindow: '7:00 – 8:30 PM',
    deliveryClusterName: 'Bugis Rochor Cluster',
    deliveryClusterHouseholdsJoined: 4,
    deliveryClusterThreshold: 5,
    dayBucket: 'tonight',
    orderCutoffTime: '5:00 PM (Today)',
    batchCapacity: 20,
    portionsBooked: 17,
    groupOrderThreshold: 20,
    currentDeliveryFee: 3.50,
    unlockedDeliveryFee: 2.00,
    rating: 4.9,
    reviewCount: 42,
    featuredReview: {
      author: 'Marcus Ho',
      residentArea: 'Rochor resident',
      orderCount: 5,
      rating: 5.0,
      comment: 'The pork chop was charred just right and broken rice was fluffy and fragrant. The nước chấm ties the whole dish together!',
    },
    neighbourPhotos: [
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=400&q=80',
    ],
    reviews: [
      {
        id: 'rev_301',
        author: 'Marcus Ho',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        rating: 5.0,
        date: '3 days ago',
        residentArea: 'Rochor Centre',
        orderCount: 5,
        comment: 'The pork chop was charred just right and broken rice was fluffy. Super authentic.',
      },
    ],
    allergens: [
      'Fish sauce',
      'Egg',
    ],
    ingredients: [
      'Broken rice (cơm tấm)',
      'Marinated grilled pork chop',
      'Sunny-side fried egg',
      'House pickled carrot & daikon',
      'Fresh Japanese cucumber',
      'Garlic-chilli nước chấm dip',
    ],
    status: 'OPEN',
  },
  {
    id: 'drop_004',
    cookId: 'cook_priya_04',
    cookName: "Priya's Home Tiffin",
    cookAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    cookBio: 'North Indian home cook settled in Clementi. Prepares wholesome homestyle vegetarian tiffins without heavy oil or commercial restaurant coloring.',
    cookAddressShort: 'Blk 354 Clementi Ave 2',
    completedBatches: 19,
    cookingSchedule: 'Homestyle vegetarian tiffins on Tue & Thu',
    repeatCustomerRate: 79,
    mealName: 'Paneer Butter Masala with 3 Soft Rotis & Jeera Rice',
    mealImage: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Fresh cottage cheese in roasted tomato cashew gravy, 3 hot wholewheat rotis, jeera rice & raita.',
    fullDescription: 'Priya makes fresh soft paneer from local milk every morning. The gravy is thickened with stone-ground cashews and sweet vine tomatoes, simmered with freshly pounded green cardamom and kasoori methi. Wholesome, preservative-free, and tastes like Sunday lunch back in Delhi.',
    cuisine: 'North Indian Home-Style',
    pricePerPortion: 11.20,
    neighbourhood: 'Clementi',
    distanceKm: 1.5,
    pickupLocation: 'Blk 354 Clementi Ave 2 (Next to Badminton Court)',
    pickupWindow: '12:30 – 2:00 PM',
    deliveryArea: 'Clementi Ave 2/3/5, Dover, Buona Vista',
    deliveryWindow: '12:30 – 2:00 PM',
    deliveryClusterName: 'Clementi North Cluster',
    deliveryClusterHouseholdsJoined: 2,
    deliveryClusterThreshold: 5,
    dayBucket: 'tomorrow',
    orderCutoffTime: '10:30 AM (Tomorrow)',
    batchCapacity: 12,
    portionsBooked: 7,
    groupOrderThreshold: 12,
    currentDeliveryFee: 4.50,
    unlockedDeliveryFee: 2.50,
    rating: 4.8,
    reviewCount: 29,
    featuredReview: {
      author: 'Siddharth Rao',
      residentArea: 'Clementi Ave 2 resident',
      orderCount: 4,
      rating: 5.0,
      comment: 'Paneer was super soft and rotis arrived warm wrapped in foil. True home-cooked comfort with very light oil.',
    },
    neighbourPhotos: [
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80',
    ],
    reviews: [
      {
        id: 'rev_401',
        author: 'Siddharth Rao',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
        rating: 5.0,
        date: 'Last week',
        residentArea: 'Blk 352 Clementi',
        orderCount: 4,
        comment: 'Paneer was super soft and rotis arrived warm in foil wrapping. Highly recommend!',
      },
    ],
    allergens: [
      'Dairy',
      'Cashew nuts',
    ],
    ingredients: [
      'Artisanal cottage cheese (paneer)',
      'Vine-ripened tomatoes & cashews',
      'Wholewheat atta flour for rotis',
      'Jeera basmati rice',
      'House-made spiced yogurt raita',
    ],
    status: 'OPEN',
  },
  {
    id: 'drop_005',
    cookId: 'cook_sarah_05',
    cookName: 'Nourish by Sarah',
    cookAvatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=200&q=80',
    cookBio: 'Sports nutritionist and Queenstown resident preparing clean, nutrient-dense macro-balanced home meals for busy neighbours and desk workers.',
    cookAddressShort: 'Blk 52 Strathmore Ave',
    completedBatches: 31,
    cookingSchedule: 'Nutrient-rich bowls every Tue, Thu & Sat',
    repeatCustomerRate: 92,
    mealName: 'Grilled Miso Salmon Bowl with Quinoa & Edamame',
    mealImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Miso Norwegian salmon fillet, tri-color quinoa, roasted kabocha squash, charred edamame & ginger dip.',
    fullDescription: 'Designed for optimal energy and zero food coma. Features 180g of Norwegian salmon grilled with mild Shiro miso, piled atop fluffy organic Andean quinoa, roasted Japanese pumpkin, and steamed edamame. Clean, vibrant, and packed with 36g clean protein.',
    cuisine: 'Healthy Home-Style',
    pricePerPortion: 13.50,
    neighbourhood: 'Queenstown',
    distanceKm: 2.1,
    pickupLocation: 'Blk 52 Strathmore Ave (Community Garden corner)',
    pickupWindow: '6:30 – 8:00 PM',
    deliveryArea: 'Queenstown, Dawson, Strathmore, Redhill',
    deliveryWindow: '6:30 – 8:00 PM',
    deliveryClusterName: 'Queenstown Dawson Cluster',
    deliveryClusterHouseholdsJoined: 4,
    deliveryClusterThreshold: 5,
    dayBucket: 'tomorrow',
    orderCutoffTime: '4:30 PM (Tomorrow)',
    batchCapacity: 15,
    portionsBooked: 14,
    groupOrderThreshold: 15,
    currentDeliveryFee: 4.00,
    unlockedDeliveryFee: 2.00,
    rating: 4.9,
    reviewCount: 31,
    featuredReview: {
      author: 'Chloe Lim',
      residentArea: 'Strathmore Ave resident',
      orderCount: 7,
      rating: 5.0,
      comment: 'Finally healthy home food that is properly seasoned! The salmon portion is hearty and the dressing is on point.',
    },
    neighbourPhotos: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
    ],
    reviews: [
      {
        id: 'rev_501',
        author: 'Chloe Lim',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80',
        rating: 5.0,
        date: '2 days ago',
        residentArea: 'Dawson SkyVille',
        orderCount: 7,
        comment: 'Finally healthy food that actually tastes seasoned! Only 1 order left for tomorrow so glad I grabbed one.',
      },
    ],
    allergens: [
      'Fish',
      'Soy',
      'Sesame',
    ],
    ingredients: [
      'Norwegian salmon fillet (180g)',
      'White organic Shiro miso',
      'Tri-color quinoa',
      'Japanese kabocha pumpkin',
      'Shelled edamame beans',
      'Sesame ginger dressing',
    ],
    status: 'ALMOST_FULL',
  },
  {
    id: 'drop_006',
    cookId: 'cook_tan_06',
    cookName: 'Tan Family Kitchen',
    cookAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    cookBio: 'Father-and-son cooking duo in Jurong East recreating heritage claypot recipes perfected over three generations. Uses earthenware pots for proper crust.',
    cookAddressShort: 'Blk 112 Jurong East St 13',
    completedBatches: 15,
    cookingSchedule: 'Claypot weekend feast sets every Saturday',
    repeatCustomerRate: 82,
    mealName: 'Claypot Sesame Chicken & Shiitake Rice (Family Set for 3-4)',
    mealImage: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Fragrant dark soya chicken slow-cooked with whole shiitakes, lap cheong, ginger & crispy rice bottom crust.',
    fullDescription: 'A complete hearty family dinner intended to be shared. Cooked in earthenware pots with premium aged dark soy sauce, pure toasted sesame oil, whole braised Japanese mushrooms, and fragrant jasmine rice with crispy golden bottom crust. Comes with blanched Hong Kong choy sum in oyster sauce.',
    cuisine: 'Family Dinner Set',
    pricePerPortion: 24.00,
    neighbourhood: 'Jurong East',
    distanceKm: 1.8,
    pickupLocation: 'Blk 112 Jurong East St 13 (Multi-Storey Carpark Lift A)',
    pickupWindow: '6:00 – 7:30 PM',
    deliveryArea: 'Jurong East St 13/21/24, Yuhua, Toh Guan',
    deliveryWindow: '6:00 – 7:30 PM',
    deliveryClusterName: 'Jurong East St 13 Cluster',
    deliveryClusterHouseholdsJoined: 3,
    deliveryClusterThreshold: 4,
    dayBucket: 'weekend',
    orderCutoffTime: '3:00 PM (Saturday)',
    batchCapacity: 10,
    portionsBooked: 8,
    groupOrderThreshold: 10,
    currentDeliveryFee: 5.00,
    unlockedDeliveryFee: 3.00,
    rating: 5.0,
    reviewCount: 42,
    featuredReview: {
      author: 'Bernard Teo',
      residentArea: 'Jurong East St 24 resident',
      orderCount: 3,
      rating: 5.0,
      comment: 'Fed our family of 4 comfortably. The crispy rice bottom was sensational and still hot upon pickup!',
    },
    neighbourPhotos: [
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
    ],
    reviews: [
      {
        id: 'rev_601',
        author: 'Bernard Teo',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=100&q=80',
        rating: 5.0,
        date: 'Last Saturday',
        residentArea: 'Jurong East St 24',
        orderCount: 3,
        comment: 'Fed our family of 4 comfortably. The crispy rice bottom was sensational!',
      },
    ],
    allergens: [
      'Soy',
      'Sesame',
      'Pork (Lap cheong)',
    ],
    ingredients: [
      'Fresh chicken thighs',
      'Whole dried shiitake mushrooms',
      'Artisanal waxed sausage (lap cheong)',
      'Pure toasted sesame oil & ginger',
      'Fragrant jasmine rice',
      'Hong Kong choy sum greens',
    ],
    status: 'OPEN',
  },
  /**
   * Server-only batch retained for future use. Deliberately outside the
   * approved drop_001-drop_006 range and not exposed in the frontend yet.
   */
  {
    id: 'drop_007',
    cookId: 'cook_fazilah_04',
    cookName: "Kak Fazilah's Dapur",
    cookAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    cookBio: 'Passionate home chef living in Queenstown for 15 years. Uses heritage spices stone-ground by hand and fresh coconut milk pressed daily from the wet market.',
    cookAddressShort: 'Blk 52 Strathmore Ave',
    completedBatches: 31,
    cookingSchedule: 'Rendang and traditional Malay feast every Sat',
    repeatCustomerRate: 88,
    mealName: 'Slow-Simmered Beef Rendang Tok + Nasi Kunyit Set',
    mealImage: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Tender beef shank caramelized in toasted coconut kerisik, fragrant turmeric rice & sambal telur.',
    fullDescription: 'The crown jewel of Malay hospitality. 5 hours of patient reduction ensures the beef is melt-in-mouth tender while absorbing roasted spices, lemongrass, and freshly pounded kerisik. Served alongside fragrant pandan turmeric rice, sambal egg, and spiced achar.',
    cuisine: 'Malay Heritage (Muslim-Owned Home)',
    pricePerPortion: 12.00,
    neighbourhood: 'Queenstown',
    distanceKm: 3.5,
    pickupLocation: 'Blk 52 Strathmore Ave (Void Deck Resident Corner)',
    pickupWindow: '12:00 – 1:30 PM (Saturday Lunch)',
    deliveryArea: 'Queenstown, Dawson, Redhill, Tanglin Halt',
    deliveryWindow: '12:00 – 1:30 PM',
    deliveryClusterName: 'Strathmore Green Cluster',
    deliveryClusterHouseholdsJoined: 5,
    deliveryClusterThreshold: 5,
    dayBucket: 'weekend',
    orderCutoffTime: 'Fri 8:00 PM',
    batchCapacity: 20,
    portionsBooked: 20,
    groupOrderThreshold: 18,
    currentDeliveryFee: 2.00,
    unlockedDeliveryFee: 2.00,
    rating: 5.0,
    reviewCount: 42,
    featuredReview: {
      author: 'Farhan Ibrahim',
      residentArea: 'Dawson Road resident',
      orderCount: 5,
      rating: 5,
      comment: 'Hands down the best rendang in Queenstown. Thick caramelized kerisik coat, not watery curry. Already unlocked S$2 delivery!',
    },
    neighbourPhotos: [
      'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=600&q=80',
    ],
    reviews: [],
    allergens: ['Beef', 'Eggs', 'Coconut'],
    ingredients: [
      'Prime beef shank & brisket',
      'Freshly grated and toasted coconut kerisik',
      'Galangal, turmeric, lemongrass, shallots',
      'Pandan turmeric fragrant rice',
      'Hard-boiled farm egg in sambal tumis',
    ],
    status: 'SOLD_OUT',
  }];

let batchesState: MarketplaceBatch[] = JSON.parse(JSON.stringify(INITIAL_BATCHES));

export function getAllBatches(neighbourhood?: string) {
  let list = batchesState;
  if (neighbourhood && neighbourhood !== 'All') {
    list = list.filter(
      (b) => b.neighbourhood.toLowerCase() === neighbourhood.toLowerCase()
    );
  }

  // Calculate cluster fee status deterministically
  return list.map((b) => {
    const fee =
      b.deliveryClusterHouseholdsJoined >= b.deliveryClusterThreshold
        ? b.unlockedDeliveryFee
        : b.currentDeliveryFee;
    return {
      ...b,
      effectiveDeliveryFee: fee,
    };
  });
}

export function getBatchById(id: string): MarketplaceBatch | null {
  const batch = batchesState.find((b) => b.id === id);
  if (!batch) return null;

  const fee =
    batch.deliveryClusterHouseholdsJoined >= batch.deliveryClusterThreshold
      ? batch.unlockedDeliveryFee
      : batch.currentDeliveryFee;

  return {
    ...batch,
    currentDeliveryFee: fee,
  };
}

export function registerOrderInBatch(
  batchId: string,
  quantity: number,
  fulfilmentType: 'pickup' | 'delivery'
) {
  const index = batchesState.findIndex((b) => b.id === batchId);
  if (index === -1) return null;

  const batch = batchesState[index];
  const newBooked = batch.portionsBooked + quantity;
  const newHouseholds =
    fulfilmentType === 'delivery'
      ? batch.deliveryClusterHouseholdsJoined + 1
      : batch.deliveryClusterHouseholdsJoined;

  const isSoldOut = newBooked >= batch.batchCapacity;
  const isUnlocked = newBooked >= batch.groupOrderThreshold;

  batchesState[index] = {
    ...batch,
    portionsBooked: newBooked,
    deliveryClusterHouseholdsJoined: newHouseholds,
    status: isSoldOut ? 'SOLD_OUT' : isUnlocked ? 'UNLOCKED' : batch.status,
  };

  return batchesState[index];
}
