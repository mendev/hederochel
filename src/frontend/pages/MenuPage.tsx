import { useState, useEffect } from 'react';
import menuItemsData from '../data/menuItems.json';
import { motion, AnimatePresence } from 'framer-motion';

interface price {
  size: string;
  price: number;
}

interface MenuItem {
  id: number;
  name: string;
  category: string;
  prices: price[];
  image: string;
  description: string;
  available: boolean;
}

const menuItems = menuItemsData as MenuItem[];

const categories = Array.from(
  new Set(menuItems.map((item) => item.category))
);




const groupedItems = menuItems.reduce((groups, item) => {
  if (!item.available) return groups;
  if (!groups[item.category]) groups[item.category] = [];
  groups[item.category].push(item);
  return groups;
}, {} as Record<string, MenuItem[]>);
interface ItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

function ItemModal({ item, onClose }: ItemModalProps) {
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="סגור">
          ×
        </button>
        <div className="modal-image">
          <img src={item.image} alt={item.name} />
        </div>
        <div className="modal-info">
          <h2 className="modal-title">{item.name}</h2>
          {item.prices.map((serving) => (
           <div className="modal-price">{serving.size} - {serving.price.toFixed(0)} ניקובים </div>
          ))}
          <div className="modal-description">
            <h3>תיאור:</h3>
            <p>{item.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuPage() {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(categories)); // open all initially

  const toggleCategory = (category: string) => {
  setOpenCategories(prev => {
    const newSet = new Set(prev);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    return newSet;
  });
};

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedItem]);

  return (
    <div className="page-content">
  <div className="menu-header">
  <img 
    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68eac3828de1bc1e5375b02f/5d877b84f_image.png" 
    alt="חדר אוכל"
    className="logo-image"
  />
  <h2 className="menu-title">תפריט</h2>
</div>
  {Object.entries(groupedItems).map(([category, items]) => {
  const isOpen = openCategories.has(category);

  return (
    <div key={category} className="menu-category">
      <div
        className="category-header"
        onClick={() => toggleCategory(category)}
      >
        <h3 className="category-title">{isOpen ? '–' : '+'} {category}</h3>
        {/* <span className="category-toggle">
          
        </span> */}
      </div>

      <AnimatePresence initial={false}>
  {isOpen && (
    <motion.div
      key="content"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{ overflow: 'hidden' }}
    >
      <div className="menu-grid">
        {items.map((item) => (
          <div
            key={item.id}
            className="menu-item"
            onClick={() => setSelectedItem(item)}
          >
            <div className="menu-item-image">
              <img src={item.image} alt={item.name} />
            </div>
            <div className="menu-item-info">
              <h3 className="menu-item-name">{item.name}</h3>
              {item.prices.length === 1 && (
                <div className="menu-item-price">
                  {item.prices[0].size} - {item.prices[0].price.toFixed(0)} ניקובים
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )}
</AnimatePresence>
    </div>
  );
})}

  <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    <p>ייתכנו שינויים במוצרים ובהגשה בהתאם למלאי. התמונות והפריטים בתפריט להמחשה בלבד.</p>

</div>

  );
}

export default MenuPage;

