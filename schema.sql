create table if not exists public.ore_defs (
  id text primary key,
  name text not null,
  rarity text not null,
  base_value bigint not null check (base_value > 0),
  duration numeric(6,3) not null check (duration > 0),
  xp integer not null check (xp > 0),
  rarity_rank integer not null default 0 check (rarity_rank between 0 and 5),
  color text not null default '#94a3b8',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pickaxe_defs (
  id text primary key,
  name text not null,
  price bigint not null check (price >= 0),
  speed numeric(6,3) not null check (speed > 0),
  level_required integer not null default 1 check (level_required >= 1),
  color text not null default '#94a3b8',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mine_defs (
  id text primary key,
  name text not null,
  level_required integer not null default 1 check (level_required >= 1),
  cost bigint not null default 0 check (cost >= 0),
  tier integer not null default 1 check (tier >= 1),
  value_mult numeric(6,3) not null default 1 check (value_mult > 0),
  ore_chance numeric(4,3) not null default 0.760 check (ore_chance between 0 and 1),
  world_width integer not null default 2400 check (world_width >= 800),
  world_height integer not null default 1600 check (world_height >= 600),
  theme text not null default 'mossy',
  accent text not null default '#60a5fa',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mine_ore_weights (
  mine_id text not null references public.mine_defs(id) on delete cascade,
  ore_id text not null references public.ore_defs(id) on delete cascade,
  weight numeric(8,3) not null check (weight >= 0),
  primary key (mine_id, ore_id)
);

create table if not exists public.achievement_defs (
  id text primary key,
  name text not null,
  description text not null,
  reward_coins bigint not null default 0 check (reward_coins >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.consumable_defs (
  id text primary key,
  name text not null,
  price bigint not null check (price >= 0),
  description text not null,
  duration_seconds integer not null default 30 check (duration_seconds > 0),
  color text not null default '#60a5fa',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.ore_defs (id, name, rarity, base_value, duration, xp, rarity_rank, color, sort_order) values
  ('coal', 'Coal', 'Common', 7, 1.65, 5, 0, '#5c6576', 1),
  ('copper', 'Copper', 'Uncommon', 16, 2.25, 9, 1, '#e08a4b', 2),
  ('iron', 'Iron', 'Rare', 38, 3.05, 17, 2, '#c3ccdb', 3),
  ('gold', 'Gold', 'Epic', 95, 4.15, 34, 3, '#f7c948', 4),
  ('sapphire', 'Sapphire', 'Legendary', 240, 5.4, 62, 4, '#4d8dff', 5),
  ('diamond', 'Diamond', 'Legendary', 340, 5.95, 82, 4, '#37e6f0', 6),
  ('ruby', 'Ruby', 'Mythic', 430, 6.7, 104, 5, '#ff4d6a', 7),
  ('emerald', 'Emerald', 'Mythic', 450, 6.85, 108, 5, '#3ce07a', 8)
on conflict (id) do update set
  name = excluded.name,
  rarity = excluded.rarity,
  base_value = excluded.base_value,
  duration = excluded.duration,
  xp = excluded.xp,
  rarity_rank = excluded.rarity_rank,
  color = excluded.color,
  sort_order = excluded.sort_order;

insert into public.pickaxe_defs (id, name, price, speed, level_required, color, sort_order) values
  ('basic', 'Basic Pickaxe', 0, 1.0, 1, '#94a3b8', 1),
  ('iron', 'Iron Pickaxe', 300, 1.35, 2, '#cbd5e1', 2),
  ('steel', 'Steel Pickaxe', 1000, 1.75, 4, '#93c5fd', 3),
  ('gold', 'Gold Pickaxe', 3000, 2.2, 7, '#fbbf24', 4),
  ('crystal', 'Crystal Pickaxe', 8500, 2.8, 11, '#67e8f9', 5),
  ('obsidian', 'Obsidian Pickaxe', 22000, 3.5, 16, '#a78bfa', 6),
  ('void', 'Void Pickaxe', 60000, 4.5, 22, '#f472b6', 7)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  speed = excluded.speed,
  level_required = excluded.level_required,
  color = excluded.color,
  sort_order = excluded.sort_order;

insert into public.mine_defs (id, name, level_required, cost, tier, value_mult, ore_chance, world_width, world_height, theme, accent, sort_order) values
  ('mossy', 'Mossy Hollow', 1, 0, 1, 1.0, 0.760, 2400, 1600, 'mossy', '#34d399', 1),
  ('crystal', 'Crystal Cavern', 3, 500, 2, 1.6, 0.760, 2600, 1700, 'crystal', '#38bdf8', 2),
  ('ember', 'Ember Depths', 7, 2200, 3, 2.4, 0.760, 2700, 1750, 'ember', '#fb923c', 3),
  ('frost', 'Frostbite Abyss', 12, 7500, 4, 3.6, 0.760, 2800, 1800, 'frost', '#7dd3fc', 4),
  ('void', 'Voidreach', 18, 25000, 5, 5.5, 0.760, 2900, 1850, 'void', '#c084fc', 5)
on conflict (id) do update set
  name = excluded.name,
  level_required = excluded.level_required,
  cost = excluded.cost,
  tier = excluded.tier,
  value_mult = excluded.value_mult,
  ore_chance = excluded.ore_chance,
  world_width = excluded.world_width,
  world_height = excluded.world_height,
  theme = excluded.theme,
  accent = excluded.accent,
  sort_order = excluded.sort_order;

insert into public.mine_ore_weights (mine_id, ore_id, weight) values
  ('mossy', 'coal', 100), ('mossy', 'copper', 58), ('mossy', 'iron', 18), ('mossy', 'gold', 3.2),
  ('mossy', 'sapphire', 0.5), ('mossy', 'diamond', 0.16), ('mossy', 'ruby', 0.04), ('mossy', 'emerald', 0.04),
  ('crystal', 'coal', 55), ('crystal', 'copper', 75), ('crystal', 'iron', 48), ('crystal', 'gold', 11),
  ('crystal', 'sapphire', 3.4), ('crystal', 'diamond', 1.5), ('crystal', 'ruby', 0.45), ('crystal', 'emerald', 0.4),
  ('ember', 'coal', 32), ('ember', 'copper', 55), ('ember', 'iron', 70), ('ember', 'gold', 24),
  ('ember', 'sapphire', 6), ('ember', 'diamond', 3.2), ('ember', 'ruby', 1.8), ('ember', 'emerald', 1.2),
  ('frost', 'coal', 16), ('frost', 'copper', 34), ('frost', 'iron', 62), ('frost', 'gold', 34),
  ('frost', 'sapphire', 13), ('frost', 'diamond', 7), ('frost', 'ruby', 3.6), ('frost', 'emerald', 3.2),
  ('void', 'coal', 8), ('void', 'copper', 18), ('void', 'iron', 46), ('void', 'gold', 48),
  ('void', 'sapphire', 26), ('void', 'diamond', 16), ('void', 'ruby', 9), ('void', 'emerald', 8)
on conflict (mine_id, ore_id) do update set weight = excluded.weight;

insert into public.achievement_defs (id, name, description, reward_coins, sort_order) values
  ('first_deposit', 'First Swing', 'Break your first deposit.', 25, 1),
  ('first_ore', 'First Find', 'Collect your first ore.', 40, 2),
  ('ore_100', 'Prospector', 'Collect 100 ores.', 300, 3),
  ('ore_1000', 'Master Miner', 'Collect 1,000 ores.', 3000, 4),
  ('deposits_100', 'Rockbreaker', 'Break 100 deposits.', 500, 5),
  ('sold_100', 'Market Regular', 'Sell 100 ores.', 400, 6),
  ('rare_find', 'Rare Find', 'Collect a Rare or better ore.', 150, 7),
  ('epic_find', 'Epic Discovery', 'Collect an Epic ore.', 400, 8),
  ('legendary_find', 'Legendary Strike', 'Collect a Legendary ore.', 1200, 9),
  ('mythic_find', 'Mythic Fortune', 'Collect a Mythic ore.', 3000, 10),
  ('level_5', 'Getting Deep', 'Reach level 5.', 200, 11),
  ('level_10', 'Seasoned Miner', 'Reach level 10.', 700, 12),
  ('level_18', 'Deep Dweller', 'Reach level 18.', 2500, 13),
  ('coins_1000', 'Payday', 'Earn 1,000 coins total.', 300, 14),
  ('coins_25000', 'Tycoon', 'Earn 25,000 coins total.', 2500, 15),
  ('coins_100000', 'Ore Baron', 'Earn 100,000 coins total.', 15000, 16),
  ('all_mines', 'The Deep End', 'Unlock every mine.', 8000, 17),
  ('all_picks', 'Full Arsenal', 'Own every pickaxe.', 12000, 18)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  reward_coins = excluded.reward_coins,
  sort_order = excluded.sort_order;

insert into public.consumable_defs (id, name, price, description, duration_seconds, color, sort_order) values
  ('tonic', 'Energy Tonic', 120, '+60% mining speed for 30 seconds.', 30, '#22d3ee', 1),
  ('magnet', 'Ore Magnet', 180, 'Automatically pulls nearby ore drops for 30 seconds.', 30, '#a78bfa', 2),
  ('charm', 'Lucky Charm', 250, '+50% rare ore odds for 30 seconds.', 30, '#fbbf24', 3)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  description = excluded.description,
  duration_seconds = excluded.duration_seconds,
  color = excluded.color,
  sort_order = excluded.sort_order;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 24),
  level integer not null default 1 check (level >= 1),
  xp bigint not null default 0 check (xp >= 0),
  coins bigint not null default 0 check (coins >= 0),
  current_mine text not null default 'mossy' references public.mine_defs(id) on delete restrict,
  equipped_pickaxe text not null default 'basic' references public.pickaxe_defs(id) on delete restrict,
  wealth bigint not null default 0 check (wealth >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));
create index if not exists profiles_wealth_idx on public.profiles (wealth desc, level desc, created_at asc);

create table if not exists public.player_pickaxes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pickaxe_id text not null references public.pickaxe_defs(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, pickaxe_id)
);

create table if not exists public.player_mines (
  user_id uuid not null references public.profiles(id) on delete cascade,
  mine_id text not null references public.mine_defs(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, mine_id)
);

create table if not exists public.inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ore_id text not null references public.ore_defs(id) on delete restrict,
  mine_id text not null references public.mine_defs(id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  unit_value bigint not null check (unit_value > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, ore_id, mine_id)
);

create index if not exists inventory_user_idx on public.inventory (user_id);

create table if not exists public.player_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  ores_mined bigint not null default 0 check (ores_mined >= 0),
  deposits_mined bigint not null default 0 check (deposits_mined >= 0),
  coins_earned bigint not null default 0 check (coins_earned >= 0),
  coins_spent bigint not null default 0 check (coins_spent >= 0),
  ores_sold bigint not null default 0 check (ores_sold >= 0),
  play_time_seconds bigint not null default 0 check (play_time_seconds >= 0),
  rarest_tier integer not null default -1 check (rarest_tier >= -1),
  rarest_ore text references public.ore_defs(id) on delete set null,
  sessions bigint not null default 0 check (sessions >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievement_defs(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.player_consumables (
  user_id uuid not null references public.profiles(id) on delete cascade,
  consumable_id text not null references public.consumable_defs(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, consumable_id)
);

create table if not exists public.mine_sessions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mine_id text not null references public.mine_defs(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ores_collected integer not null default 0 check (ores_collected >= 0),
  deposits_broken integer not null default 0 check (deposits_broken >= 0),
  coins_earned bigint not null default 0 check (coins_earned >= 0)
);

create index if not exists mine_sessions_user_idx on public.mine_sessions (user_id, started_at desc);
create index if not exists mine_sessions_active_idx on public.mine_sessions (user_id) where ended_at is null;

create table if not exists public.reward_events (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  amount bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists reward_events_user_idx on public.reward_events (user_id, created_at desc);

create or replace function public.xp_needed(p_level integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select (floor(50 * power(greatest(coalesce(p_level, 1), 1), 1.5)) + 30)::bigint;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.recompute_wealth(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles p
  set wealth = p.coins + coalesce((
        select sum(i.quantity::bigint * i.unit_value)
        from public.inventory i
        where i.user_id = p_user
      ), 0)::bigint,
      updated_at = now()
  where p.id = p_user;
$$;

create or replace function public.inventory_wealth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_wealth(old.user_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform public.recompute_wealth(old.user_id);
  end if;
  perform public.recompute_wealth(new.user_id);
  return new;
end;
$$;

create or replace function public.profiles_wealth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.coins is distinct from old.coins then
    perform public.recompute_wealth(new.id);
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_candidate text;
  v_attempt integer := 0;
begin
  v_base := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, 'miner'), '@', 1), 'miner'),
    '[^a-zA-Z0-9_]+',
    '',
    'g'
  ));
  if char_length(v_base) < 3 then
    v_base := 'miner';
  end if;
  v_base := left(v_base, 18);
  v_candidate := v_base;
  while exists (select 1 from public.profiles p where lower(p.username) = lower(v_candidate)) loop
    v_attempt := v_attempt + 1;
    v_candidate := left(v_base, 16) || v_attempt::text;
    if v_attempt > 1000 then
      v_candidate := left(v_base, 8) || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
  end loop;
  insert into public.profiles (id, username) values (new.id, v_candidate);
  insert into public.player_stats (user_id) values (new.id);
  insert into public.player_pickaxes (user_id, pickaxe_id) values (new.id, 'basic');
  insert into public.player_mines (user_id, mine_id) values (new.id, 'mossy');
  return new;
end;
$$;

create or replace function public.record_deposit_break(p_user uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deposits bigint;
begin
  update public.player_stats s
  set deposits_mined = s.deposits_mined + 1,
      updated_at = now()
  where s.user_id = p_user
  returning s.deposits_mined into v_deposits;
  if v_deposits is null then
    raise exception 'unknown_player';
  end if;
  return v_deposits;
end;
$$;

create or replace function public.apply_mining_reward(
  p_reward_id uuid,
  p_user uuid,
  p_ore_id text,
  p_mine_id text,
  p_quantity integer,
  p_unit_value bigint,
  p_xp integer
)
returns table (applied boolean, quantity integer, coins bigint, xp bigint, level integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ore public.ore_defs%rowtype;
  v_mine public.mine_defs%rowtype;
  v_coins bigint;
  v_xp bigint;
  v_level integer;
  v_qty integer;
  v_rank integer;
begin
  if p_reward_id is null then
    raise exception 'invalid_payload';
  end if;
  if p_quantity < 1 or p_quantity > 6 then
    raise exception 'invalid_quantity';
  end if;
  select p.coins, p.xp, p.level into v_coins, v_xp, v_level
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  select * into v_ore from public.ore_defs where id = p_ore_id;
  if not found then
    raise exception 'unknown_ore';
  end if;
  select * into v_mine from public.mine_defs where id = p_mine_id;
  if not found then
    raise exception 'unknown_mine';
  end if;
  if not exists (select 1 from public.player_mines pm where pm.user_id = p_user and pm.mine_id = p_mine_id) then
    raise exception 'mine_locked';
  end if;
  if p_unit_value <> round(v_ore.base_value * v_mine.value_mult)::bigint then
    raise exception 'invalid_value';
  end if;
  if p_xp < 1 or p_xp > 5000 then
    raise exception 'invalid_xp';
  end if;

  insert into public.reward_events (id, user_id, kind, amount)
  values (p_reward_id, p_user, 'ore:' || p_ore_id, p_quantity)
  on conflict (id) do nothing;

  if not found then
    return query select false, 0, v_coins, v_xp, v_level;
    return;
  end if;

  insert into public.inventory as inv (user_id, ore_id, mine_id, quantity, unit_value, updated_at)
  values (p_user, p_ore_id, p_mine_id, p_quantity, p_unit_value, now())
  on conflict (user_id, ore_id, mine_id) do update
    set quantity = inv.quantity + excluded.quantity,
        unit_value = excluded.unit_value,
        updated_at = now()
  returning inv.quantity into v_qty;

  v_rank := v_ore.rarity_rank;
  update public.player_stats s
  set ores_mined = s.ores_mined + p_quantity,
      rarest_tier = greatest(s.rarest_tier, v_rank),
      rarest_ore = case when v_rank > s.rarest_tier then p_ore_id else s.rarest_ore end,
      updated_at = now()
  where s.user_id = p_user;

  v_xp := v_xp + p_xp;
  while v_xp >= public.xp_needed(v_level) loop
    v_xp := v_xp - public.xp_needed(v_level);
    v_level := v_level + 1;
  end loop;

  update public.profiles p
  set xp = v_xp,
      level = v_level,
      updated_at = now()
  where p.id = p_user;

  return query select true, v_qty, v_coins, v_xp, v_level;
end;
$$;

create or replace function public.sell_inventory_item(
  p_user uuid,
  p_ore_id text,
  p_mine_id text,
  p_quantity integer
)
returns table (sold integer, total bigint, coins bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantity integer;
  v_unit bigint;
  v_total bigint;
  v_coins bigint;
begin
  if p_quantity < 1 or p_quantity > 999 then
    raise exception 'invalid_quantity';
  end if;
  select p.coins into v_coins
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  select i.quantity, i.unit_value into v_quantity, v_unit
  from public.inventory i
  where i.user_id = p_user and i.ore_id = p_ore_id and i.mine_id = p_mine_id
  for update;
  if not found then
    raise exception 'inventory_empty';
  end if;
  if p_quantity > v_quantity then
    raise exception 'invalid_quantity';
  end if;
  v_total := v_unit * p_quantity;
  if p_quantity = v_quantity then
    delete from public.inventory i
    where i.user_id = p_user and i.ore_id = p_ore_id and i.mine_id = p_mine_id;
  else
    update public.inventory i
    set quantity = i.quantity - p_quantity,
        updated_at = now()
    where i.user_id = p_user and i.ore_id = p_ore_id and i.mine_id = p_mine_id;
  end if;
  update public.profiles p
  set coins = p.coins + v_total,
      updated_at = now()
  where p.id = p_user
  returning p.coins into v_coins;
  update public.player_stats s
  set coins_earned = s.coins_earned + v_total,
      ores_sold = s.ores_sold + p_quantity,
      updated_at = now()
  where s.user_id = p_user;
  return query select p_quantity, v_total, v_coins;
end;
$$;

create or replace function public.purchase_pickaxe(
  p_user uuid,
  p_pickaxe_id text
)
returns table (purchased boolean, coins bigint, equipped_pickaxe text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pick public.pickaxe_defs%rowtype;
  v_coins bigint;
  v_level integer;
  v_owned boolean;
begin
  select * into v_pick from public.pickaxe_defs where id = p_pickaxe_id;
  if not found then
    raise exception 'unknown_pickaxe';
  end if;
  select p.coins, p.level into v_coins, v_level
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  select exists (
    select 1 from public.player_pickaxes pp
    where pp.user_id = p_user and pp.pickaxe_id = p_pickaxe_id
  ) into v_owned;
  if v_owned then
    update public.profiles p
    set equipped_pickaxe = p_pickaxe_id,
        updated_at = now()
    where p.id = p_user;
    return query select false, v_coins, p_pickaxe_id;
    return;
  end if;
  if v_level < v_pick.level_required then
    raise exception 'level_too_low';
  end if;
  if v_coins < v_pick.price then
    raise exception 'insufficient_coins';
  end if;
  update public.profiles p
  set coins = p.coins - v_pick.price,
      equipped_pickaxe = p_pickaxe_id,
      updated_at = now()
  where p.id = p_user;
  update public.player_stats s
  set coins_spent = s.coins_spent + v_pick.price,
      updated_at = now()
  where s.user_id = p_user;
  insert into public.player_pickaxes (user_id, pickaxe_id)
  values (p_user, p_pickaxe_id)
  on conflict do nothing;
  return query select true, v_coins - v_pick.price, p_pickaxe_id;
end;
$$;

create or replace function public.unlock_mine(
  p_user uuid,
  p_mine_id text
)
returns table (unlocked boolean, coins bigint, current_mine text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mine public.mine_defs%rowtype;
  v_coins bigint;
  v_level integer;
  v_owned boolean;
begin
  select * into v_mine from public.mine_defs where id = p_mine_id;
  if not found then
    raise exception 'unknown_mine';
  end if;
  select p.coins, p.level into v_coins, v_level
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  select exists (
    select 1 from public.player_mines pm
    where pm.user_id = p_user and pm.mine_id = p_mine_id
  ) into v_owned;
  if v_owned then
    update public.profiles p
    set current_mine = p_mine_id,
        updated_at = now()
    where p.id = p_user;
    return query select false, v_coins, p_mine_id;
    return;
  end if;
  if v_level < v_mine.level_required then
    raise exception 'level_too_low';
  end if;
  if v_coins < v_mine.cost then
    raise exception 'insufficient_coins';
  end if;
  update public.profiles p
  set coins = p.coins - v_mine.cost,
      current_mine = p_mine_id,
      updated_at = now()
  where p.id = p_user;
  update public.player_stats s
  set coins_spent = s.coins_spent + v_mine.cost,
      updated_at = now()
  where s.user_id = p_user;
  insert into public.player_mines (user_id, mine_id)
  values (p_user, p_mine_id)
  on conflict do nothing;
  return query select true, v_coins - v_mine.cost, p_mine_id;
end;
$$;

create or replace function public.purchase_consumable(
  p_user uuid,
  p_consumable_id text
)
returns table (purchased boolean, coins bigint, quantity integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.consumable_defs%rowtype;
  v_coins bigint;
  v_qty integer;
begin
  select * into v_item from public.consumable_defs where id = p_consumable_id;
  if not found then
    raise exception 'unknown_consumable';
  end if;
  select p.coins into v_coins
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  if v_coins < v_item.price then
    raise exception 'insufficient_coins';
  end if;
  update public.profiles p
  set coins = p.coins - v_item.price,
      updated_at = now()
  where p.id = p_user;
  update public.player_stats s
  set coins_spent = s.coins_spent + v_item.price,
      updated_at = now()
  where s.user_id = p_user;
  insert into public.player_consumables as pc (user_id, consumable_id, quantity, updated_at)
  values (p_user, p_consumable_id, 1, now())
  on conflict (user_id, consumable_id) do update
    set quantity = pc.quantity + 1,
        updated_at = now()
  returning pc.quantity into v_qty;
  return query select true, v_coins - v_item.price, v_qty;
end;
$$;

create or replace function public.consume_consumable(
  p_user uuid,
  p_consumable_id text
)
returns table (consumed boolean, quantity integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_qty integer;
begin
  select pc.quantity into v_qty
  from public.player_consumables pc
  where pc.user_id = p_user and pc.consumable_id = p_consumable_id
  for update;
  if not found or v_qty <= 0 then
    return query select false, coalesce(v_qty, 0);
    return;
  end if;
  update public.player_consumables pc
  set quantity = pc.quantity - 1,
      updated_at = now()
  where pc.user_id = p_user and pc.consumable_id = p_consumable_id
  returning pc.quantity into v_qty;
  return query select true, v_qty;
end;
$$;

create or replace function public.equip_pickaxe(p_user uuid, p_pickaxe_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.player_pickaxes pp
    where pp.user_id = p_user and pp.pickaxe_id = p_pickaxe_id
  ) then
    raise exception 'not_owned';
  end if;
  update public.profiles p
  set equipped_pickaxe = p_pickaxe_id,
      updated_at = now()
  where p.id = p_user;
  if not found then
    raise exception 'unknown_player';
  end if;
  return p_pickaxe_id;
end;
$$;

create or replace function public.select_mine(p_user uuid, p_mine_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.player_mines pm
    where pm.user_id = p_user and pm.mine_id = p_mine_id
  ) then
    raise exception 'mine_locked';
  end if;
  update public.profiles p
  set current_mine = p_mine_id,
      updated_at = now()
  where p.id = p_user;
  if not found then
    raise exception 'unknown_player';
  end if;
  return p_mine_id;
end;
$$;

create or replace function public.set_username(p_user uuid, p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_username !~ '^[A-Za-z0-9_]{3,24}$' then
    raise exception 'invalid_username';
  end if;
  update public.profiles p
  set username = p_username,
      updated_at = now()
  where p.id = p_user;
  if not found then
    raise exception 'unknown_player';
  end if;
  return p_username;
exception
  when unique_violation then
    raise exception 'username_taken';
end;
$$;

create or replace function public.start_mine_session(p_user uuid, p_mine_id text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not exists (
    select 1 from public.player_mines pm
    where pm.user_id = p_user and pm.mine_id = p_mine_id
  ) then
    raise exception 'mine_locked';
  end if;
  insert into public.mine_sessions (user_id, mine_id)
  values (p_user, p_mine_id)
  returning id into v_id;
  update public.player_stats s
  set sessions = s.sessions + 1,
      updated_at = now()
  where s.user_id = p_user;
  return v_id;
end;
$$;

create or replace function public.end_mine_session(
  p_user uuid,
  p_session bigint,
  p_ores integer,
  p_deposits integer,
  p_coins bigint,
  p_play_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.mine_sessions ms
  set ended_at = now(),
      ores_collected = greatest(0, p_ores),
      deposits_broken = greatest(0, p_deposits),
      coins_earned = greatest(0, p_coins)
  where ms.id = p_session and ms.user_id = p_user and ms.ended_at is null;
  update public.player_stats s
  set play_time_seconds = s.play_time_seconds + greatest(0, p_play_seconds),
      updated_at = now()
  where s.user_id = p_user;
end;
$$;

create or replace function public.evaluate_achievements(p_user uuid)
returns table (achievement_id text, achievement_name text, reward_coins bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level integer;
  v_ores bigint;
  v_deposits bigint;
  v_sold bigint;
  v_rarest integer;
  v_coins_earned bigint;
  v_mines integer;
  v_picks integer;
  v_total_mines integer;
  v_total_picks integer;
  v_reward bigint := 0;
  v_rec record;
begin
  select p.level into v_level from public.profiles p where p.id = p_user;
  if not found then
    raise exception 'unknown_player';
  end if;
  select s.ores_mined, s.deposits_mined, s.ores_sold, s.rarest_tier, s.coins_earned
  into v_ores, v_deposits, v_sold, v_rarest, v_coins_earned
  from public.player_stats s
  where s.user_id = p_user;
  if not found then
    insert into public.player_stats (user_id) values (p_user) on conflict do nothing;
    select s.ores_mined, s.deposits_mined, s.ores_sold, s.rarest_tier, s.coins_earned
    into v_ores, v_deposits, v_sold, v_rarest, v_coins_earned
    from public.player_stats s
    where s.user_id = p_user;
  end if;
  select count(*) into v_mines from public.player_mines where user_id = p_user;
  select count(*) into v_picks from public.player_pickaxes where user_id = p_user;
  select count(*) into v_total_mines from public.mine_defs;
  select count(*) into v_total_picks from public.pickaxe_defs;

  for v_rec in
    select a.id, a.name, a.reward_coins
    from public.achievement_defs a
    where not exists (
      select 1 from public.player_achievements pa
      where pa.user_id = p_user and pa.achievement_id = a.id
    )
    and (
      (a.id = 'first_deposit' and v_deposits >= 1) or
      (a.id = 'first_ore' and v_ores >= 1) or
      (a.id = 'ore_100' and v_ores >= 100) or
      (a.id = 'ore_1000' and v_ores >= 1000) or
      (a.id = 'deposits_100' and v_deposits >= 100) or
      (a.id = 'sold_100' and v_sold >= 100) or
      (a.id = 'rare_find' and v_rarest >= 2) or
      (a.id = 'epic_find' and v_rarest >= 3) or
      (a.id = 'legendary_find' and v_rarest >= 4) or
      (a.id = 'mythic_find' and v_rarest >= 5) or
      (a.id = 'level_5' and v_level >= 5) or
      (a.id = 'level_10' and v_level >= 10) or
      (a.id = 'level_18' and v_level >= 18) or
      (a.id = 'coins_1000' and v_coins_earned >= 1000) or
      (a.id = 'coins_25000' and v_coins_earned >= 25000) or
      (a.id = 'coins_100000' and v_coins_earned >= 100000) or
      (a.id = 'all_mines' and v_mines >= v_total_mines) or
      (a.id = 'all_picks' and v_picks >= v_total_picks)
    )
    order by a.sort_order
  loop
    insert into public.player_achievements (user_id, achievement_id)
    values (p_user, v_rec.id)
    on conflict do nothing;
    if found then
      v_reward := v_reward + v_rec.reward_coins;
      achievement_id := v_rec.id;
      achievement_name := v_rec.name;
      reward_coins := v_rec.reward_coins;
      return next;
    end if;
  end loop;

  if v_reward > 0 then
    update public.profiles p
    set coins = p.coins + v_reward,
        updated_at = now()
    where p.id = p_user;
    update public.player_stats s
    set coins_earned = s.coins_earned + v_reward,
        updated_at = now()
    where s.user_id = p_user;
  end if;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists inventory_touch on public.inventory;
create trigger inventory_touch before update on public.inventory
for each row execute function public.touch_updated_at();

drop trigger if exists inventory_wealth_change on public.inventory;
create trigger inventory_wealth_change after insert or update or delete on public.inventory
for each row execute function public.inventory_wealth();

drop trigger if exists profiles_wealth_change on public.profiles;
create trigger profiles_wealth_change after update of coins on public.profiles
for each row execute function public.profiles_wealth();

drop trigger if exists player_stats_touch on public.player_stats;
create trigger player_stats_touch before update on public.player_stats
for each row execute function public.touch_updated_at();

drop trigger if exists player_consumables_touch on public.player_consumables;
create trigger player_consumables_touch before update on public.player_consumables
for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace view public.leaderboard
with (security_invoker = true)
as
select
  row_number() over (order by p.wealth desc, p.level desc, p.created_at asc) as rank,
  p.id as user_id,
  p.username,
  p.level,
  p.coins,
  p.wealth,
  p.updated_at
from public.profiles p;

alter view public.leaderboard set (security_invoker = true);

alter table public.ore_defs enable row level security;
alter table public.pickaxe_defs enable row level security;
alter table public.mine_defs enable row level security;
alter table public.mine_ore_weights enable row level security;
alter table public.achievement_defs enable row level security;
alter table public.consumable_defs enable row level security;
alter table public.profiles enable row level security;
alter table public.player_pickaxes enable row level security;
alter table public.player_mines enable row level security;
alter table public.inventory enable row level security;
alter table public.player_stats enable row level security;
alter table public.player_achievements enable row level security;
alter table public.player_consumables enable row level security;
alter table public.mine_sessions enable row level security;
alter table public.reward_events enable row level security;

drop policy if exists ore_defs_read on public.ore_defs;
create policy ore_defs_read on public.ore_defs for select to authenticated using (true);

drop policy if exists pickaxe_defs_read on public.pickaxe_defs;
create policy pickaxe_defs_read on public.pickaxe_defs for select to authenticated using (true);

drop policy if exists mine_defs_read on public.mine_defs;
create policy mine_defs_read on public.mine_defs for select to authenticated using (true);

drop policy if exists mine_ore_weights_read on public.mine_ore_weights;
create policy mine_ore_weights_read on public.mine_ore_weights for select to authenticated using (true);

drop policy if exists achievement_defs_read on public.achievement_defs;
create policy achievement_defs_read on public.achievement_defs for select to authenticated using (true);

drop policy if exists consumable_defs_read on public.consumable_defs;
create policy consumable_defs_read on public.consumable_defs for select to authenticated using (true);

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);

drop policy if exists player_pickaxes_read on public.player_pickaxes;
create policy player_pickaxes_read on public.player_pickaxes for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists player_mines_read on public.player_mines;
create policy player_mines_read on public.player_mines for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists inventory_read on public.inventory;
create policy inventory_read on public.inventory for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists player_stats_read on public.player_stats;
create policy player_stats_read on public.player_stats for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists player_achievements_read on public.player_achievements;
create policy player_achievements_read on public.player_achievements for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists player_consumables_read on public.player_consumables;
create policy player_consumables_read on public.player_consumables for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists mine_sessions_read on public.mine_sessions;
create policy mine_sessions_read on public.mine_sessions for select to authenticated using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated, service_role;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.ore_defs, public.pickaxe_defs, public.mine_defs, public.mine_ore_weights,
  public.achievement_defs, public.consumable_defs, public.profiles, public.inventory,
  public.player_stats, public.player_pickaxes, public.player_mines, public.player_achievements,
  public.player_consumables, public.mine_sessions to authenticated;
grant select on public.leaderboard to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
