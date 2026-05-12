const categories = [
  { _id: 'cat-rice', name: '🍚 招牌主食', sort: 1 },
  { _id: 'cat-noodle', name: '🍜 面食小馆', sort: 2 },
  { _id: 'cat-snack', name: '🍗 小吃配菜', sort: 3 },
  { _id: 'cat-drink', name: '🧋 饮品甜品', sort: 4 }
];

const products = [
  {
    _id: 'p001',
    categoryId: 'cat-rice',
    name: '🥩 黑椒牛肉饭',
    description: '嫩牛肉、太阳蛋、时蔬和黑椒汁叠在一页热腾腾的米饭上。',
    price: 32,
    sales: 126,
    tag: '热卖',
    image: '',
    available: true
  },
  {
    _id: 'p002',
    categoryId: 'cat-rice',
    name: '🍗 照烧鸡腿饭',
    description: '去骨鸡腿现煎出焦香，照烧酱收汁，搭配清爽蔬菜。',
    price: 28,
    sales: 98,
    tag: '推荐',
    image: '',
    available: true
  },
  {
    _id: 'p003',
    categoryId: 'cat-noodle',
    name: '🍅 番茄肥牛面',
    description: '酸甜番茄汤底配肥牛卷，入口轻盈但很满足。',
    price: 30,
    sales: 76,
    tag: '新品',
    image: '',
    available: true
  },
  {
    _id: 'p004',
    categoryId: 'cat-noodle',
    name: '🧅 葱油拌面',
    description: '慢熬葱油裹住劲道面条，再配一颗溏心蛋。',
    price: 19,
    sales: 141,
    tag: '',
    image: '',
    available: true
  },
  {
    _id: 'p005',
    categoryId: 'cat-snack',
    name: '🍿 黄金鸡米花',
    description: '外壳酥脆、肉汁饱满，适合翻菜单时顺手加一份。',
    price: 16,
    sales: 88,
    tag: '',
    image: '',
    available: true
  },
  {
    _id: 'p006',
    categoryId: 'cat-snack',
    name: '🥬 蒜香烤时蔬',
    description: '低负担配菜，现烤出餐，蒜香和蔬菜甜味刚刚好。',
    price: 18,
    sales: 52,
    tag: '',
    image: '',
    available: true
  },
  {
    _id: 'p007',
    categoryId: 'cat-drink',
    name: '🍋 冷萃柠檬茶',
    description: '清爽解腻，少糖也好喝，适合搭配重口味主食。',
    price: 12,
    sales: 113,
    tag: '解腻',
    image: '',
    available: true
  },
  {
    _id: 'p008',
    categoryId: 'cat-drink',
    name: '🌸 桂花酒酿圆子',
    description: '温热甜品，桂花香气轻轻铺开，收尾很舒服。',
    price: 15,
    sales: 64,
    tag: '',
    image: '',
    available: true
  }
];

module.exports = {
  categories,
  products
};
