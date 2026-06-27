-- Migration 002: image style on game sets, reference image URLs array on characters
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/yjsdslqvpnezpwvlxmvm/sql/new

alter table game_sets add column image_style text not null default 'pixar';

alter table characters add column reference_image_urls text[] not null default '{}';
alter table characters drop column if exists reference_image_url;
