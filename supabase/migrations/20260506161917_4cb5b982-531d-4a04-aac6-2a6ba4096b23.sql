
-- 1. Cleanup bogus type
DELETE FROM public.catalog_types WHERE code = 'Name' OR name = 'Ashu';

-- 2. Ensure 3 canonical types exist (idempotent)
INSERT INTO public.catalog_types (code, name, icon, sort_order, is_active) VALUES
  ('service', 'Service', '🛠️', 1, true),
  ('product', 'Product', '📦', 2, true),
  ('other',   'Other',   '✨', 3, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- 3. Seed root categories under Service (using slug as natural key)
WITH svc AS (SELECT id FROM public.catalog_types WHERE code = 'service')
INSERT INTO public.categories (type_id, parent_id, name, slug, icon, sort_order, is_active)
SELECT svc.id, NULL, x.name, x.slug, x.icon, x.sort_order, true
FROM svc, (VALUES
  ('Legal Services',   'legal-services',   '⚖️', 1),
  ('Finance Services', 'finance-services', '💰', 2),
  ('Basic Services',   'basic-services',   '🔧', 3),
  ('More Services',    'more-services',    '✨', 4)
) AS x(name, slug, icon, sort_order)
ON CONFLICT (slug) DO UPDATE SET
  type_id = EXCLUDED.type_id,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- 4. Seed sub-categories under "Basic Services"
WITH basic AS (SELECT id, type_id FROM public.categories WHERE slug = 'basic-services')
INSERT INTO public.categories (type_id, parent_id, name, slug, icon, sort_order, is_active)
SELECT basic.type_id, basic.id, x.name, x.slug, x.icon, x.sort_order, true
FROM basic, (VALUES
  ('AC',          'basic-ac',          '❄️',  1),
  ('Carpenter',   'basic-carpenter',   '🪚',  2),
  ('Painter',     'basic-painter',     '🎨',  3),
  ('Movers',      'basic-movers',      '🚚',  4),
  ('Chef',        'basic-chef',        '👨‍🍳', 5),
  ('Electronics', 'basic-electronics', '📱',  6),
  ('Plumber',     'basic-plumber',     '🔩',  7),
  ('Cleaner',     'basic-cleaner',     '🧹',  8)
) AS x(name, slug, icon, sort_order)
ON CONFLICT (slug) DO UPDATE SET
  type_id = EXCLUDED.type_id,
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- 5. Seed items per sub-category
-- Helper: for each (sub_slug, item_name, price_min, price_max, sort_order)
WITH item_seed AS (
  SELECT * FROM (VALUES
    -- AC
    ('basic-ac', 'AC Service',      499.0, 999.0,  1),
    ('basic-ac', 'AC Repair',       699.0, 1499.0, 2),
    ('basic-ac', 'AC Installation', 1299.0, 2499.0, 3),
    ('basic-ac', 'AC Gas Refill',   1999.0, 2999.0, 4),
    -- Carpenter
    ('basic-carpenter', 'Furniture Repair', 399.0, 899.0,  1),
    ('basic-carpenter', 'Door Fitting',     599.0, 1299.0, 2),
    ('basic-carpenter', 'Custom Wood Work', 1499.0, 4999.0, 3),
    -- Painter
    ('basic-painter', 'Interior Paint', 4999.0, 14999.0, 1),
    ('basic-painter', 'Exterior Paint', 7999.0, 19999.0, 2),
    -- Movers
    ('basic-movers', 'Local Shifting',     1999.0, 4999.0, 1),
    ('basic-movers', 'Outstation Moving',  9999.0, 29999.0, 2),
    -- Chef
    ('basic-chef', 'Party Chef Booking',   1999.0, 4999.0, 1),
    -- Electronics
    ('basic-electronics', 'Mobile Repair',  299.0, 1999.0, 1),
    ('basic-electronics', 'TV Service',     499.0, 2499.0, 2),
    ('basic-electronics', 'Appliance Fix',  399.0, 1499.0, 3),
    -- Plumber
    ('basic-plumber', 'Tap & Pipe Repair', 299.0, 799.0, 1),
    ('basic-plumber', 'Bathroom Fitting',  1999.0, 5999.0, 2),
    -- Cleaner
    ('basic-cleaner', 'Home Deep Clean', 1499.0, 3999.0, 1),
    ('basic-cleaner', 'Sofa Cleaning',   799.0, 1999.0, 2)
  ) AS t(cat_slug, name, pmin, pmax, sort_order)
)
INSERT INTO public.catalog_items (category_id, name, slug, price_min, price_max, sort_order, is_active)
SELECT
  c.id,
  s.name,
  s.cat_slug || '-' || lower(regexp_replace(s.name, '[^a-zA-Z0-9]+', '-', 'g')),
  s.pmin,
  s.pmax,
  s.sort_order,
  true
FROM item_seed s
JOIN public.categories c ON c.slug = s.cat_slug
ON CONFLICT DO NOTHING;

-- 6. Seed variations for "Installation" / "Repair" / "Service" type items (3 sample variations each)
INSERT INTO public.item_variations (item_id, name, price_min, price_max, sort_order, is_active)
SELECT i.id, v.name, i.price_min * v.mult, i.price_max * v.mult, v.sort_order, true
FROM public.catalog_items i
JOIN public.categories c ON c.id = i.category_id
JOIN public.categories pc ON pc.id = c.parent_id
CROSS JOIN (VALUES
  ('Standard',  1.0, 1),
  ('Premium',   1.4, 2),
  ('Deluxe',    1.8, 3)
) AS v(name, mult, sort_order)
WHERE pc.slug = 'basic-services'
  AND NOT EXISTS (SELECT 1 FROM public.item_variations iv WHERE iv.item_id = i.id);
