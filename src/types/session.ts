export interface UserSession {
  user: {
    id: string;
    companies: {
      companyId: string;
      locations: { locationId: string }[];
    }[];
  };
}