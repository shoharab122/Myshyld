create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, icon text default '🛍️', created_at timestamptz default now());
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  name text not null, brand text, tag text, price numeric not null,
  rating numeric default 4.5, reviews int default 0, image_url text,
  variants jsonb default '[]', features jsonb default '[]', created_at timestamptz default now());
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique, user_id uuid, items jsonb, total numeric,
  address jsonb, payment text, status int default 0, created_at timestamptz default now());
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
create policy "read categories" on categories for select using (true);
create policy "read products" on products for select using (true);
create policy "write categories" on categories for all to authenticated using (true) with check (true);
create policy "write products" on products for all to authenticated using (true) with check (true);
create policy "own orders" on orders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
insert into categories(name,icon) values ('Condoms','🛡️'),('Sanitary Pads','🌸') on conflict do nothing;
