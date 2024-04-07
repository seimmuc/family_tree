export const load = async ({ url }) => {
  const redirectTo = url.searchParams.get('redirectTo');
  return { redirectTo };
};
