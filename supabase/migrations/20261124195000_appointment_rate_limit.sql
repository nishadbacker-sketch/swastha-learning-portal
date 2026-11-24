-- Atomic, private, database-backed appointment rate limiting.
-- Requires a server-only service role secret; never expose RPC to normal users.
create table if not exists swastha_private.appointment_rate_limits (
  bucket_key text not null,
  window_number bigint not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (bucket_key, window_number)
);
alter table swastha_private.appointment_rate_limits enable row level security;
revoke all on swastha_private.appointment_rate_limits from PUBLIC, anon, authenticated;
grant select, insert, update on swastha_private.appointment_rate_limits to service_role;

create or replace function public.swastha_limit_appointment_request(
  p_ip_key text,
  p_phone_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_15 bigint := floor(extract(epoch from clock_timestamp()) / 900)::bigint;
  v_window_60 bigint := floor(extract(epoch from clock_timestamp()) / 3600)::bigint;
  v_hits integer;
begin
  -- Only accept keyed HMAC digests; never store raw IP addresses or phone numbers.
  if p_ip_key is null or p_ip_key !~ '^[a-f0-9]{64}$'
     or p_phone_key is null or p_phone_key !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  -- Global backstop prevents a user bypassing per-IP throttling by spoofing
  -- forwarded-IP headers. Atomic upserts protect concurrent requests.
  insert into swastha_private.appointment_rate_limits(bucket_key,window_number,hits)
  values ('global:appointments',v_window_15,1)
  on conflict (bucket_key,window_number)
    do update set hits=swastha_private.appointment_rate_limits.hits + 1
  returning hits into v_hits;
  if v_hits > 120 then return false; end if;

  insert into swastha_private.appointment_rate_limits(bucket_key,window_number,hits)
  values ('ip:' || p_ip_key,v_window_15,1)
  on conflict (bucket_key,window_number)
    do update set hits=swastha_private.appointment_rate_limits.hits + 1
  returning hits into v_hits;
  if v_hits > 8 then return false; end if;

  insert into swastha_private.appointment_rate_limits(bucket_key,window_number,hits)
  values ('phone:' || p_phone_key,v_window_60,1)
  on conflict (bucket_key,window_number)
    do update set hits=swastha_private.appointment_rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= 3;
end;
$$;
revoke all on function public.swastha_limit_appointment_request(text,text) from PUBLIC,anon,authenticated;
grant execute on function public.swastha_limit_appointment_request(text,text) to service_role;
