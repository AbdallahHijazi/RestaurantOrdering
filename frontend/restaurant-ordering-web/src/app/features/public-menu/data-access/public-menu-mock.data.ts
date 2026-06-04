import type { PublicMenuPageData } from '../models/public-menu.models';

export const DEMO_RESTAURANT_SLUG = 'demo';

const IMAGE = {
  cover:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  logo:
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
  dish1:
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  dish2:
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  dish3:
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
  dish4:
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
  dish5:
    'https://images.unsplash.com/photo-1482049010885-05f6637b9231?auto=format&fit=crop&w=800&q=80',
  dish6:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  dish7:
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=800&q=80',
  dish8:
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
  dish9:
    'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=800&q=80',
} as const;

export const MOCK_PUBLIC_MENU: PublicMenuPageData = {
  orderSettings: {
    currencyCode: 'SAR',
    taxRate: 15,
    deliveryFee: 12,
    minimumOrderAmount: 0,
    isDeliveryEnabled: true,
    isPickupEnabled: true,
  },
  restaurant: {
    slug: DEMO_RESTAURANT_SLUG,
    nameAr: 'عالم النبات',
    nameEn: 'The Botanist',
    descriptionAr:
      'تجربة طهي موسمية أنيقة تجمع بين النكهات المحلية واللمسة النباتية الراقية.',
    descriptionEn:
      'A seasonal culinary experience blending local heritage with botanical elegance.',
    logoUrl: IMAGE.logo,
    coverImageUrl: IMAGE.cover,
    primaryAccentColor: '#B8663F',
    countryCode: 'SA',
    currencyCode: 'SAR',
    timeZone: 'Asia/Riyadh',
    phoneNumber: '+966501234567',
    whatsAppNumber: '+966501234567',
    addressAr: 'حي النخيل، الرياض',
    addressEn: 'Al Nakheel District, Riyadh',
    isOpen: true,
  },
  categories: [
    {
      id: 'cat-starters',
      nameAr: 'المقبلات',
      nameEn: 'Starters',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'cat-mains',
      nameAr: 'الأطباق الرئيسية',
      nameEn: 'Mains',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'cat-desserts',
      nameAr: 'الحلويات',
      nameEn: 'Desserts',
      displayOrder: 3,
      isActive: true,
    },
  ],
  items: [
    {
      id: 'item-1',
      categoryId: 'cat-starters',
      nameAr: 'سلطة الأعشاب الموسمية',
      nameEn: 'Seasonal Herb Salad',
      descriptionAr: 'خضار طازجة مع صلصة الحمضيات والزيت البكر.',
      descriptionEn: 'Fresh greens with citrus vinaigrette and extra virgin olive oil.',
      price: 32,
      discountPrice: 28,
      imageUrl: IMAGE.dish1,
      isAvailable: true,
      isPopular: true,
      isVegetarian: true,
    },
    {
      id: 'item-2',
      categoryId: 'cat-starters',
      nameAr: 'حمص بالكمأ',
      nameEn: 'Truffle Hummus',
      descriptionAr: 'حمص كريمي مع زيت الكمأ وزيت الزيتون.',
      descriptionEn: 'Creamy hummus finished with truffle oil.',
      price: 38,
      imageUrl: IMAGE.dish2,
      isAvailable: true,
      isVegetarian: true,
    },
    {
      id: 'item-3',
      categoryId: 'cat-starters',
      nameAr: 'فطائر الجبن المشوية',
      nameEn: 'Grilled Cheese Bites',
      descriptionAr: 'أقراص جبن مشوية مع عسل الزهور.',
      descriptionEn: 'Grilled cheese rounds with wildflower honey.',
      price: 42,
      imageUrl: IMAGE.dish3,
      isAvailable: false,
    },
    {
      id: 'item-4',
      categoryId: 'cat-mains',
      nameAr: 'سلمون مشوي بالأعشاب',
      nameEn: 'Herb-Crusted Salmon',
      descriptionAr: 'سلمون طازج مع خضار موسمية.',
      descriptionEn: 'Fresh salmon with seasonal vegetables.',
      price: 98,
      discountPrice: 85,
      imageUrl: IMAGE.dish4,
      isAvailable: true,
      isPopular: true,
    },
    {
      id: 'item-5',
      categoryId: 'cat-mains',
      nameAr: 'ريش غنم بالبهارات',
      nameEn: 'Spiced Lamb Chops',
      descriptionAr: 'ريش غنم مشوية مع صلصة الرمان.',
      descriptionEn: 'Char-grilled lamb chops with pomegranate glaze.',
      price: 145,
      imageUrl: IMAGE.dish5,
      isAvailable: true,
    },
    {
      id: 'item-6',
      categoryId: 'cat-mains',
      nameAr: 'ريزوتو الفطر',
      nameEn: 'Wild Mushroom Risotto',
      descriptionAr: 'أرز كريمي مع فطر برّي وجبن بارميسان.',
      descriptionEn: 'Carnaroli rice with wild mushrooms and parmesan.',
      price: 88,
      imageUrl: IMAGE.dish6,
      isAvailable: true,
      isVegetarian: true,
    },
    {
      id: 'item-7',
      categoryId: 'cat-mains',
      nameAr: 'دجاج بالليمون',
      nameEn: 'Lemon Herb Chicken',
      descriptionAr: 'صدر دجاج مشوي مع أعشاب البحر المتوسط.',
      descriptionEn: 'Roasted chicken breast with Mediterranean herbs.',
      price: 72,
      imageUrl: IMAGE.dish7,
      isAvailable: true,
    },
    {
      id: 'item-8',
      categoryId: 'cat-desserts',
      nameAr: 'كيك الجبن بالفستق',
      nameEn: 'Pistachio Cheesecake',
      descriptionAr: 'كيك جبن كريمي مع فستق حلبي.',
      descriptionEn: 'Silky cheesecake with roasted pistachios.',
      price: 45,
      discountPrice: 39,
      imageUrl: IMAGE.dish8,
      isAvailable: true,
      isPopular: true,
    },
    {
      id: 'item-9',
      categoryId: 'cat-desserts',
      nameAr: 'شوكولاتة بالبرتقال',
      nameEn: 'Orange Dark Chocolate',
      descriptionAr: 'شوكولاتة داكنة مع قشر البرتقال المكرمل.',
      descriptionEn: 'Dark chocolate with caramelized orange peel.',
      price: 36,
      imageUrl: IMAGE.dish9,
      isAvailable: true,
    },
  ],
};

export const MOCK_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80';