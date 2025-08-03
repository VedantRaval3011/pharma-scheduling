import { getServerSession } from 'next-auth';

export async function getCurrentCompanyAndLocation() {
  const session = await getServerSession();
  if (!session?.user?.companies?.length) {
    throw new Error('No company data in session');
  }

  // Assuming a mechanism exists to determine the active company/location
  // This could be stored in session or a separate user preference
  const activeCompany = session.user.companies[0]; // Adjust based on your selection logic
  const activeLocation = activeCompany.locations[0]; // Adjust based on your selection logic
  
  return {
    companyId: activeCompany.companyId,
    locationId: activeLocation.locationId,
    createdBy: session.user.id,
  };
}