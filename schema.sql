-- OREBOUND schema v2
--
-- Game definitions (ores, pickaxes, mines, consumables, achievements,
-- ore weights) live in code — server.js and index.html. This schema only
-- stores accounts-linked player progress: profiles, inventory, unlocks,
-- stats, sessions, and reward idempotency records.
--
-- Run this in the Supabase SQL editor. It is safe to re-run.

-- Remove the old definition tables if present (they held static game
-- definitions that now live in code). Player tables are migrated below.
drop table if exists public.mine_ore_weights cascade;
drop table if exists public.ore_defs cascade;
drop table if exists public.pickaxe_defs cascade;
drop table if exists public.mine_defs cascade;
drop table if exists public.achievement_defs cascade;
drop table if exists public.consumable_defs cascade;

-- ---------------------------------------------------------------------------
-- Player progress tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 24),
  level integer not null default 1 check (level >= 1),
  xp bigint not null default 0 check (xp >= 0),
  coins bigint not null default 0 check (coins >= 0),
  current_mine text not null default 'mossy',
  equipped_pickaxe text not null default 'basic',
  wealth bigint not null default 0 check (wealth >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));
create index if not exists profiles_wealth_idx on public.profiles (wealth desc, level desc, created_at asc);

-- One table for everything a player unlocks or owns besides ore stacks:
-- pickaxes, mines, achievements, and consumable counts.
create table if not exists public.player_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('pickaxe', 'mine', 'achievement', 'consumable')),
  ref_id text not null,
  quantity integer not null default 1 check (quantity >= 0),
  unlocked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
);

create index if not exists player_unlocks_user_idx on public.player_unlocks (user_id);

-- Migrate legacy per-kind player tables into player_unlocks before dropping them.
do $$
begin
  if to_regclass('public.player_pickaxes') is not null then
    insert into public.player_unlocks (user_id, kind, ref_id)
    select user_id, 'pickaxe', pickaxe_id from public.player_pickaxes
    on conflict do nothing;
  end if;
  if to_regclass('public.player_mines') is not null then
    insert into public.player_unlocks (user_id, kind, ref_id)
    select user_id, 'mine', mine_id from public.player_mines
    on conflict do nothing;
  end if;
  if to_regclass('public.player_achievements') is not null then
    insert into public.player_unlocks (user_id, kind, ref_id)
    select user_id, 'achievement', achievement_id from public.player_achievements
    on conflict do nothing;
  end if;
  if to_regclass('public.player_consumables') is not null then
    insert into public.player_unlocks (user_id, kind, ref_id, quantity)
    select user_id, 'consumable', consumable_id, quantity from public.player_consumables
    on conflict (user_id, kind, ref_id) do update set quantity = excluded.quantity;
  end if;
end $$;

drop table if exists public.player_pickaxes cascade;
drop table if exists public.player_mines cascade;
drop table if exists public.player_achievements cascade;
drop table if exists public.player_consumables cascade;

create table if not exists public.inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ore_id text not null,
  mine_id text not null,
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
  rarest_ore text,
  sessions bigint not null default 0 check (sessions >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.mine_sessions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mine_id text not null,
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

-- ---------------------------------------------------------------------------
-- Social / economy tables
-- ---------------------------------------------------------------------------

-- Bazaar: players list ore stacks for sale. Items are escrowed — they leave
-- the seller's inventory at listing time and move to the buyer on purchase.
create table if not exists public.market_listings (
  id bigserial primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  ore_id text not null,
  mine_id text not null,
  quantity integer not null check (quantity between 1 and 9999),
  unit_value bigint not null check (unit_value > 0),
  price_each bigint not null check (price_each between 1 and 1000000000),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists market_listings_active_idx
  on public.market_listings (created_at desc) where status = 'active';
create index if not exists market_listings_seller_idx on public.market_listings (seller_id);

-- Friends: a single row per relationship direction. 'pending' rows are
-- requests; 'accepted' rows represent friendships (checked both ways).
create table if not exists public.friends (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists friends_friend_idx on public.friends (friend_id);

-- Trades: two-phase offers. Either party writes their own offer while the
-- trade is pending; the target accepts to execute an atomic item swap.
create table if not exists public.trades (
  id bigserial primary key,
  initiator_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (initiator_id <> target_id)
);

create index if not exists trades_pair_idx on public.trades (initiator_id, target_id, status);
create index if not exists trades_target_idx on public.trades (target_id, status);

create table if not exists public.trade_items (
  id bigserial primary key,
  trade_id bigint not null references public.trades(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ore_id text not null,
  mine_id text not null,
  quantity integer not null check (quantity between 1 and 9999)
);

create index if not exists trade_items_trade_idx on public.trade_items (trade_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

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

-- Wealth is the coin balance only (leaderboard ranking). Inventory value
-- is tracked separately as a stat, not part of wealth.
create or replace function public.recompute_wealth(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles p
  set wealth = p.coins,
      updated_at = now()
  where p.id = p_user;
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

create or replace function public.has_unlock(p_user uuid, p_kind text, p_ref_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.player_unlocks u
    where u.user_id = p_user and u.kind = p_kind and u.ref_id = p_ref_id
  );
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
  insert into public.player_unlocks (user_id, kind, ref_id) values
    (new.id, 'pickaxe', 'basic'),
    (new.id, 'mine', 'mossy');
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gameplay RPCs (called by server.js with the service role)
-- ---------------------------------------------------------------------------

-- Drop old signatures whose parameters changed (create or replace would
-- otherwise leave broken overloads behind).
drop function if exists public.apply_mining_reward(uuid, uuid, text, text, integer, bigint, integer);
drop function if exists public.purchase_pickaxe(uuid, text);
drop function if exists public.unlock_mine(uuid, text);
drop function if exists public.purchase_consumable(uuid, text);
drop function if exists public.evaluate_achievements(uuid);

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
  p_xp integer,
  p_rarity_rank integer
)
returns table (applied boolean, quantity integer, coins bigint, xp bigint, level integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
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
  if p_unit_value < 1 or p_unit_value > 1000000 then
    raise exception 'invalid_value';
  end if;
  if p_xp < 1 or p_xp > 5000 then
    raise exception 'invalid_xp';
  end if;
  if p_rarity_rank < 0 or p_rarity_rank > 5 then
    raise exception 'invalid_payload';
  end if;

  select p.coins, p.xp, p.level into v_coins, v_xp, v_level
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  if not public.has_unlock(p_user, 'mine', p_mine_id) then
    raise exception 'mine_locked';
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

  v_rank := p_rarity_rank;
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
  p_pickaxe_id text,
  p_price bigint,
  p_level_required integer
)
returns table (purchased boolean, coins bigint, equipped_pickaxe text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coins bigint;
  v_level integer;
  v_owned boolean;
begin
  if p_price < 0 or p_price > 1000000000 or p_level_required < 1 or p_level_required > 10000 then
    raise exception 'invalid_payload';
  end if;
  select p.coins, p.level into v_coins, v_level
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  select public.has_unlock(p_user, 'pickaxe', p_pickaxe_id) into v_owned;
  if v_owned then
    update public.profiles p
    set equipped_pickaxe = p_pickaxe_id,
        updated_at = now()
    where p.id = p_user;
    return query select false, v_coins, p_pickaxe_id;
    return;
  end if;
  if v_level < p_level_required then
    raise exception 'level_too_low';
  end if;
  if v_coins < p_price then
    raise exception 'insufficient_coins';
  end if;
  update public.profiles p
  set coins = p.coins - p_price,
      equipped_pickaxe = p_pickaxe_id,
      updated_at = now()
  where p.id = p_user;
  update public.player_stats s
  set coins_spent = s.coins_spent + p_price,
      updated_at = now()
  where s.user_id = p_user;
  insert into public.player_unlocks (user_id, kind, ref_id)
  values (p_user, 'pickaxe', p_pickaxe_id)
  on conflict do nothing;
  return query select true, v_coins - p_price, p_pickaxe_id;
end;
$$;

create or replace function public.unlock_mine(
  p_user uuid,
  p_mine_id text,
  p_cost bigint,
  p_level_required integer
)
returns table (unlocked boolean, coins bigint, current_mine text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coins bigint;
  v_level integer;
  v_owned boolean;
begin
  if p_cost < 0 or p_cost > 1000000000 or p_level_required < 1 or p_level_required > 10000 then
    raise exception 'invalid_payload';
  end if;
  select p.coins, p.level into v_coins, v_level
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  select public.has_unlock(p_user, 'mine', p_mine_id) into v_owned;
  if v_owned then
    update public.profiles p
    set current_mine = p_mine_id,
        updated_at = now()
    where p.id = p_user;
    return query select false, v_coins, p_mine_id;
    return;
  end if;
  if v_level < p_level_required then
    raise exception 'level_too_low';
  end if;
  if v_coins < p_cost then
    raise exception 'insufficient_coins';
  end if;
  update public.profiles p
  set coins = p.coins - p_cost,
      current_mine = p_mine_id,
      updated_at = now()
  where p.id = p_user;
  update public.player_stats s
  set coins_spent = s.coins_spent + p_cost,
      updated_at = now()
  where s.user_id = p_user;
  insert into public.player_unlocks (user_id, kind, ref_id)
  values (p_user, 'mine', p_mine_id)
  on conflict do nothing;
  return query select true, v_coins - p_cost, p_mine_id;
end;
$$;

create or replace function public.purchase_consumable(
  p_user uuid,
  p_consumable_id text,
  p_price bigint
)
returns table (purchased boolean, coins bigint, quantity integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coins bigint;
  v_qty integer;
begin
  if p_price < 0 or p_price > 1000000000 then
    raise exception 'invalid_payload';
  end if;
  select p.coins into v_coins
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  if v_coins < p_price then
    raise exception 'insufficient_coins';
  end if;
  update public.profiles p
  set coins = p.coins - p_price,
      updated_at = now()
  where p.id = p_user;
  update public.player_stats s
  set coins_spent = s.coins_spent + p_price,
      updated_at = now()
  where s.user_id = p_user;
  insert into public.player_unlocks as pu (user_id, kind, ref_id, quantity, updated_at)
  values (p_user, 'consumable', p_consumable_id, 1, now())
  on conflict (user_id, kind, ref_id) do update
    set quantity = pu.quantity + 1,
        updated_at = now()
  returning pu.quantity into v_qty;
  return query select true, v_coins - p_price, v_qty;
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
  select pu.quantity into v_qty
  from public.player_unlocks pu
  where pu.user_id = p_user and pu.kind = 'consumable' and pu.ref_id = p_consumable_id
  for update;
  if not found or v_qty <= 0 then
    return query select false, coalesce(v_qty, 0);
    return;
  end if;
  update public.player_unlocks pu
  set quantity = pu.quantity - 1,
      updated_at = now()
  where pu.user_id = p_user and pu.kind = 'consumable' and pu.ref_id = p_consumable_id
  returning pu.quantity into v_qty;
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
  if not public.has_unlock(p_user, 'pickaxe', p_pickaxe_id) then
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
  if not public.has_unlock(p_user, 'mine', p_mine_id) then
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
  if not public.has_unlock(p_user, 'mine', p_mine_id) then
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

-- Achievement evaluation: definitions are passed in as JSONB from the
-- server (they live in code), metrics are computed from player progress.
create or replace function public.evaluate_achievements(p_user uuid, p_defs jsonb)
returns table (achievement_id text, achievement_name text, reward_coins bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_metrics jsonb;
  v_rec record;
  v_value numeric;
  v_reward bigint := 0;
begin
  select jsonb_build_object(
    'ores_mined', coalesce(s.ores_mined, 0),
    'deposits_mined', coalesce(s.deposits_mined, 0),
    'ores_sold', coalesce(s.ores_sold, 0),
    'rarest_tier', coalesce(s.rarest_tier, -1),
    'coins_earned', coalesce(s.coins_earned, 0),
    'level', p.level,
    'mine_count', (select count(*) from public.player_unlocks u where u.user_id = p_user and u.kind = 'mine'),
    'pick_count', (select count(*) from public.player_unlocks u where u.user_id = p_user and u.kind = 'pickaxe')
  )
  into v_metrics
  from public.profiles p
  left join public.player_stats s on s.user_id = p_user
  where p.id = p_user;

  if v_metrics is null then
    raise exception 'unknown_player';
  end if;
  if not exists (select 1 from public.player_stats s where s.user_id = p_user) then
    insert into public.player_stats (user_id) values (p_user) on conflict do nothing;
  end if;

  for v_rec in
    select
      d.def ->> 'id' as id,
      d.def ->> 'name' as name,
      coalesce((d.def ->> 'reward_coins')::bigint, 0) as reward_coins,
      d.def ->> 'metric' as metric,
      coalesce((d.def ->> 'threshold')::numeric, 0) as threshold,
      coalesce((d.def ->> 'sort_order')::int, 9999) as sort_order
    from jsonb_array_elements(coalesce(p_defs, '[]'::jsonb)) as d(def)
    where not exists (
      select 1 from public.player_unlocks u
      where u.user_id = p_user and u.kind = 'achievement' and u.ref_id = d.def ->> 'id'
    )
    order by coalesce((d.def ->> 'sort_order')::int, 9999)
  loop
    v_value := coalesce((v_metrics ->> v_rec.metric)::numeric, 0);
    if v_value >= v_rec.threshold then
      insert into public.player_unlocks (user_id, kind, ref_id)
      values (p_user, 'achievement', v_rec.id)
      on conflict do nothing;
      if found then
        v_reward := v_reward + v_rec.reward_coins;
        achievement_id := v_rec.id;
        achievement_name := v_rec.name;
        reward_coins := v_rec.reward_coins;
        return next;
      end if;
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

-- ---------------------------------------------------------------------------
-- Bazaar RPCs
-- ---------------------------------------------------------------------------

-- List items for sale. The stack leaves the seller's inventory immediately
-- (escrow) and keeps its unit value on the listing.
create or replace function public.create_listing(
  p_user uuid,
  p_ore_id text,
  p_mine_id text,
  p_quantity integer,
  p_price_each bigint
)
returns table (listing_id bigint, quantity integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_qty integer;
  v_unit bigint;
  v_id bigint;
begin
  if p_quantity < 1 or p_quantity > 9999 or p_price_each < 1 or p_price_each > 1000000000 then
    raise exception 'invalid_payload';
  end if;
  select i.quantity, i.unit_value into v_qty, v_unit
  from public.inventory i
  where i.user_id = p_user and i.ore_id = p_ore_id and i.mine_id = p_mine_id
  for update;
  if not found then
    raise exception 'inventory_empty';
  end if;
  if p_quantity > v_qty then
    raise exception 'invalid_quantity';
  end if;
  if p_quantity = v_qty then
    delete from public.inventory i
    where i.user_id = p_user and i.ore_id = p_ore_id and i.mine_id = p_mine_id;
  else
    update public.inventory i
    set quantity = i.quantity - p_quantity,
        updated_at = now()
    where i.user_id = p_user and i.ore_id = p_ore_id and i.mine_id = p_mine_id;
  end if;
  insert into public.market_listings (seller_id, ore_id, mine_id, quantity, unit_value, price_each)
  values (p_user, p_ore_id, p_mine_id, p_quantity, v_unit, p_price_each)
  returning id into v_id;
  return query select v_id, p_quantity;
end;
$$;

-- Cancel an active listing and return the items to the seller.
create or replace function public.cancel_listing(p_user uuid, p_listing_id bigint)
returns table (ore_id text, mine_id text, quantity integer, unit_value bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select l.ore_id, l.mine_id, l.quantity, l.unit_value into v
  from public.market_listings l
  where l.id = p_listing_id and l.seller_id = p_user and l.status = 'active'
  for update;
  if not found then
    raise exception 'listing_not_found';
  end if;
  update public.market_listings l
  set status = 'cancelled'
  where l.id = p_listing_id;
  insert into public.inventory as inv (user_id, ore_id, mine_id, quantity, unit_value, updated_at)
  values (p_user, v.ore_id, v.mine_id, v.quantity, v.unit_value, now())
  on conflict (user_id, ore_id, mine_id) do update
    set quantity = inv.quantity + excluded.quantity,
        unit_value = excluded.unit_value,
        updated_at = now();
  return query select v.ore_id, v.mine_id, v.quantity, v.unit_value;
end;
$$;

-- Buy a listing: coins move buyer -> seller, items move to buyer inventory.
create or replace function public.buy_listing(p_user uuid, p_listing_id bigint)
returns table (ore_id text, mine_id text, quantity integer, unit_value bigint, total bigint, coins bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_total bigint;
  v_coins bigint;
  v_seller_coins bigint;
begin
  select l.seller_id, l.ore_id, l.mine_id, l.quantity, l.unit_value, l.price_each into v
  from public.market_listings l
  where l.id = p_listing_id and l.status = 'active'
  for update;
  if not found then
    raise exception 'listing_not_found';
  end if;
  if v.seller_id = p_user then
    raise exception 'own_listing';
  end if;
  v_total := v.quantity::bigint * v.price_each;
  select p.coins into v_coins
  from public.profiles p
  where p.id = p_user
  for update;
  if not found then
    raise exception 'unknown_player';
  end if;
  if v_coins < v_total then
    raise exception 'insufficient_coins';
  end if;
  update public.market_listings l
  set status = 'sold', buyer_id = p_user, sold_at = now()
  where l.id = p_listing_id and l.status = 'active';
  if not found then
    raise exception 'listing_not_found';
  end if;
  update public.profiles p
  set coins = p.coins - v_total,
      updated_at = now()
  where p.id = p_user
  returning p.coins into v_coins;
  update public.profiles p
  set coins = p.coins + v_total,
      updated_at = now()
  where p.id = v.seller_id
  returning p.coins into v_seller_coins;
  update public.player_stats s
  set coins_spent = s.coins_spent + v_total,
      updated_at = now()
  where s.user_id = p_user;
  update public.player_stats s
  set coins_earned = s.coins_earned + v_total,
      updated_at = now()
  where s.user_id = v.seller_id;
  insert into public.inventory as inv (user_id, ore_id, mine_id, quantity, unit_value, updated_at)
  values (p_user, v.ore_id, v.mine_id, v.quantity, v.unit_value, now())
  on conflict (user_id, ore_id, mine_id) do update
    set quantity = inv.quantity + excluded.quantity,
        unit_value = excluded.unit_value,
        updated_at = now();
  return query select v.ore_id, v.mine_id, v.quantity, v.unit_value, v_total, v_coins;
end;
$$;

-- ---------------------------------------------------------------------------
-- Friends RPCs
-- ---------------------------------------------------------------------------

create or replace function public.search_players(p_user uuid, p_query text)
returns table (user_id uuid, username text, level integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.level
  from public.profiles p
  where p.id <> p_user
    and char_length(coalesce(p_query, '')) >= 2
    and p.username ilike '%' || p_query || '%'
  order by p.username
  limit 20;
$$;

create or replace function public.send_friend_request(p_user uuid, p_target uuid)
returns table (status text, friend_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reverse_status text;
begin
  if p_target = p_user then
    raise exception 'invalid_target';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_target) then
    raise exception 'unknown_player';
  end if;
  if exists (select 1 from public.friends f where f.user_id = p_user and f.friend_id = p_target) then
    return query select 'already_pending', p_target;
    return;
  end if;
  select f.status into v_reverse_status
  from public.friends f
  where f.user_id = p_target and f.friend_id = p_user;
  if v_reverse_status = 'accepted' then
    return query select 'already_friends', p_target;
    return;
  end if;
  if v_reverse_status = 'pending' then
    update public.friends f
    set status = 'accepted'
    where f.user_id = p_target and f.friend_id = p_user;
    return query select 'accepted', p_target;
    return;
  end if;
  insert into public.friends (user_id, friend_id, status)
  values (p_user, p_target, 'pending');
  return query select 'pending', p_target;
end;
$$;

create or replace function public.respond_friend_request(p_user uuid, p_requester uuid, p_accept boolean)
returns table (status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_accept then
    update public.friends f
    set status = 'accepted'
    where f.user_id = p_requester and f.friend_id = p_user and f.status = 'pending';
    if not found then
      raise exception 'request_not_found';
    end if;
    return query select 'accepted'::text;
  else
    delete from public.friends f
    where f.user_id = p_requester and f.friend_id = p_user and f.status = 'pending';
    if not found then
      raise exception 'request_not_found';
    end if;
    return query select 'removed'::text;
  end if;
end;
$$;

create or replace function public.remove_friend(p_user uuid, p_friend uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.friends f
  where (f.user_id = p_user and f.friend_id = p_friend)
     or (f.user_id = p_friend and f.friend_id = p_user);
$$;

create or replace function public.list_friends(p_user uuid)
returns table (friend_id uuid, username text, level integer, relation text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when f.user_id = p_user then f.friend_id else f.user_id end as friend_id,
    p.username,
    p.level,
    case
      when f.status = 'accepted' then 'friend'
      when f.user_id = p_user then 'outgoing'
      else 'incoming'
    end as relation
  from public.friends f
  join public.profiles p
    on p.id = case when f.user_id = p_user then f.friend_id else f.user_id end
  where f.user_id = p_user or f.friend_id = p_user
  order by relation, p.username;
$$;

-- ---------------------------------------------------------------------------
-- Trade RPCs
-- ---------------------------------------------------------------------------

-- Create a trade, or return the existing pending one between the pair.
create or replace function public.create_trade(p_user uuid, p_target uuid)
returns table (trade_id bigint, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_status text;
begin
  if p_target = p_user then
    raise exception 'invalid_target';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_target) then
    raise exception 'unknown_player';
  end if;
  select t.id, t.status into v_id, v_status
  from public.trades t
  where t.status = 'pending'
    and ((t.initiator_id = p_user and t.target_id = p_target)
      or (t.initiator_id = p_target and t.target_id = p_user))
  limit 1;
  if v_id is not null then
    return query select v_id, v_status;
    return;
  end if;
  insert into public.trades (initiator_id, target_id)
  values (p_user, p_target)
  returning id into v_id;
  return query select v_id, 'pending'::text;
end;
$$;

-- Replace one side's offer. Items are validated again at accept time.
create or replace function public.set_trade_offer(p_user uuid, p_trade_id bigint, p_items jsonb)
returns table (item_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_initiator uuid;
  v_target uuid;
  v_status text;
  v_count integer := 0;
  v_item record;
begin
  select t.initiator_id, t.target_id, t.status into v_initiator, v_target, v_status
  from public.trades t
  where t.id = p_trade_id
  for update;
  if not found then
    raise exception 'trade_not_found';
  end if;
  if v_status <> 'pending' then
    raise exception 'trade_closed';
  end if;
  if p_user <> v_initiator and p_user <> v_target then
    raise exception 'not_participant';
  end if;
  if p_items is not null and jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_payload';
  end if;
  if p_items is not null and jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_payload';
  end if;
  delete from public.trade_items ti
  where ti.trade_id = p_trade_id and ti.user_id = p_user;
  for v_item in
    select
      elem ->> 'ore_id' as ore_id,
      elem ->> 'mine_id' as mine_id,
      (elem ->> 'quantity')::integer as quantity
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as elem
  loop
    if v_item.quantity < 1 or v_item.quantity > 9999
       or char_length(coalesce(v_item.ore_id, '')) > 64
       or char_length(coalesce(v_item.mine_id, '')) > 64 then
      raise exception 'invalid_payload';
    end if;
    insert into public.trade_items (trade_id, user_id, ore_id, mine_id, quantity)
    values (p_trade_id, p_user, v_item.ore_id, v_item.mine_id, v_item.quantity);
    v_count := v_count + 1;
  end loop;
  update public.trades t
  set updated_at = now()
  where t.id = p_trade_id;
  return query select v_count;
end;
$$;

create or replace function public.cancel_trade(p_user uuid, p_trade_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trades t
  set status = 'cancelled', updated_at = now()
  where t.id = p_trade_id and t.status = 'pending'
    and (t.initiator_id = p_user or t.target_id = p_user);
  if not found then
    raise exception 'trade_not_found';
  end if;
end;
$$;

-- Target accepts: atomically swap both offers. Any failure rolls back the
-- whole trade, so a stale offer can never half-complete.
create or replace function public.accept_trade(p_user uuid, p_trade_id bigint)
returns table (status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_initiator uuid;
  v_target uuid;
  v_status text;
  v_item record;
  v_unit bigint;
  v_total integer := 0;
begin
  select t.initiator_id, t.target_id, t.status into v_initiator, v_target, v_status
  from public.trades t
  where t.id = p_trade_id
  for update;
  if not found then
    raise exception 'trade_not_found';
  end if;
  if v_status <> 'pending' then
    raise exception 'trade_closed';
  end if;
  if p_user <> v_target then
    raise exception 'not_authorized';
  end if;
  select count(*) into v_total
  from public.trade_items ti
  where ti.trade_id = p_trade_id;
  if v_total = 0 then
    raise exception 'empty_trade';
  end if;
  update public.trades t
  set status = 'completed', completed_at = now(), updated_at = now()
  where t.id = p_trade_id;

  for v_item in
    select ti.user_id as side, ti.ore_id, ti.mine_id, ti.quantity
    from public.trade_items ti
    where ti.trade_id = p_trade_id
  loop
    select i.unit_value into v_unit
    from public.inventory i
    where i.user_id = v_item.side
      and i.ore_id = v_item.ore_id
      and i.mine_id = v_item.mine_id;
    if v_unit is null then
      raise exception 'insufficient_ore';
    end if;
    -- remove from the offering side
    update public.inventory i
    set quantity = i.quantity - v_item.quantity,
        updated_at = now()
    where i.user_id = v_item.side
      and i.ore_id = v_item.ore_id
      and i.mine_id = v_item.mine_id
      and i.quantity >= v_item.quantity;
    if not found then
      raise exception 'insufficient_ore';
    end if;
    delete from public.inventory i
    where i.user_id = v_item.side
      and i.ore_id = v_item.ore_id
      and i.mine_id = v_item.mine_id
      and i.quantity <= 0;
    -- credit the other side
    insert into public.inventory as inv (user_id, ore_id, mine_id, quantity, unit_value, updated_at)
    values (
      case when v_item.side = v_initiator then v_target else v_initiator end,
      v_item.ore_id,
      v_item.mine_id,
      v_item.quantity,
      v_unit,
      now()
    )
    on conflict (user_id, ore_id, mine_id) do update
      set quantity = inv.quantity + excluded.quantity,
          updated_at = now();
  end loop;

  return query select 'completed'::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists inventory_touch on public.inventory;
create trigger inventory_touch before update on public.inventory
for each row execute function public.touch_updated_at();

drop trigger if exists inventory_wealth_change on public.inventory;
drop function if exists public.inventory_wealth();

drop trigger if exists profiles_wealth_change on public.profiles;
create trigger profiles_wealth_change after update of coins on public.profiles
for each row execute function public.profiles_wealth();

drop trigger if exists player_stats_touch on public.player_stats;
create trigger player_stats_touch before update on public.player_stats
for each row execute function public.touch_updated_at();

drop trigger if exists player_unlocks_touch on public.player_unlocks;
create trigger player_unlocks_touch before update on public.player_unlocks
for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- One-time backfill: wealth is now coins only.
update public.profiles set wealth = coins where wealth <> coins;

-- ---------------------------------------------------------------------------
-- Leaderboard
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.player_unlocks enable row level security;
alter table public.inventory enable row level security;
alter table public.player_stats enable row level security;
alter table public.mine_sessions enable row level security;
alter table public.reward_events enable row level security;
alter table public.market_listings enable row level security;
alter table public.friends enable row level security;
alter table public.trades enable row level security;
alter table public.trade_items enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);

drop policy if exists player_unlocks_read on public.player_unlocks;
create policy player_unlocks_read on public.player_unlocks for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists inventory_read on public.inventory;
create policy inventory_read on public.inventory for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists player_stats_read on public.player_stats;
create policy player_stats_read on public.player_stats for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists mine_sessions_read on public.mine_sessions;
create policy mine_sessions_read on public.mine_sessions for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists reward_events_read on public.reward_events;
create policy reward_events_read on public.reward_events for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists market_listings_read on public.market_listings;
create policy market_listings_read on public.market_listings for select to authenticated using (true);

drop policy if exists friends_read on public.friends;
create policy friends_read on public.friends for select to authenticated
  using ((select auth.uid()) = user_id or (select auth.uid()) = friend_id);

drop policy if exists trades_read on public.trades;
create policy trades_read on public.trades for select to authenticated
  using ((select auth.uid()) = initiator_id or (select auth.uid()) = target_id);

drop policy if exists trade_items_read on public.trade_items;
create policy trade_items_read on public.trade_items for select to authenticated
  using (exists (
    select 1 from public.trades t
    where t.id = trade_items.trade_id
      and ((select auth.uid()) = t.initiator_id or (select auth.uid()) = t.target_id)
  ));

grant usage on schema public to anon, authenticated, service_role;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.profiles, public.player_unlocks, public.inventory,
  public.player_stats, public.mine_sessions, public.reward_events,
  public.market_listings, public.friends, public.trades, public.trade_items to authenticated;
grant select on public.leaderboard to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
