// Turns a stored photo path into a web address (shared by the website and the admin app)
export const photo = (p) => !p ? '' : /^(\/|https?:)/.test(p) ? p : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${p}`;
