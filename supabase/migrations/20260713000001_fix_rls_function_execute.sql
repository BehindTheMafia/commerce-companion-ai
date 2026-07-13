-- REVOKE EXECUTE in 20260708061447 broke all RLS policies that call
-- is_business_member() (6 policies) and has_business_role() (13 policies).
-- These are SECURITY DEFINER functions, so granting EXECUTE is safe —
-- they run as the owner, not the calling user.
--
-- Tables affected: businesses, products, categories, brands, product_images,
-- inventory_movements, customers, customer_addresses, orders, order_items

GRANT EXECUTE ON FUNCTION public.is_business_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_business_role(UUID, public.membership_role[]) TO authenticated;
