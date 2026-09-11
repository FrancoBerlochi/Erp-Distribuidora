const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const sampleProducts = [
  // BEBIDAS (15)
  {
    Nombre: 'Coca Cola Original 2.25L',
    Descripción: 'Gaseosa sabor cola original botella descartable 2.25L pack x6',
    Precio: 3200,
    Stock: 120,
    Categoría: 'Bebidas',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Coca Cola Sin Azúcar 2.25L',
    Descripción: 'Gaseosa Coca-Cola sabor zero azúcar 2.25L',
    Precio: 3200,
    Stock: 80,
    Categoría: 'Bebidas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Sprite Lima Limón 2.25L',
    Descripción: 'Gaseosa refrescante lima limón botella 2.25L',
    Precio: 3100,
    Stock: 95,
    Categoría: 'Bebidas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Fanta Naranja 2.25L',
    Descripción: 'Gaseosa sabor naranja clásica botella 2.25L',
    Precio: 3100,
    Stock: 70,
    Categoría: 'Bebidas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Agua Mineral Villavicencio 2L',
    Descripción: 'Agua mineral natural de manantial sin gas 2L',
    Precio: 1450,
    Stock: 250,
    Categoría: 'Bebidas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Agua Con Gas Bonafont 1.5L',
    Descripción: 'Agua mineralizada con gas suave gasificada 1.5L',
    Precio: 1350,
    Stock: 110,
    Categoría: 'Bebidas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Cerveza Quilmes Clásica 1L',
    Descripción: 'Cerveza rubia tradicional argentina retornable 1L',
    Precio: 2400,
    Stock: 180,
    Categoría: 'Bebidas',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Cerveza Corona Extra 710ml',
    Descripción: 'Cerveza importada lager botella 710ml',
    Precio: 3600,
    Stock: 90,
    Categoría: 'Bebidas',
    'Descuento (%)': 20,
    'Imagen URL': 'https://images.unsplash.com/photo-1608270191986-e885c3dbb98f?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Cerveza Stella Artois Lata 473ml',
    Descripción: 'Six pack de cerveza rubia premium en lata 473ml',
    Precio: 7800,
    Stock: 65,
    Categoría: 'Bebidas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Jugo Cepita Naranja 1L',
    Descripción: 'Jugo de naranja pasteurizado tetra brik 1L enriquecido con vitaminas',
    Precio: 1850,
    Stock: 140,
    Categoría: 'Bebidas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Jugo Baggio Pronto Multifruta 1L',
    Descripción: 'Bebida a base de frutas seleccionadas 1L',
    Precio: 1650,
    Stock: 130,
    Categoría: 'Bebidas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Vino Malbec Trapiche 750ml',
    Descripción: 'Vino tinto varietal Malbec Mendoza botella 750ml',
    Precio: 4500,
    Stock: 85,
    Categoría: 'Bebidas',
    'Descuento (%)': 25,
    'Imagen URL': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Fernet Branca 750ml',
    Descripción: 'Aperitivo amargo de hierbas botella 750ml original',
    Precio: 9800,
    Stock: 60,
    Categoría: 'Bebidas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Gatorade Manzana 500ml',
    Descripción: 'Bebida isotónica hidratante botella 500ml',
    Precio: 1600,
    Stock: 150,
    Categoría: 'Bebidas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Red Bull Energy Drink 250ml',
    Descripción: 'Bebida energizante en lata 250ml clásica',
    Precio: 2200,
    Stock: 115,
    Categoría: 'Bebidas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&w=500&q=75'
  },

  // ALMACÉN (20)
  {
    Nombre: 'Aceite de Girasol Cocinero 1.5L',
    Descripción: 'Aceite puro de girasol primera prensada botella 1.5L',
    Precio: 2750,
    Stock: 180,
    Categoría: 'Almacén',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Aceite de Oliva Extra Virgen Natura 500ml',
    Descripción: 'Aceite de oliva virgen extra blend prensado en frío 500ml',
    Precio: 5800,
    Stock: 75,
    Categoría: 'Almacén',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1579613832125-5d34a13ffe0a?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Arroz Lucchetti Largo Fino 1kg',
    Descripción: 'Arroz blanco no se pasa paquete 1kg',
    Precio: 1950,
    Stock: 220,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Fideos Matarazzo Tirabuzón 500g',
    Descripción: 'Fideos secos elaborados con sémola de trigo candeal 500g',
    Precio: 1350,
    Stock: 160,
    Categoría: 'Almacén',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Fideos Lucchetti Tallarín 500g',
    Descripción: 'Pastas secas de trigo candeal tipo tallarín 500g',
    Precio: 1250,
    Stock: 140,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Harina de Trigo 000 Pureza 1kg',
    Descripción: 'Harina de trigo con levadura 1kg ideal para panificados',
    Precio: 1100,
    Stock: 300,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Harina Leudante Blancaflor 1kg',
    Descripción: 'Harina enriquecida con polvo de hornear 1kg',
    Precio: 1400,
    Stock: 210,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Azúcar Ledesma Clásica 1kg',
    Descripción: 'Azúcar común tipo A de caña de azúcar 1kg',
    Precio: 1200,
    Stock: 350,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Yerba Mate Playadito 1kg',
    Descripción: 'Yerba mate con palo suave tradicional 1kg con bajo contenido de polvo',
    Precio: 4300,
    Stock: 190,
    Categoría: 'Almacén',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Yerba Mate Taragüi Sin Palo 500g',
    Descripción: 'Yerba pura hoja molienda fina 500g',
    Precio: 2600,
    Stock: 120,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Café Molido La Virginia Tostado 500g',
    Descripción: 'Café torrado molido torrefacto intenso 500g',
    Precio: 5200,
    Stock: 80,
    Categoría: 'Almacén',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Café Instantáneo Nescafé Dolca 170g',
    Descripción: 'Café soluble instantáneo suave frasco de vidrio 170g',
    Precio: 4100,
    Stock: 95,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Té Negro La Virginia Saquitos x50',
    Descripción: 'Caja de 50 saquitos de té negro selección especial',
    Precio: 1600,
    Stock: 150,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Puré de Tomate Arcor Tetra 520g',
    Descripción: 'Puré de tomates seleccionados sin conservantes 520g',
    Precio: 890,
    Stock: 400,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Atún Desmenuzado La Campagnola 170g',
    Descripción: 'Lata de atún al natural desmenuzado 170g',
    Precio: 2150,
    Stock: 140,
    Categoría: 'Almacén',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Arvejas Noel en Lata 300g',
    Descripción: 'Arvejas secas remojadas calidad premium lata 300g',
    Precio: 750,
    Stock: 280,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Choclo Amarillo Cremoso Arcor 300g',
    Descripción: 'Choclo cremoso amarillo en grano entero lata 300g',
    Precio: 1150,
    Stock: 180,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Mayonesa Hellmanns Doypack 475g',
    Descripción: 'Mayonesa clásica cremosa receta original con jugo de limón 475g',
    Precio: 2200,
    Stock: 160,
    Categoría: 'Almacén',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Mostaza Savora Clásica 250g',
    Descripción: 'Aderezo a base de mostaza con especias selectas 250g',
    Precio: 1300,
    Stock: 140,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Ketchup Dánica Especial 250g',
    Descripción: 'Salsa ketchup dulce con tomates frescos 250g',
    Precio: 1350,
    Stock: 130,
    Categoría: 'Almacén',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=500&q=75'
  },

  // SNACKS (15)
  {
    Nombre: 'Papas Fritas Lays Clásicas 140g',
    Descripción: 'Papas fritas crocantes con sal marina paquete 140g',
    Precio: 2450,
    Stock: 190,
    Categoría: 'Snacks',
    'Descuento (%)': 20,
    'Imagen URL': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Papas Fritas Lays Onduladas 140g',
    Descripción: 'Papas fritas con corte ondulado extra crujientes 140g',
    Precio: 2500,
    Stock: 110,
    Categoría: 'Snacks',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Doritos Queso Mega Crunch 140g',
    Descripción: 'Tortillas de maíz sabor a queso nacho 140g',
    Precio: 2700,
    Stock: 130,
    Categoría: 'Snacks',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Cheetos Horneados Palitos 130g',
    Descripción: 'Snack horneado de maíz sabor queso paquete 130g',
    Precio: 2100,
    Stock: 140,
    Categoría: 'Snacks',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Maní Salado Pehuamar 150g',
    Descripción: 'Maní seleccionado tostado y salado sin piel 150g',
    Precio: 1500,
    Stock: 170,
    Categoría: 'Snacks',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1567892328604-03a55e2d1923?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Mix de Frutos Secos Premium 200g',
    Descripción: 'Nueces, almendras, castañas de cajú y pasas de uva 200g',
    Precio: 4500,
    Stock: 80,
    Categoría: 'Snacks',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Papas Pringles Original 137g',
    Descripción: 'Tubo de papas deshidratadas crocantes clásicas 137g',
    Precio: 3900,
    Stock: 90,
    Categoría: 'Snacks',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Papas Pringles Crema y Cebolla 137g',
    Descripción: 'Tubo de papas sabor crema agria y cebolla 137g',
    Precio: 3900,
    Stock: 85,
    Categoría: 'Snacks',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Palitos Salados Krachitos 180g',
    Descripción: 'Snack de harina frita con sal fina crujientes 180g',
    Precio: 1400,
    Stock: 160,
    Categoría: 'Snacks',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Chizitos Krachitos Horneados 150g',
    Descripción: 'Snack inflado horneado de maíz crocante sabor queso 150g',
    Precio: 1450,
    Stock: 145,
    Categoría: 'Snacks',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Nachos Macritas 200g',
    Descripción: 'Triángulos de maíz crocantes ideales para dipear con queso o guacamole 200g',
    Precio: 2200,
    Stock: 125,
    Categoría: 'Snacks',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Twistos Crackers Queso 110g',
    Descripción: 'Bocaditos de trigo tostados horneados sabor 4 quesos 110g',
    Precio: 1800,
    Stock: 105,
    Categoría: 'Snacks',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Saladix Horneados Pizza 100g',
    Descripción: 'Galletitas horneadas crocantes sabor pizza de mozzarella 100g',
    Precio: 1250,
    Stock: 200,
    Categoría: 'Snacks',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Rex Galletitas Saladas 125g',
    Descripción: 'Snacks salados horneados clásicos redondos 125g',
    Precio: 1350,
    Stock: 110,
    Categoría: 'Snacks',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Tutucas de Maíz Azucaradas 150g',
    Descripción: 'Maíz inflado dulce tradicional paquete 150g',
    Precio: 990,
    Stock: 160,
    Categoría: 'Snacks',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=500&q=75'
  },

  // LIMPIEZA (15)
  {
    Nombre: 'Lavandina Ayudín Clásica 1L',
    Descripción: 'Lavandina común desinfectante antibacteriana multiuso 1L',
    Precio: 1200,
    Stock: 250,
    Categoría: 'Limpieza',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Lavandina en Gel Ayudín 750ml',
    Descripción: 'Lavandina en gel con mayor adherencia y poder blanqueador 750ml',
    Precio: 1850,
    Stock: 130,
    Categoría: 'Limpieza',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Detergente Magistral Limón 500ml',
    Descripción: 'Detergente concentrado antigrasa rinde x4 botella 500ml',
    Precio: 2300,
    Stock: 200,
    Categoría: 'Limpieza',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Detergente Cif BioActive Manzana 500ml',
    Descripción: 'Lavavajillas biodegradable alto poder desengrasante 500ml',
    Precio: 1950,
    Stock: 140,
    Categoría: 'Limpieza',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Desodorante de Piso Poett Lavanda 900ml',
    Descripción: 'Limpiador líquido aromatizante para pisos fragancia lavanda 900ml',
    Precio: 1650,
    Stock: 180,
    Categoría: 'Limpieza',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Limpiador en Crema Cif Blanco 750g',
    Descripción: 'Limpiador cremoso micropartículas para superficies difíciles 750g',
    Precio: 2400,
    Stock: 120,
    Categoría: 'Limpieza',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Jabón Líquido para Ropa Skip Evolution 3L',
    Descripción: 'Jabón líquido baja espuma remueve manchas difíciles bidón 3L',
    Precio: 8900,
    Stock: 90,
    Categoría: 'Limpieza',
    'Descuento (%)': 20,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Jabón Líquido Ala Camellito 3L',
    Descripción: 'Jabón concentrado para ropa blanca y de color 3L',
    Precio: 6500,
    Stock: 110,
    Categoría: 'Limpieza',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Suavizante Vivere Clásico 3L',
    Descripción: 'Suavizante para ropa fragancia suave y duradera 3L',
    Precio: 4900,
    Stock: 95,
    Categoría: 'Limpieza',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Desinfectante en Aerosol Lysoform 360ml',
    Descripción: 'Aerosol desinfectante de ambientes y superficies mata el 99.9% de bacterias 360ml',
    Precio: 2800,
    Stock: 130,
    Categoría: 'Limpieza',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Papel Higiénico Higienol Max Doble Hoja 4x30m',
    Descripción: 'Pack de 4 rollos de 30 metros doble hoja suave y resistente',
    Precio: 2900,
    Stock: 220,
    Categoría: 'Limpieza',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Rollos de Cocina Sussex Clásico x3',
    Descripción: 'Papel absorbente de cocina pack por 3 rollos hojas triples',
    Precio: 2400,
    Stock: 180,
    Categoría: 'Limpieza',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Esponja Scotch Brite Clásica Doble Acción',
    Descripción: 'Esponja de cocina con fibra verde abrasiva anti-bacterias',
    Precio: 850,
    Stock: 300,
    Categoría: 'Limpieza',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Limpiavidrios Cristalita con Gatillo 500ml',
    Descripción: 'Limpia cristales y espejos sin vetas ni marcas 500ml',
    Precio: 1750,
    Stock: 115,
    Categoría: 'Limpieza',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Bolsas de Residuos Negras 45x60cm x30',
    Descripción: 'Rollo de 30 bolsas reforzadas resistentes para tacho de basura',
    Precio: 1300,
    Stock: 210,
    Categoría: 'Limpieza',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=75'
  },

  // LÁCTEOS Y REFRIGERADOS (12)
  {
    Nombre: 'Leche Entera La Serenísima Tetra 1L',
    Descripción: 'Leche ultra pasteurizada fortificada con vitaminas A, C y D 1L',
    Precio: 1450,
    Stock: 300,
    Categoría: 'Lácteos',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Leche Descremada Ilolay Brik 1L',
    Descripción: 'Leche larga vida 0% grasas trans con calcio 1L',
    Precio: 1380,
    Stock: 220,
    Categoría: 'Lácteos',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Dulce de Leche Colonial La Serenísima 400g',
    Descripción: 'Dulce de leche clásico tradicional pote de cartón 400g',
    Precio: 2350,
    Stock: 170,
    Categoría: 'Lácteos',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Dulce de Leche San Ignacio 400g',
    Descripción: 'Dulce de leche receta tradicional premiado frasco 400g',
    Precio: 2600,
    Stock: 110,
    Categoría: 'Lácteos',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Queso Crema Casancrem Clásico 480g',
    Descripción: 'Queso crema untable libre de gluten apto celíacos 480g',
    Precio: 3400,
    Stock: 130,
    Categoría: 'Lácteos',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1589881133595-a3c085cb731d?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Queso Cremoso La Paulina x kg',
    Descripción: 'Queso cuartirolo fundente ideal pizzas y tartas precio por horma/kg',
    Precio: 6800,
    Stock: 80,
    Categoría: 'Lácteos',
    'Descuento (%)': 20,
    'Imagen URL': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Queso Muzzarella Barra Barraza x kg',
    Descripción: 'Queso muzzarella de alta hilatura para gastronomía por kg',
    Precio: 7400,
    Stock: 95,
    Categoría: 'Lácteos',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Queso Rallado La Serenísima 100g',
    Descripción: 'Blend de quesos duros estacionados sachet 100g',
    Precio: 2200,
    Stock: 140,
    Categoría: 'Lácteos',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Manteca La Serenísima Clásica 200g',
    Descripción: 'Manteca de primera calidad pasteurizada pan 200g',
    Precio: 2350,
    Stock: 160,
    Categoría: 'Lácteos',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1589881133595-a3c085cb731d?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Crema de Leche La Paulina 360g',
    Descripción: 'Crema de leche tenor graso 36% especial para repostería 360g',
    Precio: 2900,
    Stock: 110,
    Categoría: 'Lácteos',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1589881133595-a3c085cb731d?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Yogur Firme Ilolay Frutilla 120g',
    Descripción: 'Yogur entero saborizado con frutas naturales 120g',
    Precio: 790,
    Stock: 250,
    Categoría: 'Lácteos',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Yogur Bebible Yogurísimo Vainilla 1kg',
    Descripción: 'Yogur descremado bebible probióticos y vitaminas sachet 1kg',
    Precio: 2100,
    Stock: 130,
    Categoría: 'Lácteos',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=500&q=75'
  },

  // GOLOSINAS Y GALLETITAS (12)
  {
    Nombre: 'Alfajor Havanna Chocolate 6 unidades',
    Descripción: 'Caja x6 alfajores marplatenses rellenos de dulce de leche con baño de chocolate',
    Precio: 7500,
    Stock: 80,
    Categoría: 'Golosinas',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Alfajor Guaymallén Triple Blanco x40',
    Descripción: 'Caja mayorista por 40 unidades de alfajores triples con dulce de leche',
    Precio: 14500,
    Stock: 60,
    Categoría: 'Golosinas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Alfajor Capitán del Espacio Negro',
    Descripción: 'Alfajor tradicional relleno con dulce de leche y cobertura semiamarga',
    Precio: 850,
    Stock: 180,
    Categoría: 'Golosinas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Chocolate Milka Leche Aireado 100g',
    Descripción: 'Tableta de chocolate con leche alpina textura aireada 100g',
    Precio: 2400,
    Stock: 140,
    Categoría: 'Golosinas',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Chocolate Shot con Maní 170g',
    Descripción: 'Chocolate con leche con abundante maní tostado crocante 170g',
    Precio: 3200,
    Stock: 110,
    Categoría: 'Golosinas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Bombones Bon o Bon Leche x30',
    Descripción: 'Caja exhibidora por 30 bombones de oblea rellena con pasta de maní',
    Precio: 11200,
    Stock: 50,
    Categoría: 'Golosinas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Galletitas Oreo Original 118g',
    Descripción: 'Galletitas de cacao rellenas con crema de vainilla 118g',
    Precio: 1450,
    Stock: 210,
    Categoría: 'Golosinas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Galletitas Chocolinas 250g',
    Descripción: 'Galletitas de chocolate clásicas para chocotorta 250g',
    Precio: 1850,
    Stock: 190,
    Categoría: 'Golosinas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Galletitas Pepas Terepin Membrillo 300g',
    Descripción: 'Masas secas con dulce de membrillo horneadas 300g',
    Precio: 1400,
    Stock: 150,
    Categoría: 'Golosinas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Caramelos Sugus Masticables Bolsa 500g',
    Descripción: 'Caramelos masticables surtidos sabores frutales bolsa 500g',
    Precio: 3600,
    Stock: 80,
    Categoría: 'Golosinas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Gomitas Mogul Ositos Frutales 150g',
    Descripción: 'Gomitas con jugo natural de fruta sin tacc 150g',
    Precio: 1350,
    Stock: 130,
    Categoría: 'Golosinas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Chicles Beldent Menta Fuerte x18',
    Descripción: 'Display por 18 cajitas de chicles sin azúcar sabor menta intensa',
    Precio: 9800,
    Stock: 70,
    Categoría: 'Golosinas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=500&q=75'
  },

  // PERFUMERÍA Y CUIDADO PERSONAL (11)
  {
    Nombre: 'Shampoo Pantene Restauración 400ml',
    Descripción: 'Shampoo con provitaminas para cabello dañado 400ml',
    Precio: 4600,
    Stock: 120,
    Categoría: 'Perfumería',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Acondicionador Pantene Restauración 400ml',
    Descripción: 'Acondicionador hidratante profundo 400ml',
    Precio: 4600,
    Stock: 110,
    Categoría: 'Perfumería',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Shampoo Sedal Ceramidas 340ml',
    Descripción: 'Shampoo para brillo y fuerza fibra capilar 340ml',
    Precio: 2950,
    Stock: 140,
    Categoría: 'Perfumería',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Jabón en Barra Dove Original 90g x3',
    Descripción: 'Pack de 3 jabones de tocador con 1/4 de crema humectante',
    Precio: 3200,
    Stock: 160,
    Categoría: 'Perfumería',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1607006314175-4bb6934c9c7f?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Jabón Líquido Corporal Rexona Antibacterial 250ml',
    Descripción: 'Jabón líquido de ducha protección activa 250ml',
    Precio: 2100,
    Stock: 125,
    Categoría: 'Perfumería',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1607006314175-4bb6934c9c7f?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Desodorante Antitranspirante Rexona Hombre Aerosol 150ml',
    Descripción: 'Protección 72hs contra el sudor y mal olor 150ml',
    Precio: 3100,
    Stock: 150,
    Categoría: 'Perfumería',
    'Descuento (%)': 20,
    'Imagen URL': 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Desodorante Dove Original Mujer Aerosol 150ml',
    Descripción: 'Antitranspirante suave cuida la piel de las axilas 150ml',
    Precio: 3200,
    Stock: 140,
    Categoría: 'Perfumería',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Pasta Dental Colgate Total 12 Clean Mint 90g',
    Descripción: 'Crema dental antibacteriana protección completa 12 horas 90g',
    Precio: 2250,
    Stock: 180,
    Categoría: 'Perfumería',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1559591937-e1032b9042b3?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Cepillo Dental Oral-B Indicator Medio x2',
    Descripción: 'Pack de dos cepillos dentales con cerdas con indicador de uso',
    Precio: 2800,
    Stock: 110,
    Categoría: 'Perfumería',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1559591937-e1032b9042b3?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Protector Solar Dermaglós FPS 50 250ml',
    Descripción: 'Emulsión fotoprotectora resistente al agua para piel sensible 250ml',
    Precio: 13500,
    Stock: 45,
    Categoría: 'Perfumería',
    'Descuento (%)': 20,
    'Imagen URL': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Alcohol en Gel Bialcohol 250ml con Dosificador',
    Descripción: 'Gel antiséptico instantáneo al 70% para manos 250ml',
    Precio: 1650,
    Stock: 190,
    Categoría: 'Perfumería',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=500&q=75'
  },

  // MASCOTAS (12)
  {
    Nombre: 'Alimento Perros Dog Chow Adultos Medianos 15kg',
    Descripción: 'Alimento balanceado con ExtraLife para perros adultos medianos y grandes 15kg',
    Precio: 28900,
    Stock: 40,
    Categoría: 'Mascotas',
    'Descuento (%)': 15,
    'Imagen URL': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Alimento Perros Pedigree Carne y Verduras 15kg',
    Descripción: 'Alimento seco completo y balanceado para perros adultos 15kg',
    Precio: 26500,
    Stock: 50,
    Categoría: 'Mascotas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Alimento Perros Raza Cachorros 8kg',
    Descripción: 'Nutrición óptima para cachorros con calcio y DHA 8kg',
    Precio: 15800,
    Stock: 55,
    Categoría: 'Mascotas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Alimento Gatos Cat Chow Adultos Pescado 8kg',
    Descripción: 'Alimento balanceado con Defense Plus para gatos adultos sabor pescado 8kg',
    Precio: 19800,
    Stock: 45,
    Categoría: 'Mascotas',
    'Descuento (%)': 10,
    'Imagen URL': 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Alimento Gatos Whiskas Carne 8kg',
    Descripción: 'Croquetas crocantes rellenas para gatos adultos 8kg',
    Precio: 18900,
    Stock: 40,
    Categoría: 'Mascotas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Piedras Sanitarias Gatos Absorbentes Poopy 4kg',
    Descripción: 'Bentonita mineral aglomerante control de olores para bandeja de gato 4kg',
    Precio: 2800,
    Stock: 120,
    Categoría: 'Mascotas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Snack Dentastix Pedigree Perros Medianos x7',
    Descripción: 'Barras masticables para reducir sarro y placa bacteriana dental',
    Precio: 3200,
    Stock: 80,
    Categoría: 'Mascotas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Pouch Whiskas Gatos Salmón en Salsa 85g',
    Descripción: 'Alimento húmedo completo trozos tiernos de salmón en salsa 85g',
    Precio: 890,
    Stock: 250,
    Categoría: 'Mascotas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Pouch Pedigree Perros Pollo en Gelatina 100g',
    Descripción: 'Comida húmeda deliciosa para mezclar o servir sola 100g',
    Precio: 920,
    Stock: 230,
    Categoría: 'Mascotas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Shampoo Pulguicida Canino Osspret 250ml',
    Descripción: 'Shampoo antiparasitario externo para perros elimina pulgas y garrapatas 250ml',
    Precio: 4500,
    Stock: 65,
    Categoría: 'Mascotas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Hueso Prensado de Cuero Grande 20cm',
    Descripción: 'Hueso masticable para entretenimiento canino y salud dental',
    Precio: 1900,
    Stock: 100,
    Categoría: 'Mascotas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=500&q=75'
  },
  {
    Nombre: 'Bocaditos Húmedos Golocan Mix Carnes 100g',
    Descripción: 'Snacks semihúmedos ideales para premiar y entrenar perros 100g',
    Precio: 1400,
    Stock: 140,
    Categoría: 'Mascotas',
    'Descuento (%)': 0,
    'Imagen URL': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=500&q=75'
  }
];

const exact100Products = sampleProducts.slice(0, 100);
console.log(`Total productos cargados: ${exact100Products.length}`);

// Crear libro de trabajo
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(exact100Products);

// Ajustar anchos de columnas
ws['!cols'] = [
  { wch: 38 }, // Nombre
  { wch: 65 }, // Descripción
  { wch: 12 }, // Precio
  { wch: 10 }, // Stock
  { wch: 16 }, // Categoría
  { wch: 16 }, // Descuento (%)
  { wch: 80 }, // Imagen URL
];

XLSX.utils.book_append_sheet(wb, ws, 'Productos');

// Guardar en la raíz y en public/
const rootPath = path.join(__dirname, '..', 'productos_100_muestra.xlsx');
const publicPath = path.join(__dirname, '..', 'public', 'productos_100_muestra.xlsx');

XLSX.writeFile(wb, rootPath);
console.log(`Guardado exitosamente en: ${rootPath}`);

XLSX.writeFile(wb, publicPath);
console.log(`Guardado exitosamente en: ${publicPath}`);
