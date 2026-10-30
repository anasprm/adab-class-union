-- Update maximum wing account capacity from 7 to 8 in portal_role_capacities
update public.portal_role_capacities
set max_active = 8
where role = 'wing';
