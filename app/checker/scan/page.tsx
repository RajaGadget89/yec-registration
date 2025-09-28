import { getCurrentUser } from '../../lib/auth-utils.server';
import QRScannerClient from './_components/QRScannerClient';

export default async function QRScannerPage() {
  // Get user data server-side (layout already handles auth)
  const user = await getCurrentUser();
  
  if (!user) {
    return <div>Loading...</div>;
  }

  return <QRScannerClient user={user} />;
}