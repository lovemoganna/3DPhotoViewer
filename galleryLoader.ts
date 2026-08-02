import { GalleryItem } from './types';

// Preset metadata descriptions for known items if desired, fallback to title
const PRESET_DESCRIPTIONS: Record<string, string> = {
  '盘古开天辟地': '天地混沌如鸡子，盘古生其中，开天辟地，创造万物。',
  '女娲补天': '往古之时，四极废，九州裂，女娲炼五色石以补苍天。',
  '伏羲画卦': '仰则观象于天，俯则观法于地，始作八卦，通神明之德。',
  '神农尝百草': '神农氏尝百草之滋味，水泉之甘苦，教民播种五谷。',
  '后羿射日': '十日并出，焦禾作物，后羿弯弓搭箭，挽救苍生于水火。',
  '嫦娥奔月': '嫦娥吞不死药，身轻如叶，飘飞入月宫，永居广寒。',
  '夸父逐日': '夸父与日逐走，入日，渴欲得饮，化为邓林。',
  '精卫填海': '炎帝少女名曰女娃，溺而不返，化为精卫，常衔西山木石以填东海。',
  '大禹治水': '三过家门而不入，疏通江河，平息水患，定九州大地。',
  '黄帝战蚩尤': '涿鹿之战，应龙吐水，指南车破迷雾，奠定华夏之基。',

  '唐代赤金瑞兽纹': '唐代经典赤金锻造图腾，雄健矫捷，彰显盛唐万国来朝之昂扬气概。',
  '宝相花鎏金图腾': '融合莲花与牡丹之姿的盛唐宝相花，雍容华贵，寓意吉庆祥瑞。',
  '青龙呈祥壁画纹': '敦煌及唐代宫廷壁画经典四象青龙纹样，鳞爪宛然，气势恢宏。',
  '朱雀展翅铜镜纹': '唐代金银平脱铜镜常见朱雀图腾，羽翼丰盈，栩栩如生。',
  '金翅鸟迦楼罗纹': '西域丝路文化与中原交融之金翅神鸟图腾，庄严神圣，辟邪镇宅。',
  '三彩飞天御鹿纹': '唐三彩典雅釉彩风格中的瑞鹿图腾，矫健飘逸，如梦似幻。',
  '唐代海兽葡萄纹': '唐代最富盛名的海马葡萄镜纹饰，融汇中外艺术精华，繁复精美。',
  '团花瑞锦纹饰': '丝绸之路唐锦核心团花图案，结构对称庄严，富丽堂皇。',
  '玄武御水铜盘纹': '龟蛇合体之四象玄武图腾，沉稳刚健，具镇守北方水德之意。',
  '盛唐双凤朝阳图': '双凤对鸣，祥云缭绕，展现极盛时期宫廷皇家图腾极致工艺。'
};

const CATEGORY_ICONS: Record<string, string> = {
  '中国古代神话': '🐉',
  '唐代图腾艺术': '⚜️',
};

export interface GalleryCategory {
  id: string;
  name: string;
  icon: string;
  items: GalleryItem[];
}

export function loadGalleriesAuto(): { categories: GalleryCategory[]; allItems: GalleryItem[] } {
  // Use Vite's import.meta.glob to dynamically scan all image files inside Data/Img subdirectories
  const modules = import.meta.glob<{ default: string }>('./Data/Img/*/*.{png,jpg,jpeg,webp,svg,gif}', { eager: true });

  const categoryMap: Record<string, GalleryItem[]> = {};

  Object.keys(modules).forEach((filePath) => {
    // filePath format example: "./Data/Img/唐代图腾艺术/ChatGPT Image Aug 1, 2026, 11_12_45 PM (1).png"
    const parts = filePath.split('/');
    if (parts.length >= 4) {
      const categoryName = parts[3]; // Subfolder name
      const fileNameWithExt = parts[parts.length - 1];
      const assetUrl = modules[filePath].default || filePath;

      // Clean up title or match preset title
      let title = fileNameWithExt.replace(/\.[^/.]+$/, "");
      
      // Look for preset title matches
      let matchedDescription = '精美典藏艺术画作';
      for (const [key, desc] of Object.entries(PRESET_DESCRIPTIONS)) {
        if (title.includes(key) || key.includes(title)) {
          title = key;
          matchedDescription = desc;
          break;
        }
      }

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = [];
      }

      const id = `${categoryName}-${categoryMap[categoryName].length + 1}`;

      categoryMap[categoryName].push({
        id,
        title,
        url: assetUrl,
        category: categoryName,
        description: matchedDescription,
      });
    }
  });

  const categories: GalleryCategory[] = Object.keys(categoryMap).map((catName, idx) => ({
    id: `cat-${idx + 1}`,
    name: catName,
    icon: CATEGORY_ICONS[catName] || '🖼️',
    items: categoryMap[catName],
  }));

  const allItems = categories.flatMap((cat) => cat.items);

  return { categories, allItems };
}
