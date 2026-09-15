-- ============================================================
-- FULL RESET — Butajira Polytechnic College
-- WARNING: This DELETES all existing data in these tables.
-- Run this ONCE, then immediately run schema.sql right after it
-- to recreate the tables, triggers, policies, and functions.
-- ============================================================

drop table if exists public.maintenance_logs cascade;
drop table if exists public.cables cascade;
drop table if exists public.ports cascade;
drop table if exists public.assets cascade;