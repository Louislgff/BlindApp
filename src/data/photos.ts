// Photos de démonstration (Pexels, libres de droits). En production : URL signées et de courte
// durée, servies uniquement après un reveal mutuel (voir can_view_photos dans supabase/schema.sql).
import type { ImageSourcePropType } from 'react-native';

export const DEMO_PHOTOS: Record<string, ImageSourcePropType[]> = {
  me: [
    require('../../assets/demo/lucien-1.jpg'),
    require('../../assets/demo/lucien-2.jpg'),
    require('../../assets/demo/lucien-3.jpg'),
  ],
  lea: [
    require('../../assets/demo/lea-1.jpg'),
    require('../../assets/demo/lea-2.jpg'),
    require('../../assets/demo/lea-3.jpg'),
    require('../../assets/demo/lea-4.jpg'),
  ],
};
